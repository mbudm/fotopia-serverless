import { AttributeValue as ddbAttVals } from "dynamodb-data-types";
import * as uuid from "uuid";

import { INDEXES_KEY } from "./lib/constants";
import logger from "./lib/logger";
import { failure, success } from "./lib/responses";
import createS3Client from "./lib/s3";

import { safeLength } from "./create";
import { getZeroCount } from "./indexes";
import {
  ILoggerBaseParams,
} from "./types";

let s3;

export function getS3Params() {
  return {
    Bucket: process.env.S3_BUCKET,
    Key: INDEXES_KEY,
  };
}

export function getS3PutParams(indexData) {
  return {
    Body: JSON.stringify(indexData),
    Bucket: process.env.S3_BUCKET,
    ContentType: "application/json",
    Key: INDEXES_KEY,
  };
}

export function getExistingIndex() {
  const s3Params = getS3Params();
  return s3.getObject(s3Params).promise()
    .then((s3Object) => JSON.parse(s3Object.Body.toString()))
    .catch((error) => ({ error, tags: {}, people: {} }));
}

export function normaliseArrayFields(record) {
  const arrayFields = {
    people: {
      new: new Array<any>(),
      old: new Array<any>(),
    },
    tags: {
      new: new Array<any>(),
      old: new Array<any>(),
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

export function parseIndexes(records) {
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

export function updateCounts(existing, newUpdates) {
  const updated = {};
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

export function getUpdatedIndexes(existing, newRecords) {
  const updates = parseIndexes(newRecords);
  return updateCounts(existing, updates);
}

export function putIndex(index) {
  const s3PutParams = getS3PutParams(index);
  return s3.putObject(s3PutParams).promise();
}

export function getLogFields(records, existingIndex, updatedIndexes) {
  const firstRecord = ddbAttVals.unwrap(records[0].dynamodb.NewImage);
  return {
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

export async function indexRecords(event, context, callback) {
  const startTime = Date.now();
  s3 = createS3Client();
  const loggerBaseParams: ILoggerBaseParams = {
    name: "indexRecords",
    parentId: null,
    spanId: uuid.v1(),
    timestamp: startTime,
    traceId: uuid.v1(),
  };
  try {
    const existingIndex = await getExistingIndex();
    const updatedIndexes = getUpdatedIndexes(existingIndex, event.Records);
    const response = await putIndex(updatedIndexes);
    logger(context, loggerBaseParams, getLogFields(event.Records, existingIndex, updatedIndexes));
    return callback(null, success(response));
  } catch (err) {
    logger(context, loggerBaseParams, { err, ...getLogFields(event.Records, null, null) });
    return callback(null, failure(err));
  }
}
