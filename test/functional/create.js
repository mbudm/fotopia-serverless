import test from 'tape';
import formatError from './formatError';

export default function createTests(setupData, api) {
  test('create image one meta data', (t) => {
    t.plan(1);
    api.post(setupData.apiUrl, '/create', {
      body: setupData.records[0],
    })
      .then((responseBody) => {
        t.equal(responseBody.img_key, setupData.images[0].key, `image one key is ${responseBody.img_key} id is ${responseBody.id}`);
      })
      .catch(formatError);
  });

  test('create image with four people meta data', (t) => {
    t.plan(1);
    api.post(setupData.apiUrl, '/create', {
      body: setupData.records[1],
    })
      .then((responseBody) => {
        t.equal(responseBody.img_key, setupData.images[1].key);
      })
      .catch(formatError);
  });
}
