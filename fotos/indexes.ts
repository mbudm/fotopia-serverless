
import * as uuid from "uuid";
import { INDEXES_KEY } from "./lib/constants";
import logger from "./lib/logger";
import { failure, success } from "./lib/responses";
import createS3Client from "./lib/s3";
import {
  ILoggerBaseParams,
} from "./types";

export function getS3Params() {
  const Bucket = process.env.S3_BUCKET;
  const Key = INDEXES_KEY;
  return {
    Bucket,
    Key,
  };
}

export function getZeroCount(indexObj) {
  return Object.keys(indexObj).filter((item) => +item <= 0).length;
}

export function getObject(s3, s3Params) {
  return s3.getObject(s3Params).promise();
}

export function getLogFields(indexesObj) {
  return {
    indexesPeopleCount: indexesObj && Object.keys(indexesObj.people).length,
    indexesTagCount: indexesObj && Object.keys(indexesObj.tags).length,
    indexesZeroPeopleCount: indexesObj && getZeroCount(indexesObj.people),
    indexesZeroTagCount: indexesObj && getZeroCount(indexesObj.people),
  };
}

export async function getItem(event, context, callback) {
  const startTime = Date.now();
  const s3 = createS3Client();
  const s3Params = getS3Params();
  const loggerBaseParams: ILoggerBaseParams = {
    Timestamp: startTime,
    id: uuid.v1(),
    name: "getItem",
    parentId: null,
    traceId: uuid.v1(),
  };
  try {
    const s3Object = await getObject(s3, s3Params);
    const indexesObject = JSON.parse(s3Object.Body.toString());
    logger(context, loggerBaseParams, getLogFields(indexesObject));
    return callback(null, success(indexesObject));
  } catch (err) {
    logger(context, loggerBaseParams, { err });
    return callback(null, failure(err));
  }
}
