import dynamodb from './lib/dynamodb';
import s3 from './lib/s3';
import lambda from './lib/lambda';
import { success, failure } from "./lib/responses";

export async function deleteItem(event, context, callback){
  const userid = event.pathParameters.userid;
  const birthtime = event.pathParameters.birthtime;
  try {
    const params = getInvokeGetParams(userid, birthtime);
    const dbItem = await lambda.invoke(params).promise();
    console.log('dbItem', dbItem);
    // s3 dlete
    const ddbParams = getDynamoDbParams(userid, birthtime);
    await dynamodb.delete(ddbParams).promise();
    return callback(null, success(ddbParams.Key));
    //return callback(null, 'yo!');
  } catch(err){
    return callback(null, failure(err));
  }
};

export function getDynamoDbParams(userid, birthtime){
  return {
    TableName: process.env.DYNAMODB_TABLE,
    Key: {
      userid,
      birthtime: birthtime * 1
    },
  };
}

export function getInvokeGetParams(userid, birthtime){
  return {
    InvocationType: 'Event',
    FunctionName: 'get',
    LogType: 'None',
    Payload: JSON.stringify({userid,birthtime})
  }
}
