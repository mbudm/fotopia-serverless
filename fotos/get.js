import Joi from 'joi';
import dynamodb from './lib/dynamodb';
import { success, failure } from './lib/responses';
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
      userid: request.userid,
      birthtime: request.birthtime * 1,
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
  return ddbResponse.Item || `No item found for ${request.userid} & ${request.birthtime}`;
}

export async function getItem(event, context, callback) {
  try {
    const request = validateRequest(event.pathParameters);
    const ddbParams = getDynamoDbParams(request);
    const ddbResponse = await dynamodb.get(ddbParams).promise();
    const responseBody = getResponseBody(ddbResponse);
    return callback(null, success(responseBody));
  } catch (err) {
    console.error(err, event.pathParameters);
    return callback(null, failure(err));
  }
}
