
import Sharp from 'sharp';
import Joi from 'joi';
import createS3Client from './lib/s3';
import { success, failure } from './lib/responses';
import logger from './lib/logger';
import { validatePut } from './thumbs';
import { personSchema } from './joi/stream';
import { safeLength, replicateAuthKey } from './create';
import { GetObjectError, PutObjectError } from './errors/s3';

let s3;

export function validateRequest(data) {
  const result = Joi.validate(data, personSchema);
  if (result.error !== null) {
    throw result.error;
  } else {
    return data;
  }
}

export function getObject(request) {
  const key = replicateAuthKey(request.img_key, request.userIdentityId);
  return s3.getObject({
    Bucket: process.env.S3_BUCKET,
    Key: key,
  }).promise()
    .catch((e) => {
      throw new GetObjectError(e, key, process.env.S3_BUCKET);
    });
}

export function putObject(params) {
  const data = validatePut(params);
  return s3.putObject(data).promise()
    .catch((e) => {
      throw new PutObjectError(e, params.Key, params.Body);
    });
}

function hasDimensions(person) {
  return person.boundingBox && person.imageDimensions;
}

export function crop(person, s3Object) {
  const width = hasDimensions(person) ?
    Math.round(person.boundingBox.Width * person.imageDimensions.width) :
    200;
  const height = hasDimensions(person) ?
    Math.round(person.boundingBox.Height * person.imageDimensions.height) :
    200;
  const top = hasDimensions(person) ?
    Math.round(person.boundingBox.Top * person.imageDimensions.height) :
    100;
  const left = hasDimensions(person) ?
    Math.round(person.boundingBox.Left * person.imageDimensions.width) :
    100;
  console.log(`resizing ${person.thumbnail} from ${person.imageDimensions.width}/${person.imageDimensions.height}
   to ${width}/${height}. not using top/left of ${top}/${left}.`);
  return Sharp(s3Object.Body)
    .extract({
      left, top, width, height,
    })
    .toBuffer();
}

export function cropAndUpload(request, s3Object) {
  return crop(request, s3Object)
    .then(buffer => putObject({
      buffer, key: replicateAuthKey(request.thumbnail, request.userIdentityId),
    }));
}

export function getLogFields(data) {
  return {
    imageKey: data && data.img_key,
    imageUserIdentityId: data && data.userIdentityId,
    personThumbnail: data && data.thumbnail,
    personId: data && data.id,
    personName: data && data.name,
    personThumbWidth: data && data.boundingBox && data.boundingBox.Width,
    personThumbHeight: data && data.boundingBox && data.boundingBox.Height,
    personFacesCount: data && safeLength(data.faces),
  };
}

export async function createThumb(event, context, callback) {
  const startTime = Date.now();
  const data = JSON.parse(event.body);
  s3 = createS3Client();
  try {
    const request = validateRequest(data);
    const s3Object = await getObject(request);
    const result = await cropAndUpload(request, s3Object);
    logger(context, startTime, getLogFields(data));
    return callback(null, success(result));
  } catch (err) {
    logger(context, startTime, { err, ...getLogFields(data) });
    return callback(null, failure(err));
  }
}
