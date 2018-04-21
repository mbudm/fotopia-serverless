import test from 'tape';
import uuid from 'uuid';
import * as create from './create';

const username = 'jethro';

const requestBody = {
  username,
  birthtime: 123,
  people: ['Bob'],
  tags: [],
  img_key: `${username}/me.jpg`,
};

const recordId = uuid.v1();

test('validateRequest', (t) => {
  try {
    const result = create.validateRequest(JSON.stringify(requestBody));
    t.deepEqual(result, requestBody);
    t.end();
  } catch (e) {
    t.fail(e);
  }
});

test('getDynamoDbParams', (t) => {
  process.env.DYNAMODB_TABLE = 'TABLE';
  try {
    const params = create.getDynamoDbParams(requestBody, recordId);
    t.deepEqual(params.Item.username, requestBody.username);
    t.end();
  } catch (e) {
    t.fail(e);
  }
});

