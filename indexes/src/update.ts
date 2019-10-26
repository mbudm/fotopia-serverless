import * as uuid from "uuid";

import { APIGatewayProxyEvent, Callback, Context } from "aws-lambda";
import {
  DocumentClient as DocClient,
} from "aws-sdk/lib/dynamodb/document_client.d";
import getTableName from "./common/getTableName";
import { failure, success } from "./common/responses";
import validatePathParameters from "./common/validatePathParameters";

import dynamodb from "./lib/dynamodb";
import logger from "./lib/logger";
import {
  IIndex, IIndexRequestBody, ILoggerBaseParams, IPathParameters, ITraceMeta,
} from "./types";

export function getDynamoDbParams(pathParams: IPathParameters, body: IIndex): DocClient.UpdateItemInput {
  const timestamp = new Date().getTime();
  const validKeys =  Object.keys(body).filter((k) => body[k] !== undefined);
  const ExpressionAttributeNames = validKeys.reduce((accum, key) => ({
    ...accum,
    [`#${key}`]: key,
  }), {});

  const ExpressionAttributeValues = validKeys.reduce((accum, key) => ({
    ...accum,
    [`:${key}`]: body[key],
  }), {
    ":zero": 0,
    ":updatedAt": timestamp,
  });
  // =if_not_exists(counter, :zero)+:counter
  const updateKeyValues = validKeys.map((key) => `#${key} = if_not_exists(#${key},:zero) + :${key}`).join(", ");
  return {
    ExpressionAttributeNames,
    ExpressionAttributeValues,
    Key: pathParams,
    ReturnValues: "ALL_NEW",
    TableName: getTableName(),
    UpdateExpression: `SET ${updateKeyValues}, updatedAt = :updatedAt`,
  };
}

export function updateIndexRecord(ddbParams: DocClient.UpdateItemInput): Promise<DocClient.UpdateItemOutput> {
  return dynamodb.update(ddbParams).promise();
}

export function getLogFields(
  data: IIndex, pathParams?: IPathParameters, ddbResponse?: DocClient.UpdateItemOutput,
) {
  const Attributes = ddbResponse && ddbResponse.Attributes;
  return {
    dataRaw: data,
    indexUpdateCount: data && Object.keys(data).length,
    paramId: pathParams && pathParams.id,
  };
}

export async function putItem(event: APIGatewayProxyEvent, context: Context, callback: Callback): Promise<void> {
  const startTime: number = Date.now();
  const requestBody: IIndexRequestBody = event.body ? JSON.parse(event.body) : null;
  const traceMeta: ITraceMeta | undefined = requestBody!.traceMeta;

  const loggerBaseParams: ILoggerBaseParams = {
    id: uuid.v1(),
    name: "updateItem",
    parentId: traceMeta && traceMeta!.parentId || "",
    startTime,
    traceId: traceMeta && traceMeta!.traceId || uuid.v1(),
  };
  try {
    const requestParams: IPathParameters = validatePathParameters(event.pathParameters);
    const ddbParams: DocClient.UpdateItemInput = getDynamoDbParams(requestParams, requestBody.index);
    const ddbResponse: DocClient.UpdateItemOutput  = await updateIndexRecord(ddbParams);
    logger(context, loggerBaseParams, getLogFields(requestBody.index, requestParams, ddbResponse));
    return callback(null, success(ddbResponse.Attributes));
  } catch (err) {
    const logFields = event.pathParameters ? getLogFields(requestBody.index, {
      id: event.pathParameters.id,
    }) : getLogFields(requestBody.index);
    logger(context, loggerBaseParams, { err, logFields });
    return callback(null, failure(err));
  }
}
