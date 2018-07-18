import logger from './lib/logger';
import createS3Client from './lib/s3';
import { success, failure } from './lib/responses';

export function getS3Params() {
  const Bucket = process.env.S3_OUTPUT_BUCKET;
  const Key = process.env.S3_OUTPUT_FILENAME;
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
    logger(context, startTime, { ...s3Params });
    return callback(null, success(parsedBuffer));
  } catch (err) {
    logger(context, startTime, { err });
    return callback(null, failure(err));
  }
}
