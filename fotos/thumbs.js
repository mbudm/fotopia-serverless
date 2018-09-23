
import Sharp from 'sharp';
import Joi from 'joi';
import createS3Client from './lib/s3';
import { success, failure } from './lib/responses';
import logger from './lib/logger';
import { requestSchema, putSchema } from './joi/thumbs';
import { safeLength } from './create';

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


export function getLogFields(data) {
  return {
    imageId: data.id,
    imageUsername: data.username,
    imageFamilyGroup: data.group,
    imagePeopleCount: safeLength(data.people),
    imageFaceMatchCount: safeLength(data.faceMatches),
    imageFacesCount: safeLength(data.faces),
    imageTagCount: safeLength(data.tags),
    imageKey: data.img_key,
    imageWidth: data.meta && data.meta.width,
    imageHeight: data.meta && data.meta.height,
    imageUserIdentityId: data.userIdentityId,
    imageBirthtime: data.birthtime,
    imageCreatedAt: data.createdAt,
    imageUpdatedAt: data.updatedAt,
  };
}

export async function createThumb(event, context, callback) {
  const startTime = Date.now();
  const data = JSON.parse(event.body);
  s3 = createS3Client();
  try {
    const request = validateRequest(data);
    const objData = await getObject(request.key);
    const result = await resizeAndUpload({ data: objData, key: request.thumbKey });
    logger(context, startTime, getLogFields(data));
    return callback(null, success(result));
  } catch (err) {
    logger(context, startTime, { err, ...getLogFields(data) });
    return callback(null, failure(err));
  }
}
