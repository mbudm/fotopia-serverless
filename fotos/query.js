import Joi from 'joi';
import dynamodb from './lib/dynamodb';
import { success, failure } from './lib/responses';
import logger from './lib/logger';
import { requestSchema, ddbParamsSchema } from './joi/query';
import { safeLength } from './create';

export function validateRequest(data) {
  const result = Joi.validate(data, requestSchema);
  if (result.error !== null) {
    throw result.error;
  } else {
    return data;
  }
}

export const getUserDynamoDbParams = (data) => {
  const params = {
    TableName: process.env.DYNAMODB_TABLE,
    IndexName: 'UsernameBirthtimeIndex',
    ProjectionExpression: 'id, meta, people, tags, img_location, img_key, img_thumb_key',
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

export const getGroupDynamoDbParams = (data) => {
  const params = {
    TableName: process.env.DYNAMODB_TABLE,
    IndexName: 'GroupBirthtimeIndex',
    ProjectionExpression: '#group, #birthtime, username, userIdentityId, id, meta, people, tags, img_key, img_thumb_key',
    KeyConditionExpression: '#group = :group AND #birthtime BETWEEN :from AND :to',
    ExpressionAttributeNames: {
      '#group': 'group',
      '#birthtime': 'birthtime',
    },
    ExpressionAttributeValues: {
      ':group': process.env.FOTOPIA_GROUP,
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

export const getDynamoDbParams = (data) => {
  if (data.username) {
    return getUserDynamoDbParams(data);
  }
  return getGroupDynamoDbParams(data);
};
export const hasCriteria = (criteria = {}) =>
  Object.keys(criteria).every(key => Array.isArray(criteria[key])) &&
  Object.keys(criteria).some(key => criteria[key].length > 0);

export const filterByCriteria = (item, criteriaKey, criteriaData) =>
  criteriaData.some(criteriaDataItem => item[criteriaKey].includes(criteriaDataItem));

export const filterItemsByCriteria = (items, data) =>
  (hasCriteria(data.criteria) ?
    items.filter(item => item &&
      Object.keys(data.criteria).some(criteriaKey =>
        filterByCriteria(item, criteriaKey, data.criteria[criteriaKey]))) :
    items);


export function getResponseBody(ddbResponse, data) {
  const filteredItems = filterItemsByCriteria(ddbResponse.Items, data);
  return filteredItems.length > 0 ? filteredItems : 'No items found that match your criteria';
}

export function getLogFields(data, ddbResponse, responseBody) {
  return {
    queryFromDate: data.from,
    queryToDate: data.to,
    queryRawCount: ddbResponse && safeLength(ddbResponse.Items),
    queryFilteredCount: safeLength(responseBody),
    queryFiltersTagsCount: data.criteria && safeLength(data.criteria.tags),
    queryFiltersPeopleCount: data.criteria && safeLength(data.criteria.people),
  };
}

export async function queryItems(event, context, callback) {
  const startTime = Date.now();
  const data = JSON.parse(event.body);
  try {
    const request = validateRequest(data);
    const ddbParams = getDynamoDbParams(request);
    const ddbResponse = await dynamodb.query(ddbParams).promise();
    const responseBody = getResponseBody(ddbResponse, request);
    logger(context, startTime, getLogFields(data, ddbResponse, responseBody));
    return callback(null, success(responseBody));
  } catch (err) {
    logger(context, startTime, { err, ...getLogFields(data) });
    return callback(null, failure(err));
  }
}
