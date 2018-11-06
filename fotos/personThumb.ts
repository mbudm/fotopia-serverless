
import * as Sharp from "sharp";
import * as uuid from "uuid";

import { replicateAuthKey, safeLength } from "./create";
import { GetObjectError } from "./errors/getObject";
import { PutObjectError} from "./errors/putObject";
import logger from "./lib/logger";
import { failure, success } from "./lib/responses";
import createS3Client from "./lib/s3";
import { validatePut } from "./thumbs";

import {
  ILoggerBaseParams,
  IPerson,
} from "./types";

let s3;

export function validateRequest(data) {
  return data;
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
  // tslint:disable-next-line:no-console
  console.log(`resizing ${person.thumbnail} from ${person.imageDimensions.width}/${person.imageDimensions.height}
   to ${width}/${height}. not using top/left of ${top}/${left}.`);
  return Sharp(s3Object.Body)
    .extract({
      height, left, top, width,
    })
    .toBuffer();
}

export function cropAndUpload(request, s3Object) {
  return crop(request, s3Object)
    .then((buffer) => putObject({
      buffer, key: replicateAuthKey(request.thumbnail, request.userIdentityId),
    }));
}

export function getLogFields(data: IPerson) {
  return {
    imageHeight: data && data.imageDimensions && data.imageDimensions.height,
    imageKey: data && data.img_key,
    imageUserIdentityId: data && data.userIdentityId,
    imageWidth: data && data.imageDimensions && data.imageDimensions.width,
    personFacesCount: data && safeLength(data.faces),
    personId: data && data.id,
    personName: data && data.name,
    personThumbHeight: data && data.boundingBox && data.boundingBox.Height,
    personThumbLeft: data && data.boundingBox && data.boundingBox.Left,
    personThumbTop: data && data.boundingBox && data.boundingBox.Top,
    personThumbWidth: data && data.boundingBox && data.boundingBox.Width,
    personThumbnail: data && data.thumbnail,
  };
}

export async function createThumb(event, context, callback) {
  const startTime = Date.now();
  const data = JSON.parse(event.body);
  const traceMeta = data!.traceMeta;
  s3 = createS3Client();
  const loggerBaseParams: ILoggerBaseParams = {
    Timestamp: startTime,
    id: uuid.v1(),
    name: "createThumb",
    parentId: traceMeta && traceMeta!.parentId,
    traceId: traceMeta && traceMeta!.traceId || uuid.v1(),
  };
  const person: IPerson = data.person;
  try {
    const s3Object = await getObject(person);
    const result = await cropAndUpload(person, s3Object);
    logger(context, loggerBaseParams, getLogFields(person));
    return callback(null, success(result));
  } catch (err) {
    logger(context, loggerBaseParams, { err, ...getLogFields(person) });
    return callback(null, failure(err));
  }
}
