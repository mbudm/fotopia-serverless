import { APIGatewayProxyEvent, Callback, Context } from "aws-lambda";
import * as uuid from "uuid";
import { failure, success } from "./common/responses";
import dynamodb from "./lib/dynamodb";
import logger from "./lib/logger";
import {
  IIndex,
  ILoggerBaseParams,
  ITraceMeta,
} from "./types";

import {
  DocumentClient as DocClient,
} from "aws-sdk/lib/dynamodb/document_client.d";
import {
  AWSError,
} from "aws-sdk/lib/error";
import {
  PromiseResult,
} from "aws-sdk/lib/request";
import getTableName from "./common/getTableName";

const TAGS_ID = "tags";
const PEOPLE_ID = "people";

export function getDynamoDbParams(
  id: string,
): DocClient.PutItemInput {
  const timestamp: number = new Date().getTime();
  return {
    Item: {
      createdAt: timestamp,
      id,
    },
    TableName: getTableName(),
  };
}

export function getResponseBody(ddbResponse: DocClient.GetItemOutput): IIndex {
  const item: IIndex = ddbResponse.Item as IIndex;
  return item;
}

export function putIndexRecord(
  ddbParams: DocClient.PutItemInput,
): Promise<PromiseResult<DocClient.PutItemOutput, AWSError>> {
  return dynamodb.put(ddbParams).promise();
}

export async function init(event: APIGatewayProxyEvent, context: Context, callback: Callback): Promise<void> {
  const startTime: number = Date.now();
  const traceMeta: ITraceMeta | null = event.body ? JSON.parse(event.body) : null;
  const loggerBaseParams: ILoggerBaseParams = {
    id: uuid.v1(),
    name: "getItem",
    parentId: traceMeta && traceMeta!.parentId || "",
    startTime,
    traceId: traceMeta && traceMeta!.traceId || uuid.v1(),
  };
  try {
    const tagsDdbParams: DocClient.PutItemInput = getDynamoDbParams(TAGS_ID);
    const tagsDdbResponse: DocClient.PutItemOutput = await putIndexRecord(tagsDdbParams);
    const tagsResponseBody: IIndex = getResponseBody(tagsDdbResponse);
    logger(context, loggerBaseParams, {});
    return callback(null, success(tagsResponseBody));
  } catch (err) {
    logger(context, loggerBaseParams, { err });
    return callback(null, failure(err));
  }
}
