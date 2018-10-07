import Joi from 'joi';
import { AttributeValue as ddbAttVals } from 'dynamodb-data-types';
import uuid from 'uuid';

import createS3Client from './lib/s3';
import {
  PEOPLE_KEY,
  INVOCATION_REQUEST_RESPONSE,
  INVOCATION_EVENT,
} from './lib/constants';
import logger from './lib/logger';
import lambda from './lib/lambda';
import rekognition from './lib/rekognition';

import { validateRequest } from './get';
import { getSchema, putSchema, peopleSchema } from './joi/stream';
import { requestSchema } from './joi/update';
import { success, failure } from './lib/responses';

import { safeLength } from './create';

const MATCH_THRESHOLD = 80;
const PERSON_THUMB_SUFFIX = '-face-';
const fotopiaGroup = process.env.FOTOPIA_GROUP;

export function getS3Params(Bucket, Key) {
  const data = {
    Bucket,
    Key,
  };
  const result = Joi.validate(data, getSchema);
  if (result.error !== null) {
    throw result.error;
  } else {
    return data;
  }
}

export function getS3PutParams(indexData, Bucket, Key) {
  const data = {
    Body: JSON.stringify(indexData),
    Bucket,
    ContentType: 'application/json',
    Key,
  };
  const result = Joi.validate(data, putSchema);
  if (result.error !== null) {
    throw result.error;
  } else {
    return data;
  }
}

export function validatePeople(object) {
  const result = Joi.validate(object, peopleSchema);
  if (result.error !== null) {
    throw new Error(JSON.stringify(result));
  } else {
    return object;
  }
}

export function getExistingPeople(s3, Bucket, Key) {
  const s3Params = getS3Params(Bucket, Key);
  return s3.getObject(s3Params).promise()
    .then((s3Object) => {
      const object = JSON.parse(s3Object.Body.toString());
      return validatePeople(object);
    })
    .catch((e) => {
      if (e.code === 'NoSuchKey' || e.code === 'AccessDenied') {
        console.log('No object found / AccessDenied - assuming empty people list');
        return [];
      }
      console.log('Another error with get people object', e);
      return { error: e, s3Params };
    });
}

export function putPeople(s3, people, Bucket, Key) {
  const s3PutParams = getS3PutParams(people, Bucket, Key);
  return s3.putObject(s3PutParams).promise()
    .catch((e) => {
      const logitall = { e, people };
      throw new Error(JSON.stringify(logitall));
    });
}

export function getFaceMatch(face) {
  const params = {
    CollectionId: fotopiaGroup,
    FaceId: face,
    FaceMatchThreshold: MATCH_THRESHOLD,
  };
  return rekognition ?
    rekognition.searchFaces(params)
      .promise() :
    {
      FaceMatches: [],
      SearchedFaceId: face,
    };
}

export function getSimilarityAggregate(person, faceMatches) {
  const personFacesWithSimilarity = person.faces.map((personFace) => {
    const faceMatch = faceMatches
      .find(matchedFace => matchedFace.Face.FaceId === personFace.FaceId);
    return faceMatch ? faceMatch.Similarity : 0;
  });
  return personFacesWithSimilarity
    .reduce((accum, sim) => accum + sim, 0) / person.faces.length;
}

export function getPeopleForFace(existingPeople = [], faceMatches) {
  return existingPeople.map(person => ({
    Person: person.id,
    Match: getSimilarityAggregate(person, faceMatches),
  }));
}

export function getNewImageRecords(records) {
  return records.filter(record => record.dynamodb &&
    record.dynamodb.NewImage &&
    !record.dynamodb.OldImage)
    .map(record => ({
      ...ddbAttVals.unwrap(record.dynamodb.Keys),
      ...ddbAttVals.unwrap(record.dynamodb.NewImage),
    }));
}

