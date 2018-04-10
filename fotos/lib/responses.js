
const buildResponse = (statusCode, body) => {
  console.log(statusCode, 'body', body);
  return {
    statusCode,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Credentials': true,
    },
    body: JSON.stringify(body),
  };
};

export const success = body => buildResponse(200, body);

export const failure = body => buildResponse(500, { error: body });
