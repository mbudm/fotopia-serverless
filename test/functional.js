import dotEnv from 'dotenv';
import util from 'util';
import fs from 'fs';
import path from 'path';
import test from 'tape';


dotEnv.config();

const getEndpointPath = rec => `/foto/${rec.username}/${rec.id}`;
const formatError = (e) => {
  const data = e && e.response && e.response.data ?
    JSON.stringify(e.response.data, null, 2) :
    util.inspect(e);
  console.log('error', data);
};

export function getConfig() {
  return new Promise((res, rej) => {
    if (process.env.IS_OFFLINE) {
      res({
        ServiceEndpoint: 'http://localhost:3000',
      });
    } else {
      const customDomain = process.env.STAGE === 'prod' ?
        process.env.CUSTOM_DOMAIN_PROD :
        process.env.CUSTOM_DOMAIN_DEV;
      const configEndpoint = `https://${customDomain}/config`;
      fetch(configEndpoint)
        .then(response => res(response.json()))
        .catch(rej);
    }
  });
}

export default function (auth, api, upload) {
  let username;
  let images = [];
  let records = [];
  let apiUrl;
  const uniqueTag = `_${Math.random().toString(36).substr(2, 9)}`;

  test('setup', (t) => {
    getConfig()
      .then((config) => {
        apiUrl = config.ServiceEndpoint;
        return auth(config);
      })
      .then((signedIn) => {
        username = signedIn.username;
        images = [{
          path: path.resolve(__dirname, './mock/one.jpg'),
          key: `${username}/one.jpg`,
        }, {
          path: path.resolve(__dirname, './mock/two.jpeg'),
          key: `${username}/two.jpg`,
        }];
        records = [{
          username,
          userIdentityId: signedIn.userIdentityId,
          birthtime: '2012-06-28T00:55:11.000Z',
          tags: ['blue', 'red', uniqueTag],
        }, {
          username,
          userIdentityId: signedIn.userIdentityId,
          birthtime: '2014-06-28T00:55:11.000Z',
          tags: ['blue', 'yellow'],
        }];
        t.end();
      })
      .catch(formatError);
  });


  test('upload image one', (t) => {
    t.plan(1);
    const object = fs.createReadStream(images[0].path);
    upload(images[0].key, object, {
      contentType: 'image/jpeg',
    })
      .then((responseBody) => {
        console.log('image one reponse', responseBody);
        t.equal(responseBody.key, images[0].key);
        records[0].img_key = responseBody.key;
      })
      .catch(formatError);
  });

  test('upload image two', (t) => {
    t.plan(1);
    const object = fs.createReadStream(images[1].path);
    upload(images[1].key, object, {
      contentType: 'image/jpeg',
    })
      .then((responseBody) => {
        t.equal(responseBody.key, images[1].key);
        records[1].img_key = responseBody.key;
      })
      .catch(formatError);
  });

  test('create image one meta data', (t) => {
    t.plan(1);
    api.post(apiUrl, '/create', {
      body: records[0],
    })
      .then((responseBody) => {
        t.equal(responseBody.key, records[0].key);
        records[0].id = responseBody.id;
        records[0].birthtime = responseBody.birthtime;
        records[0].people = responseBody.people;
      })
      .catch(formatError);
  });

  test('create image two meta data', (t) => {
    t.plan(1);
    api.post(apiUrl, '/create', {
      body: records[1],
    })
      .then((responseBody) => {
        t.equal(responseBody.key, records[1].key);
        records[1].id = responseBody.id;
        records[1].birthtime = responseBody.birthtime;
        records[1].people = responseBody.people;
      })
      .catch(formatError);
  });

  test('query all', (t) => {
    t.plan(2);

    const query = {
      username,
      criteria: {
        people: [],
        tags: [],
      },
      from: '2004-04-04',
      to: '2017-11-02',
    };

    api.post(apiUrl, '/query', {
      body: query,
    })
      .then((responseBody) => {
        t.ok(responseBody.find(rec => rec.id === records[0].id));
        t.ok(responseBody.find(rec => rec.id === records[1].id));
      })
      .catch(formatError);
  });


  test('query by tag and person', (t) => {
    t.plan(2);

    const query = {
      criteria: {
        tags: ['yellow'],
        people: records[1].people,
      },
      from: '2004-04-04',
      to: '2017-11-02',
    };

    api.post(apiUrl, '/query', {
      body: query,
    })
      .then((responseBody) => {
        t.notOk(responseBody.find(rec => rec.id === records[0].id));
        t.ok(responseBody.find(rec => rec.id === records[1].id));
      })
      .catch(formatError);
  });

  test('query by tag only', (t) => {
    t.plan(3);

    const query = {
      criteria: {
        tags: [uniqueTag],
      },
      from: '2004-04-04',
      to: '2017-11-02',
    };

    api.post(apiUrl, '/query', {
      body: query,
    })
      .then((responseBody) => {
        t.equal(responseBody.length, 1);
        t.ok(responseBody.find(rec => rec.id === records[0].id));
        t.notOk(responseBody.find(rec => rec.id === records[1].id));
      })
      .catch(formatError);
  });

  test('query by person only', (t) => {
    t.plan(1);

    const query = {
      username,
      criteria: {
        people: records[0].people,
      },
      from: '2004-04-04',
      to: '2017-11-02',
    };

    api.post(apiUrl, '/query', {
      body: query,
    })
      .then((responseBody) => {
        t.ok(responseBody.find(rec => rec.id === records[0].id));
      })
      .catch(formatError);
  });

  test('get an item', (t) => {
    t.plan(1);
    const apiPath = getEndpointPath(records[0]);
    api.get(apiUrl, apiPath)
      .then((responseBody) => {
        t.equal(responseBody.id, records[0].id);
      })
      .catch(formatError);
  });


  test('delete item one', (t) => {
    t.plan(2);
    const apiPath = getEndpointPath(records[0]);
    api.del(apiUrl, apiPath)
      .then((responseBody) => {
        t.equal(responseBody.username, records[0].username);
        t.equal(responseBody.id, records[0].id);
      })
      .catch(formatError);
  });

  test('update item two', (t) => {
    t.plan(3);
    const updatedRecord = {
      meta: {
        newProperty: 'squirrel',
      },
    };
    const apiPath = getEndpointPath(records[1]);
    api.put(apiUrl, apiPath, { body: updatedRecord })
      .then((responseBody) => {
        t.equal(responseBody.username, records[1].username);
        t.equal(responseBody.id, records[1].id);
        t.equal(responseBody.meta.newProperty, updatedRecord.meta.newProperty);
      })
      .catch(formatError);
  });

  test('get updated item', (t) => {
    t.plan(3);
    const apiPath = getEndpointPath(records[1]);
    api.get(apiUrl, apiPath)
      .then((responseBody) => {
        t.equal(responseBody.id, records[1].id);
        t.equal(responseBody.meta.newProperty, 'squirrel', 'updated data');
        t.ok(responseBody.tags.includes(records[1].tags[0]), 'existing data unaffected');
      })
      .catch(formatError);
  });

  let people;

  test('getPeople', (t) => {
    api.get(apiUrl, '/people')
      .then((responseBody) => {
        people = responseBody;
        t.ok(Array.isArray(responseBody), 'people array');
        t.end();
      })
      .catch(formatError);
  });
  if (people.length > 0) {
    // sometimes the faces lambda - that creates the people object in s3 is not complete
    // before the functional tests get to this point. Until I think of a more robust option,
    // cordoning off these two tests
    const updatedPerson = {
      name: 'Jacinta Dias',
    };

    test('updatePerson', (t) => {
      api.put(apiUrl, `/person/${people[0].id}`, { body: updatedPerson })
        .then((responseBody) => {
          t.ok(responseBody, 'update person ok');
          t.end();
        })
        .catch(formatError);
    });

    test('getPeople - check updated name', (t) => {
      api.get(apiUrl, '/people')
        .then((responseBody) => {
          people = responseBody;
          const personInResponse = responseBody.find(person => person.id === people[0].id);
          t.equal(personInResponse.name, updatedPerson.name, 'updated name');
          t.end();
        })
        .catch(formatError);
    });
  }
  test('force kill amplify process', (t) => {
    t.end();
    process.exit(0);
  });
}
