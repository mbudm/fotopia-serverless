import test from 'tape';
import formatError from './formatError';

export default function queryTests(setupData, api) {
  let imageWithFourPeople;

  test('query all', (t) => {
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


  test('query by tag and person', (t) => {
    t.plan(2);
    const query = {
      criteria: {
        tags: ['yellow'],
        people: imageWithFourPeople.people,
      },
      from: '2004-04-04',
      to: '2017-11-02',
    };

    api.post(setupData.apiUrl, '/query', {
      body: query,
    })
      .then((responseBody) => {
        t.notOk(responseBody.find(rec => rec.img_key === setupData.images[0].key), 'image one not found');
        t.ok(responseBody.find(rec => rec.img_key === imageWithFourPeople.img_key), 'image with four people found');
      })
      .catch(formatError);
  });

  test('query by tag only', (t) => {
    t.plan(3);

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
        t.ok(responseBody.find(rec => rec.img_key === setupData.images[0].key), 'image one found');
        t.notOk(responseBody.find(rec => rec.img_key === setupData.images[1].key), 'image w four people not found');
      })
      .catch(formatError);
  });

  test('query by person only', (t) => {
    t.plan(1);

    const query = {
      username: setupData.username,
      criteria: {
        people: imageWithFourPeople.people,
      },
      from: '2004-04-04',
      to: '2017-11-02',
    };

    api.post(setupData.apiUrl, '/query', {
      body: query,
    })
      .then((responseBody) => {
        t.equal(responseBody.length, 1);
        t.notOk(responseBody.find(rec => rec.img_key === setupData.images[0].key), 'image one not found');
        t.ok(responseBody.find(rec => rec.img_key === imageWithFourPeople.img_key), 'image with four people found');
      })
      .catch(formatError);
  });
}
