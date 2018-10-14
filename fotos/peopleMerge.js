import createS3Client from './lib/s3';
import { success, failure } from './lib/responses';
import {
  PEOPLE_KEY,
  INVOCATION_REQUEST_RESPONSE,
  INVOCATION_EVENT,
} from './lib/constants';
import logger from './lib/logger';
import lambda from './lib/lambda';
import { getExistingPeople, putPeople } from './faces';
import { safeLength } from './create';

export function mergePeopleObjects(data, existingPeople) {
  const mergedPeople = existingPeople
    .filter(person => data.includes(person.id))
    .map(person => ({ ...person, faces: [...person.faces] }));
  const mainPerson = mergedPeople
    .reduce((accum, person) => (accum.faces.length > person.faces.length ?
      accum : person), { faces: [] });
  mainPerson.faces = mergedPeople
    .reduce((accum, person) => {
      const uniqFaces = person.faces.filter(face => !accum.find(f => f.FaceId === face.FaceId));
      return accum.concat(uniqFaces);
    }, []);
  return mainPerson;
}
export function getDeletePeople(data, mergedPerson, existingPeople) {
  return data.filter(pid => pid !== mergedPerson.id)
    .map(pid2 => existingPeople.find(p => pid2 === p.id));
}

export function getInvokeQueryParams(deletedPeople, mergedPerson) {
  const body = {
    criteria: {
      people: deletedPeople.map(person => person.id).push(mergedPerson.id),
    },
    from: 0,
    to: Date.now(),
  };
  return {
    InvocationType: INVOCATION_REQUEST_RESPONSE,
    FunctionName: process.env.IS_OFFLINE ? 'query' : `${process.env.LAMBDA_PREFIX}query`,
    LogType: 'Tail',
    Payload: JSON.stringify({
      body: JSON.stringify(body),
    }),
  };
}
// need to query the images so we can modify just the deleted person id
// RDBMS may be more efficient here where we could remove selected people
// or use aliases for people in all searches
// first see how this goes
export async function queryImagesByPeople(deletePeople, mergedPerson) {
  const params = getInvokeQueryParams(deletePeople, mergedPerson);
  return lambda.invoke(params).promise();
}


export function getInvokeUpdateParams(pathParameters, body) {
  return {
    InvocationType: INVOCATION_EVENT,
    FunctionName: process.env.IS_OFFLINE ? 'update' : `${process.env.LAMBDA_PREFIX}update`,
    LogType: 'Tail',
    Payload: JSON.stringify({
      pathParameters,
      body: JSON.stringify(body),
    }),
  };
}

export function getAllInvokeUpdateParams(imagesWithAffectedPeople, mergedPerson, deletePeople) {
  return imagesWithAffectedPeople.map((image) => {
    const pathParameters = {
      id: image.id,
      username: image.username,
    };
    const body = {
      people: image.people.filter(p => !deletePeople.find(dp => dp.id === p))
        .concat((image.people.includes(mergedPerson.id) ? [] : [mergedPerson.id])),
    };
    return getInvokeUpdateParams(pathParameters, body);
  });
}

export async function updatedImages(imagesWithAffectedPeople, mergedPerson, deletePeople) {
  const allParams = getAllInvokeUpdateParams(imagesWithAffectedPeople, mergedPerson, deletePeople);
  return Promise.all(allParams.map(params => lambda.invoke(params).promise()));
}

export function getUpdatedPeople(existingPeople, mergedPerson, deletePeople) {
  return existingPeople.filter(p => !deletePeople.find(dp => dp.id === p.id))
    .map(person => (mergedPerson.id === person.id ?
      mergedPerson :
      person));
}

export function getLogFields({ existingPeople }) {
  return {
    peopleCount: safeLength(existingPeople),
  };
}

export async function mergePeople(event, context, callback) {
  const startTime = Date.now();
  const s3 = createS3Client();
  const bucket = process.env.S3_BUCKET;
  const key = PEOPLE_KEY;
  const data = event.body ? JSON.parse(event.body) : null;
  try {
    const existingPeople = await getExistingPeople(s3, bucket, key, context, startTime);
    const mergedPerson = mergePeopleObjects(data);
    const deletePeople = getDeletePeople(data, mergedPerson, existingPeople);
    const imagesWithAffectedPeople = await queryImagesByPeople(deletePeople, mergedPerson);
    const updatedImagesResponse =
      await updatedImages(imagesWithAffectedPeople, mergedPerson, deletePeople);
    const updatedPeople = getUpdatedPeople(existingPeople, mergedPerson, deletePeople);
    const putPeoplePromise = putPeople(s3, updatedPeople, bucket, key);
    logger(context, startTime, getLogFields({
      existingPeople,
      mergedPerson,
      deletePeople,
      imagesWithAffectedPeople,
      updatedImagesResponse,
      updatedPeople,
      putPeoplePromise,
    }));
    return callback(null, success(existingPeople));
  } catch (err) {
    logger(context, startTime, { err });
    return callback(null, failure(err));
  }
}
