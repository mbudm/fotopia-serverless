import * as uuid from "uuid";

import { safeLength } from "./create";
import { validateRequest } from "./get";
import dynamodb from "./lib/dynamodb";
import logger from "./lib/logger";
import { failure, success } from "./lib/responses";
import {
  ILoggerBaseParams,
} from "./types";

export function validateBody(data) {
  return data;
}

export function getDynamoDbParams(pathParams, body) {
  const timestamp = new Date().getTime();
  const ExpressionAttributeNames = Object.keys(body).reduce((accum, key) => ({
    ...accum,
    [`#${key}`]: key,
  }), {});

  const ExpressionAttributeValues = Object.keys(body).reduce((accum, key) => ({
    ...accum,
    [`:${key}`]: body[key],
  }), {
    ":updatedAt": timestamp,
  });
  const updateKeyValues = Object.keys(body).map((key) => `#${key} = :${key}`).join(", ");
  return {
    ExpressionAttributeNames,
    ExpressionAttributeValues,
    Key: pathParams,
    ReturnValues: "ALL_NEW",
    TableName: process.env.DYNAMODB_TABLE,
    UpdateExpression: `SET ${updateKeyValues}, updatedAt = :updatedAt`,
  };
}

export function updateImageRecord(ddbParams) {
  return dynamodb.update(ddbParams).promise();
}

export function getLogFields(pathParams, data, ddbResponse) {
  const { Attributes } = ddbResponse;
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
    updateImageBirthtime: data.birthtime,
    updateImageFaceMatchCount: data && safeLength(data.faceMatches),
    updateImageFacesCount: data && safeLength(data.faces),
    updateImagePeopleCount: data && safeLength(data.people),
    updateImageTagCount: data && safeLength(data.tags),
  };
}

export async function updateItem(event, context, callback) {
  const startTime = Date.now();
  const data = event.body ? JSON.parse(event.body) : null;
  const traceMeta = data!.traceMeta;
  const pathParams = event.pathParameters;
  const loggerBaseParams: ILoggerBaseParams = {
    Timestamp: startTime,
    id: uuid.v1(),
    name: "updateItem",
    parentId: traceMeta && traceMeta!.parentId || "",
    traceId: traceMeta && traceMeta!.traceId || uuid.v1(),
  };
  try {
    const requestBody = validateBody(data);
    const requestParams = validateRequest(pathParams);
    const ddbParams = getDynamoDbParams(requestParams, requestBody);
    const ddbResponse = await updateImageRecord(ddbParams);
    logger(context, loggerBaseParams, getLogFields(pathParams, data, ddbResponse));
    return callback(null, success(ddbResponse.Attributes));
  } catch (err) {
    logger(context, loggerBaseParams, { err, ...getLogFields(pathParams, data, null) });
    return callback(null, failure(err));
  }
}
