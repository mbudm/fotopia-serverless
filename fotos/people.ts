import * as uuid from "uuid";
import { safeLength } from "./create";
import { getExistingPeople } from "./faces";
import { PEOPLE_KEY } from "./lib/constants";
import logger from "./lib/logger";
import { failure, success } from "./lib/responses";
import createS3Client from "./lib/s3";
import {
  ILoggerBaseParams,
} from "./types";

export function getLogFields(existingPeople) {
  return {
    peopleCount: safeLength(existingPeople),
  };
}
export async function getItem(event, context, callback) {
  const startTime = Date.now();
  const s3 = createS3Client();
  const bucket = process.env.S3_BUCKET;
  const key = PEOPLE_KEY;
  const loggerBaseParams: ILoggerBaseParams = {
    Timestamp: startTime,
    id: uuid.v1(),
    name: "getItem",
    parentId: "",
    traceId: uuid.v1(),
  };
  try {
    const existingPeople = await getExistingPeople(s3, bucket, key);
    logger(context, loggerBaseParams, getLogFields(existingPeople));
    return callback(null, success(existingPeople));
  } catch (err) {
    logger(context, loggerBaseParams, { err });
    return callback(null, failure(err));
  }
}
