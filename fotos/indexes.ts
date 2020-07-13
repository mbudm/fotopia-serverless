
import { APIGatewayProxyEvent, Callback, Context } from "aws-lambda";
import * as uuid from "uuid";
import { failure, success } from "./common/responses";
import dynamodb from "./lib/dynamodb";
import logger from "./lib/logger";
import {
  IIndex, IIndexDictionary, IIndexUpdate, ILoggerBaseParams, IPutIndexRequest, ITraceMeta,
} from "./types";

import { AWSError } from "aws-sdk";
import { BatchWriteItemOutput } from "aws-sdk/clients/dynamodb";
import {
  DocumentClient as DocClient,
} from "aws-sdk/lib/dynamodb/document_client.d";
import { PromiseResult } from "aws-sdk/lib/request";
import { getZeroCount } from "./stream";

export const TAGS_ID = "tags";
export const PEOPLE_ID = "people";
export const INDEX_KEYS_PROP = "indexKeys";

const defaultIndex = (): IIndex  => ({
  people: {},
  tags: {},
});

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
    ...defaultIndex(),
  };
  if (ddbResponse.Responses) {
    const tagsRecord = ddbResponse.Responses[getIndexTableName()]
      .find((response) => response.id === TAGS_ID);
    indexes.tags = tagsRecord && tagsRecord[INDEX_KEYS_PROP] ? tagsRecord[INDEX_KEYS_PROP] : indexes.tags;
    const peopleRecord = ddbResponse.Responses[getIndexTableName()]
      .find((response) => response.id === PEOPLE_ID);
    indexes.people = peopleRecord && peopleRecord[INDEX_KEYS_PROP] ? peopleRecord[INDEX_KEYS_PROP] : indexes.people;
  }
  return indexes;
}

export function updateCleanIndexes(indexObject: IIndex): Promise<PromiseResult<BatchWriteItemOutput, AWSError>> {
  const ddbParams: DocClient.BatchWriteItemInput = {
    RequestItems: {
      [getIndexTableName()]: [
        {
          PutRequest: {
            Item: {
              id: TAGS_ID,
              [INDEX_KEYS_PROP]: {
                ...indexObject.tags,
              },
            },
          },
        },
        {
          PutRequest: {
            Item: {
              id: PEOPLE_ID,
              [INDEX_KEYS_PROP]: {
                ...indexObject.people,
              },
            },
          },
        },
      ],
    },
  };
  return dynamodb.batchWrite(ddbParams).promise();
}

export function cleanZeroIndexes(indexObject: IIndex): Promise<IIndex> | IIndex {
  const cleanedIndex: IIndex = {
    ...defaultIndex(),
  };
  let updateNeeded = false;
  Object.keys(indexObject.people).forEach((p) => {
    if (indexObject.people[p] <= 0) {
      updateNeeded = true;
    } else {
      cleanedIndex.people[p] = indexObject.people[p];
    }
  });

  Object.keys(indexObject.tags).forEach((t) => {
    if (indexObject.tags[t] <= 0) {
      updateNeeded = true;
    } else {
      cleanedIndex.tags[t] = indexObject.tags[t];
    }
  });
  return updateNeeded ?
    updateCleanIndexes(cleanedIndex)
      .then(() => cleanedIndex) :
    cleanedIndex;
}

export function getLogFields(indexesObj: IIndex, cleanIndexesObject: IIndex) {
  return {
    indexesCleanPeopleCount: cleanIndexesObject && Object.keys(cleanIndexesObject.people).length,
    indexesCleanTagCount: cleanIndexesObject && Object.keys(cleanIndexesObject.tags).length,
    indexesCleanZeroPeopleCount: cleanIndexesObject && getZeroCount(cleanIndexesObject.people),
    indexesCleanZeroTagCount: cleanIndexesObject && getZeroCount(cleanIndexesObject.tags),
    indexesPeopleCount: indexesObj && Object.keys(indexesObj.people).length,
    indexesTagCount: indexesObj && Object.keys(indexesObj.tags).length,
    indexesZeroPeopleCount: indexesObj && getZeroCount(indexesObj.people),
    indexesZeroTagCount: indexesObj && getZeroCount(indexesObj.tags),
  };
}

// get each index (if no record then create one)
export async function getItem(event: APIGatewayProxyEvent, context: Context, callback: Callback): Promise<void> {
  const startTime: number = Date.now();

  const traceMetaParentId: string | null = event.headers && event.headers["x-trace-meta-parent-id"];
  const traceMetaTraceId: string | null = event.headers && event.headers["x-trace-meta-trace-id"];

  const loggerBaseParams: ILoggerBaseParams = {
    id: uuid.v1(),
    name: "getItem",
    parentId: traceMetaParentId || "",
    startTime,
    traceId: traceMetaTraceId || uuid.v1(),
  };
  // change to batch get items
  try {
    const ddbParams: DocClient.BatchGetItemInput = getDynamoDbBatchGetItemParams();
    const ddbResponse: DocClient.BatchGetItemOutput = await getIndexRecords(ddbParams);
    const indexesObject: IIndex = parseIndexesObject(ddbResponse);
    const cleanZeroIndexesObject: IIndex = await cleanZeroIndexes(indexesObject);
    logger(context, loggerBaseParams, getLogFields(indexesObject, cleanZeroIndexesObject));
    return callback(null, success(cleanZeroIndexesObject));
  } catch (err) {
    logger(context, loggerBaseParams, { err });
    return callback(null, failure(err));
  }
}

