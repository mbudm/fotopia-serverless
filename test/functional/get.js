import test from 'tape';
import formatError from './formatError';
import getEndpointPath from './getEndpointPath';

export default function getTests(setupData, api) {
  let imageWithFourPeople;
  test('query all to get an id', (t) => {
    t.plan(2);

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
        t.ok(responseBody.find(rec => rec.img_key === setupData.images[0].key), 'image one found');
        imageWithFourPeople = responseBody.find(rec => rec.img_key === setupData.images[1].key);
        t.ok(imageWithFourPeople, 'image with four people found');
      })
      .catch(formatError);
  });

  test('get an item', (t) => {
    t.plan(1);
    const apiPath = getEndpointPath(imageWithFourPeople);
    api.get(setupData.apiUrl, apiPath)
      .then((responseBody) => {
        t.equal(responseBody.id, imageWithFourPeople.id);
      })
      .catch(formatError);
  });
}
