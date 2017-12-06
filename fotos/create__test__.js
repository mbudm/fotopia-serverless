
import * as create from './create';
import test from 'tape';
import uuid from 'uuid';
import sinon from 'sinon';

const requestBody = {
  userid: uuid.v1(),
  birthtime: 123,
  people: ["Bob"],
  tags:[]
}

test('validateRequest', t => {
  try {
    const result = create.validateRequest(JSON.stringify(requestBody));
    t.deepEqual(result, requestBody);
    t.end();
  } catch (e) {
    t.fail(e);
  }
});

test('getCreateParams', t => {
  process.env.DYNAMODB_TABLE = "TABLE";
  try {
    const params = create.getCreateParams(requestBody);
    t.deepEqual(params.Item.userid, requestBody.userid);
    t.end();
  } catch (e) {
    t.fail(e);
  }
});
