import { APIGatewayProxyEvent, Callback, Context } from "aws-lambda";
import * as uuid from "uuid";
import { failure, success } from "./common/responses";
import { safeLength } from "./create";
import dynamodb from "./lib/dynamodb";
import logger from "./lib/logger";
import {
  IImage,
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

export function getDynamoDbParams(request: IPathParameters): DocClient.GetItemInput {
  return {
    Key: {
      id: request.id,
      username: request.username,
    },
    TableName: getTableName(),
  };
}

export function getResponseBody(ddbResponse: DocClient.GetItemOutput): IImage {
  const item: IImage = ddbResponse.Item as IImage;
  return item;
}

export function getImageRecord(
  ddbParams: DocClient.GetItemInput,
): Promise<PromiseResult<DocClient.GetItemOutput, AWSError>> {
  return dynamodb.get(ddbParams).promise();
}

export function getLogFields(pathParams?: IPathParameters, responseBody?: IImage) {
  return {
    imageBirthtime: responseBody && responseBody.birthtime,
    imageCreatedAt: responseBody && responseBody.createdAt,
    imageFaceMatchCount: responseBody && safeLength(responseBody.faceMatches),
    imageFacesCount: responseBody && safeLength(responseBody.faces),
    imageFamilyGroup: responseBody && responseBody.group,
    imageHeight: responseBody && responseBody.meta && responseBody.meta.height,
    imageId: responseBody && responseBody.id,
    imageKey: responseBody && responseBody.img_key,
    imagePeopleCount: responseBody && safeLength(responseBody.people),
    imageTagCount: responseBody && safeLength(responseBody.tags),
    imageUpdatedAt: responseBody && responseBody.updatedAt,
    imageUserIdentityId: responseBody && responseBody.userIdentityId,
    imageUsername: responseBody && responseBody.username,
    imageWidth: responseBody && responseBody.meta && responseBody.meta.width,
    paramId: pathParams && pathParams.id,
    paramUsername: pathParams && pathParams.username,
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
    const responseBody: IImage = getResponseBody(ddbResponse);
    logger(context, loggerBaseParams, getLogFields(request, responseBody));
    return callback(null, success(responseBody));
  } catch (err) {
    const logFields = event.pathParameters ? getLogFields({
      id: event.pathParameters.id,
      username: event.pathParameters.username,
    }) : getLogFields();
    logger(context, loggerBaseParams, { err, ...logFields });
    return callback(null, failure(err));
  }
}
