/*
 for new images

 load persons json file

 run SearchFaces for each faceId in the image (max 3..? to limit costs)

 loop through each face match
  - log the persons that each face match is assigned to
  - add this face to the person with the most face matches
  - if number of faces in persons is equal assign to the higher match confidence

 if no faces match then create a new person for this face.

gonna need a faces database ?
- store results of searchFaces
- how to derive people?

people just end up in indexes?
store guid in

or

all stored on the image record

indexFaces and searchFaces done on faces event lambda
this adds faces and facematch data to the record

then need to look up faces that are assigned to a
person and add that person tag to this image record

so just make existing people slimmer
and store facematch data on the record
omit match data below threshold?

just
{
  id:
  thumbnail: - create this immediately from the facedid image?
  name:
  faces: [{
    faceId,
    ExternalImageId,
  }]
}

*/
import Joi from 'joi';
import { AttributeValue as ddbAttVals } from 'dynamodb-data-types';
import uuid from 'uuid';

import createS3Client from './lib/s3';
import {
  PEOPLE_KEY,
  INVOCATION_REQUEST_RESPONSE,
} from './lib/constants';
import logger from './lib/logger';
import lambda from './lib/lambda';
import rekognition from './lib/rekognition';

import { validateRequest } from './get';
import { getSchema, putSchema, peopleSchema } from './joi/stream';
import { requestSchema } from './joi/update';
import { success, failure } from './lib/responses';

const MATCH_THRESHOLD = 80;
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
    throw new Error(JSON.stringify(result.error));
  } else {
    return result;
  }
}

export function getExistingPeople(s3, Bucket, Key, context, startTime) {
  const s3Params = getS3Params(Bucket, Key);
  return s3.getObject(s3Params).promise()
    .then((s3Object) => {
      const object = JSON.parse(s3Object.Body.toString());
      logger(context, startTime, { s3PeopleObject: object });
      console.log('--- people raw response --- ', object);
      return validatePeople(object);
    })
    .catch((e) => {
      logger(context, startTime, { err: e, msg: 'Existing people object get error' });
      console.log('--- people raw error --- ', e);
      return [];
    });
}

export function putPeople(s3, people, Bucket, Key) {
  const s3PutParams = getS3PutParams(people, Bucket, Key);
  return s3.putObject(s3PutParams).promise();
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
          img_thumb_key: newImages[0].img_thumb_key,
          userIdentityId: newImages[0].userIdentityId,
          People: peopleMatches,
          FaceMatches,
        };
      })));
}

export function getFacesThatMatchThisPerson(person, facesWithPeopleMatches) {
  return facesWithPeopleMatches.filter(face => face.People
    .find(p => p.Person === person.id && p.Match >= MATCH_THRESHOLD));
}

export function getNewPeople(facesWithPeople) {
  const newFaces = facesWithPeople
    .filter(face => !face.People.find(person => person.Match >= MATCH_THRESHOLD));
  const newPeople = newFaces.map(newFace => ({
    name: '',
    id: uuid.v1(),
    thumbnail: 'todo-create-person-thumb.jpg',
    faces: [{
      FaceId: newFace.FaceId,
      ExternalImageId: newFace.ExternalImageId,
    }],
  }));
  return newPeople; // return validatePeople(newPeople);
}


export function getUpdatedPeople(existingPeople, facesWithPeople) {
  const updatedPeople = existingPeople.map(person => ({
    ...person,
    faces: person.faces.concat(getFacesThatMatchThisPerson(person, facesWithPeople))
      .map(face => ({
        FaceId: face.FaceId,
        ExternalImageId: face.ExternalImageId,
      })),
  })).concat(getNewPeople(facesWithPeople));

  return updatedPeople; // validatePeople(updatedPeople);
}

export function getUpdateBody(peopleForTheseFaces) {
  const body = {
    people: peopleForTheseFaces.map(face => face.People
      .filter(person => person.Match >= MATCH_THRESHOLD)
      .map(person => person.Person))
      .filter(people => people.length > 0)
      .reduce((accum, item) => accum.concat(item), []),
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

export function getRecordFields(records) {
  return records;
}

export async function addToPerson(event, context, callback) {
  const startTime = Date.now();
  const newImages = getNewImageRecords(event.Records);
  const s3 = createS3Client();
  const bucket = process.env.S3_BUCKET;
  const key = PEOPLE_KEY;
  try {
    let logMeta;
    if (newImages.length > 0) {
      // todo handle multiple new image records if feasible scenario
      const existingPeople = await getExistingPeople(s3, bucket, key, context, startTime);
      const facesWithPeople = await getPeopleForFaces(newImages, existingPeople, getFaceMatch);
      const updatedPeople = getUpdatedPeople(existingPeople, facesWithPeople);
      const putPeoplePromise = putPeople(s3, updatedPeople, bucket, key);
      const pathParameters = getUpdatePathParameters(newImages);
      const body = getUpdateBody(facesWithPeople);
      const updateParams = getInvokeUpdateParams(pathParameters, body);
      const updateResponse = await lambda.invoke(updateParams).promise();
      logMeta = {
        existingPeople,
        facesWithPeople,
        updatedPeople,
        updateResponse: JSON.parse(updateResponse.Payload),
        newImages,
      };
      await putPeoplePromise;
    } else {
      logMeta = { msg: 'no new images', recEventName: event.Records[0].eventName };
    }
    logger(context, startTime, logMeta);
    return callback(null, success({ logMeta }));
  } catch (err) {
    logger(context, startTime, { err, newImages, recs: event.Records });
    return callback(null, failure(err));
  }
}