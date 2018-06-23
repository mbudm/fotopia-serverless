import Joi from 'joi';

import createS3Client from './lib/s3';
import { getSchema, putSchema } from './joi/stream';

let s3;
const Key = 'indexes.json';

export function getS3Params() {
  const data = {
    Bucket: process.env.S3_BUCKET,
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
    Body: JSON.stringify(indexData),
    Bucket: process.env.S3_BUCKET,
    ContentType: 'application/json',
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
      arrayFields.tags.new = newImg.tags ? newImg.tags.L.map(item => item.S) : [];
      arrayFields.people.new = newImg.people ? newImg.people.L.map(item => item.S) : [];
    }
    if (record.dynamodb.OldImage) {
      const oldImg = record.dynamodb.OldImage;
      arrayFields.tags.old = oldImg.tags ? oldImg.tags.L.map(item => item.S) : [];
      arrayFields.people.old = oldImg.people ? oldImg.people.L.map(item => item.S) : [];
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

export async function indexRecords(event) {
  console.log('stream indexRecords', JSON.stringify(event.Records, null, 2));
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
[
  {
    "eventID": "9cbe27db657102695598580df16565b5",
    "eventName": "REMOVE",
    "eventVersion": "1.1",
    "eventSource": "aws:dynamodb",
    "awsRegion": "us-east-1",
    "dynamodb": {
      "ApproximateCreationDateTime": 1529636100,
      "Keys": {
        "id": {
          "S": "bbf1ae40-75c7-11e8-b1f5-e7a9339da1f0"
        },
        "username": {
          "S": "tester"
        }
      },
      "OldImage": {
        "createdAt": {
          "N": "1529636135812"
        },
        "img_key": {
          "S": "tester/one.jpg"
        },
        "img_thumb_key": {
          "S": "tester/one-thumbnail.jpg"
        },
        "birthtime": {
          "N": "1340844911000"
        },
        "id": {
          "S": "bbf1ae40-75c7-11e8-b1f5-e7a9339da1f0"
        },
        "userIdentityId": {
          "S": "us-east-1:7261e973-d20d-406a-828c-d8cf70fd888e"
        },
        "people": {
          "L": [
            {
              "S": "Steve"
            },
            {
              "S": "Oren"
            }
          ]
        },
        "group": {
          "S": "sosnowski-roberts"
        },
        "tags": {
          "L": [
            {
              "S": "blue"
            },
            {
              "S": "red"
            }
          ]
        },
        "updatedAt": {
          "N": "1529636135812"
        },
        "username": {
          "S": "tester"
        }
      },
      "SequenceNumber": "52444600000000035236636795",
      "SizeBytes": 330,
      "StreamViewType": "NEW_AND_OLD_IMAGES"
    },
    "eventSourceARN": "arn:am.."
  }
]
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
