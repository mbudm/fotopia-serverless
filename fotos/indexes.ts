
import { APIGatewayProxyEvent, Callback, Context } from "aws-lambda";
import * as uuid from "uuid";
import { failure, success } from "./common/responses";
import dynamodb from "./lib/dynamodb";
import logger from "./lib/logger";
import {
  IIndex, IIndexDictionary, IIndexUpdate, ILoggerBaseParams, IPutIndexRequest, ITraceMeta,
} from "./types";

import { AWSError } from "aws-sdk";
import {
  DocumentClient as DocClient,
} from "aws-sdk/lib/dynamodb/document_client.d";
import { PromiseResult } from "aws-sdk/lib/request";

export const TAGS_ID = "tags";
export const PEOPLE_ID = "people";

const defaultIndex: IIndex = {
  people: {},
  tags: {},
};

const getIndexTableName = (): string => {
  if (process.env.DYNAMODB_TABLE_INDEXES) {
    return process.env.DYNAMODB_TABLE_INDEXES;
  } else {
    throw new Error("No DYNAMODB_TABLE_INDEXES env variable set");
  }
};

export function getDynamoDbBatchGetItemParams(): DocClient.BatchGetItemInput {
  return {
    RequestItems: {
      [getIndexTableName()]: {
        Keys: [{
          id: TAGS_ID,
        },
        {
          id: PEOPLE_ID,
        }],
      },
    },
  };
}

export function getIndexRecords(
  ddbParams: DocClient.BatchGetItemInput,
): Promise<PromiseResult<DocClient.BatchGetItemOutput, AWSError>> {
  return dynamodb.batchGet(ddbParams).promise();
}

export function parseIndexesObject(ddbResponse: DocClient.BatchGetItemOutput): IIndex {
  const indexes: IIndex = {
    ...defaultIndex,
  };
  if (ddbResponse.Responses) {
    indexes.tags = ddbResponse.Responses[getIndexTableName()]
      .find((response) => response.id === TAGS_ID) || indexes.tags;
    indexes.people = ddbResponse.Responses[getIndexTableName()]
      .find((response) => response.id === PEOPLE_ID) || indexes.people;
  }
  return indexes;
}

export function getLogFields(indexesObj: IIndex) {
  return {
    indexesPeopleCount: indexesObj && Object.keys(indexesObj.people).length,
    indexesTagCount: indexesObj && Object.keys(indexesObj.tags).length,
  };
}

// get each index (if no record then create one)
export async function getItem(event: APIGatewayProxyEvent, context: Context, callback: Callback): Promise<void> {
  const startTime: number = Date.now();
  const eventBody = event.body ? JSON.parse(event.body) : null;
  const traceMeta: ITraceMeta | undefined = eventBody && eventBody.traceMeta;

  const loggerBaseParams: ILoggerBaseParams = {
    id: uuid.v1(),
    name: "getItem",
    parentId: traceMeta && traceMeta.parentId || "",
    startTime,
    traceId: traceMeta && traceMeta.traceId || uuid.v1(),
  };
  // change to batch get items
  try {
    const ddbParams: DocClient.BatchGetItemInput = getDynamoDbBatchGetItemParams();
    const ddbResponse: DocClient.BatchGetItemOutput = await getIndexRecords(ddbParams);
    const indexesObject: IIndex = parseIndexesObject(ddbResponse);
    logger(context, loggerBaseParams, getLogFields(indexesObject));
    return callback(null, success(indexesObject));
  } catch (err) {
    logger(context, loggerBaseParams, { err });
    return callback(null, failure(err));
  }
}

export function getDynamoDbUpdateItemParams(
  indexId: string,
  indexData: IIndexDictionary,
): DocClient.UpdateItemInput | null {
  const timestamp = new Date().getTime();
  const validKeys =  Object.keys(indexData).filter((k) => indexData[k] !== undefined);
  if (validKeys.length > 0) {
    /*
    https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/Expressions.ExpressionAttributeNames.html
    "If an attribute name begins with a number or contains a space, a special character,
    or a reserved word, you must use an expression attribute name to replace that attribute's
    name in the expression."

    So because tags could be anything, we use idx
    */
    const ExpressionAttributeNames = validKeys.reduce((accum, key, idx) => ({
      ...accum,
      [`#${idx}`]: key,
    }), {});

    const ExpressionAttributeValues = validKeys.reduce((accum, key, idx) => ({
      ...accum,
      [`:${idx}`]: indexData[key],
    }), {
      ":updatedAt": timestamp,
      ":zero": 0,
    });
    const updateKeyValues = validKeys.map((key, idx) => `#${idx} = if_not_exists(#${idx},:zero) + :${idx}`).join(", ");
    return {
      ExpressionAttributeNames,
      ExpressionAttributeValues,
      Key: {
        id: indexId,
      },
      ReturnValues: "ALL_NEW",
      TableName: getIndexTableName(),
      UpdateExpression: `SET ${updateKeyValues}, updatedAt = :updatedAt`,
    };
  } else {
    return null;
  }
}

export function updateIndexRecord(
  indexId: string,
  indexData: IIndexDictionary,
): Promise<DocClient.UpdateItemOutput> | undefined {
  const ddbParams: DocClient.UpdateItemInput | null = getDynamoDbUpdateItemParams(indexId, indexData);
  return ddbParams ? dynamodb.update(ddbParams).promise() : undefined ;
}

export function getPutLogFields(
  updates: IIndexUpdate,
  tagsUpdateResponse?: DocClient.UpdateItemOutput,
  peopleUpdateResponse?: DocClient.UpdateItemOutput,
) {
  return {
    indexesModifiedPeopleCount: updates && Object.keys(updates.people).length,
    indexesModifiedTagCount: updates && Object.keys(updates.tags).length,
    indexesPeopleCount: peopleUpdateResponse
      && peopleUpdateResponse.Attributes
      && peopleUpdateResponse.Attributes.length,
    indexesTagCount: tagsUpdateResponse && tagsUpdateResponse.Attributes && tagsUpdateResponse.Attributes.length,
  };
}

export async function putItem(event: APIGatewayProxyEvent, context: Context, callback: Callback): Promise<void> {
  const startTime: number = Date.now();

  const requestBody: IPutIndexRequest = event.body ?
    JSON.parse(event.body) :
    { indexUpdate: defaultIndex as IIndexUpdate};
  const traceMeta = requestBody!.traceMeta;

  const loggerBaseParams: ILoggerBaseParams = {
    id: uuid.v1(),
    name: "putItem",
    parentId: traceMeta && traceMeta!.parentId || "",
    startTime,
    traceId: traceMeta && traceMeta!.traceId || uuid.v1(),
  };

  try {
    // update each index - change to batch write item
    const tagsUpdateResponse: DocClient.UpdateItemOutput | undefined =
      await updateIndexRecord(TAGS_ID, requestBody.indexUpdate.tags);
    const peopleUpdateResponse: DocClient.UpdateItemOutput | undefined =
      await updateIndexRecord(PEOPLE_ID, requestBody.indexUpdate.tags);
    logger(context, loggerBaseParams, getPutLogFields(
      requestBody.indexUpdate,
      tagsUpdateResponse,
      peopleUpdateResponse,
    ));
    return callback(null, success(requestBody));
  } catch (err) {
    logger(context, loggerBaseParams, { err, ...getPutLogFields(requestBody.indexUpdate)});
    return callback(null, failure(err));
  }
}
