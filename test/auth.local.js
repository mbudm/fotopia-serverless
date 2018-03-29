require('dotenv').config();
require('es6-promise').polyfill();
require('isomorphic-fetch');

const uuid = require('uuid');

const uploadLocal = require('./uploadLocal');
const { postLocal, getLocal, delLocal } = require('./apiLocal');

module.exports = {
  auth() {
    return new Promise(resolve => resolve({
      username: uuid.v1(),
    }));
  },
  API: {
    post: postLocal,
    get: getLocal,
    del: delLocal,
  },
  Storage: {
    vault: {
      put: uploadLocal,
    },
  },
};
