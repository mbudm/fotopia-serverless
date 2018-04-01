
import fetch from 'isomorphic-fetch';
import aws4 from 'aws4';

const handleError = e => console.error(e);

export function post(hostname, route, params, auth) {
  const headers = auth ? aws4.sign({
    hostname,
    path: route,
    body: params.body,
  }, auth) : {};
  return fetch(`${hostname}${route}`, {
    method: 'POST',
    body: JSON.stringify(params.body),
    headers,
  })
    .then(response => response.json())
    .catch(handleError);
}

export function get(hostname, route, auth) {
  const headers = auth ? aws4.sign({
    hostname,
    path: route,
  }, auth) : {};
  return fetch(`${hostname}${route}`, {
    headers,
  })
    .then(response => response.json())
    .catch(handleError);
}

export function del(hostname, route, auth) {
  const headers = auth ? aws4.sign({
    hostname,
    path: route,
    method: 'DELETE',
  }, auth) : {};
  return fetch(`${hostname}${route}`, {
    method: 'DELETE',
    headers,
  })
    .then(response => response.json())
    .catch(handleError);
}
