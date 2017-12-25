import Joi from 'joi';
import dynamodb from './lib/dynamodb';
import { success, failure } from './lib/responses';
import { requestSchema, ddbParamsSchema } from './joi/update';

export function validateRequest(requestBody) {
  const data = JSON.parse(requestBody);
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
      userid: data.userid,
      birthtime: data.birthtime * 1,
    },
    ExpressionAttributeNames: {
      '#meta': 'meta',
      '#people': 'people',
      '#tags': 'tags',
    },
    ExpressionAttributeValues: {
      ':meta': data.meta,
      ':updatedAt': timestamp,
      ':tags': data.tags,
      ':people': data.people,
    },
    UpdateExpression: 'SET #meta = :meta, #people = :people, #tags = :tags, updatedAt = :updatedAt',
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
  try {
    const request = validateRequest(event.body);
    const ddbParams = getDynamoDbParams(request);
    await dynamodb.update(ddbParams).promise();
    return callback(null, success(ddbParams.Item));
  } catch (err) {
    return callback(null, failure(err));
  }
}
