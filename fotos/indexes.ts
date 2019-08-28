
import { APIGatewayProxyEvent, Callback, Context } from "aws-lambda";
import { S3 } from "aws-sdk/clients/all";
import { GetObjectRequest, PutObjectOutput } from "aws-sdk/clients/s3";
import * as uuid from "uuid";
import getS3Bucket from "./common/getS3Bucket";
import { getS3PutParams } from "./common/getS3PutParams";
import { failure, success } from "./common/responses";
import { JSONParseError } from "./errors/jsonParse";
import { INDEXES_KEY } from "./lib/constants";
import logger from "./lib/logger";
import createS3Client from "./lib/s3";
import {
  IIndex, IIndexDictionary, ILoggerBaseParams, IPutIndexRequest, ITraceMeta,
} from "./types";

let s3: S3;

const defaultIndex: IIndex = {
  people: {},
  tags: {},
};

export function getS3Params(): GetObjectRequest {
  const Bucket = getS3Bucket();
  const Key = INDEXES_KEY;
  return {
    Bucket,
    Key,
  };
}

export function getZeroCount(indexObj: IIndexDictionary): number {
  return Object.keys(indexObj).filter((item) => indexObj[item] <= 0).length;
}

export function getObject(s3Params: GetObjectRequest): Promise<IIndex> {
  return s3.getObject(s3Params)
    .promise()
    .then((s3Object) => {
      try {
        if (s3Object.Body) {
          const bodyString = s3Object.Body.toString();
          return bodyString ? JSON.parse(bodyString) : defaultIndex;
        } else {
          return defaultIndex;
        }
      } catch (e) {
        throw new JSONParseError(e, `get indexes ${s3Object.Body && s3Object.Body.toString()}`);
      }
    })
    .catch((e) => {
      if (e.code === "NoSuchKey" || e.code === "AccessDenied") {
        // tslint:disable-next-line:no-console
        console.log("No object found / AccessDenied - assuming empty indexes");
        return defaultIndex;
      }
      // tslint:disable-next-line:no-console
      console.log("Another error with get indexes object", e);
      throw e;
    });
}

export function getLogFields(indexesObj: IIndex) {
  return {
    indexesPeopleCount: indexesObj && Object.keys(indexesObj.people).length,
    indexesTagCount: indexesObj && Object.keys(indexesObj.tags).length,
    indexesZeroPeopleCount: indexesObj && getZeroCount(indexesObj.people),
    indexesZeroTagCount: indexesObj && getZeroCount(indexesObj.tags),
  };
}

export async function getItem(event: APIGatewayProxyEvent, context: Context, callback: Callback): Promise<void> {
  const startTime: number = Date.now();
  s3 = createS3Client();
  const s3Params: GetObjectRequest = getS3Params();
  const eventBody = event.body ? JSON.parse(event.body) : null;
  const traceMeta: ITraceMeta | undefined = eventBody && eventBody.traceMeta;

  const loggerBaseParams: ILoggerBaseParams = {
    id: uuid.v1(),
    name: "getItem",
    parentId: traceMeta && traceMeta.parentId || "",
    startTime,
    traceId: traceMeta && traceMeta.traceId || uuid.v1(),
  };
  try {
    const indexesObject: IIndex = await getObject(s3Params);
    logger(context, loggerBaseParams, getLogFields(indexesObject));
    return callback(null, success(indexesObject));
  } catch (err) {
    logger(context, loggerBaseParams, { err });
    return callback(null, failure(err));
  }
}

export function putIndex(index: IIndex): Promise<PutObjectOutput> {
  const s3PutParams = getS3PutParams(index, INDEXES_KEY);
  return s3.putObject(s3PutParams).promise();
}

export function removeZeroCounts(index: IIndex): IIndex {
  const people: IIndexDictionary = Object.keys(index.people).reduce((accum, key) => {
    return index.people[key] > 0 ?
      {
        ...accum,
        [key]: index.people[key],
      } :
      accum;
  }, {} as IIndexDictionary);
  const tags: IIndexDictionary = Object.keys(index.tags).reduce((accum, key) => {
    return index.tags[key] > 0 ?
      {
        ...accum,
        [key]: index.tags[key],
      } :
      accum;
  }, {} as IIndexDictionary);
  return {
    people,
    tags,
  };
}

export async function putItem(event: APIGatewayProxyEvent, context: Context, callback: Callback): Promise<void> {
  const startTime: number = Date.now();

  const requestBody: IPutIndexRequest = event.body ? JSON.parse(event.body) : { index: defaultIndex};
  const traceMeta = requestBody!.traceMeta;

  s3 = createS3Client();

  const loggerBaseParams: ILoggerBaseParams = {
    id: uuid.v1(),
    name: "putItem",
    parentId: traceMeta && traceMeta!.parentId || "",
    startTime,
    traceId: traceMeta && traceMeta!.traceId || uuid.v1(),
  };

  try {
    const indexesClean = removeZeroCounts(requestBody.index);
    const putIndexObject: PutObjectOutput = await putIndex(requestBody.index);
    logger(context, loggerBaseParams, getLogFields(requestBody.index));
    return callback(null, success(requestBody));
  } catch (err) {
    logger(context, loggerBaseParams, { err, ...getLogFields(requestBody.index)});
    return callback(null, failure(err));
  }
}