// can there be multiple insert records in one event? probably?
export function getPeopleForFaces(newImages, existingPeople, faceMatcher) {
  return Promise.all(newImages[0].faces
    .map(face => faceMatcher(face.Face.FaceId)
      .then(({ FaceMatches, SearchedFaceId }) => {
        const peopleMatches = getPeopleForFace(existingPeople, FaceMatches);
        return {
          FaceId: SearchedFaceId,
          ExternalImageId: face.Face.ExternalImageId,
          img_key: newImages[0].img_key,
          userIdentityId: newImages[0].userIdentityId,
          People: peopleMatches,
          FaceMatches, // I dont think this is needed, just bloating the record
          BoundingBox: face.Face.BoundingBox,
          ImageDimensions: {
            width: newImages[0].meta && newImages[0].meta.width,
            height: newImages[0].meta && newImages[0].meta.height,
          },
        };
      })));
}

export function getFacesThatMatchThisPerson(person, facesWithPeopleMatches) {
  return facesWithPeopleMatches.filter(face => face.People
    .find(p => p.Person === person.id && p.Match >= MATCH_THRESHOLD));
}

export function createPersonThumbKey(newFace) {
  const keySplit = newFace.img_key.split('.');
  const ext = keySplit[keySplit.length - 1];
  return `${newFace.img_key.substr(0, newFace.img_key.lastIndexOf(ext) - 1)}${PERSON_THUMB_SUFFIX}-${newFace.FaceId}.${ext}`;
}

export function getNewPeople(facesWithPeople) {
  const newFaces = facesWithPeople
    .filter(face => !face.People.find(person => person.Match >= MATCH_THRESHOLD));
  const newPeople = newFaces.map(newFace => ({
    name: '',
    id: uuid.v1(),
    userIdentityId: newFace.userIdentityId || '',
    img_key: newFace.img_key,
    thumbnail: createPersonThumbKey(newFace),
    boundingBox: newFace.BoundingBox,
    imageDimensions: newFace.ImageDimensions,
    faces: [{
      FaceId: newFace.FaceId,
      ExternalImageId: newFace.ExternalImageId,
    }],
  }));
  return validatePeople(newPeople);
}

export function getInvokePersonThumbParams(personInThisImage) {
  return {
    InvocationType: INVOCATION_EVENT,
    FunctionName: process.env.IS_OFFLINE ? 'personThumb' : `${process.env.LAMBDA_PREFIX}personThumb`,
    LogType: 'Tail',
    Payload: JSON.stringify({
      body: JSON.stringify(personInThisImage),
    }),
  };
}

export function invokePeopleThumbEvents(newPeopleInThisImage) {
  newPeopleInThisImage.forEach((person) => {
    const newPersonThumbParams = getInvokePersonThumbParams(person);
    lambda.invoke(newPersonThumbParams).promise();
  });
}

export function getUpdatedPeople(existingPeople, facesWithPeople, newPeopleInThisImage = []) {
  const updatedPeople = existingPeople.map(person => ({
    ...person,
    faces: person.faces.concat(getFacesThatMatchThisPerson(person, facesWithPeople))
      .map(face => ({
        FaceId: face.FaceId,
        ExternalImageId: face.ExternalImageId,
      })),
  })).concat(newPeopleInThisImage);

  return validatePeople(updatedPeople);
}

export function getUpdateBody(peopleForTheseFaces, updatedPeople = []) {
  const existingPeople = peopleForTheseFaces.map(face => face.People
    .filter(person => person.Match >= MATCH_THRESHOLD)
    .map(person => person.Person))
    .filter(peopleForFace => peopleForFace.length > 0)
    .reduce((allPeopleForFaces, peopleForFace) => allPeopleForFaces.concat(peopleForFace), []);

  const combinedPeople = existingPeople.concat(updatedPeople.map(newPerson => newPerson.id));
  const uniquePeople = [...new Set(combinedPeople)];
  const body = {
    people: uniquePeople,
    faceMatches: peopleForTheseFaces,
  };

  const result = Joi.validate(body, requestSchema);
  if (result.error !== null) {
    throw result.error;
  } else {
    return body;
  }
}
export function getUpdatePathParameters(newImages) {
  return validateRequest({
    username: newImages[0].username,
    id: newImages[0].id,
  });
}

