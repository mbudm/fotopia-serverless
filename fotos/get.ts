import * as uuid from "uuid";
import { safeLength } from "./create";
import dynamodb from "./lib/dynamodb";
import logger from "./lib/logger";
import { failure, success } from "./lib/responses";
import {
  ILoggerBaseParams,
  ITraceMeta,
} from "./types";

export function validateRequest(pathParameters) {
  return pathParameters;
}

export function getDynamoDbParams(request) {
  return {
    Key: {
      id: request.id,
      username: request.username,
    },
    TableName: process.env.DYNAMODB_TABLE,
  };
}

export function getResponseBody(ddbResponse, request) {
  return ddbResponse.Item || `No item found for ${request.username} & ${request.id}`;
}

export function getImageRecord(ddbParams) {
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
    name: "getItem",
    parentId: traceMeta && traceMeta!.parentId,
    spanId: uuid.v1(),
    timestamp: startTime,
    traceId: traceMeta && traceMeta!.traceId || uuid.v1(),
  };
  try {
    const request = validateRequest(event.pathParameters);
    const ddbParams = getDynamoDbParams(request);
    const ddbResponse = await getImageRecord(ddbParams);
    const responseBody = getResponseBody(ddbResponse, request);
    logger(context, loggerBaseParams, getLogFields(request, responseBody));
    return callback(null, success(responseBody));
  } catch (err) {
    logger(context, loggerBaseParams, { err, ...getLogFields(event.pathParameters, null) });
    return callback(null, failure(err));
  }
}
