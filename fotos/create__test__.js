import test from 'tape';
import uuid from 'uuid';
import * as create from './create';

const username = 'jethro';

const requestBody = {
  username,
  userIdentityId: username,
  birthtime: 123,
  people: ['Bob'],
  tags: [],
  img_key: `${username}/me.jpg`,
};

const recordId = uuid.v1();

const fotopiaGroup = 'my-group';

test('validateRequest', (t) => {
  try {
    const result = create.validateRequest(JSON.stringify(requestBody));
    t.deepEqual(result, requestBody);
    t.end();
  } catch (e) {
    t.fail(e);
  }
});

test('createThumbKey - safe filename', (t) => {
  const key = 'username/somefile.jpg';
  const thumbKey = `username/somefile${create.THUMB_SUFFIX}.jpg`;
  const result = create.createThumbKey(key);
  t.equal(thumbKey, result);
  t.end();
});

test('createThumbKey - filename extra dots', (t) => {
  const key = 'user.name/some.file.jpg';
  const thumbKey = `user.name/some.file${create.THUMB_SUFFIX}.jpg`;
  const result = create.createThumbKey(key);
  t.equal(thumbKey, result);
  t.end();
});

test('getDynamoDbParams', (t) => {
  process.env.DYNAMODB_TABLE = 'TABLE';
  try {
    const params = create.getDynamoDbParams(requestBody, recordId, fotopiaGroup);
    t.deepEqual(params.Item.username, requestBody.username);
    t.end();
  } catch (e) {
    t.fail(e);
  }
});

