import test from 'tape';
import uuid from 'uuid';
import * as deleteFns from './delete';

const request = {
  userid: uuid.v1(),
  birthtime: 123,
};

test('getS3Params', (t) => {
  const result = deleteFns.getS3Params(JSON.stringify(request));
  t.deepEqual(result, request);
  t.end();
});


test('getInvokeGetParams', (t) => {
  const result = deleteFns.getInvokeGetParams(JSON.stringify(request));
  t.deepEqual(result, request);
  t.end();
});

