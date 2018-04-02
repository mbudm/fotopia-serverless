
import fetch from 'isomorphic-fetch';
import { API } from 'aws-amplify';

const handleError = e => console.error(e);

function postLocal(hostname, route, params) {
  return fetch(`${hostname}${route}`, {
    method: 'POST',
    body: JSON.stringify(params.body),
  })
    .then(response => response.json())
    .catch(handleError);
}

function getLocal(hostname, route) {
  return fetch(`${hostname}${route}`)
    .then(response => response.json())
    .catch(handleError);
}

function delLocal(hostname, route) {
  return fetch(`${hostname}${route}`, {
    method: 'DELETE',
  })
    .then(response => response.json())
    .catch(handleError);
}
const endpointName = 'fotos';
const postRemote = (hostname, route, params) => API.post(endpointName, route, params);
const getRemote = (hostname, route) => API.get(endpointName, route);
const delRemote = (hostname, route) => API.del(endpointName, route);
export const post = process.env.IS_OFFLINE ? postLocal : postRemote;
export const get = process.env.IS_OFFLINE ? getLocal : getRemote;
export const del = process.env.IS_OFFLINE ? delLocal : delRemote;
