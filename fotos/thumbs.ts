
import Sharp from "sharp";
import { safeLength } from "./create";
import logger from "./lib/logger";
import { failure, success } from "./lib/responses";
import createS3Client from "./lib/s3";

let s3;

export const THUMB_WIDTH = 200;
export const THUMB_HEIGHT = 200;

export function validateRequest(data) {
  return data;
}

export function validatePut({
  buffer, key,
}) {
  return {
    Body: buffer,
    Bucket: process.env.S3_BUCKET,
    ContentType: "image/jpg",
    Key: key,
  };
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
    .toFormat("png")
    .toBuffer();
}

export function resizeAndUpload({
  data, key,
}) {
  return resize({ data })
    .then((buffer) => putObject({
      buffer, key,
    }));
}

export function getLogFields(data) {
  return {
    imageBirthtime: data.birthtime,
    imageCreatedAt: data.createdAt,
    imageFaceMatchCount: safeLength(data.faceMatches),
    imageFacesCount: safeLength(data.faces),
    imageFamilyGroup: data.group,
    imageHeight: data.meta && data.meta.height,
    imageId: data.id,
    imageKey: data.img_key,
    imagePeopleCount: safeLength(data.people),
    imageTagCount: safeLength(data.tags),
    imageUpdatedAt: data.updatedAt,
    imageUserIdentityId: data.userIdentityId,
    imageUsername: data.username,
    imageWidth: data.meta && data.meta.width,
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
