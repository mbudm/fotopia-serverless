
import uuid from 'uuid';
import Joi from 'joi';
import dynamodb from './lib/dynamodb';
import { success, failure } from './lib/responses';
import { requestSchema, ddbParamsSchema } from './joi/create';


export function validateRequest(requestBody) {
  const data = JSON.parse(requestBody);
  const result = Joi.validate(data, requestSchema);
  if (result.error !== null) {
    throw result.error;
  } else {
    return data;
  }
}

export function getDynamoDbParams(data, id) {
  const timestamp = new Date().getTime();
  const params = {
    TableName: process.env.DYNAMODB_TABLE,
    Item: {
      username: data.username,
      id,
      birthtime: new Date(data.birthtime).getTime(),
      tags: data.tags,
      people: data.people, // for rekognition categorisation
      location: data.location, // s3 object (image) url
      key: data.key, // s3 object key
      meta: data.meta, // whatever metadata we've got for this item
      createdAt: timestamp,
      updatedAt: timestamp,
    },
  };

  const result = Joi.validate(params, ddbParamsSchema);
  if (result.error !== null) {
    throw result.error;
  } else {
    return params;
  }
}

export async function createItem(event, context, callback) {
  const id = uuid.v1();
  console.log('create', event.body);
  try {
    const request = validateRequest(event.body);
    const ddbParams = getDynamoDbParams(request, id);
    await dynamodb.put(ddbParams).promise();
    console.log('Created Item', JSON.stringify(ddbParams.Item));
    return callback(null, success(ddbParams.Item));
  } catch (err) {
    return callback(null, failure(err));
  }
}

