import * as uuid from "uuid";

import { APIGatewayProxyEvent, Callback } from "aws-lambda";
import {
  DocumentClient as DocClient,
} from "aws-sdk/lib/dynamodb/document_client.d";
import { Context } from "vm";
import getTableName from "./common/getTableName";
import { failure, success } from "./common/responses";
import validatePathParameters from "./common/validatePathParameters";
import { safeLength } from "./create";
import dynamodb from "./lib/dynamodb";
import logger from "./lib/logger";
import {
  ILoggerBaseParams, IPathParameters, ITraceMeta, IUpdateBody,
} from "./types";

export function getDynamoDbParams(pathParams: IPathParameters, body: IUpdateBody): DocClient.UpdateItemInput {
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
    ":updatedAt": timestamp,
  });
  const updateKeyValues = validKeys.map((key) => `#${key} = :${key}`).join(", ");
  return {
    ExpressionAttributeNames,
    ExpressionAttributeValues,
    Key: pathParams,
    ReturnValues: "ALL_NEW",
    TableName: getTableName(),
    UpdateExpression: `SET ${updateKeyValues}, updatedAt = :updatedAt`,
  };
}

export function updateImageRecord(ddbParams: DocClient.UpdateItemInput): Promise<DocClient.UpdateItemOutput> {
  return dynamodb.update(ddbParams).promise();
}

export function getLogFields(
  data: IUpdateBody, pathParams?: IPathParameters, ddbResponse?: DocClient.UpdateItemOutput,
) {
  const Attributes = ddbResponse && ddbResponse.Attributes;
  return {
    dataRaw: data,
    imageBirthtime: Attributes && Attributes.birthtime,
    imageCreatedAt: Attributes && Attributes.createdAt,
    imageFaceMatchCount: Attributes && safeLength(Attributes.faceMatches),
    imageFacesCount: Attributes && safeLength(Attributes.faces),
    imageFamilyGroup: Attributes && Attributes.group,
    imageHeight: Attributes && Attributes.meta && Attributes.meta.height,
    imageId: (Attributes && Attributes.id) || (pathParams && pathParams.id),
    imageKey: Attributes && Attributes.img_key,
    imagePeopleCount: Attributes && safeLength(Attributes.people),
    imageTagCount: Attributes && safeLength(Attributes.tags),
    imageUpdatedAt: Attributes && Attributes.updatedAt,
    imageUserIdentityId: Attributes && Attributes.userIdentityId,
    imageUsername:
      (Attributes && Attributes.username) ||
      (pathParams && pathParams.username),
    imageWidth: Attributes && Attributes.meta && Attributes.meta.width,
    paramId: pathParams && pathParams.id,
    paramUsername: pathParams && pathParams.username,
    updateImageFaceMatchCount: data && safeLength(data.faceMatches),
    updateImagePeopleCount: data && safeLength(data.people),
  };
}

export async function updateItem(event: APIGatewayProxyEvent, context: Context, callback: Callback): Promise<void> {
  const startTime: number = Date.now();
  const requestBody: IUpdateBody = event.body ? JSON.parse(event.body) : null;
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
    const ddbParams: DocClient.UpdateItemInput = getDynamoDbParams(requestParams, requestBody);
    const ddbResponse: DocClient.UpdateItemOutput  = await updateImageRecord(ddbParams);
    logger(context, loggerBaseParams, getLogFields(requestBody, requestParams, ddbResponse));
    return callback(null, success(ddbResponse.Attributes));
  } catch (err) {
    const logFields = event.pathParameters ? getLogFields(requestBody, {
      id: event.pathParameters.id,
      username: event.pathParameters.username,
    }) : getLogFields(requestBody);
    logger(context, loggerBaseParams, { err, logFields });
    return callback(null, failure(err));
  }
}
