import util from 'util';
import fs from 'fs';
import path from 'path';
import test from 'tape';

import auth from './auth';
import * as api from './api';
import upload from './upload';


const configPath = path.join(process.cwd(), './output/config.json');
const config = process.env.IS_OFFLINE ?
  null :
  JSON.parse(fs.readFileSync(configPath, 'utf8'));

const s3Url = process.env.IS_OFFLINE ?
  'http://localhost:5000' :
  `https://${config.Bucket}.s3.amazonaws.com`;

const apiUrl = process.env.IS_OFFLINE ?
  'http://localhost:3000' :
  config.ServiceEndpoint;


const getEndpointPath = rec => `/foto/${rec.userid}/${rec.birthtime}`;
const getLocation = key => `${s3Url}/${key}`;
const formatError = (e) => {
  console.log('error', util.inspect(e));
};
/*

todos
- logs not working?
- create user using aws sdk
- get hostname using sls cli
- set up cloudfront (sep stack? just for prod)
- switch stages
- CI tool

- auto get exif data on create (use s3 create event? can we get user id from the iam creds?)

*/
let userid = '';
let creds = null;
let images = [];
let records = [];

test('setup', (t) => {
  auth(config)
    .then((signedIn) => {
      userid = signedIn.username;
      creds = process.env.IS_OFFLINE ? null : {
        secretAccessKey: signedIn.secretAccessKey,
        accessKeyId: signedIn.accessKeyId,
        sessionToken: signedIn.token,
      };
      images = [{
        path: path.resolve(__dirname, './mock/one.jpg'),
        key: `${userid}/one.jpg`,
      }, {
        path: path.resolve(__dirname, './mock/two.jpeg'),
        key: `${userid}/two.jpg`,
      }];
      records = [{
        userid,
        birthtime: '2012-06-28T00:55:11.000Z',
        tags: ['blue', 'red'],
        people: ['Steve', 'Oren'],
      }, {
        userid,
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
      records[0].key = responseBody.key;
      records[0].location = getLocation(responseBody.key);
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
      records[1].key = responseBody.key;
      records[1].location = getLocation(responseBody.key);
    })
    .catch(formatError);
});

test('create image one meta data', (t) => {
  t.plan(1);
  api.post(apiUrl, '/create', {
    body: records[0],
  }, creds)
    .then((responseBody) => {
      const utcBirthTime = new Date(responseBody.birthtime).toISOString();
      t.equal(utcBirthTime, records[0].birthtime);
      records[0].id = responseBody.id;
      records[0].birthtime = responseBody.birthtime;
    })
    .catch(formatError);
});

test('create image two meta data', (t) => {
  t.plan(1);
  api.post(apiUrl, '/create', {
    body: records[1],
  }, creds)
    .then((responseBody) => {
      const utcBirthTime = new Date(responseBody.birthtime).toISOString();
      t.equal(utcBirthTime, records[1].birthtime);
      records[1].id = responseBody.id;
      records[1].birthtime = responseBody.birthtime;
    })
    .catch(formatError);
});


test('query by tag and person', (t) => {
  t.plan(2);

  const query = {
    userid,
    criteria: {
      tags: ['yellow'],
      people: ['Miki'],
    },
    from: '2004-04-04',
    to: '2017-11-02',
  };

  api.post(apiUrl, '/query', {
    body: query,
  }, creds)
    .then((responseBody) => {
      t.equal(responseBody.length, 1);
      const numericBirthTime = new Date(records[1].birthtime).getTime();
      t.equal(responseBody[0].birthtime, numericBirthTime);
    })
    .catch(formatError);
});

test('query by tag only', (t) => {
  t.plan(1);

  const query = {
    userid,
    criteria: {
      tags: ['blue'],
    },
    from: '2004-04-04',
    to: '2017-11-02',
  };

  api.post(apiUrl, '/query', {
    body: query,
  }, creds)
    .then((responseBody) => {
      t.equal(responseBody.length, 2);
    })
    .catch(formatError);
});

test('query by person only', (t) => {
  t.plan(1);

  const query = {
    userid,
    criteria: {
      people: ['Oren'],
    },
    from: '2004-04-04',
    to: '2017-11-02',
  };

  api.post(apiUrl, '/query', {
    body: query,
  }, creds)
    .then((responseBody) => {
      t.equal(responseBody.length, 2);
    })
    .catch(formatError);
});

test('get an item', (t) => {
  t.plan(1);
  const apiPath = getEndpointPath(records[0]);
  api.get(apiUrl, apiPath, creds)
    .then((responseBody) => {
      t.equal(responseBody.id, records[0].id);
    })
    .catch(formatError);
});


test('delete item one', (t) => {
  t.plan(2);
  const apiPath = getEndpointPath(records[0]);
  api.del(apiUrl, apiPath, creds)
    .then((responseBody) => {
      t.equal(responseBody.userid, records[0].userid);
      t.equal(responseBody.birthtime, records[0].birthtime);
    })
    .catch(formatError);
});

test('try and get deleted item', (t) => {
  t.plan(1);
  const apiPath = getEndpointPath(records[0]);
  api.get(apiUrl, apiPath, creds)
    .then((responseBody) => {
      t.ok(responseBody.startsWith('No item found for'));
    })
    .catch(formatError);
});
