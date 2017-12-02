
require('es6-promise').polyfill();
require('isomorphic-fetch');
const test = require('tape');
const localhost = "http://localhost:3000/"

const records = [{
  "userid":"steve",
  "birthtime":"2012-06-28T00:55:11.000Z",
  "tags":["blue","red"],
  "people":["Steve","Oren"]
}, {
  "userid":"steve",
  "birthtime":"2014-06-28T00:55:11.000Z",
  "tags":["blue","yellow"],
  "people":["Miki","Oren"]
}];



test('create an item', function (t) {
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

test('create another item', function (t) {
  t.plan(1);

  fetch(localhost + 'create', {
    method: 'POST',
    body: JSON.stringify(records[1])
  })
    .then((response) => response.json())
    .then((responseBody) => {
      t.equal(responseBody.userid, records[1].userid);
    });
});

test('query by tag and person', function (t) {
  t.plan(2);

  const query = {
    "userid":"steve",
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
    "userid":"steve",
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
    "userid":"steve",
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
