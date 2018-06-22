import Joi from 'joi';

import createS3Client from './lib/s3';
import { getSchema, putSchema } from './joi/stream';

let s3;
const Key = 'indexes.json';

export function getS3Params() {
  const data = {
    Bucket: process.env.S3_OUTPUT_BUCKET,
    Key,
  };
  const result = Joi.validate(data, getSchema);
  if (result.error !== null) {
    throw result.error;
  } else {
    return data;
  }
}

export function getS3PutParams(indexData) {
  const data = {
    Body: indexData,
    Bucket: process.env.S3_BUCKET,
    ContentType: 'image/jpg',
    Key,
  };
  const result = Joi.validate(data, putSchema);
  if (result.error !== null) {
    throw result.error;
  } else {
    return data;
  }
}

export function getExistingIndex() {
  const s3Params = getS3Params();
  return s3.getObject(s3Params).promise()
    .then(s3Object => JSON.parse(s3Object.Body.toString()))
    .catch(error => ({ error, tags: {}, people: {} }));
}

export function normaliseArrayFields(record) {
  const arrayFields = {
    tags: {
      new: [],
      old: [],
    },
    people: {
      new: [],
      old: [],
    },
  };
  if (record && record.dynamodb) {
    if (record.dynamodb.NewImage) {
      const newImg = record.dynamodb.NewImage;
      arrayFields.tags.new = newImg.tags ? newImg.tags.S.split(',') : [];
      arrayFields.people.new = newImg.people ? newImg.people.S.split(',') : [];
    }
    if (record.dynamodb.OldImage) {
      const oldImg = record.dynamodb.OldImage;
      arrayFields.tags.old = oldImg.tags ? oldImg.tags.S.split(',') : [];
      arrayFields.people.old = oldImg.people ? oldImg.people.S.split(',') : [];
    }
  }
  return arrayFields;
}

export function parseIndexes(records) {
  return records.reduce((indexes, record) => {
    const updatedIndexes = { ...indexes };
    const arrayFields = normaliseArrayFields(record);
    ['tags', 'people'].forEach((field) => {
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

export function updateCounts(existing, newUpdates) {
  const updated = {};
  ['tags', 'people'].forEach((key) => {
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

export async function indexRecords(event, context, callback) {
  console.log(event, context, callback);
  s3 = createS3Client();
  try {
    const existingIndex = await getExistingIndex();
    const updatedIndexes = getUpdatedIndexes(existingIndex, event.Records);
    const success = await putIndex(updatedIndexes);
    console.log('updatedIndexes', success, updatedIndexes);
  } catch (err) {
    console.error(err);
  }
}

/* example payload

{ Records:
   [ { eventID: '9250194633637e7cd1e10b89912d1d7d',
       eventName: 'INSERT',
       eventVersion: '1.1',
       eventSource: 'aws:dynamodb',
       awsRegion: 'us-east-1',
       dynamodb: [Object],
 */

// write to tags and people 'indexes'
/*
    {
      people: {
        'oren': {
          rekognitionId: 'some guid'
          count:
        }
      },
      tags: {
        tagname: {
          // what goes here - rough count?
        }
      }
    }

    or add people and tag objects to algolia? keep under the 10k records and get text search
    use NEW_AND_OLD_IMAGES so can check the diffs in people and tags and
    update the tag / people record accordingly
    how to keep counts...? have to query algloia to get the existing count and
    modify the count number

    get tag/people diffs
    query algolia with tags
    update if changed

    or just read write a json file? that way the client can also have all
    that and do basic search client side?

    */
