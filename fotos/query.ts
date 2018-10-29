import { safeLength } from "./create";
import dynamodb from "./lib/dynamodb";
import logger from "./lib/logger";
import { failure, success } from "./lib/responses";

export function validateRequest(data) {
 return data;
}

export const getUserDynamoDbParams = (data) => {
  const params = {
    ExpressionAttributeNames: {
      "#birthtime": "birthtime",
      "#username": "username",
    },
    ExpressionAttributeValues: {
      ":from": new Date(data.from).getTime(),
      ":to": new Date(data.to).getTime(),
      ":username": data.username,
    },
    IndexName: "UsernameBirthtimeIndex",
    KeyConditionExpression: "#username = :username AND #birthtime BETWEEN :from AND :to",
    ProjectionExpression: "id, meta, people, tags, img_location, img_key, img_thumb_key",
    TableName: process.env.DYNAMODB_TABLE,
  };
  return params;
};

export const getGroupDynamoDbParams = (data) => {
  const params = {
    ExpressionAttributeNames: {
      "#birthtime": "birthtime",
      "#group": "group",
    },
    ExpressionAttributeValues: {
      ":from": new Date(data.from).getTime(),
      ":group": process.env.FOTOPIA_GROUP,
      ":to": new Date(data.to).getTime(),
    },
    IndexName: "GroupBirthtimeIndex",
    KeyConditionExpression: "#group = :group AND #birthtime BETWEEN :from AND :to",
    // tslint:disable-next-line:max-line-length
    ProjectionExpression: "#group, #birthtime, username, userIdentityId, id, meta, people, tags, img_key, img_thumb_key",
    TableName: process.env.DYNAMODB_TABLE,
  };
  return params;
};

export const getDynamoDbParams = (data) => {
  if (data.username) {
    return getUserDynamoDbParams(data);
  }
  return getGroupDynamoDbParams(data);
};
export const hasCriteria = (criteria = {}) =>
  Object.keys(criteria).every((key) => Array.isArray(criteria[key])) &&
  Object.keys(criteria).some((key) => criteria[key].length > 0);

export const filterByCriteria = (item, criteriaKey, criteriaData) =>
  criteriaData.some((criteriaDataItem) => item[criteriaKey].includes(criteriaDataItem));

export const filterItemsByCriteria = (items, data) =>
  (hasCriteria(data.criteria) ?
    items.filter((item) => item &&
      Object.keys(data.criteria).some((criteriaKey) =>
        filterByCriteria(item, criteriaKey, data.criteria[criteriaKey]))) :
    items);

export function getResponseBody(ddbResponse, data) {
  const filteredItems = filterItemsByCriteria(ddbResponse.Items, data);
  return filteredItems.length > 0 ? filteredItems : "No items found that match your criteria";
}

export function queryDatabase(ddbParams) {
  return dynamodb.query(ddbParams).promise();
}

export function getLogFields(data, ddbResponse, responseBody) {
  return {
    queryFilteredCount: safeLength(responseBody),
    queryFiltersPeopleCount: data.criteria && safeLength(data.criteria.people),
    queryFiltersTagsCount: data.criteria && safeLength(data.criteria.tags),
    queryFromDate: data.from,
    queryRawCount: ddbResponse && safeLength(ddbResponse.Items),
    queryToDate: data.to,
  };
}

export async function queryItems(event, context, callback) {
  const startTime = Date.now();
  const data = JSON.parse(event.body);
  try {
    const request = validateRequest(data);
    const ddbParams = getDynamoDbParams(request);
    const ddbResponse = await queryDatabase(ddbParams);
    const responseBody = getResponseBody(ddbResponse, request);
    logger(context, startTime, getLogFields(data, ddbResponse, responseBody));
    return callback(null, success(responseBody));
  } catch (err) {
    logger(context, startTime, { err, ...getLogFields(data, null, null) });
    return callback(null, failure(err));
  }
}
