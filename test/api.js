
import fetch from 'isomorphic-fetch';
import aws4 from 'aws4';
import { Signer } from 'aws-amplify';

const handleError = e => console.error(e);

export function post(hostname, route, params, auth, config) {
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

  const signerAuth = {
    secret_key: auth.secretAccessKey,
    access_key: auth.accessKeyId,
    session_token: auth.sessionToken,
  };

  const paramsForSigner = {
    method: 'POST',
    url: `${hostname}${route}`,
    host,
    path: `${stackPath}${route}`,
    headers: {
      'Content-Type': 'application/json',
      'Content-Length': `${aws4SignedParams.headers['Content-Length']}`,
    },
    data: null,
  };


  console.log(' paramsForSigner ', paramsForSigner);

  const signedParams = Signer.sign(paramsForSigner, signerAuth, {
    service: 'execute-api',
    region: config.Region,
  });

  console.log(' signedParams ', signedParams.headers);

  console.log(' aws4SignedParams ', aws4SignedParams.headers);
  // delete aws4SignedParams.headers.Host;

  return fetch(`${hostname}${route}`, {
    method: 'POST',
    body: JSON.stringify(params.body),
    headers: {
      ...signedParams.headers,
      Authorization: aws4SignedParams.headers.Authorization,
    },
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
