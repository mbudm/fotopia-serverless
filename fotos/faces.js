/*
 for new images

 load persons json file

 run SearchFaces for each faceId in the image (max 3..? to limit costs)

 loop through each face match
  - log the persons that each face match is assigned to
  - add this face to the person with the most face matches
  - if number of faces in persons is equal assign to the higher match confidence

 if no faces match then create a new person for this face.

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
// import lambda from './lib/lambda';
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

export function getExistingPeople(s3, Bucket, Key, context, startTime) {
  const s3Params = getS3Params(Bucket, Key);
  return s3.getObject(s3Params).promise()
    .then((s3Object) => {
      const object = JSON.parse(s3Object.Body.toString());
      const result = Joi.validate(object, peopleSchema);
      if (result.error !== null) {
        throw result.error;
      } else {
        return result;
      }
    })
    .catch((e) => {
      logger(context, startTime, { err: e, msg: 'Existing people object get error' });
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
  return newFaces.map(newFace => ({
    name: '',
    id: uuid.v1(),
    keyFaceId: newFace.FaceId,
    faces: [newFace],
  }));
}


export function getUpdatedPeople(existingPeople, facesWithPeople) {
  return existingPeople.map(person => ({
    ...person,
    faces: person.faces.concat(getFacesThatMatchThisPerson(person, facesWithPeople)),
  })).concat(getNewPeople(facesWithPeople));
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
      body,
    }),
  };
}

export function getRecordFields(records) {
  return records;
}

export async function addToPerson(event, context, callback) {
  const startTime = Date.now();
  const newImageRecords = getNewImageRecords(event.Records);
  const s3 = createS3Client();
  const bucket = process.env.S3_BUCKET;
  const key = PEOPLE_KEY;
  try {
    // todo handle multiple new image records if feasible scenario
    const existingPeople = await getExistingPeople(s3, bucket, key, context, startTime);
    const facesWithPeople = await getPeopleForFaces(newImageRecords, existingPeople, getFaceMatch);
    const updatedPeople = getUpdatedPeople(existingPeople, facesWithPeople);
    const putPeoplePromise = await putPeople(s3, updatedPeople, bucket, key);

    const pathParameters = getUpdatePathParameters(newImageRecords);
    const body = getUpdateBody(facesWithPeople);
    const updateParams = getInvokeUpdateParams(body, pathParameters);
    // const updateDynamoDbPromise = await lambda.invoke(updateParams).promise();
    logger(context, startTime, getRecordFields({
      updatedPeople,
      putPeoplePromise,
      updateParams,
    }));
    return callback(null, success({ existingPeople }));
  } catch (err) {
    logger(context, startTime, { err, ...getRecordFields(newImageRecords) });
    return callback(null, failure(err));
  }
}

// export async function addToPerson(event, context, callback) {
//   const startTime = Date.now();
//   const newImageRecords = getNewImageRecords(event.Records);
//   const s3 = createS3Client();
//   const bucket = process.env.S3_BUCKET;
//   const key = PEOPLE_KEY;
//   try {
//     // todo handle multiple new image records if feasible scenario
//     const existingPeople = await getExistingPeople(s3, bucket, key, context, startTime);
//     const facesWithPeople = await getPeopleForFaces(newImageRecords,
// existingPeople, getFaceMatch);
//     const updatedPeople = getUpdatedPeople(existingPeople, facesWithPeople);
//     const putPeoplePromise = putPeople(s3, updatedPeople, bucket, key);
//     const pathParameters = getUpdatePathParameters(newImageRecords, facesWithPeople);
//     const updateParams = getInvokeUpdateParams(pathParameters);
//     const updateDynamoDbPromise = lambda.invoke(updateParams).promise();
//     const peopleResponse = await putPeoplePromise;
//     const updateResponse = await updateDynamoDbPromise;
//     logger(context, startTime, getRecordFields(updateResponse));
//     return callback(null, success({ peopleResponse, updateResponse }));
//   } catch (err) {
//     logger(context, startTime, { err, ...getRecordFields(newImageRecords) });
//     return callback(null, failure(err));
//   }
// }


/*
const payloadEG = [
  {
    eventID: '9cbe27db657102695598580df16565b5',
    eventName: 'REMOVE',
    eventVersion: '1.1',
    eventSource: 'aws:dynamodb',
    awsRegion: 'us-east-1',
    dynamodb: {
      ApproximateCreationDateTime: 1529636100,
      Keys: {
        id: {
          S: 'bbf1ae40-75c7-11e8-b1f5-e7a9339da1f0',
        },
        username: {
          S: 'tester',
        },
      },
      OldImage: {
        createdAt: {
          N: '1529636135812',
        },
        img_key: {
          S: 'tester/one.jpg',
        },
        img_thumb_key: {
          S: 'tester/one-thumbnail.jpg',
        },
        birthtime: {
          N: '1340844911000',
        },
        id: {
          S: 'bbf1ae40-75c7-11e8-b1f5-e7a9339da1f0',
        },
        userIdentityId: {
          S: 'us-east-1:7261e973-d20d-406a-828c-d8cf70fd888e',
        },
        people: {
          L: [
            {
              S: 'Steve',
            },
            {
              S: 'Oren',
            },
          ],
        },
        group: {
          S: 'sosnowski-roberts',
        },
        tags: {
          L: [
            {
              S: 'blue',
            },
            {
              S: 'red',
            },
          ],
        },
        faces: {
          L: [{
            M: {
              Face: {
                M: {
                  BoundingBox: {
                    M: {
                      Height: {
                        N: '0.4197828769683838'
                      },
                      Left: { N: '0.13826367259025574' },
                      Top: { N: '0.2267792522907257' },
                      Width: { N: '0.2797427773475647' },
                    },
                  },
                  Confidence: { N: '99.99995422363281' },
                  ExternalImageId: { S: 'ec78b570-8b6d-11e8-b919-37f6f1b199a5' },
                  FaceId: { S: '33f3f7cb-fa29-4610-91d0-db30a5b6488b' },
                  ImageId: { S: '9722f933-31ee-5bfd-8bea-a6dc639fa811' },
                },
              },
              FaceDetail: {
                M: {
                  BoundingBox: {
                    M: {
                      Height: { N: '0.4197828769683838' },
                      Left: { N: '0.13826367259025574' },
                      Top: { N: '0.2267792522907257' },
                      Width: { N: '0.2797427773475647' },
                    },
                  },
                  Confidence: { N: '99.99995422363281' },
                  Landmarks: { L: [{ M: {
                    Type: { S: 'eyeLeft' },
                    X: { N: '0.231573686003685' },
                    Y: { N: '0.39553382992744446' } } },
                    { M: { Type: { S: 'eyeRight' },
                    X: { N: '0.31014081835746765' },
                    Y: { N: '0.38730013370513916' } } },
                    { M: { Type: { S: 'nose' },
                    X: { N: '0.241814523935318' },
                    Y: { N: '0.4583139717578888' } } },
                    { M: { Type: { S: 'mouthLeft' },
                    X: { N: '0.23912177979946136' },
                    Y: { N: '0.5443535447120667' } } },
                    { M: { Type: { S: 'mouthRight' },
                    X: { N: '0.3028641939163208' },
                    Y: { N: '0.5434433221817017' } } }] },
                  Pose: { M: { Pitch: { N: '4.236342430114746' },
                  Roll: { N: '-2.4419784545898438' },
                  Yaw: { N: '-27.07720947265625' } } },
                  Quality: { M: {
                    Brightness: { N: '38.81555938720703' },
                    Sharpness: { N: '99.99671173095703' } } },
                },
              },
            },
          },
          ],
        },
        updatedAt: {
          N: '1529636135812',
        },
        username: {
          S: 'tester',
        },
      },
      SequenceNumber: '52444600000000035236636795',
      SizeBytes: 330,
      StreamViewType: 'NEW_AND_OLD_IMAGES',
    },
    eventSourceARN: 'arn:am..',
  },
];
*/
// write to tags and people 'indexes'
/*
    {
      people: {
        'oren': {
          rekognitionId: 'some guid'
          count:
        }
      },
      tags: {
        tagname: {
          // what goes here - rough count?
        }
      }
    }

    or add people and tag objects to algolia? keep under the 10k records and get text search
    use NEW_AND_OLD_IMAGES so can check the diffs in people and tags and
    update the tag / people record accordingly
    how to keep counts...? have to query algloia to get the existing count and
    modify the count number

    get tag/people diffs
    query algolia with tags
    update if changed

    or just read write a json file? that way the client can also have all
    that and do basic search client side?

    */
//  const people = [{
//   Name: 'Oren',
//   Faces: [{
//     FaceId: 'f81bb045-9d24-4d0b-a928-b0267cbbd7c6',
//     img_key:
//   }],
// }];

