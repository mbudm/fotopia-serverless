import test from 'tape';
import formatError from './formatError';
import getEndpointPath from './getEndpointPath';

export default function deleteTests(setupData, api) {
  let imageOne;

  test('query image one by unique tag', (t) => {
    const query = {
      criteria: {
        tags: [setupData.uniqueTag],
      },
      from: '2004-04-04',
      to: '2017-11-02',
    };

    api.post(setupData.apiUrl, '/query', {
      body: query,
    })
      .then((responseBody) => {
        t.equal(responseBody.length, 1);
        t.end();
      })
      .catch(formatError);
  });

  test('delete imageOne', (t) => {
    t.plan(2);
    const apiPath = getEndpointPath(imageOne);
    api.del(setupData.apiUrl, apiPath)
      .then((responseBody) => {
        t.equal(responseBody.username, setupData.username);
        t.equal(responseBody.id, imageOne.id);
      })
      .catch(formatError);
  });
}
