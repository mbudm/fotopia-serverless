import * as uuid from "uuid";

import {
  DocumentClient as DocClient,
} from "aws-sdk/lib/dynamodb/document_client.d";
import {
  AWSError,
} from "aws-sdk/lib/error";
import {
  PromiseResult,
} from "aws-sdk/lib/request";

import { APIGatewayProxyEvent, Callback, Context } from "aws-lambda";
import getTableName from "./common/getTableName";
import { failure, success } from "./common/responses";
import { safeLength } from "./create";
import dynamodb from "./lib/dynamodb";
import logger from "./lib/logger";
import {
  ILoggerBaseParams,
  IQueryBody,
  IQueryBodyCriteria,
  IQueryDBResponseItem,
  IQueryResponse,
  ITraceMeta,
} from "./types";
/*
  With the in-lambda filtering that I'm currently using (cheaper than elastic search)
  pagination is a bit tricky. By setting a maximum database query limit we will usually
  have enough results after filtering on criteria to still return a full page of results to the user.
*/
export const MAX_QUERY_LIMIT = 500;
export const MAX_DATE_RANGE = (90 * 24 * 60 * 60 * 1000); // 90 days

export const calculateFromDate = (data: IQueryBody): number => {
  const proposedFromDate = anyDateFormatToMilliseconds(data.from);
  const lastRetrievedBirthtime = data.lastRetrievedBirthtime ?
    anyDateFormatToMilliseconds(data.lastRetrievedBirthtime) :
    proposedFromDate;
  return Math.max(proposedFromDate, lastRetrievedBirthtime);
};

const anyDateFormatToMilliseconds = (d) => new Date(d).getTime();

export const canBreakLimit = (data: IQueryBody): boolean => {
  return data.breakDateRestriction === true && typeof data.clientId === "string";
};

export const calculateToDate = (data: IQueryBody): number => {
  const fromDate = calculateFromDate(data);
  const proposedToDate = anyDateFormatToMilliseconds(data.to);
  if (proposedToDate >= (fromDate + MAX_DATE_RANGE)) {
    return canBreakLimit(data) ?
      proposedToDate :
      fromDate + MAX_DATE_RANGE;
  } else if (proposedToDate >= fromDate) {
    return proposedToDate;
  } else {
    throw new Error(`'To' date is prior to 'from' date`);
  }
};

export const calculateLimit = (data: IQueryBody): number => {
  return hasCriteria(data.criteria) ?
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
      ":from": calculateFromDate(data),
      ":to": calculateToDate(data),
      ":username": data.username,
    },
    IndexName: "UsernameBirthtimeIndex",
    KeyConditionExpression: "#username = :username AND #birthtime BETWEEN :from AND :to",
    Limit: calculateLimit(data),
    ProjectionExpression: "#birthtime, #username, id, meta, people, tags, img_location, img_key, img_thumb_key",
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
      ":from": calculateFromDate(data),
      ":group": process.env.FOTOPIA_GROUP,
      ":to": calculateToDate(data),
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
  }
  return getGroupDynamoDbParams(data);
};
export const hasCriteria = (criteria?: IQueryBodyCriteria): boolean => criteria !== undefined &&
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

export function validateDateTime(ts): number {
  if (Number.isInteger(ts)) {
    return ts;
  } else {
    try {
      const d = new Date(ts);
      return d.getTime();
    } catch (e) {
      throw new Error(`Could not get a valid timestamp from ${ts}`);
    }
  }
}

export function validateQueryBody(data: IQueryBody) {
  const from = validateDateTime(data.from);
  const to = validateDateTime(data.to);
  if (Number.isInteger(from) && Number.isInteger(to)) {
    return {
      ...data,
      from,
      to,
    };
  } else {
    throw new Error(
      `Query body is not valid, needs at least a numeric from/to value: ${JSON.stringify(data)}`,
    );
  }
}

export function getLogFields(
  data: IQueryBody,
  ddbParams?: DocClient.QueryInput | null,
  ddbResponse?: DocClient.QueryOutput,
  responseBody?: IQueryResponse,
) {
  return {
    queryActualFromDate: ddbParams &&
      new Date(ddbParams.ExpressionAttributeValues![":from"]).toISOString(),
    queryActualToDate: ddbParams &&
      new Date(ddbParams.ExpressionAttributeValues![":to"]).toISOString(),
    queryBreakDateRestriction: data.breakDateRestriction,
    queryClientId: data.clientId,
    queryFilteredCount: responseBody && safeLength(responseBody.items),
    queryFiltersPeopleCount:
      data.criteria && safeLength(data.criteria.people),
    queryFiltersTagsCount:
      data.criteria && safeLength(data.criteria.tags),
    queryFromDate: new Date(data.from).toISOString(),
    queryLimit: data.limit,
    queryRawCount: ddbResponse && safeLength(ddbResponse.Items),
    queryRevisedLimit: ddbParams && ddbParams.Limit,
    queryToDate: new Date(data.to).toISOString(),
  };
}

export async function queryItems(event: APIGatewayProxyEvent, context: Context, callback: Callback): Promise<void> {
  const startTime: number = Date.now();
  const data: IQueryBody = event.body && JSON.parse(event.body);
  const traceMeta: ITraceMeta | undefined = data!.traceMeta;
  const loggerBaseParams: ILoggerBaseParams = {
    id: uuid.v1(),
    name: "queryItems",
    parentId: traceMeta && traceMeta!.parentId || "",
    startTime,
    traceId: traceMeta && traceMeta!.traceId || uuid.v1(),
  };
  try {
    const validatedQueryBody: IQueryBody = validateQueryBody(data);
    const ddbParams: DocClient.QueryInput = getDynamoDbParams(validatedQueryBody);
    const ddbResponse: DocClient.QueryOutput = await queryDatabase(ddbParams);
    const responseBody: IQueryResponse = getResponseBody(ddbResponse, validatedQueryBody);
    logger(context, loggerBaseParams, getLogFields(validatedQueryBody, ddbParams, ddbResponse, responseBody));
    return callback(null, success(responseBody));
  } catch (err) {
    logger(context, loggerBaseParams, { err, ...getLogFields(data) });
    return callback(null, failure(err));
  }
}
