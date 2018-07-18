import Joi from 'joi';
import dynamodb from './lib/dynamodb';
import { success, failure } from './lib/responses';
import logger from './lib/logger';
import { requestSchema, ddbParamsSchema } from './joi/update';

export function validateRequest(data) {
  const result = Joi.validate(data, requestSchema);
  if (result.error !== null) {
    throw result.error;
  } else {
    return data;
  }
}

export function getDynamoDbParams(data) {
  const timestamp = new Date().getTime();
  const params = {
    TableName: process.env.DYNAMODB_TABLE,
    Key: {
      username: data.username,
      id: data.id,
    },
    ExpressionAttributeNames: {
      '#meta': 'meta',
      '#people': 'people',
      '#tags': 'tags',
      '#birthtime': 'birthtime',
    },
    ExpressionAttributeValues: {
      ':meta': data.meta,
      ':updatedAt': timestamp,
      ':tags': data.tags,
      ':people': data.people,
    },
    UpdateExpression: 'SET #birthtime = :birthtime, #meta = :meta, #people = :people, #tags = :tags, updatedAt = :updatedAt',
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
  const data = JSON.parse(event.body);
  try {
    const request = validateRequest(data);
    const ddbParams = getDynamoDbParams(request);
    await dynamodb.update(ddbParams).promise();
    logger(context, startTime, { ...data });
    return callback(null, success(ddbParams.Item));
  } catch (err) {
    logger(context, startTime, { err, ...data });
    return callback(null, failure(err));
  }
}
