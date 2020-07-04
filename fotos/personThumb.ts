
import * as Sharp from "sharp";
import * as uuid from "uuid";

import { failure, success } from "./common/responses";
import { safeLength } from "./create";
import { GetObjectError } from "./errors/getObject";
import { PutObjectError} from "./errors/putObject";
import logger from "./lib/logger";
import createS3Client from "./lib/s3";
import { getPutObjectParams } from "./thumbs";

import { APIGatewayProxyEvent, Callback, Context } from "aws-lambda";
import { Rekognition, S3 } from "aws-sdk";
import { GetObjectOutput, PutObjectOutput } from "aws-sdk/clients/s3";
import getS3Bucket from "./common/getS3Bucket";
import { EXIF_ORIENT } from "./lib/constants";
import {
  IBounds,
  IFaceDimensions,
  IImageDimensions,
  ILoggerBaseParams,
  IPerson,
  IPutObjectParams,
} from "./types";

let s3: S3;

export function getObject(request: IPerson): Promise<GetObjectOutput> {
  const key: string = request.img_key;
  return s3.getObject({
    Bucket: getS3Bucket(),
    Key: key,
  }).promise()
    .catch((e) => {
      throw new GetObjectError(e, key, process.env.S3_BUCKET);
    });
}

export function putObject(params: IPutObjectParams) {
  const data = getPutObjectParams(params);
  return s3.putObject(data).promise()
    .catch((e) => {
      throw new PutObjectError(e, data.Key, data.Body);
    });
}

function getValidImageDimensions(dimsArr: [Sharp.Metadata, IImageDimensions]): IImageDimensions {
  const firstValidDims: IImageDimensions | Sharp.Metadata | undefined = dimsArr.find(
    (dims) => dims && dims.width && dims.height && !Number.isNaN(dims.width * dims.height),
  );
  if (firstValidDims) {
    return firstValidDims as IImageDimensions;
  } else {
    throw new Error(`No valid w/h dimensions found in: ${JSON.stringify(dimsArr)}`);
  }
}

export function getBounds(person: IPerson): IBounds {
  const bounds: IBounds = {
    bottom: 0,
    left: 1,
    right: 0,
    top: 1,
  };
  if (person.landMarks && Array.isArray(person.landMarks)) {
    person.landMarks!.forEach((landmark: Rekognition.Landmark) => {
      if (landmark.X && landmark.X < bounds.left) {
        bounds.left = landmark.X;
      }
      if (landmark.Y && landmark.Y < bounds.top) {
        bounds.top = landmark.Y;
      }
      if (landmark.X  && landmark.X > bounds.right) {
        bounds.right = landmark.X;
      }
      if (landmark.Y && landmark.Y > bounds.bottom) {
        bounds.bottom = landmark.Y;
      }
    });
  } else if (person.boundingBox) {
    if (
      person.boundingBox.Top !== undefined &&
      person.boundingBox.Height !== undefined &&
      person.boundingBox.Left !== undefined &&
      person.boundingBox.Width !== undefined
    ) {
      bounds.bottom = Math.min(1, person.boundingBox.Top + person.boundingBox.Height);
      bounds.top = Math.max(0, person.boundingBox.Top);
      bounds.left = Math.max(0, person.boundingBox.Left);
      bounds.right = Math.min(1, person.boundingBox.Left + person.boundingBox.Width);
    } else {
      throw new Error(
        `Failed to calculate a bounding box because of invalid value(s) ${JSON.stringify(person.boundingBox)}`,
      );
    }

  }
  return bounds;
}

export function getDimsFromBounds(bounds: IBounds, correctedImageDimensions: IImageDimensions): IFaceDimensions {
  return {
    height: (bounds.bottom - bounds.top) * correctedImageDimensions.height,
    left: bounds.left * correctedImageDimensions.width,
    top: bounds.top * correctedImageDimensions.height,
    width: (bounds.right - bounds.left) * correctedImageDimensions.width,
  };
}

export function expandAndSqareUpDims(
  dims: IFaceDimensions, person: IPerson, correctedImageDimensions: IImageDimensions,
): IFaceDimensions {
  // expand x3 if we are using landmarks and square up
  const factor: number = Array.isArray(person.landMarks) ? 3 : 1;
  const maxDim: number = Math.max(dims.width, dims.height);
  const expandedDim: number =  Math.round(maxDim * factor);
  const idealDims: IFaceDimensions = {
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

export function getCorrectImageDimension(
  imageDimensions: IImageDimensions, metadata: Sharp.Metadata,
): IImageDimensions {
  const validImageDims: IImageDimensions = getValidImageDimensions([metadata, imageDimensions]);
  const orientation: number = (metadata && metadata.orientation as number) || EXIF_ORIENT.TOP_LEFT;
  return (
    orientation === EXIF_ORIENT.TOP_LEFT ||
    orientation === EXIF_ORIENT.TOP_RIGHT ||
    orientation === EXIF_ORIENT.BOTTOM_LEFT ||
    orientation === EXIF_ORIENT.BOTTOM_RIGHT
  ) ?
  {
    height: validImageDims.height,
    width: validImageDims.width,
  } :
  {
    height: validImageDims.width,
    width: validImageDims.height,
  };
}

export function getDims(person: IPerson, metadata: Sharp.Metadata): IFaceDimensions {
  let dims: IFaceDimensions = {
    height: 200,
    left: 0,
    top: 0,
    width: 200,
  };
  const imageDimensions: IImageDimensions = getCorrectImageDimension(person.imageDimensions, metadata);
  if (imageDimensions) {
    const bounds: IBounds = getBounds(person);
    dims = getDimsFromBounds(bounds, imageDimensions);
    dims = expandAndSqareUpDims(dims, person, imageDimensions);
  }
  return dims;
}

export function crop(dims: IFaceDimensions, s3Object: GetObjectOutput): Promise<Buffer> {
  const region: Sharp.Region = dims as Sharp.Region;
  return Sharp(s3Object.Body as Buffer)
    .rotate()
    .extract(region)
    .toBuffer();
}

export function cropAndUpload(
  person: IPerson, dims: IFaceDimensions, s3Object: GetObjectOutput,
): Promise<PutObjectOutput> {
  return crop(dims, s3Object)
    .then((buffer) => putObject({
      buffer, key: person.thumbnail,
    }));
}

export function getMetadata(s3Object: GetObjectOutput): Promise<Sharp.Metadata> {
  const sharpImage = Sharp(s3Object.Body as Buffer);
  return sharpImage.metadata();
}

export function getLogFields(data: IPerson, dims?: IFaceDimensions, metadata?: Sharp.Metadata) {
  return {
    imageHeight: data!.imageDimensions!.height ?
      data.imageDimensions.height :
      metadata && metadata.height,
    imageKey: data && data.img_key,
    imageOrientation: (metadata && metadata.orientation) || "unknown",
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

export async function createThumb(event: APIGatewayProxyEvent, context: Context, callback: Callback): Promise<void> {
  const startTime = Date.now();
  const data = event.body && JSON.parse(event.body);
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
    const metadata: Sharp.Metadata = await getMetadata(s3Object);
    const dims = getDims(person, metadata);
    await cropAndUpload(person, dims, s3Object);
    logger(context, loggerBaseParams, getLogFields(person, dims, metadata));
    return callback(null, success(dims));
  } catch (err) {
    logger(context, loggerBaseParams, { err, ...getLogFields(person) });
    return callback(null, failure(err));
  }
}
