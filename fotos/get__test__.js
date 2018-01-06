import test from 'tape';
import uuid from 'uuid';
import * as get from './get';

const request = {
  userid: uuid.v1(),
  birthtime: 123,
};

test('validateRequest', (t) => {
  try {
    const result = get.validateRequest(request);
    t.deepEqual(result, request);
    t.end();
  } catch (e) {
    t.fail(e);
  }
});

test('getResponseBody w Item', (t) => {
  const result = get.getResponseBody({ Item: { ...request } }, request);
  t.deepEqual(result, request);
  t.end();
});

test('getResponseBody w/o Item', (t) => {
  const result = get.getResponseBody({}, request);
  t.ok(result.includes('No item found'));
  t.end();
});

test('get.getDynamoDbParams', (t) => {
  process.env.DYNAMODB_TABLE = 'TABLE';
  try {
    const params = get.getDynamoDbParams(request);
    t.equal(params.Key.userid, request.userid);
    t.end();
  } catch (e) {
    t.fail(e);
  }
});

