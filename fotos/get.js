import Joi from 'joi';
import dynamodb from './lib/dynamodb';
import { success, failure } from './lib/responses';
import logger from './lib/logger';
import { requestSchema, ddbParamsSchema } from './joi/pathParams';
import { safeLength } from './create';

export function validateRequest(pathParameters) {
  const result = Joi.validate(pathParameters, requestSchema);
  if (result.error !== null) {
    throw result.error;
  } else {
    return pathParameters;
  }
}

export function getDynamoDbParams(request) {
  const params = {
    TableName: process.env.DYNAMODB_TABLE,
    Key: {
      username: request.username,
      id: request.id,
    },
  };
  const result = Joi.validate(params, ddbParamsSchema);
  if (result.error !== null) {
    throw result.error;
  } else {
    return params;
  }
}

export function getResponseBody(ddbResponse, request) {
  return ddbResponse.Item || `No item found for ${request.username} & ${request.id}`;
}


export function getLogFields(pathParams, responseBody) {
  return {
    paramUsername: pathParams && pathParams.username,
    paramId: pathParams && pathParams.id,
    imageId: responseBody && responseBody.id,
    imageUsername: responseBody && responseBody.username,
    imageFamilyGroup: responseBody && responseBody.group,
    imagePeopleCount: responseBody && safeLength(responseBody.people),
    imageFaceMatchCount: responseBody && safeLength(responseBody.faceMatches),
    imageFacesCount: responseBody && safeLength(responseBody.faces),
    imageTagCount: responseBody && safeLength(responseBody.tags),
    imageKey: responseBody && responseBody.img_key,
    imageWidth: responseBody && responseBody.meta.width,
    imageHeight: responseBody && responseBody.meta.height,
    imageUserIdentityId: responseBody && responseBody.userIdentityId,
    imageBirthtime: responseBody && responseBody.birthtime,
    imageCreatedAt: responseBody && responseBody.createdAt,
    imageUpdatedAt: responseBody && responseBody.updatedAt,
  };
}
export async function getItem(event, context, callback) {
  const startTime = Date.now();
  try {
    const request = validateRequest(event.pathParameters);
    const ddbParams = getDynamoDbParams(request);
    const ddbResponse = await dynamodb.get(ddbParams).promise();
    const responseBody = getResponseBody(ddbResponse, request);
    logger(context, startTime, getLogFields(request, responseBody));
    return callback(null, success(responseBody));
  } catch (err) {
    logger(context, startTime, { err, ...getLogFields(event.pathParameters) });
    return callback(null, failure(err));
  }
}
