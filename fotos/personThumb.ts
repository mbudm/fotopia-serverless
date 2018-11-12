
import * as Sharp from "sharp";
import * as uuid from "uuid";

import { replicateAuthKey, safeLength } from "./create";
import { GetObjectError } from "./errors/getObject";
import { PutObjectError} from "./errors/putObject";
import logger from "./lib/logger";
import { failure, success } from "./lib/responses";
import createS3Client from "./lib/s3";
import { validatePut } from "./thumbs";

import { createPersonThumbKey } from "./faces";
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

function hasValidDimensions(dims) {
  return dims && !Number.isNaN(dims.width * dims.height);
}

export function getBounds(person) {
  const bounds = {
    bottom: 0,
    left: 1,
    right: 0,
    top: 1,
  };
  if (Array.isArray(person.landMarks)) {
    person.landMarks.forEach((landmark) => {
      if (landmark.X < bounds.left) {
        bounds.left = landmark.X;
      }
      if (landmark.Y < bounds.top) {
        bounds.top = landmark.Y;
      }
      if (landmark.X > bounds.right) {
        bounds.right = landmark.X;
      }
      if (landmark.Y > bounds.bottom) {
        bounds.bottom = landmark.Y;
      }
    });
  } else if (person.boundingBox ) {
    bounds.bottom = Math.min(1, person.boundingBox.Top + person.boundingBox.Height);
    bounds.top = Math.max(0, person.boundingBox.Top);
    bounds.left = Math.max(0, person.boundingBox.Left);
    bounds.right = Math.min(1, person.boundingBox.Left + person.boundingBox.Width);
  }
  return bounds;
}

export function getDimsFromBounds(bounds, person) {
  return {
    height: (bounds.bottom - bounds.top) * person.imageDimensions.height,
    left: bounds.left * person.imageDimensions.width,
    top: bounds.top * person.imageDimensions.height,
    width: (bounds.right - bounds.left) * person.imageDimensions.width,
  };
}

export function expandAndSqareUpDims(dims, person) {
  // expand 10% and square up
  const maxDim = Math.max(dims.width, dims.height);
  const expandedDim =  Math.round(maxDim * 1.1);
  return {
    height: Math.min(expandedDim, person.imageDimensions.height),
    left: Math.max(0, Math.round(dims.left - (expandedDim - dims.width) / 2)),
    top: Math.max(0, Math.round(dims.top - (expandedDim - dims.height) / 2)),
    width: Math.min(expandedDim, person.imageDimensions.width),
  };
}

export function getDims(person) {
  let dims = {
    height: 200,
    left: 0,
    top: 0,
    width: 200,
  };

  if (hasValidDimensions(person.imageDimensions)) {
    const bounds = getBounds(person);
    dims = getDimsFromBounds(bounds, person);
    dims = expandAndSqareUpDims(dims, person);
  }
  return dims;
}

export function crop(dims, s3Object) {
  return Sharp(s3Object.Body)
    .extract(dims)
    .toBuffer();
}

export function cropAndUpload(person, dims, s3Object) {
  return crop(dims, s3Object)
    .then((buffer) => putObject({
      buffer, key: replicateAuthKey(person.thumbnail, person.userIdentityId),
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
    id: uuid.v1(),
    name: "createThumb",
    parentId: traceMeta && traceMeta!.parentId || "",
    startTime,
    traceId: traceMeta && traceMeta!.traceId || uuid.v1(),
  };
  const person: IPerson = data.person;
  try {
    const s3Object = await getObject(person);
    const dims = getDims(person);
    const result = await cropAndUpload(person, dims, s3Object);
    logger(context, loggerBaseParams, getLogFields(person));
    return callback(null, success(result));
  } catch (err) {
    logger(context, loggerBaseParams, { err, ...getLogFields(person) });
    return callback(null, failure(err));
  }
}
