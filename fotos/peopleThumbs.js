
import Jimp from 'jimp';
import Joi from 'joi';
import createS3Client from './lib/s3';
import { success, failure } from './lib/responses';
import logger from './lib/logger';
import { validatePut } from './thumbs';
import { peopleSchema } from './joi/stream';
import { safeLength } from './create';
import { GetObjectError, PutObjectError } from './errors/s3';

let s3;

export function validateRequest(data) {
  const result = Joi.validate(data, peopleSchema);
  if (result.error !== null) {
    throw result.error;
  } else {
    return data;
  }
}

export function getObject(request) {
  const key = request[0].img_key;
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

export function crop(s3Object, person) {
  const w = person.boundingBox.Width * person.imageDimensions.width;
  const h = person.boundingBox.Height * person.imageDimensions.height;
  const top = person.boundingBox.Top * person.imageDimensions.height;
  const left = person.boundingBox.Left * person.imageDimensions.width;
  return Jimp.read(s3Object.Body)
    .then(image => image
      .crop(top, left, w, h)
      .getBufferAsync(Jimp.MIME_PNG));
}

export function cropAndUpload(request, s3Object) {
  return Promise.all(request.map(person => crop(person, s3Object)
    .then(buffer => putObject({
      buffer, key: person.thumbnail,
    }))));
}

export function getLogFields(data) {
  return {
    peopleCount: safeLength(data),
    imageKey: data && data[0].img_key,
    personThumbnail: data && data[0].thumbnail,
  };
}

export async function createThumbs(event, context, callback) {
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
