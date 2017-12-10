
require('es6-promise').polyfill();
require('isomorphic-fetch');
const fs = require('fs');
const path = require('path');
const uuid = require('uuid');
const test = require('tape');
const localhost = "http://localhost:3000/"
const userid = uuid.v1();

const imageStream = fs.createReadStream(path.resolve(__dirname, './mock/one.jpg'));

const records = [{
  "userid":userid,
  "birthtime":"2012-06-28T00:55:11.000Z",
  "tags":["blue","red"],
  "imageBuffer": imageStream,
  "filename": "one.jpg",
  "people":["Steve","Oren"]
}, {
  "userid":userid,
  "birthtime":"2014-06-28T00:55:11.000Z",
  "tags":["blue","yellow"],
  "imageBuffer": imageStream,
  "filename": "one.jpg",
  "people":["Miki","Oren"]
}];

test('upload an image', (t) => {
  t.plan(1);
  fetch(localhost + 'upload', {
    method: 'POST',
    body: imageStream
  })
    .then((response) => response.json())
    .then((responseBody) => {
      t.equal(responseBody.userid, records[0].userid);
    });
});

test('check db or s3 for uploaded image record', (t) => {
  t.plan(1);
  fetch(localhost + 'upload', {
    method: 'POST',
    body: imageStream
  })
    .then((response) => response.json())
    .then((responseBody) => {
      t.equal(responseBody.userid, records[0].userid);
    });
});

test('update db with uploaded image meta data', function (t) {
  t.plan(1);

  fetch(localhost + 'create', {
    method: 'POST',
    body: JSON.stringify(records[0])
  })
    .then((response) => response.json())
    .then((responseBody) => {
      t.equal(responseBody.userid, records[0].userid);
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

  fetch(localhost + 'query', {
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

  fetch(localhost + 'query', {
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

  fetch(localhost + 'query', {
    method: 'POST',
    body: JSON.stringify(query)
  })
    .then((response) => response.json())
    .then((responseBody) => {
      t.equal(responseBody.length, 2);
    });
});

