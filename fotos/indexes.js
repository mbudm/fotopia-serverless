
import createS3Client from './lib/s3';
import { success, failure } from './lib/responses';
import { INDEXES_KEY } from './lib/constants';
import logger from './lib/logger';

export function getS3Params() {
  const Bucket = process.env.S3_BUCKET;
  const Key = INDEXES_KEY;
  return {
    Bucket,
    Key,
  };
}

export function getZeroCount(indexObj) {
  return Object.keys(indexObj).filter(item => item <= 0).length;
}

export function getLogFields(indexesObj) {
  return {
    indexesTagCount: indexesObj && Object.keys(indexesObj.tags).length,
    indexesPeopleCount: indexesObj && Object.keys(indexesObj.people).length,
    indexesZeroTagCount: indexesObj && getZeroCount(indexesObj.people),
    indexesZeroPeopleCount: indexesObj && getZeroCount(indexesObj.people),
  };
}

export async function getItem(event, context, callback) {
  const startTime = Date.now();
  const s3 = createS3Client();
  const s3Params = getS3Params();
  try {
    const s3Object = await s3.getObject(s3Params).promise();
    const indexesObject = JSON.parse(s3Object.Body.toString());
    logger(context, startTime, getLogFields(indexesObject));
    return callback(null, success(indexesObject));
  } catch (err) {
    logger(context, startTime, { err });
    return callback(null, failure(err));
  }
}
