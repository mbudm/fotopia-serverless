
import fetch from 'isomorphic-fetch';

const handleError = e => console.error(e);

export function post(hostname, route, params) {
  return fetch(`${hostname}${route}`, {
    method: 'POST',
    body: JSON.stringify(params.body),
  })
    .then(response => response.json())
    .catch(handleError);
}

export function get(hostname, route) {
  return fetch(`${hostname}${route}`)
    .then(response => response.json())
    .catch(handleError);
}

export function del(hostname, route) {
  return fetch(`${hostname}${route}`, {
    method: 'DELETE',
  })
    .then(response => response.json())
    .catch(handleError);
}
