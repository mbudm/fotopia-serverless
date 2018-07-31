
import Sharp from 'sharp';
import Joi from 'joi';
import createS3Client from './lib/s3';
import { success, failure } from './lib/responses';
import logger from './lib/logger';
import { requestSchema, putSchema } from './joi/thumbs';

let s3;

export const THUMB_WIDTH = 200;
export const THUMB_HEIGHT = 200;

export function validateRequest(data) {
  const result = Joi.validate(data, requestSchema);
  if (result.error !== null) {
    throw result.error;
  } else {
    return data;
  }
}

export function validatePut({
  buffer, key,
}) {
  const data = {
    Body: buffer,
    Bucket: process.env.S3_BUCKET,
    ContentType: 'image/jpg',
    Key: key,
  };
  const result = Joi.validate(data, putSchema);
  if (result.error !== null) {
    throw result.error;
  } else {
    return data;
  }
}

export function getObject(Key) {
  console.log('getObject', Key, process.env.S3_BUCKET);
  return s3.getObject({
    Bucket: process.env.S3_BUCKET,
    Key,
  }).promise();
}

export function putObject(params) {
  const data = validatePut(params);
  return s3.putObject(data).promise();
}

export function resize({ data }) {
  return Sharp(data.Body)
    .resize(THUMB_WIDTH, THUMB_HEIGHT)
    .crop(Sharp.strategy.entropy)
    .toFormat('png')
    .toBuffer();
}

export function resizeAndUpload({
  data, key,
}) {
  return resize({ data })
    .then(buffer => putObject({
      buffer, key,
    }));
}

export async function createThumb(event, context, callback) {
  const startTime = Date.now();
  const data = JSON.parse(event.body);
  s3 = createS3Client();
  try {
    const request = validateRequest(data);
    const objData = await getObject(request.key);
    const result = await resizeAndUpload({ data: objData, key: request.thumbKey });
    logger(context, startTime, { ...data });
    return callback(null, success(result));
  } catch (err) {
    logger(context, startTime, { err, ...data });
    return callback(null, failure(err));
  }
}
