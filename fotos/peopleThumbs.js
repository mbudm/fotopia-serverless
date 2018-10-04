
import Jimp from 'jimp';
import Joi from 'joi';
import createS3Client from './lib/s3';
import { success, failure } from './lib/responses';
import logger from './lib/logger';
import { validatePut } from './thumbs';
import { peopleSchema } from './joi/stream';
import { safeLength } from './create';

let s3;

export function validateRequest(data) {
  const result = Joi.validate(data, peopleSchema);
  if (result.error !== null) {
    throw result.error;
  } else {
    return data;
  }
}

export function getObjectsForRequestedPeople(request) {
  return Promise.all(request.map(person => s3.getObject({
    Bucket: process.env.S3_BUCKET,
    Key: person.img_key,
  }).promise()
    .then(objData => ({
      objData,
      person,
    }))));
}

export function putObject(params) {
  const data = validatePut(params);
  return s3.putObject(data).promise();
}

export function crop({ objData, person }) {
  const w = person.boundingBox.Width * person.imageDimensions.width;
  const h = person.boundingBox.Height * person.imageDimensions.height;
  const top = person.boundingBox.Top * person.imageDimensions.height;
  const left = person.boundingBox.Left * person.imageDimensions.width;
  return Jimp.read(objData.Body)
    .then(image => image
      .crop(top, left, w, h)
      .getBufferAsync(Jimp.MIME_PNG));
}

export function cropAndUpload(peopleWithObjects) {
  return Promise.all(peopleWithObjects.map(personObject => crop(personObject)
    .then(buffer => putObject({
      buffer, key: personObject.person.thumbnail,
    }))));
}

export function getLogFields(data) {
  return {
    peopleCount: safeLength(data),
  };
}

export async function createThumbs(event, context, callback) {
  const startTime = Date.now();
  const data = JSON.parse(event.body);
  s3 = createS3Client();
  try {
    const request = validateRequest(data);
    const peopleWithObjects = await getObjectsForRequestedPeople(request);
    const result = await cropAndUpload(peopleWithObjects);
    logger(context, startTime, getLogFields(data));
    return callback(null, success(result));
  } catch (err) {
    logger(context, startTime, { err, ...getLogFields(data) });
    return callback(null, failure(err));
  }
}
