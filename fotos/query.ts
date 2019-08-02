import * as uuid from "uuid";

import { failure, success } from "./common/responses";
import { safeLength } from "./create";
import dynamodb from "./lib/dynamodb";
import logger from "./lib/logger";
import {
  ILoggerBaseParams,
  IQueryBody,
  IQueryDBResponseItem,
  IQueryResponse,
} from "./types";

import {
  AWSError,
} from "aws-sdk/lib/error";
import {
  PromiseResult,
} from "aws-sdk/lib/request";

import {
  DocumentClient as DocClient,
} from "aws-sdk/lib/dynamodb/document_client.d";

/*
  With the in-lambda filtering that I'm currently using (cheaper than elastic search)
  pagination is a bit tricky. By setting a maximum database query limit we will usually
  have enough results after filtering on criteria to still return a full page of results to the user.
*/
export const MAX_QUERY_LIMIT = 500;
export const MAX_DATE_RANGE = (90 * 24 * 60 * 1000); // 90 days

export const getTableName = (): string => {
  if (process.env.DYNAMODB_TABLE) {
    return process.env.DYNAMODB_TABLE;
  } else {
    throw new Error("No DYNAMODB_TABLE env variable set");
  }
};

export const calculateFromDate = (data: IQueryBody): number => {
  const proposedFromDate = anyDateFormatToMilliseconds(data.from);
  const lastRetrievedBirthtime = data.lastRetrievedBirthtime ?
    anyDateFormatToMilliseconds(data.lastRetrievedBirthtime) :
    proposedFromDate;
  return Math.max(proposedFromDate, lastRetrievedBirthtime);
};

const anyDateFormatToMilliseconds = (d) => new Date(d).getTime();

export const calculateToDate = (data: IQueryBody): number => {
  const fromDate = calculateFromDate(data);
  const proposedToDate = anyDateFormatToMilliseconds(data.to);
  if (proposedToDate >= (fromDate + MAX_DATE_RANGE)) {
    return  fromDate + MAX_DATE_RANGE;
  } else if (proposedToDate >= fromDate) {
    return proposedToDate;
  } else {
    throw new Error(`'To' date is prior to 'from' date`);
  }
};

export const calculateLimit = (data: IQueryBody): number => {
  return hasCriteria(data) ?
    MAX_QUERY_LIMIT :
    (data.limit || MAX_QUERY_LIMIT );
};

export const getUserDynamoDbParams = (data: IQueryBody): DocClient.QueryInput => {
  const params = {
    ExpressionAttributeNames: {
      "#birthtime": "birthtime",
      "#username": "username",
    },
    ExpressionAttributeValues: {
      ":from": new Date(data.from).getTime(), // make this after birthtime of the last item from the prev query
      ":to": new Date(data.to).getTime(),
      ":username": data.username,
    },
    IndexName: "UsernameBirthtimeIndex",
    KeyConditionExpression: "#username = :username AND #birthtime BETWEEN :from AND :to",
    Limit: calculateLimit(data),
    ProjectionExpression: "id, meta, people, tags, img_location, img_key, img_thumb_key",
    TableName: getTableName(),
  };
  return params;
};

export const getGroupDynamoDbParams = (data: IQueryBody): DocClient.QueryInput => {
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
    Limit: calculateLimit(data),
    // tslint:disable-next-line:max-line-length
    ProjectionExpression: "#group, #birthtime, username, userIdentityId, id, meta, people, tags, img_key, img_thumb_key",
    TableName: getTableName(),
  };
  return params;
};

export const getDynamoDbParams = (data: IQueryBody): DocClient.QueryInput => {
  if (data.username) {
    return getUserDynamoDbParams(data);
  } else {
    return getGroupDynamoDbParams(data);
  }
};

export const hasCriteria = (criteria = {}) =>
  Object.keys(criteria).every((key) => Array.isArray(criteria[key])) &&
  Object.keys(criteria).some((key) => criteria[key].length > 0);

export const filterByCriteria = (item: IQueryDBResponseItem, criteriaKey, criteriaData): boolean =>
  criteriaData.some((criteriaDataItem) => item[criteriaKey].includes(criteriaDataItem));

export const filterItemsByCriteria = (items: IQueryDBResponseItem[], data: IQueryBody): IQueryDBResponseItem[] =>
  (hasCriteria(data.criteria) ?
    items.filter((item) => item &&
      Object.keys(data!.criteria || {}).some((criteriaKey) =>
        filterByCriteria(item, criteriaKey, data!.criteria![criteriaKey]))) :
    items);

export function getResponseBody(ddbResponse: DocClient.QueryOutput, data: IQueryBody): IQueryResponse {
  const items: IQueryDBResponseItem[] = ddbResponse.Items ?
    ddbResponse.Items as IQueryDBResponseItem[] :
    [];
  const filteredItems: IQueryDBResponseItem[] = filterItemsByCriteria(items, data);

  const delimitedItems = data.limit && data.limit > 0 ? filteredItems.slice(0, data.limit) : filteredItems;
  const message = delimitedItems.length > 0 ?
    `${filteredItems.length} items found, ${delimitedItems.length} returned` :
    "No items found that match your criteria";

  return {
    items: delimitedItems,
    message,
    remainingResults: filteredItems.length - delimitedItems.length,
  };
}

export function queryDatabase(ddbParams): Promise<PromiseResult<DocClient.QueryOutput, AWSError>> {
  return dynamodb.query(ddbParams).promise();
}

export function getLogFields({
    data,
    ddbParams,
    ddbResponse,
    responseBody,
  }: {
    data: IQueryBody;
    ddbParams: DocClient.QueryInput | null;
    ddbResponse;
    responseBody;
  }) {
  return {
    queryFilteredCount: safeLength(responseBody),
    queryFiltersPeopleCount:
      data.criteria && safeLength(data.criteria.people),
    queryFiltersTagsCount:
      data.criteria && safeLength(data.criteria.tags),
    queryFromDate: new Date(data.from).toISOString(),
    queryLimit: data.limit,
    queryRawCount: ddbResponse && safeLength(ddbResponse.Items),
    queryRevisedFromDate:
      ddbParams && new Date(ddbParams.ExpressionAttributeValues![":from"]).toISOString(),
    queryRevisedLimit: ddbParams && ddbParams.Limit,
    queryRevisedToDate:
      ddbParams && new Date(ddbParams.ExpressionAttributeValues![":to"]).toISOString(),
    queryToDate: new Date(data.to).toISOString(),
  };
}

export async function queryItems(event, context, callback) {
  const startTime = Date.now();
  const data: IQueryBody = JSON.parse(event.body);
  const traceMeta = data!.traceMeta;
  const loggerBaseParams: ILoggerBaseParams = {
    id: uuid.v1(),
    name: "queryItems",
    parentId: traceMeta && traceMeta!.parentId || "",
    startTime,
    traceId: traceMeta && traceMeta!.traceId || uuid.v1(),
  };
  try {
    const ddbParams = getDynamoDbParams(data);
    const ddbResponse: DocClient.QueryOutput = await queryDatabase(ddbParams);
    const responseBody = getResponseBody(ddbResponse, data);
    logger(context, loggerBaseParams, getLogFields({ data, ddbParams, ddbResponse, responseBody }));
    return callback(null, success(responseBody));
  } catch (err) {
    logger(context, loggerBaseParams, {
      err,
      ...getLogFields({
        data,
        ddbParams: null,
        ddbResponse: null,
        responseBody: null,
      }),
    });
    return callback(null, failure(err));
  }
}
