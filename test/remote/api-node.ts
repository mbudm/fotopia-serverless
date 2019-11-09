import "isomorphic-fetch";
import sigV4Client from "./sigV4Client";

export default function api(region: string, credentials) {
  return {
    del: (endpoint: string, route: string) => invokeApig({
      credentials,
      endpoint,
      method: "DELETE",
      region,
      route,
    }),
    get: (endpoint: string, route: string) => invokeApig({
      credentials,
      endpoint,
      method: "GET",
      region,
      route,
    }),
    post: (endpoint: string, route: string, params: any) => invokeApig({
      body: params.body,
      credentials,
      endpoint,
      method: "POST",
      region,
      route,
    }),
    put: (endpoint: string, route: string, params: any) => invokeApig({
      body: params.body,
      credentials,
      endpoint,
      method: "PUT",
      region,
      route,
    }),
  };
}

async function invokeApig({
  region,
  credentials,
  endpoint,
  route,
  method = "GET",
  headers = {},
  queryParams = {},
  body = {},
}) {

  const signedRequest = sigV4Client
    .newClient({
      accessKey: credentials.accessKeyId,
      endpoint,
      region,
      secretKey: credentials.secretAccessKey,
      sessionToken: credentials.sessionToken,
    })
    .signRequest({
      body,
      headers,
      method,
      path: route,
      queryParams,
    });

  const bodyString: string = body ? JSON.stringify(body) : "";

  const results = await fetch(signedRequest.url, {
    body: bodyString,
    headers: signedRequest.headers,
    method,
  });

  if (results.status !== 200) {
    console.error("API ERROR")
    console.error("-> url", signedRequest.url);
    console.error("-> body:", bodyString);
    console.error("-> headers:", signedRequest.headers)
    throw new Error(await results.text());
  }

  return results.json();
}
