import test from 'tape';
import formatError from './formatError';
import getEndpointPath from './getEndpointPath';

export default function updateTests(setupData, api) {
  let imageWithFourPeople;

  test('query all to get img with four people', (t) => {
    const query = {
      username: setupData.username,
      criteria: {
        people: [],
        tags: [],
      },
      from: '2004-04-04',
      to: '2017-11-02',
    };

    api.post(setupData.apiUrl, '/query', {
      body: query,
    })
      .then((responseBody) => {
        imageWithFourPeople = responseBody.find(rec => rec.img_key === setupData.images[1].key);
        t.ok(imageWithFourPeople, 'image with four people found');
        t.end();
      })
      .catch(formatError);
  });

  test('update imageWithFourPeople', (t) => {
    t.plan(3);
    const updatedRecord = {
      meta: {
        newProperty: 'squirrel',
      },
    };
    const apiPath = getEndpointPath(imageWithFourPeople);
    api.put(setupData.apiUrl, apiPath, { body: updatedRecord })
      .then((responseBody) => {
        t.equal(responseBody.username, imageWithFourPeople.username);
        t.equal(responseBody.id, imageWithFourPeople.id);
        t.equal(responseBody.meta.newProperty, updatedRecord.meta.newProperty);
      })
      .catch(formatError);
  });

  test('get updated item', (t) => {
    t.plan(3);
    const apiPath = getEndpointPath(imageWithFourPeople);
    api.get(setupData.apiUrl, apiPath)
      .then((responseBody) => {
        t.equal(responseBody.id, imageWithFourPeople.id);
        t.equal(responseBody.meta.newProperty, 'squirrel', 'updated data');
        t.ok(responseBody.tags.includes(imageWithFourPeople.tags[0]), 'existing data unaffected');
      })
      .catch(formatError);
  });
}
