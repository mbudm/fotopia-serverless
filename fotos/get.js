import Joi from 'joi';
import dynamodb from './lib/dynamodb';
import { success, failure } from './lib/responses';
import logger from './lib/logger';
import { requestSchema, ddbParamsSchema } from './joi/pathParams';

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

export async function getItem(event, context, callback) {
  const startTime = Date.now();
  try {
    const request = validateRequest(event.pathParameters);
    const ddbParams = getDynamoDbParams(request);
    const ddbResponse = await dynamodb.get(ddbParams).promise();
    const responseBody = getResponseBody(ddbResponse, request);
    logger(context, startTime, { ...event.pathParameters, ...responseBody });
    return callback(null, success(responseBody));
  } catch (err) {
    logger(context, startTime, { err, ...event.pathParameters });
    return callback(null, failure(err));
  }
}
