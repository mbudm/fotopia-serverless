import {
  Callback,
  Context,
  DynamoDBRecord,
  DynamoDBStreamEvent,
} from "aws-lambda";
import { AttributeValue as ddbAttVals } from "dynamodb-data-types";
import * as uuid from "uuid";

import { failure, success } from "./common/responses";
import logger from "./lib/logger";

import { InvocationResponse } from "aws-sdk/clients/lambda";
import { getTraceMeta } from "./common/getTraceMeta";
import invokeGetIndex from "./common/invokeGetIndex";
import invokePutIndex from "./common/invokePutIndex";
import { safeLength } from "./create";
import { getZeroCount } from "./indexes";
import {
  IIndex, IIndexDictionary, IIndexFields, ILoggerBaseParams,
} from "./types";

export function normaliseArrayFields(record: DynamoDBRecord): IIndexFields {
  const arrayFields: IIndexFields = {
    people: {
      new: [],
      old: [],
    },
    tags: {
      new: [],
      old: [],
    },
  };
  if (record && record.dynamodb) {
    if (record.dynamodb.NewImage) {
      const newImg = ddbAttVals.unwrap(record.dynamodb.NewImage);
      arrayFields.tags.new = Array.isArray(newImg.tags) ? [...newImg.tags] : [];
      arrayFields.people.new = Array.isArray(newImg.people) ? [...newImg.people] : [];
    }
    if (record.dynamodb.OldImage) {
      const oldImg = ddbAttVals.unwrap(record.dynamodb.OldImage);
      arrayFields.tags.old = Array.isArray(oldImg.tags) ? [...oldImg.tags] : [];
      arrayFields.people.old = Array.isArray(oldImg.people) ? [...oldImg.people] : [];
    }
  }
  return arrayFields;
}

export function parseIndexes(records: DynamoDBRecord[]): IIndex {
  return records.reduce((indexes, record) => {
    const updatedIndexes = { ...indexes };
    const arrayFields = normaliseArrayFields(record);
    ["tags", "people"].forEach((field) => {
      arrayFields[field].new.forEach((item) => {
        if (!arrayFields[field].old.includes(item)) {
          updatedIndexes[field][item] = updatedIndexes[field][item] ?
            updatedIndexes[field][item] + 1 :
            1;
        }
      });
      arrayFields[field].old.forEach((item) => {
        if (!arrayFields[field].new.includes(item)) {
          updatedIndexes[field][item] = updatedIndexes[field][item] ?
            updatedIndexes[field][item] - 1 :
            -1;
        }
      });
    });
    return updatedIndexes;
  }, { tags: {}, people: {} });
}
/*
todo
remove people from indexes, just handle tags here as
the info on people is all in people.json inc number of images (faces)
so then indexes just becomes tags - makes it scalable, add another index file
for another taxoniomy if we adds one
could also make tags have an array of images to make for more accuarte counts (and easier auditing)
*/

export function updateCounts(existing: IIndex, newUpdates: IIndex) {
  const updated: IIndex = {
    people: {},
    tags: {},
  };
  ["tags", "people"].forEach((key) => {
    updated[key] = { ...existing[key] };
    Object.keys(newUpdates[key]).forEach((item) => {
      updated[key][item] = updated[key][item] ?
        Math.max(0, updated[key][item] + newUpdates[key][item]) :
        Math.max(0, newUpdates[key][item]);
    });
  });
  return updated;
}

export function getUpdatedIndexes(existing: IIndex, newRecords: DynamoDBRecord[]): IIndex {
  const updates: IIndex = parseIndexes(newRecords);
  return updateCounts(existing, updates);
}

export function getModifiedIndexItems(existing: IIndexDictionary, updated: IIndexDictionary) {
  return Object.keys(updated).filter((fieldKey: string) => {
    return updated[fieldKey] !== existing[fieldKey];
  });
}

export function getFirstRecord(records: DynamoDBRecord[]) {
  const firstRecord: DynamoDBRecord = records[0];
  return firstRecord.dynamodb!.NewImage ?
    ddbAttVals.unwrap(records[0].dynamodb!.NewImage) :
    ddbAttVals.unwrap(records[0].dynamodb!.OldImage);
}

export function getLogFields(records: DynamoDBRecord[], existingIndex?: IIndex, updatedIndexes?: IIndex) {
  const firstRecord = getFirstRecord(records);
  return {
    ddbEventName: records[0].eventName,
    ddbEventRecordsCount: safeLength(records),
    ddbEventRecordsRaw: records,
    imageBirthtime: firstRecord.birthtime,
    imageCreatedAt: firstRecord.createdAt,
    imageFaceMatchCount: safeLength(firstRecord.faceMatches),
    imageFacesCount: safeLength(firstRecord.faces),
    imageFamilyGroup: firstRecord.group,
    imageHeight: firstRecord.meta && firstRecord.meta.height,
    imageId: firstRecord.id,
    imageKey: firstRecord.img_key,
    imagePeopleCount: safeLength(firstRecord.people),
    imageTagCount: safeLength(firstRecord.tags),
    imageUpdatedAt: firstRecord.updatedAt,
    imageUserIdentityId: firstRecord.userIdentityId,
    imageUsername: firstRecord.username,
    imageWidth: firstRecord.meta && firstRecord.meta.width,
    indexesModifiedPeopleCount: existingIndex && updatedIndexes &&
      getModifiedIndexItems(existingIndex.people, updatedIndexes.people).length,
    indexesModifiedTagCount: existingIndex && updatedIndexes &&
      getModifiedIndexItems(existingIndex.tags, updatedIndexes.tags).length,
    indexesPeopleCount: existingIndex && Object.keys(existingIndex.people).length,
    indexesTagCount: existingIndex && Object.keys(existingIndex.tags).length,
    indexesUpdatedPeopleCount: updatedIndexes && Object.keys(updatedIndexes.people).length,
    indexesUpdatedTagCount: updatedIndexes && Object.keys(updatedIndexes.tags).length,
    indexesUpdatedZeroPeopleCount: updatedIndexes && getZeroCount(updatedIndexes.people),
    indexesUpdatedZeroTagCount: updatedIndexes && getZeroCount(updatedIndexes.tags),
    indexesZeroPeopleCount: existingIndex && getZeroCount(existingIndex.people),
    indexesZeroTagCount: existingIndex && getZeroCount(existingIndex.tags),
  };
}

export async function indexRecords(event: DynamoDBStreamEvent, context: Context, callback: Callback) {
  const startTime: number = Date.now();
  const loggerBaseParams: ILoggerBaseParams = {
    id: uuid.v1(),
    name: "indexRecords",
    parentId: "",
    startTime,
    traceId: uuid.v1(),
  };
  try {
    const existingIndex: IIndex = await invokeGetIndex(getTraceMeta(loggerBaseParams));
    const updatedIndexes: IIndex = getUpdatedIndexes(existingIndex, event.Records);
    const response: InvocationResponse = await invokePutIndex(updatedIndexes, getTraceMeta(loggerBaseParams));
    logger(context, loggerBaseParams, getLogFields(event.Records, existingIndex, updatedIndexes));
    return callback(null, success(response));
  } catch (err) {
    logger(context, loggerBaseParams, { err, ...getLogFields(event.Records) });
    return callback(null, failure(err));
  }
}
