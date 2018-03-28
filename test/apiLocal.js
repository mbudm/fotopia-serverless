
const fetch = require('isomorphic-fetch');

const apiUrl = 'http://localhost:3000';

const handlError = e => console.error(e);

module.exports = {
  postLocal(key, route, params) {
    return fetch(`${apiUrl}${route}`, {
      method: 'POST',
      body: JSON.stringify(params.body),
    })
      .then(response => response.json())
      .catch(handlError);
  },
  getLocal(key, route) {
    return fetch(`${apiUrl}${route}`)
      .then(response => response.json())
      .catch(handlError);
  },
  delLocal(key, route) {
    return fetch(`${apiUrl}${route}`, {
      method: 'DELETE',
    })
      .then(response => response.json())
      .catch(handlError);
  },
};
