import {
  Callback,
  Context,
  S3Event,
  S3EventRecord,
} from "aws-lambda";
import { S3 } from "aws-sdk";
import { InvocationRequest } from "aws-sdk/clients/lambda";
import { GetObjectOutput } from "aws-sdk/clients/s3";
import * as ExifReader from "exifreader";
import * as querystring from "querystring";
import { v4 as uuidv4 } from "uuid";

import getS3Bucket from "./common/getS3Bucket";
import { getTraceMeta } from "./common/getTraceMeta";
import { failure, success } from "./common/responses";
import { safeLength } from "./create";
import { GetObjectError } from "./errors/getObject";
import { INVOCATION_EVENT } from "./lib/constants";
import lambda from "./lib/lambda";
import logger from "./lib/logger";
import createS3Client from "./lib/s3";
import {
  ICreateBody, ILoggerBaseParams, ITraceMeta,
} from "./types";

let s3: S3;

export function getObject(key): Promise<GetObjectOutput> {
  return s3.getObject({
    Bucket: getS3Bucket(),
    Key: key,
  }).promise()
    .catch((e) => {
      throw new GetObjectError(e, key, process.env.S3_BUCKET);
    });
}

export function getKeyFromRecord(record: S3EventRecord) {
  return querystring.unescape(record.s3.object.key);
}

export function parseUserIdentityIdFromKey(key: string) {
  return key.split("/")[1];
}

export function parseUsernameFromKey(key: string) {
  return key.split("/")[2];
}

export function getBasicKey(authKey: string) {
  return authKey.split("/").slice(2).join("/");
}

export function getMeta(imageMetaData) {

  const birthtimeDateTag = imageMetaData.DateCreated ||
    imageMetaData.DateTimeOriginal ||
    imageMetaData.CreateDate ||
    imageMetaData["Date Created"];
  const birthtimeDate = birthtimeDateTag ?
   new Date(birthtimeDateTag.value) :
   new Date();
  const orientation = imageMetaData.Orientation ? imageMetaData.Orientation.value : 1 ;

  const height = imageMetaData["Image Height"] && imageMetaData["Image Height"].value as unknown as number || 0;
  const widthTag = imageMetaData["Image Width"] || imageMetaData.ImageLength || imageMetaData.ImageWidth;
  const width = widthTag && widthTag.value as unknown as number || 0;

  const city = imageMetaData.City && imageMetaData.City.value;
  const country = imageMetaData.Country && imageMetaData.Country.value;
  const countryCode = imageMetaData.CountryCode && imageMetaData.CountryCode.value;

  return {
    birthtime: birthtimeDate.getTime(),
    city,
    country,
    countryCode,
    height,
    orientation,
    width,
  };
}

export async function getImageBody(record: S3EventRecord): Promise<ICreateBody> {
  // tslint:disable-next-line:variable-name
  const key = getKeyFromRecord(record);
  const userIdentityId = parseUserIdentityIdFromKey(key);
  const username = parseUsernameFromKey(key);
  const s3Object = await getObject(key);
  const imageMetaData = ExifReader.load(s3Object.Body as Buffer);
  const meta = getMeta(imageMetaData);

  return {
    birthtime: meta.birthtime,
    img_key: getBasicKey(key),
    meta: {
      ...meta,
      raw: imageMetaData, // for testing until exif variations are known
    },
    userIdentityId,
    username,
  };
}

export function getInvokeCreateRequest(
  imageBody: ICreateBody,
  traceMeta: ITraceMeta,
): InvocationRequest {
  const bodyWithMeta: ICreateBody = {
    ...imageBody,
    traceMeta,
  };
  return {
    FunctionName: `${process.env.LAMBDA_PREFIX}create`,
    InvocationType: INVOCATION_EVENT,
    LogType: "Tail",
    Payload: JSON.stringify({
      body: JSON.stringify(bodyWithMeta),
    }),
  };
}

export async function getInvocations(records: S3EventRecord[], traceMeta) {
  return Promise.all(records.map(async (record) => {
    const imageBody = await getImageBody(record);
    return getInvokeCreateRequest(imageBody, traceMeta);
  }));
}

export function invokeLambdas(invocations) {
  return Promise.all(invocations.map((invocation) => lambda.invoke(invocation).promise()));
}

export function getLogFields(records: S3EventRecord[], invocations?) {
  return {
    invocationsCount: safeLength(invocations),
    invocationsRaw: JSON.stringify(invocations),
    recordsCount: safeLength(records),
    recordsRaw: JSON.stringify(records),
  };
}

export async function handler(event: S3Event, context: Context, callback: Callback) {
  const startTime: number = Date.now();
  const loggerBaseParams: ILoggerBaseParams = {
    id: uuidv4(),
    name: "fotoEvents",
    parentId: "",
    startTime,
    traceId: uuidv4(),
  };
  const traceMeta = getTraceMeta(loggerBaseParams);
  s3 = createS3Client();
  try {
    const invocations = await getInvocations(event.Records, traceMeta);
    invokeLambdas(invocations);
    logger(context, loggerBaseParams, getLogFields(event.Records, invocations ));
    return callback(null, success(true));
  } catch (err) {
    logger(context, loggerBaseParams, { err, ...getLogFields(event.Records) });
    return callback(null, failure(err));
  }
}
