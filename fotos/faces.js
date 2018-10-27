import Joi from 'joi';
import { peopleSchema } from './joi/stream';


export function getS3Params(Bucket, Key) {
  return {
    Bucket,
    Key,
  };
}

export function getS3PutParams(indexData, Bucket, Key) {
  return {
    Body: JSON.stringify(indexData),
    Bucket,
    ContentType: 'application/json',
    Key,
  };
}

export function getExistingPeople(s3, Bucket, Key) {
  const s3Params = getS3Params(Bucket, Key);
  return s3.getObject(s3Params).promise()
    .then(s3Object => JSON.parse(s3Object.Body.toString()))
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


export function validatePeople(object) {
  const result = Joi.validate(object, peopleSchema);
  if (result.error !== null) {
    throw new Error(JSON.stringify(result));
  } else {
    return object;
  }
}
