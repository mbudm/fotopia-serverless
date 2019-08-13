import * as uuid from "uuid";
import { getExistingPeople } from "./common/getExistingPeople";
import { putPeople } from "./common/putPeople";
import { failure, success } from "./common/responses";
import { safeLength } from "./create";
import { PEOPLE_KEY } from "./lib/constants";
import logger from "./lib/logger";
import createS3Client from "./lib/s3";
import {
  ILoggerBaseParams, IPerson,
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
    id: uuid.v1(),
    name: "getItem",
    parentId: "",
    startTime,
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

export async function putItem(event, context, callback) {
  const startTime = Date.now();

  const requestBody = event.body ? JSON.parse(event.body) : null;
  const traceMeta = requestBody!.traceMeta;

  const s3 = createS3Client();
  const bucket = process.env.S3_BUCKET;
  const key = PEOPLE_KEY;

  const loggerBaseParams: ILoggerBaseParams = {
    id: uuid.v1(),
    name: "putItem",
    parentId: traceMeta && traceMeta!.parentId || "",
    startTime,
    traceId: traceMeta && traceMeta!.traceId || uuid.v1(),
  };

  try {
    logger(context, loggerBaseParams, getLogFields(requestBody));
    await putPeople(s3, requestBody.people, bucket, key);
    return callback(null, success(requestBody));
  } catch (err) {
    logger(context, loggerBaseParams, { err, ...getLogFields(requestBody)});
    return callback(null, failure(err));
  }
}
