import test from 'tape';
import uuid from 'uuid';
import * as query from './query';

const requestBody = {
  userid: uuid.v1(),
  criteria: {
    people: ['Lucy', 'Ahmed'],
    tags: ['flowers', 'trees'],
  },
  from: 345,
  to: 678,
};

test('validateRequest', (t) => {
  try {
    const result = query.validateRequest(JSON.stringify(requestBody));
    t.deepEqual(result, requestBody);
    t.end();
  } catch (e) {
    t.fail(e);
  }
});


test('getResponseBody - no results from db', (t) => {
  const result = query.getResponseBody({ Items: [] }, requestBody);
  t.ok(result.includes('No items found'));
  t.end();
});


test('getResponseBody - no items after filter', (t) => {
  const result = query.getResponseBody({
    Items: [{
      people: [],
      tags: ['Castle', 'Countryside'],
    }],
  }, requestBody);
  t.ok(result.includes('No items found'));
  t.end();
});

test('getResponseBody - items after filter', (t) => {
  const result = query.getResponseBody({
    Items: [{
      people: ['Lucy', 'Bob'],
      tags: [],
    },
    {
      tags: ['trees'],
      people: ['Ahmeds Uncle'],
    }],
  }, requestBody);
  t.equal(result.length, 2);
  t.end();
});

test('filterItemsByCriteria', (t) => {
  const items = [{
    people: ['Lucy', 'Bob'],
    tags: [],
  },
  {
    tags: ['trees'],
    people: [],
  }];
  const result = query.filterItemsByCriteria(items, requestBody);
  t.equal(result.length, 2);
  t.end();
});

test('filterByCriteria', (t) => {
  const item = {
    people: ['Lucy', 'Bob'],
    tags: [],
  };
  const result = query.filterByCriteria(item, 'people', requestBody.criteria.people);
  t.ok(result);
  t.end();
});


test('getDynamoDbParams', (t) => {
  process.env.DYNAMODB_TABLE = 'TABLE';
  try {
    const params = query.getDynamoDbParams(requestBody);
    t.equal(params.ExpressionAttributeValues[':userid'], requestBody.userid);
    t.end();
  } catch (e) {
    t.fail(e);
  }
});

