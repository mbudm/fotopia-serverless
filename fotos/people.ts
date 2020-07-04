import { APIGatewayProxyEvent, Callback, Context } from "aws-lambda";
import { S3 } from "aws-sdk/clients/all";
import { GetObjectRequest, PutObjectOutput, PutObjectRequest } from "aws-sdk/clients/s3";
import * as uuid from "uuid";
import getS3BucketGenerated from "./common/getS3BucketGenerated";
import { getS3Params } from "./common/getS3Params";
import { getS3PutParams } from "./common/getS3PutParams";
import { failure, success } from "./common/responses";
import { safeLength } from "./create";
import { JSONParseError } from "./errors/jsonParse";
import { PEOPLE_KEY } from "./lib/constants";
import logger from "./lib/logger";
import createS3Client from "./lib/s3";
import {
  ILoggerBaseParams, IPerson, IPutPeopleRequest,
} from "./types";

export function putPeople(s3: S3, people: IPerson[]): Promise<PutObjectOutput> {
  const key: string = PEOPLE_KEY;
  const s3PutParams: PutObjectRequest = getS3PutParams(people, key);
  return s3.putObject(s3PutParams).promise()
    .catch((e) => {
      const logitall = { e, people };
      throw new Error(JSON.stringify(logitall));
    });
}

export function getExistingPeople(s3: S3): Promise<IPerson[]> {
  const bucket = getS3BucketGenerated();
  const key = PEOPLE_KEY;
  const s3Params: GetObjectRequest = getS3Params(bucket, key);
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
        throw new JSONParseError(e, `getExistingPeople ${s3Object.Body && s3Object.Body.toString()}`);
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
export async function getItem(event: APIGatewayProxyEvent, context: Context, callback: Callback): Promise<void> {
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
    const existingPeople = await getExistingPeople(s3);
    logger(context, loggerBaseParams, getLogFields(existingPeople));
    return callback(null, success(existingPeople));
  } catch (err) {
    logger(context, loggerBaseParams, { err });
    return callback(null, failure(err));
  }
}

export async function putItem(event: APIGatewayProxyEvent, context: Context, callback: Callback): Promise<void> {
  const startTime: number = Date.now();

  const requestBody: IPutPeopleRequest = event.body ? JSON.parse(event.body) : { people: []};
  const traceMeta = requestBody!.traceMeta;

  const s3: S3 = createS3Client();

  const loggerBaseParams: ILoggerBaseParams = {
    id: uuid.v1(),
    name: "putItem",
    parentId: traceMeta && traceMeta!.parentId || "",
    startTime,
    traceId: traceMeta && traceMeta!.traceId || uuid.v1(),
  };

  try {
    await putPeople(s3, requestBody.people);
    logger(context, loggerBaseParams, getLogFields(requestBody.people));
    return callback(null, success(requestBody));
  } catch (err) {
    logger(context, loggerBaseParams, { err, ...getLogFields(requestBody.people)});
    return callback(null, failure(err));
  }
}
