
require('es6-promise').polyfill();
require('isomorphic-fetch');
const fs = require('fs');
const path = require('path');
const uuid = require('uuid');
const test = require('tape');
const localhost = "http://localhost:3000/"
const userid = uuid.v1();

const mocks = new Promise((resolve, reject) => {
  const image = path.resolve(__dirname, './mock/one.jpg');
  fs.readFile(image, 'utf8', function (err,data) {
    if (err) {
      reject(err);
    }
    resolve(data);
  });
})
  .then(imageData => {
    return [{
      "userid":userid,
      "birthtime":"2012-06-28T00:55:11.000Z",
      "tags":["blue","red"],
      "imageBuffer": imageData,
      "people":["Steve","Oren"]
    }, {
      "userid":userid,
      "birthtime":"2014-06-28T00:55:11.000Z",
      "tags":["blue","yellow"],
      "imageBuffer": imageData,
      "people":["Miki","Oren"]
    }];
  })
  .then(records => {

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

});
