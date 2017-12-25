import dynamodb from './lib/dynamodb';
import { success, failure } from './lib/responses';

export function getDynamoDbParams(userid, birthtime) {
  return {
    TableName: process.env.DYNAMODB_TABLE,
    Key: {
      userid,
      birthtime: birthtime * 1,
    },
  };
}

export function getResponseBody(ddbResponse, userid, birthtime) {
  return ddbResponse.Item || `No item found for ${userid} & ${birthtime}`;
}

export async function getItem(event, context, callback) {
  const { userid, birthtime } = event.pathParameters;
  try {
    const ddbParams = getDynamoDbParams(userid, birthtime);
    const ddbResponse = await dynamodb.get(ddbParams).promise();
    const responseBody = getResponseBody(ddbResponse);
    return callback(null, success(responseBody));
  } catch (err) {
    console.error(err, userid, birthtime);
    return callback(null, failure(err));
  }
}
