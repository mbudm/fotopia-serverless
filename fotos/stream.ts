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
import invokePutIndex from "./common/invokePutIndex";
import { safeLength } from "./create";
import {
  IIndex, IIndexDictionary, IIndexFields, IIndexUpdate, ILoggerBaseParams,
} from "./types";

export function getZeroCount(indexObj: IIndexDictionary): number {
  return Object.keys(indexObj).filter((item) => indexObj[item] <= 0).length;
}

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

export function getIndexUpdates(records: DynamoDBRecord[]): IIndexUpdate {
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
for another taxonomy if we adds one
could also make tags have an array of images to make for more accuarte counts (and easier auditing)
*/

export function getFirstRecord(records: DynamoDBRecord[]) {
  const firstRecord: DynamoDBRecord = records[0];
  return firstRecord.dynamodb!.NewImage ?
    ddbAttVals.unwrap(records[0].dynamodb!.NewImage) :
    ddbAttVals.unwrap(records[0].dynamodb!.OldImage);
}

export function getLogFields(records: DynamoDBRecord[], indexUpdates?: IIndexUpdate) {
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
    indexesUpdatedPeopleCount: indexUpdates && Object.keys(indexUpdates.people).length,
    indexesUpdatedTagCount: indexUpdates && Object.keys(indexUpdates.tags).length,
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
    const indexUpdates: IIndex = getIndexUpdates(event.Records);
    const response: InvocationResponse = await invokePutIndex(indexUpdates, getTraceMeta(loggerBaseParams));
    logger(context, loggerBaseParams, getLogFields(event.Records, indexUpdates));
    return callback(null, success(response));
  } catch (err) {
    logger(context, loggerBaseParams, { err, ...getLogFields(event.Records) });
    return callback(null, failure(err));
  }
}
