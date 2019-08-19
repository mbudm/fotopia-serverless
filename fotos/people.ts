import { PutObjectOutput } from "aws-sdk/clients/s3";
import * as uuid from "uuid";
import { getS3Params } from "./common/getS3Params";
import { getS3PutParams } from "./common/getS3PutParams";
import { failure, success } from "./common/responses";
import { safeLength } from "./create";
import { JSONParseError } from "./errors/jsonParse";
import { PEOPLE_KEY } from "./lib/constants";
import logger from "./lib/logger";
import createS3Client from "./lib/s3";
import {
  ILoggerBaseParams, IPerson,
} from "./types";

export function putPeople(s3, people, Bucket, Key): Promise<PutObjectOutput> {
  const s3PutParams = getS3PutParams(people, Bucket, Key);
  return s3.putObject(s3PutParams).promise()
    .catch((e) => {
      const logitall = { e, people };
      throw new Error(JSON.stringify(logitall));
    });
}

export function getExistingPeople(s3, Bucket, Key): Promise<IPerson[]> {
  const s3Params = getS3Params(Bucket, Key);
  return s3.getObject(s3Params).promise()
    .then((s3Object) => {
      try {
        if (s3Object.Body) {
          const bodyString = s3Object.Body.toString();
          return bodyString ? JSON.parse(bodyString) : [];
        } else {
          return [];
        }
      } catch (e) {
        throw new JSONParseError(e, `getExistingPeople ${s3Object.Body.toString()}`);
      }
    })
    .catch((e) => {
      if (e.code === "NoSuchKey" || e.code === "AccessDenied") {
        // tslint:disable-next-line:no-console
        console.log("No object found / AccessDenied - assuming empty people list");
        return [];
      }
      // tslint:disable-next-line:no-console
      console.log("Another error with get people object", e);
      throw e;
    });
}

export function getLogFields(people: IPerson[]) {
  return {
    peopleCount: safeLength(people),
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

  const requestBody = event.body ? JSON.parse(event.body) : { people: []};
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
    const putPeopleObject: PutObjectOutput = await putPeople(s3, requestBody.people, bucket, key);
    logger(context, loggerBaseParams, getLogFields(requestBody.people));
    return callback(null, success(requestBody));
  } catch (err) {
    logger(context, loggerBaseParams, { err, ...getLogFields(requestBody.people)});
    return callback(null, failure(err));
  }
}
