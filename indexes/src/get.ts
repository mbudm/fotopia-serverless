import { APIGatewayProxyEvent, Callback, Context } from "aws-lambda";
import * as uuid from "uuid";
import { failure, success } from "./common/responses";
import dynamodb from "./lib/dynamodb";
import logger from "./lib/logger";
import {
  IIndex,
  ILoggerBaseParams,
  IPathParameters,
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
import validatePathParameters from "./common/validatePathParameters";

export function getDynamoDbParams(request: IPathParameters | null ): DocClient.GetItemInput {
  if (request === null ) {
    throw new Error("No path parameters provided");
  } else {
    return {
      Key: {
        id: request.id,
      },
      TableName: getTableName(),
    };
  }
}

export function getResponseBody(ddbResponse: DocClient.GetItemOutput): IIndex {
  const item: IIndex = ddbResponse.Item as IIndex;
  return item;
}

export function getImageRecord(
  ddbParams: DocClient.GetItemInput,
): Promise<PromiseResult<DocClient.GetItemOutput, AWSError>> {
  return dynamodb.get(ddbParams).promise();
}

export function getLogFields(pathParams?: IPathParameters, responseBody?: IIndex) {
  return {
    indexCount: responseBody && Object.keys(responseBody).length,
    paramId: pathParams && pathParams.id,
  };
}
export async function getItem(event: APIGatewayProxyEvent, context: Context, callback: Callback): Promise<void> {
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
    const request: IPathParameters = validatePathParameters(event.pathParameters);
    const ddbParams: DocClient.GetItemInput = getDynamoDbParams(request);
    const ddbResponse: DocClient.GetItemOutput = await getImageRecord(ddbParams);
    const responseBody: IIndex = getResponseBody(ddbResponse);
    logger(context, loggerBaseParams, getLogFields(request, responseBody));
    return callback(null, success(responseBody));
  } catch (err) {
    const logFields = event.pathParameters ? getLogFields({
      id: event.pathParameters.id,
    }) : getLogFields();
    logger(context, loggerBaseParams, { err, ...logFields });
    return callback(null, failure(err));
  }
}
