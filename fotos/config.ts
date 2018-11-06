import * as uuid from "uuid";
import { GetObjectError } from "./errors/getObject";
import logger from "./lib/logger";
import { failure, success } from "./lib/responses";
import createS3Client from "./lib/s3";
import {
  ILoggerBaseParams,
} from "./types";

export function getS3Params() {
  const Bucket: string | undefined = process.env.S3_OUTPUT_BUCKET;
  const Key: string | undefined = process.env.S3_OUTPUT_FILENAME;
  return {
    Bucket,
    Key,
  };
}

export function getConfigObject(s3) {
  const s3Params = getS3Params();
  return s3.getObject(s3Params).promise()
    .then((s3Object) => {
      try {
        return JSON.parse(s3Object.Body.toString());
      } catch (e) {
        throw new GetObjectError(e, s3Params.Key, s3Params.Bucket);
      }
    });
}

export function getLogParams(params) {
  const prefix = "config";
  return Object.keys(params)
    .reduce((result, key) => ({ ...result, [prefix + key]: params[key] }), {});
}

export async function getItem(event, context, callback) {
  const startTime = Date.now();
  const s3 = createS3Client();
  const loggerBaseParams: ILoggerBaseParams = {
    id: uuid.v1(),
    name: "getItem",
    parentId: "",
    startTime,
    traceId: uuid.v1(),
  };
  try {
    const s3Body = await getConfigObject(s3);
    logger(context, loggerBaseParams, getLogParams(s3Body));
    return callback(null, success(s3Body));
  } catch (err) {
    logger(context, loggerBaseParams, { err });
    return callback(null, failure(err));
  }
}
