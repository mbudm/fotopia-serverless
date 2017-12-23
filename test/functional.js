
require('es6-promise').polyfill();
require('isomorphic-fetch');
const fs = require('fs');
const path = require('path');
const uuid = require('uuid');
const test = require('tape');

const upload = require('./upload');


const bucket = 'fotopia-web-app-prod';
const host = process.env.hostname || "http://localhost:3000/";
const s3Url = process.env.hostname ? false : 'http://localhost:5000';
const userid = uuid.v1();

console.log('urls - ', host, s3Url);

const images = [{
  path: path.resolve(__dirname, './mock/one.jpg'),
  key: userid+'-one.jpg'
},{
  path: path.resolve(__dirname, './mock/two.jpeg'),
  key: userid+'-two.jpg'
}];

const records = [{
  "userid":userid,
  "birthtime":"2012-06-28T00:55:11.000Z",
  "tags":["blue","red"],
  "people":["Steve","Oren"]
}, {
  "userid":userid,
  "birthtime":"2014-06-28T00:55:11.000Z",
  "tags":["blue","yellow"],
  "people":["Miki","Oren"]
}];

const getEndpoint = (rec) => `${host}foto/${rec.userid}/${rec.birthtime}`;


test('upload image one', (t) => {
  t.plan(2);
  upload(images[0].path, bucket, images[0].key, s3Url)
    .then((responseBody) => {
      t.equal(responseBody.key, images[0].key);
      t.equal(responseBody.Bucket, bucket);

      records[0].location = responseBody.Location;
    })
    .catch((e) => {
      console.log('error', e);
    });
});

test('upload image two', (t) => {
  t.plan(2);
  upload(images[1].path, bucket, images[1].key, s3Url)
    .then((responseBody) => {
      t.equal(responseBody.key, images[1].key);
      t.equal(responseBody.Bucket, bucket);

      records[1].location = responseBody.Location;
    })
    .catch((e) => {
      console.log('error', e);
    });
});

test('create image one meta data', function (t) {
  t.plan(1);

  fetch(host + 'create', {
    method: 'POST',
    body: JSON.stringify(records[0])
  })
    .then((response) => response.json())
    .then((responseBody) => {

      const utcBirthTime = new Date(responseBody.birthtime).toISOString();
      t.equal(utcBirthTime, records[0].birthtime);
      records[0].id = responseBody.id;
      records[0].birthtime = responseBody.birthtime;
    })
    .catch((e) => {
      console.log('error', e, );
    });
});

test('create image two meta data', function (t) {
  t.plan(1);

  fetch(host + 'create', {
    method: 'POST',
    body: JSON.stringify(records[1])
  })
    .then((response) => response.json())
    .then((responseBody) => {
      const utcBirthTime = new Date(responseBody.birthtime).toISOString();
      t.equal(utcBirthTime, records[1].birthtime);
      records[1].id = responseBody.id;
      records[1].birthtime = responseBody.birthtime;
    });
});


test('query by tag and person', function (t) {
  t.plan(2);

  const query = {
    "userid":userid,
    "criteria":{
      "tags":["blue"],
      "people":["Miki"]
    },
    "from":"2004-04-04",
    "to":"2017-11-02"
  }

  fetch(host + 'query', {
    method: 'POST',
    body: JSON.stringify(query)
  })
    .then((response) => response.json())
    .then((responseBody) => {
      t.equal(responseBody.length, 1);
      const numericBirthTime = new Date(records[1].birthtime).getTime();
      t.equal(responseBody[0].birthtime, numericBirthTime);
    });
});

test('query by tag only', function (t) {
  t.plan(1);

  const query = {
    "userid":userid,
    "criteria":{
      "tags":["blue"]
    },
    "from":"2004-04-04",
    "to":"2017-11-02"
  }

  fetch(host + 'query', {
    method: 'POST',
    body: JSON.stringify(query)
  })
    .then((response) => response.json())
    .then((responseBody) => {
      t.equal(responseBody.length, 2);
    });
});

test('query by person only', function (t) {
  t.plan(1);

  const query = {
    "userid":userid,
    "criteria":{
      "people":["Oren"]
    },
    "from":"2004-04-04",
    "to":"2017-11-02"
  }

  fetch(host + 'query', {
    method: 'POST',
    body: JSON.stringify(query)
  })
    .then((response) => response.json())
    .then((responseBody) => {
      t.equal(responseBody.length, 2);
    });
});

test('get an item', function (t) {
  t.plan(1);
  const endpoint = getEndpoint(records[0]);
  fetch(endpoint)
    .then((response) => response.json())
    .then((responseBody) => {
      t.equal(responseBody.id, records[0].id);
    });
});


test('delete item', function (t) {
  t.plan(2);
  const endpoint = getEndpoint(records[0]);
  fetch(endpoint, {
    method: 'DELETE'
  })
    .then((response) => response.json())
    .then((responseBody) => {
      t.equal(responseBody.userid, records[0].userid);
      t.equal(responseBody.birthtime, records[0].birthtime);
    })
    .catch((e) => {
      console.log('error', e, );
    });

});

test('get deleted item', function (t) {
  t.plan(1);
  const endpoint = getEndpoint(records[0]);
  fetch(endpoint)
    .then((response) => response.json())
    .then((responseBody) => {
      t.ok(responseBody.startsWith('No item found for'));
    })
    .catch((e) => {
      console.log('error', e, );
    });
});

/*
more tests

get an image record
update a person
update a tag
update metadata

update multiple

delete an image and its record


*/
