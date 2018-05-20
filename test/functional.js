import util from 'util';
import fs from 'fs';
import path from 'path';
import test from 'tape';

export default function (auth, api, upload) {
  const configPath = path.join(process.cwd(), './output/config.json');
  const config = process.env.IS_OFFLINE ?
    null :
    JSON.parse(fs.readFileSync(configPath, 'utf8'));

  const apiUrl = process.env.IS_OFFLINE ?
    'http://localhost:3000' :
    config.ServiceEndpoint;


  const getEndpointPath = rec => `/foto/${rec.username}/${rec.id}`;
  const formatError = (e) => {
    console.log('error', util.inspect(e));
  };
  /*

  todos
  - set up cloudfront (sep stack? just for prod)
  - switch stages
  - CI tool
  - auto get exif data on create

  */
  let username = '';
  let images = [];
  let records = [];

  test('setup', (t) => {
    auth(config)
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
          birthtime: '2012-06-28T00:55:11.000Z',
          tags: ['blue', 'red'],
          people: ['Steve', 'Oren'],
        }, {
          username,
          birthtime: '2014-06-28T00:55:11.000Z',
          tags: ['blue', 'yellow'],
          people: ['Miki', 'Oren'],
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
      })
      .catch(formatError);
  });


  test('query by tag and person', (t) => {
    t.plan(2);

    const query = {
      criteria: {
        tags: ['yellow'],
        people: ['Miki'],
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
    t.plan(2);

    const query = {
      criteria: {
        tags: ['blue'],
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

  test('query by person only', (t) => {
    t.plan(2);

    const query = {
      username,
      criteria: {
        people: ['Oren'],
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

  test('force kill amplify process', (t) => {
    t.end();
    process.exit(0);
  });
}
