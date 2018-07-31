import Joi from 'joi';
import dynamodb from './lib/dynamodb';
import { success, failure } from './lib/responses';
import logger from './lib/logger';
import { requestSchema, ddbParamsSchema } from './joi/update';
import { validateRequest } from './get';

export function validateBody(data) {
  const result = Joi.validate(data, requestSchema);
  if (result.error !== null) {
    throw result.error;
  } else {
    return data;
  }
}

export function getDynamoDbParams(keys, body) {
  const timestamp = new Date().getTime();
  const ExpressionAttributeNames = Object.keys(body).reduce((accum, key) => ({
    ...accum,
    [`#${key}`]: key,
  }), {});

  const ExpressionAttributeValues = Object.keys(body).reduce((accum, key) => ({
    ...accum,
    [`:${key}`]: body[key],
  }), {
    ':updatedAt': timestamp,
  });
  const updateKeyValues = Object.keys(body).map(key => `#${key} = :${key}`).join(', ');
  const params = {
    TableName: process.env.DYNAMODB_TABLE,
    Key: keys,
    ExpressionAttributeNames,
    ExpressionAttributeValues,
    UpdateExpression: `SET ${updateKeyValues}, updatedAt = :updatedAt`,
    ReturnValues: 'ALL_NEW',
  };

  const result = Joi.validate(params, ddbParamsSchema);
  if (result.error !== null) {
    throw result.error;
  } else {
    return params;
  }
}

export async function updateItem(event, context, callback) {
  const startTime = Date.now();
  const data = event.body ? JSON.parse(event.body) : null;
  const pathParams = event.pathParameters;
  try {
    const requestBody = validateBody(data);
    const requestParams = validateRequest(pathParams);
    const ddbParams = getDynamoDbParams(requestParams, requestBody);
    const ddbResponse = await dynamodb.update(ddbParams).promise();
    logger(context, startTime, {
      ddbResponse,
    });
    return callback(null, success(ddbResponse.Attributes));
  } catch (err) {
    logger(context, startTime, { err, requestBodyType: typeof data, pathParams });
    return callback(null, failure(err));
  }
}
