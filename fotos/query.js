import Joi from 'joi';
import dynamodb from './lib/dynamodb';
import { success, failure } from './lib/responses';
import { requestSchema, ddbParamsSchema } from './joi/query';

export function validateRequest(requestBody) {
  const data = JSON.parse(requestBody);
  const result = Joi.validate(data, requestSchema);
  if (result.error !== null) {
    throw result.error;
  } else {
    return data;
  }
}

export const getDynamoDbParams = (data) => {
  const params = {
    TableName: process.env.DYNAMODB_TABLE,
    KeyConditionExpression: '#username = :username AND #birthtime BETWEEN :from AND :to',
    ExpressionAttributeNames: {
      '#username': 'username',
      '#birthtime': 'birthtime',
    },
    ExpressionAttributeValues: {
      ':username': data.username,
      ':from': new Date(data.from).getTime(),
      ':to': new Date(data.to).getTime(),
    },
  };
  const result = Joi.validate(params, ddbParamsSchema);
  if (result.error !== null) {
    throw result.error;
  } else {
    return params;
  }
};

export const filterByCriteria = (item, criteriaKey, criteriaData) =>
  criteriaData.length === 0 ||
  criteriaData.some(criteriaDataItem => item[criteriaKey].includes(criteriaDataItem));

export const filterItemsByCriteria = (items, data) =>
  items.filter(item =>
    Object.keys(data.criteria).some(criteriaKey =>
      filterByCriteria(item, criteriaKey, data.criteria[criteriaKey])));


export function getResponseBody(ddbResponse, data) {
  const filteredItems = filterItemsByCriteria(ddbResponse.Items, data);
  return filteredItems.length > 0 ? filteredItems : 'No items found that match your criteria';
}

export async function queryItems(event, context, callback) {
  try {
    const request = validateRequest(event.body);
    const ddbParams = getDynamoDbParams(request);
    const ddbResponse = await dynamodb.query(ddbParams).promise();
    const responseBody = getResponseBody(ddbResponse, request);
    return callback(null, success(responseBody));
  } catch (err) {
    return callback(null, failure(err));
  }
}