export function getInvokeUpdateParams(pathParameters, body) {
  return {
    InvocationType: INVOCATION_REQUEST_RESPONSE,
    FunctionName: process.env.IS_OFFLINE ? 'update' : `${process.env.LAMBDA_PREFIX}update`,
    LogType: 'Tail',
    Payload: JSON.stringify({
      pathParameters,
      body: JSON.stringify(body),
    }),
  };
}

export function getLogFields({
  newImages,
  eventRecords,
  body,
  existingPeople,
  facesWithPeople,
  updatedPeople,
  newPeopleInThisImage,
}) {
  const firstNewImage = newImages[0] || {};
  return {
    imageId: firstNewImage.id,
    imageUsername: firstNewImage.username,
    imageFamilyGroup: firstNewImage.group,
    imageUserIdentityId: firstNewImage.userIdentityId,
    peopleCount: safeLength(existingPeople),
    imageFacesWithPeopleCount: safeLength(facesWithPeople),
    newPeopleCount: safeLength(newPeopleInThisImage),
    updatedPeopleCount: safeLength(updatedPeople),
    imagePeopleCount: body && safeLength(body.people),
    imageFaceMatchCount: body && safeLength(body.faceMatches),
    imageFacesCount: safeLength(firstNewImage.faces),
    imageTagCount: safeLength(firstNewImage.tags),
    imageKey: firstNewImage.img_key,
    imageWidth: firstNewImage.meta && firstNewImage.meta.width,
    imageHeight: firstNewImage.meta && firstNewImage.meta.height,
    imageBirthtime: firstNewImage.birthtime,
    imageCreatedAt: firstNewImage.createdAt,
    imageUpdatedAt: firstNewImage.updatedAt,
    ddbEventInsertRecordsCount: newImages.length,
    ddbEventRecordsCount: safeLength(eventRecords),
    ddbEventRecordsRaw: eventRecords,
    existingPeopleRaw: existingPeople,
    facesWithPeopleRaw: facesWithPeople,
  };
}

export async function addToPerson(event, context, callback) {
  const startTime = Date.now();
  const newImages = getNewImageRecords(event.Records);
  const s3 = createS3Client();
  const bucket = process.env.S3_BUCKET;
  const key = PEOPLE_KEY;
  let logMetaParams = {
    newImages,
    eventRecords: event.Records,
  };
  try {
    let logMeta;
    if (newImages.length > 0) {
      // todo handle multiple new image records if feasible scenario
      const existingPeople = await getExistingPeople(s3, bucket, key, context, startTime);
      const facesWithPeople = await getPeopleForFaces(newImages, existingPeople, getFaceMatch);
      const newPeopleInThisImage = getNewPeople(facesWithPeople);
      if (newPeopleInThisImage.length > 0) {
        invokePeopleThumbEvents(newPeopleInThisImage);
      }
      const updatedPeople = getUpdatedPeople(existingPeople, facesWithPeople, newPeopleInThisImage);
      const putPeoplePromise = putPeople(s3, updatedPeople, bucket, key);
      const pathParameters = getUpdatePathParameters(newImages);
      const body = getUpdateBody(facesWithPeople, newPeopleInThisImage);
      const updateParams = getInvokeUpdateParams(pathParameters, body);
      await lambda.invoke(updateParams).promise();
      logMetaParams = {
        ...logMetaParams,
        body,
        existingPeople,
        facesWithPeople,
        updatedPeople,
        newPeopleInThisImage,
      };
      await putPeoplePromise;
    }
    logger(context, startTime, getLogFields(logMetaParams));
    return callback(null, success({ logMeta }));
  } catch (err) {
    logger(context, startTime, { err, ...getLogFields(logMetaParams) });
    return callback(null, failure(err));
  }
}
