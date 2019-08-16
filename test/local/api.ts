
import * as fetch from "isomorphic-fetch";

// tslint:disable-next-line:no-console
const handleError = (e) => console.error(e);

export function post(hostname, route, params) {
  return fetch(`${hostname}${route}`, {
    body: JSON.stringify(params.body),
    method: "POST",
  })
    .then((response) => response.json())
    .catch(handleError);
}

export function get(hostname, route) {
  return fetch(`${hostname}${route}`)
    .then((response) => response.json())
    .catch(handleError);
}

export function del(hostname, route) {
  return fetch(`${hostname}${route}`, {
    method: "DELETE",
  })
    .then((response) => response.json())
    .catch(handleError);
}

export function put(hostname, route, params) {
  return fetch(`${hostname}${route}`, {
    body: JSON.stringify(params.body),
    method: "PUT",
  })
    .then((response) => response.json())
    .catch(handleError);
}
