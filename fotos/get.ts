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

export function getDynamoDbParams(request): DocClient.GetItemInput {
  return {
    Key: {
      id: request.id,
      username: request.username,
    },
    TableName: process.env.DYNAMODB_TABLE!,
  };
}

export function getResponseBody(ddbResponse): IImage {
  const item: IImage = ddbResponse.Item as IImage;
  return item;
}

export function getImageRecord(
  ddbParams: DocClient.GetItemInput,
): Promise<PromiseResult<DocClient.GetItemOutput, AWSError>> {
  return dynamodb.get(ddbParams).promise();
}

export function getLogFields(pathParams, responseBody) {
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
export async function getItem(event, context, callback) {
  const startTime = Date.now();
  const traceMeta: ITraceMeta | null = event.body ? JSON.parse(event.body) : null;
  const loggerBaseParams: ILoggerBaseParams = {
    id: uuid.v1(),
    name: "getItem",
    parentId: traceMeta && traceMeta!.parentId || "",
    startTime,
    traceId: traceMeta && traceMeta!.traceId || uuid.v1(),
  };
  try {
    const request: IPathParameters = event.pathParameters;
    const ddbParams = getDynamoDbParams(request);
    const ddbResponse = await getImageRecord(ddbParams);
    const responseBody = getResponseBody(ddbResponse);
    logger(context, loggerBaseParams, getLogFields(request, responseBody));
    return callback(null, success(responseBody));
  } catch (err) {
    logger(context, loggerBaseParams, { err, ...getLogFields(event.pathParameters, null) });
    return callback(null, failure(err));
  }
}
