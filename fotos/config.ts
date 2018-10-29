import logger from "./lib/logger";
import { failure, success } from "./lib/responses";
import createS3Client from "./lib/s3";

export function getS3Params() {
  const Bucket: string | undefined = process.env.S3_OUTPUT_BUCKET;
  const Key: string | undefined = process.env.S3_OUTPUT_FILENAME;
  return {
    Bucket,
    Key,
  };
}

export function getConfigObject(s3) {
  const s3Params = getS3Params();
  return s3.getObject(s3Params).promise()
    .then((s3Object) => {
      return JSON.parse(s3Object.Body.toString());
    });
}

export function getLogParams(params) {
  const prefix = "config";
  return Object.keys(params)
    .reduce((result, key) => ({ ...result, [prefix + key]: params[key] }), {});
}

export async function getItem(event, context, callback) {
  const startTime = Date.now();
  const s3 = createS3Client();
  try {
    const s3Object = await getConfigObject(s3);
    const parsedBuffer = JSON.parse(s3Object.Body.toString());
    logger(context, startTime, getLogParams(parsedBuffer));
    return callback(null, success(parsedBuffer));
  } catch (err) {
    logger(context, startTime, { err });
    return callback(null, failure(err));
  }
}
