import test from 'tape';
import uuid from 'uuid';
import * as update from './update';

const requestBody = {
  username: 'pedro',
  id: uuid.v1(),
  birthtime: 123,
  people: ['Bob'],
  tags: [],
  meta: {
    location: 'Peru',
  },
};

test('validateRequest', (t) => {
  try {
    const result = update.validateRequest(JSON.stringify(requestBody));
    t.deepEqual(result, requestBody);
    t.end();
  } catch (e) {
    t.fail(e);
  }
});

test('getDynamoDbParams', (t) => {
  process.env.DYNAMODB_TABLE = 'TABLE';
  try {
    const params = update.getDynamoDbParams(requestBody);
    t.deepEqual(params.Key.username, requestBody.username);
    t.end();
  } catch (e) {
    t.fail(e);
  }
});

