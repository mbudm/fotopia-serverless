
import * as Sharp from "sharp";
import * as uuid from "uuid";

import { failure, success } from "./common/responses";
import { replicateAuthKey, safeLength } from "./create";
import { GetObjectError } from "./errors/getObject";
import { PutObjectError} from "./errors/putObject";
import logger from "./lib/logger";
import createS3Client from "./lib/s3";
import { validatePut } from "./thumbs";

import { EXIF_ORIENT } from "./lib/constants";
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

export function getDimsFromBounds(bounds, correctedImageDimensions) {
  return {
    height: (bounds.bottom - bounds.top) * correctedImageDimensions.height,
    left: bounds.left * correctedImageDimensions.width,
    top: bounds.top * correctedImageDimensions.height,
    width: (bounds.right - bounds.left) * correctedImageDimensions.width,
  };
}

export function expandAndSqareUpDims(dims, person, correctedImageDimensions) {
  // expand x3 if we are using landmarks and square up
  const factor = Array.isArray(person.landMarks) ? 3 : 1;
  const maxDim = Math.max(dims.width, dims.height);
  const expandedDim =  Math.round(maxDim * factor);
  const idealDims = {
    height: Math.min(expandedDim, correctedImageDimensions.height),
    left: Math.max(0, Math.round(dims.left - (expandedDim - dims.width) / 2)),
    top: Math.max(0, Math.round(dims.top - (expandedDim - dims.height) / 2)),
    width: Math.min(expandedDim, correctedImageDimensions.width),
  };
  return {
    ...idealDims,
    height: Math.min(idealDims.height, correctedImageDimensions.height - idealDims.top),
    width: Math.min(idealDims.width, correctedImageDimensions.width - idealDims.left),
  };
}

export function guessOrientation(imageDims) {
  return imageDims.width < imageDims.height ?
    EXIF_ORIENT.TOP_LEFT :
    EXIF_ORIENT.LEFT_TOP;
}

export function getCorrectImageDimension(imageDimensions, metadata) {
  const validImageDims = hasValidDimensions(metadata) && metadata ||
    hasValidDimensions(imageDimensions) && imageDimensions;
  const orientation = metadata.orientation || guessOrientation(validImageDims);
  return orientation === EXIF_ORIENT.TOP_LEFT ||
  orientation === EXIF_ORIENT.TOP_RIGHT ||
  orientation === EXIF_ORIENT.BOTTOM_LEFT ||
  orientation === EXIF_ORIENT.BOTTOM_RIGHT ?
  {
    height: validImageDims.height,
    width: validImageDims.width,
  } :
  {
    height: validImageDims.width,
    width: validImageDims.height,
  };
}

export function getDims(person, metadata) {
  let dims = {
    height: 200,
    left: 0,
    top: 0,
    width: 200,
  };
  const imageDimensions = getCorrectImageDimension(person.imageDimensions, metadata);
  if (imageDimensions) {
    const bounds = getBounds(person);
    dims = getDimsFromBounds(bounds, imageDimensions);
    dims = expandAndSqareUpDims(dims, person, imageDimensions);
  }
  return dims;
}

export function crop(dims, s3Object) {
  return Sharp(s3Object.Body)
    .rotate()
    .extract(dims)
    .toBuffer();
}

export function cropAndUpload(person, dims, s3Object) {
  return crop(dims, s3Object)
    .then((buffer) => putObject({
      buffer, key: replicateAuthKey(person.thumbnail, person.userIdentityId),
    }));
}

export function getMetadata(s3Object) {
  const sharpImage = Sharp(s3Object.Body);
  return sharpImage.metadata();
}

export function getLogFields(data: IPerson, dims, metadata) {
  return {
    imageHeight: data!.imageDimensions!.height ?
      data.imageDimensions.height :
      metadata && metadata.height,
    imageKey: data && data.img_key,
    imageMetaDataRaw: metadata && JSON.stringify(metadata),
    imageOrientation: metadata && metadata.orientation,
    imageUserIdentityId: data && data.userIdentityId,
    imageWidth: data!.imageDimensions!.width ?
      data.imageDimensions.width :
      metadata && metadata.width,
    personBoundsHeight: data && data.boundingBox && data.boundingBox.Height,
    personBoundsLeft: data && data.boundingBox && data.boundingBox.Left,
    personBoundsTop: data && data.boundingBox && data.boundingBox.Top,
    personBoundsWidth: data && data.boundingBox && data.boundingBox.Width,
    personFacesCount: data && safeLength(data.faces),
    personId: data && data.id,
    personName: data && data.name,
    personThumbHeight: dims && dims.height,
    personThumbLeft: dims && dims.left,
    personThumbTop: dims && dims.top,
    personThumbWidth: dims && dims.width,
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
    const metadata = await getMetadata(s3Object);
    const dims = getDims(person, metadata);
    await cropAndUpload(person, dims, s3Object);
    logger(context, loggerBaseParams, getLogFields(person, dims, metadata));
    return callback(null, success(dims));
  } catch (err) {
    const dims = getDims(person, EXIF_ORIENT.TOP_LEFT);
    logger(context, loggerBaseParams, { err, ...getLogFields(person, dims, EXIF_ORIENT.TOP_LEFT) });
    return callback(null, failure(err));
  }
}
