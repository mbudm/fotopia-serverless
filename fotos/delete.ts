import * as uuid from "uuid";
import { safeLength } from "./create";
import { getDynamoDbParams, validateRequest } from "./get";
import { INVOCATION_REQUEST_RESPONSE } from "./lib/constants";
import dynamodb from "./lib/dynamodb";
import lambda from "./lib/lambda";
import logger from "./lib/logger";
import { failure, success } from "./lib/responses";
import createS3Client from "./lib/s3";
import {
  ILoggerBaseParams,
  ITraceMeta,
} from "./types";

export function getBodyFromDbGetResponse(dbGetResponse) {
  const payload = dbGetResponse && JSON.parse(dbGetResponse.Payload);
  return payload ? JSON.parse(payload.body) : {};
}
export function getS3Params(dbGetResponse) {
  const body = getBodyFromDbGetResponse(dbGetResponse);
  return {
    Bucket: process.env.S3_BUCKET,
    Key: body.img_key,
  };
}

export function getInvokeGetParams(request) {
  return {
    FunctionName: process.env.IS_OFFLINE ? "get" : `${process.env.LAMBDA_PREFIX}get`,
    InvocationType: INVOCATION_REQUEST_RESPONSE,
    LogType: "Tail",
    Payload: JSON.stringify({
      pathParameters: {
        ...request,
      },
    }),
  };
}

export function deleteObject(s3, s3Params) {
  return s3.deleteObject(s3Params).promise();
}

export function deleteImageRecord(ddbParams) {
  return dynamodb.delete(ddbParams).promise();
}

export function getLogFields(pathParams, dbGetResponse) {
  const body = getBodyFromDbGetResponse(dbGetResponse);
  return {
    imageBirthtime: body.birthtime,
    imageCreatedAt: body.createdAt,
    imageFacesCount: safeLength(body.faces),
    imageFamilyGroup: body.group,
    imageHeight: body.meta && body.meta.height,
    imageId: body.id,
    imageKey: body.img_key,
    imageTagCount: safeLength(body.tags),
    imageUpdatedAt: body.updatedAt,
    imageUserIdentityId: body.userIdentityId,
    imageUsername: body.username,
    imageWidth: body.meta && body.meta.width,
    paramId: pathParams.id,
    paramUsername: pathParams.username,
  };
}

export async function deleteItem(event, context, callback) {
  const startTime = Date.now();
  const s3 = createS3Client();
  const traceMeta: ITraceMeta | null = event.body ? JSON.parse(event.body) : null;
  const loggerBaseParams: ILoggerBaseParams = {
    Timestamp: startTime,
    id: uuid.v1(),
    name: "deleteItem",
    parentId: traceMeta && traceMeta!.parentId || "",
    traceId: traceMeta && traceMeta!.traceId || uuid.v1(),
  };
  try {
    const request = validateRequest(event.pathParameters);
    const params = getInvokeGetParams(request);
    const dbGetResponse = await lambda.invoke(params).promise();
    const s3Params = getS3Params(dbGetResponse);
    await deleteObject(s3, s3Params);
    const ddbParams = getDynamoDbParams(request);
    await deleteImageRecord(ddbParams);
    logger(context, loggerBaseParams, getLogFields(request, dbGetResponse));
    return callback(null, success(ddbParams.Key));
  } catch (err) {
    logger(context, loggerBaseParams, { err, ...getLogFields(event.pathParameters, null) });
    return callback(null, failure(err));
  }
}
