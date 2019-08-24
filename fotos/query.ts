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

import { APIGatewayProxyEvent, Callback } from "aws-lambda";
import { Context } from "vm";
import getTableName from "./common/getTableName";
import { failure, success } from "./common/responses";
import { safeLength } from "./create";
import dynamodb from "./lib/dynamodb";
import logger from "./lib/logger";
import {
  ILoggerBaseParams,
  IQueryBody,
  IQueryBodyCriteria,
  IQueryResponse,
  ITraceMeta,
} from "./types";

export const getUserDynamoDbParams = (data: IQueryBody): DocClient.QueryInput => {
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
      ":from": new Date(data.from).getTime(),
      ":group": process.env.FOTOPIA_GROUP,
      ":to": new Date(data.to).getTime(),
    },
    IndexName: "GroupBirthtimeIndex",
    KeyConditionExpression: "#group = :group AND #birthtime BETWEEN :from AND :to",
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

export const filterByCriteria = (item: IQueryResponse, criteriaKey: string, criteriaData: string[]): boolean =>
  criteriaData.some((criteriaDataItem) => item[criteriaKey].includes(criteriaDataItem));

export const filterItemsByCriteria = (items: IQueryResponse[], data: IQueryBody): IQueryResponse[] =>
  (hasCriteria(data.criteria) && items ?
    items.filter((item) => item &&
      Object.keys(data!.criteria || {}).some((criteriaKey) =>
        filterByCriteria(item, criteriaKey, data!.criteria![criteriaKey]))) :
    items || []);

export function getResponseBody(ddbResponse: DocClient.QueryOutput, data: IQueryBody): IQueryResponse[] | string {
  const items: IQueryResponse[] = ddbResponse.Items ?
    ddbResponse.Items as IQueryResponse[] :
    [];
  const filteredItems: IQueryResponse[] = filterItemsByCriteria(items, data) ;
  return filteredItems.length > 0 ? filteredItems : "No items found that match your criteria";
}

export function queryDatabase(ddbParams): Promise<PromiseResult<DocClient.QueryOutput, AWSError>> {
  return dynamodb.query(ddbParams).promise();
}

export function validateQueryBody(data: IQueryBody) {
  if (data.username && Number.isInteger(data.from) && Number.isInteger(data.to)) {
    return data;
  } else {
    throw new Error(
      `Query body is not valid, needs at least a username and a numeric from/to value: ${JSON.stringify(data)}`,
    );
  }
}

export function getLogFields(
  data: IQueryBody, ddbResponse?: DocClient.QueryOutput, responseBody?: IQueryResponse[] | string,
) {
  return {
    queryFilteredCount: Array.isArray(responseBody) ? responseBody.length : 0,
    queryFiltersPeopleCount: data.criteria && safeLength(data.criteria.people),
    queryFiltersTagsCount: data.criteria && safeLength(data.criteria.tags),
    queryFromDate: data.from,
    queryRawCount: ddbResponse && safeLength(ddbResponse.Items),
    queryToDate: data.to,
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
    const responseBody: IQueryResponse[] | string = getResponseBody(ddbResponse, validatedQueryBody);
    logger(context, loggerBaseParams, getLogFields(validatedQueryBody, ddbResponse, responseBody));
    return callback(null, success(responseBody));
  } catch (err) {
    logger(context, loggerBaseParams, { err, ...getLogFields(data) });
    return callback(null, failure(err));
  }
}
