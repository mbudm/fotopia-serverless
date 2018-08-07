
import createS3Client from './lib/s3';
import { success, failure } from './lib/responses';
import { PEOPLE_KEY } from './lib/constants';
import logger from './lib/logger';
import {
  putPeople,
  validatePeople,
  getExistingPeople,
} from './faces';

export function getS3Params() {
  const Bucket = process.env.S3_BUCKET;
  const Key = PEOPLE_KEY;
  return {
    Bucket,
    Key,
  };
}

export async function getItem(event, context, callback) {
  const startTime = Date.now();
  const s3 = createS3Client();
  const s3Params = getS3Params();
  try {
    const s3Object = await s3.getObject(s3Params).promise();
    const parsedBuffer = JSON.parse(s3Object.Body.toString());
    logger(context, startTime, { response: parsedBuffer });
    return callback(null, success(parsedBuffer));
  } catch (err) {
    logger(context, startTime, { err });
    return callback(null, failure(err));
  }
}

export function getUpdatedPeople(existingPeople, data, pathParams) {
  const updatedPeople = existingPeople.map(person => ({
    ...person,
    name: pathParams.id === person.id ? data.name : person.name,
  }));

  return validatePeople(updatedPeople);
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
    logger(context, startTime, {
      response: putPeopleResponse, data, pathParams, existingPeople, updatedPeople,
    });
    return callback(null, success({ putPeopleResponse, updatedPeople }));
  } catch (err) {
    logger(context, startTime, { err, data, pathParams });
    return callback(null, failure(err));
  }
}
