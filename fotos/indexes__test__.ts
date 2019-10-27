import { DynamoDBRecord } from "aws-lambda";
import * as test from "tape";
import * as indexes from "./indexes";
import { getIndexUpdates } from "./stream";
import { IIndex, IIndexUpdate, IIndexDictionary } from "./types";

import {
  DocumentClient as DocClient,
} from "aws-sdk/lib/dynamodb/document_client.d";

test("parseIndexesObject ", (t) => {

  process.env.DYNAMODB_TABLE_INDEXES = "TABLE";
  const batchGetItemOutput: DocClient.BatchGetItemOutput = {
    Responses: {
      [process.env.DYNAMODB_TABLE_INDEXES]: [{
        id: indexes.TAGS_ID,
        black: 0,
        pink: 2,
        yellow: 1,
      }, {
        id: indexes.PEOPLE_ID,
        emma: 1,
        leona: 1,
        wilma: 2,
      }]
    }
  };
  const result = indexes.parseIndexesObject(batchGetItemOutput);
  t.equal(result.tags.black, 0, "tag parsed to index shape");
  t.equal(result.people.leona, 1, "person parsed to index shape");
  t.end();
});

test("getDynamoDbUpdateItemParams", (t) => {
  const tags: IIndexDictionary = {
    yellow: -2,
  }
  const result = indexes.getDynamoDbUpdateItemParams(indexes.TAGS_ID, tags);
  t.deepEqual(result.ExpressionAttributeNames, { '#yellow': 'yellow' });
  t.equal(result.ExpressionAttributeValues![':yellow'], tags.yellow);
  t.deepEqual(result.Key, { id: 'tags' });
  t.end();
});
