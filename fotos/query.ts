import * as uuid from "uuid";

import { safeLength } from "./create";
import dynamodb from "./lib/dynamodb";
import logger from "./lib/logger";
import { failure, success } from "./lib/responses";
import {
  ILoggerBaseParams,
  IQueryBody,
} from "./types";

export const getUserDynamoDbParams = (data: IQueryBody) => {
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

export const getGroupDynamoDbParams = (data: IQueryBody) => {
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

export const getDynamoDbParams = (data: IQueryBody) => {
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

export const filterItemsByCriteria = (items, data: IQueryBody) =>
  (hasCriteria(data.criteria) ?
    items.filter((item) => item &&
      Object.keys(data!.criteria || {}).some((criteriaKey) =>
        filterByCriteria(item, criteriaKey, data!.criteria![criteriaKey]))) :
    items);

export function getResponseBody(ddbResponse, data: IQueryBody) {
  const filteredItems = filterItemsByCriteria(ddbResponse.Items, data);
  return filteredItems.length > 0 ? filteredItems : "No items found that match your criteria";
}

export function queryDatabase(ddbParams) {
  return dynamodb.query(ddbParams).promise();
}

export function getLogFields(data: IQueryBody, ddbResponse, responseBody) {
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
  const data: IQueryBody = JSON.parse(event.body);
  const traceMeta = data!.traceMeta;
  const loggerBaseParams: ILoggerBaseParams = {
    Timestamp: startTime,
    id: uuid.v1(),
    name: "queryItems",
    parentId: traceMeta && traceMeta!.parentId || "",
    traceId: traceMeta && traceMeta!.traceId || uuid.v1(),
  };
  try {
    const ddbParams = getDynamoDbParams(data);
    const ddbResponse = await queryDatabase(ddbParams);
    const responseBody = getResponseBody(ddbResponse, data);
    logger(context, loggerBaseParams, getLogFields(data, ddbResponse, responseBody));
    return callback(null, success(responseBody));
  } catch (err) {
    logger(context, loggerBaseParams, { err, ...getLogFields(data, null, null) });
    return callback(null, failure(err));
  }
}
