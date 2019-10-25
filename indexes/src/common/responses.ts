
const buildResponse = (statusCode, body) => ({
  body: JSON.stringify(body),
  headers: {
    "Access-Control-Allow-Credentials": true,
    "Access-Control-Allow-Origin": "*",
  },
  statusCode,
});

export const success = (body) => buildResponse(200, body);

export const failure = (body) => buildResponse(500, { error: body });
