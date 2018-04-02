
import fetch from 'isomorphic-fetch';
import axios from 'axios';
import aws4 from 'aws4';
// import { Signer } from 'aws-amplify';

const handleError = e => console.error(e);

export function post(hostname, route, params, auth) {
  const hostnameBits = hostname.split('/');
  const stackPath = hostnameBits.pop();
  const host = hostnameBits.join('/');
  const aws4SignedParams = auth ? aws4.sign({
    host,
    service: 'execute-api',
    path: `${stackPath}${route}`,
    body: JSON.stringify(params.body),
    headers: {
      Host: hostnameBits[2],
      'Content-Type': 'application/json',
    },
  }, auth) : {};

  // delete aws4SignedParams.headers.Host;

  return fetch(`${hostname}${route}`, {
    method: 'POST',
    body: JSON.stringify(params.body),
    headers: aws4SignedParams.headers,
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
