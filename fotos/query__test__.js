import test from 'tape';
import * as query from './query';

const requestBody = {
  username: 'saloni',
  criteria: {
    people: ['Lucy', 'Ahmed'],
    tags: ['flowers', 'trees'],
  },
  from: 345,
  to: 678,
};

test('validateRequest', (t) => {
  try {
    const result = query.validateRequest(requestBody);
    t.deepEqual(result, requestBody);
    t.end();
  } catch (e) {
    t.fail(e);
  }
});

test('hasCriteria - no arg', (t) => {
  const result = query.hasCriteria();
  t.equal(result, false);
  t.end();
});

test('hasCriteria - no arrays', (t) => {
  const result = query.hasCriteria({});
  t.equal(result, false);
  t.end();
});

test('hasCriteria - empty arrays', (t) => {
  const result = query.hasCriteria({
    tags: [],
    someOtherCriteria: [],
  });
  t.equal(result, false);
  t.end();
});

test('hasCriteria - one empty array', (t) => {
  const result = query.hasCriteria({
    tags: ['a tag'],
    someOtherCriteria: [],
    people: [],
  });
  t.equal(result, true);
  t.end();
});

test('hasCriteria - no empty arrays', (t) => {
  const result = query.hasCriteria({
    tags: ['a tag'],
    someOtherCriteria: ['a thing', 'another thing'],
    people: ['some geezer'],
  });
  t.equal(result, true);
  t.end();
});

test('getResponseBody - no results from db', (t) => {
  const result = query.getResponseBody({ Items: [] }, requestBody);
  t.ok(result.includes('No items found'));
  t.end();
});

test('getResponseBody - items after filter', (t) => {
  const requestBodyNoCriteria = {
    ...requestBody,
    criteria: {
      people: [],
      tags: [],
    },
  };
  const result = query.getResponseBody({
    Items: [{
      people: ['Lucy', 'Bob'],
      tags: [],
    },
    {
      tags: ['trees'],
      people: ['Ahmed'],
    }],
  }, requestBodyNoCriteria);

  t.ok(Array.isArray(result));
  t.equal(result.length, 2);
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
      people: ['Ahmed'],
    }],
  }, requestBody);
  t.equal(result.length, 2);
  t.end();
});

test('getResponseBody - items after single criteria filter', (t) => {
  const requestBodySingleCriteria = {
    ...requestBody,
    criteria: {
      people: ['Lucy'],
      tags: [],
    },
  };
  const result = query.getResponseBody({
    Items: [{
      people: ['Lucy', 'Bob'],
      tags: [],
    },
    {
      tags: ['trees'],
      people: ['Ahmed'],
    }],
  }, requestBodySingleCriteria);
  t.equal(result.length, 1);
  t.ok(result[0].people.includes('Lucy'));
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
    t.equal(params.ExpressionAttributeValues[':username'], requestBody.username);
    t.end();
  } catch (e) {
    t.fail(e);
  }
});

