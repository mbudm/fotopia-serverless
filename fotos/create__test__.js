import test from 'tape';
import uuid from 'uuid';
import * as create from './create';

const requestBody = {
  userid: uuid.v1(),
  birthtime: 123,
  people: ['Bob'],
  tags: [],
  key: `${uuid.v1()}-me.jpg`,
  location: 'https://location.of.image.com/me.jpg',
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
    t.deepEqual(params.Item.userid, requestBody.userid);
    t.end();
  } catch (e) {
    t.fail(e);
  }
});

