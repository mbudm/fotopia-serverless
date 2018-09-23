
import createS3Client from './lib/s3';
import { success, failure } from './lib/responses';
import { PEOPLE_KEY } from './lib/constants';
import logger from './lib/logger';
import {
  putPeople,
  validatePeople,
  getExistingPeople,
} from './faces';
import { safeLength } from './create';

export function getUpdatedPeople(existingPeople, data, pathParams) {
  const updatedPeople = existingPeople.map(person => ({
    ...person,
    name: pathParams.id === person.id ? data.name : person.name,
  }));

  return validatePeople(updatedPeople);
}

export function getPersonFaces(people, personId) {
  const person = people.find(p => p.id === personId);
  return person && person.faces;
}

export function getLogFields(existingPeople, updatedPeople, pathParams) {
  return {
    peopleCount: safeLength(existingPeople),
    updatedPeopleCount: safeLength(updatedPeople),
    personId: pathParams.id,
    personFacesCount: safeLength(getPersonFaces(updatedPeople, pathParams.id)),
  };
}

export async function updatePerson(event, context, callback) {
  const startTime = Date.now();
  const s3 = createS3Client();
  const bucket = process.env.S3_BUCKET;
  const key = PEOPLE_KEY;
  const data = event.body ? JSON.parse(event.body) : null;
  const pathParams = event.pathParameters;
  try {
    const existingPeople = await getExistingPeople(s3, bucket, key, context, startTime);
    const updatedPeople = getUpdatedPeople(existingPeople, data, pathParams);
    const putPeopleResponse = await putPeople(s3, updatedPeople, bucket, key);
    logger(context, startTime, getLogFields(existingPeople, updatedPeople, pathParams));
    return callback(null, success({ putPeopleResponse, updatedPeople }));
  } catch (err) {
    logger(context, startTime, { err, data, pathParams });
    return callback(null, failure(err));
  }
}
