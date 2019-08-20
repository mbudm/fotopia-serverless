
import * as uuid from "uuid";
import { failure, success } from "./common/responses";
import { JSONParseError } from "./errors/jsonParse";
import { INDEXES_KEY } from "./lib/constants";
import logger from "./lib/logger";
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
  return s3.getObject(s3Params)
    .promise()
    .then((s3Object) => {
      try {
        if (s3Object.Body) {
          const bodyString = s3Object.Body.toString();
          return bodyString ? JSON.parse(bodyString) : [];
        } else {
          return [];
        }
      } catch (e) {
        throw new JSONParseError(e, `get indexes ${s3Object.Body.toString()}`);
      }
    })
    .catch((e) => {
      if (e.code === "NoSuchKey" || e.code === "AccessDenied") {
        // tslint:disable-next-line:no-console
        console.log("No object found / AccessDenied - assuming empty indexes");
        return {
          people: [],
          tags: [],
        };
      }
      // tslint:disable-next-line:no-console
      console.log("Another error with get indexes object", e);
      throw e;
    });
}

export function getLogFields(indexesObj) {
  return {
    indexesPeopleCount: indexesObj && Object.keys(indexesObj.people).length,
    indexesTagCount: indexesObj && Object.keys(indexesObj.tags).length,
    indexesZeroPeopleCount: indexesObj && getZeroCount(indexesObj.people),
    indexesZeroTagCount: indexesObj && getZeroCount(indexesObj.tags),
  };
}

export async function getItem(event, context, callback) {
  const startTime = Date.now();
  const s3 = createS3Client();
  const s3Params = getS3Params();
  const loggerBaseParams: ILoggerBaseParams = {
    id: uuid.v1(),
    name: "getItem",
    parentId: "",
    startTime,
    traceId: uuid.v1(),
  };
  try {
    const indexesObject = await getObject(s3, s3Params);
    logger(context, loggerBaseParams, getLogFields(indexesObject));
    return callback(null, success(indexesObject));
  } catch (err) {
    logger(context, loggerBaseParams, { err });
    return callback(null, failure(err));
  }
}
