
import fetch from 'isomorphic-fetch';
import aws4 from 'aws4';
import { Signer } from 'aws-amplify';

const handleError = e => console.error(e);

export function post(hostname, route, params, auth, config) {
  const headers = auth ? aws4.sign({
    hostname,
    path: route,
    body: JSON.stringify(params.body),
  }, auth) : {};

  const paramsForSigner = {
    method: 'POST',
    url: `${hostname}${route}`,
    host: hostname,
    path: route,
    headers: {},
    data: null,
  };

  const signedParams = Signer.sign(paramsForSigner, auth, {
    service: 'execute-api',
    region: config.Region,
  });

  console.log('aws4 res', headers);
  console.log('amplify signer res', signedParams);

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