export function getDynamoDbUpdateItemParams(
  indexData: IIndexDictionary,
  indexId: string,
  validKeys: string[],
): DocClient.UpdateItemInput {
  const timestamp = new Date().getTime();
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
    [`#indexKeysProp`]: INDEX_KEYS_PROP,
  }), {});

  const ExpressionAttributeValues = validKeys.reduce((accum, key, idx) => ({
    ...accum,
    [`:${idx}`]: indexData[key],
  }), {
    ":updatedAt": timestamp,
    ":zero": 0,
  });
  const updateKeyValues = validKeys.map((key, idx) => `#indexKeysProp.#${idx} = if_not_exists(#indexKeysProp.#${idx},:zero) + :${idx}`).join(", ");
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
}

export function getDynamoDbUpdateItemParamsBatch(
  indexId: string,
  indexData: IIndexDictionary,
): DocClient.UpdateItemInput[] {
  const validKeys =  Object.keys(indexData).filter((k) => indexData[k] !== undefined);
  if (validKeys.length > 0) {
    const maxKeysPerBatch = 10;
    const batchedParams: DocClient.UpdateItemInput[] = [];
    for (let i = 0; i < validKeys.length; i += maxKeysPerBatch) {
      const params: DocClient.UpdateItemInput = getDynamoDbUpdateItemParams(
        indexData,
        indexId,
        validKeys.slice(i, i + maxKeysPerBatch),
      );
      batchedParams.push(params);
    }
    return batchedParams;
  } else {
    return [];
  }
}

export function updateAndHandleEmptyMap(ddbParams: DocClient.UpdateItemInput): Promise<DocClient.UpdateItemOutput> {
  return dynamodb.update(ddbParams).promise()
  .catch((e) => {
    // this check may be a bit too brittle, but we want to only retry on this very specific error
    if (e.code === "ValidationException"
      && e.message === "The document path provided in the update expression is invalid for update"
    ) {
      const setMapParams: DocClient.UpdateItemInput = {
        ConditionExpression: "attribute_not_exists(#indexKeysProp)",
        ExpressionAttributeNames: {
          [`#indexKeysProp`]: INDEX_KEYS_PROP,
        },
        ExpressionAttributeValues: {
          ":emptyMap": {},
        },
        Key: ddbParams.Key,
        TableName: ddbParams.TableName,
        UpdateExpression: "SET #indexKeysProp = :emptyMap",
      };
      return dynamodb.update(setMapParams).promise()
        .then(() => {
          // now that the map has been created try the update again
          return dynamodb.update(ddbParams).promise();
        });
    } else {
      throw e;
    }
  });
}

export function updateIndexRecord(
  indexId: string,
  indexData: IIndexDictionary,
): Promise<DocClient.UpdateItemOutput[]> {
  const ddbParamsBatches: DocClient.UpdateItemInput[] = getDynamoDbUpdateItemParamsBatch(indexId, indexData);
  return Promise.all(ddbParamsBatches.map((batch) => updateAndHandleEmptyMap(batch)));
}

export function getPutLogFields(
  updates: IIndexUpdate,
  tagsUpdateResponses?: DocClient.UpdateItemOutput[],
  peopleUpdateResponses?: DocClient.UpdateItemOutput[],
) {

  const indexesPeopleAtts: string[] = peopleUpdateResponses &&
    peopleUpdateResponses.reduce((accum, response) => {
      return accum.concat(Object.keys(response.Attributes!));
    }, [] as string[]) || [];
  const indexesTagsAtts: string[] = tagsUpdateResponses &&
    tagsUpdateResponses.reduce((accum, response) => {
      return accum.concat(Object.keys(response.Attributes!));
    }, [] as string[]) || [];
  return {
    indexesModifiedPeopleCount: updates && Object.keys(updates.people).length,
    indexesModifiedTagCount: updates && Object.keys(updates.tags).length,
    indexesPeopleBatchCount: peopleUpdateResponses ? peopleUpdateResponses.length : 0,
    indexesPeopleCount: indexesPeopleAtts.length,
    indexesTagBatchCount: tagsUpdateResponses ? tagsUpdateResponses.length : 0,
    indexesTagCount: indexesTagsAtts.length,
  };
}

export async function putItem(event: APIGatewayProxyEvent, context: Context, callback: Callback): Promise<void> {
  const startTime: number = Date.now();

  const requestBody: IPutIndexRequest = event.body ?
    JSON.parse(event.body) :
    { indexUpdate: defaultIndex() as IIndexUpdate};
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
    const tagsUpdateResponses: DocClient.UpdateItemOutput[] =
      await updateIndexRecord(TAGS_ID, requestBody.indexUpdate.tags);
    const peopleUpdateResponses: DocClient.UpdateItemOutput[] =
      await updateIndexRecord(PEOPLE_ID, requestBody.indexUpdate.people);
    logger(context, loggerBaseParams, getPutLogFields(
      requestBody.indexUpdate,
      tagsUpdateResponses,
      peopleUpdateResponses,
    ));
    return callback(null, success(requestBody));
  } catch (err) {
    logger(context, loggerBaseParams, { err, ...getPutLogFields(requestBody.indexUpdate)});
    return callback(null, failure(err));
  }
}
