import test from 'tape';
import uuid from 'uuid';
import * as update from './update';

const requestParams = {
  username: 'pedro',
  id: uuid.v1(),
};
const requestBody = {
  people: ['Bob'],
  meta: {
    location: 'Peru',
  },
};

test('validateBody', (t) => {
  try {
    const result = update.validateBody(requestBody);
    t.deepEqual(result, requestBody);
    t.end();
  } catch (e) {
    t.fail(e);
  }
});

test('getDynamoDbParams', (t) => {
  process.env.DYNAMODB_TABLE = 'TABLE';
  try {
    const params = update.getDynamoDbParams(requestParams, requestBody);
    t.deepEqual(params.Key.username, requestParams.username);
    t.equal(params.UpdateExpression, 'SET #people = :people, #meta = :meta updatedAt = :updatedAt');
    t.end();
  } catch (e) {
    t.fail(e);
  }
});

