import dynamodb from './lib/dynamodb';
import s3 from './lib/s3';
import lambda from './lib/lambda';
import { success, failure } from "./lib/responses";

export async function deleteItem(event, context, callback){
  const userid = event.pathParameters.userid;
  const birthtime = event.pathParameters.birthtime;
  try {
    const params = getInvokeGetParams(userid, birthtime);
    const dbGetResponse = await lambda.invoke(params).promise();
    console.log('dbGetResponse', dbGetResponse);
    const s3Params = getS3Params(dbGetResponse);
    console.log('s3Params', s3Params);
    await s3.deleteObject(s3Params).promise();
    const ddbParams = getDynamoDbParams(userid, birthtime);
    await dynamodb.delete(ddbParams).promise();
    return callback(null, success(ddbParams.Key));
  } catch(err){
    return callback(null, failure(err));
  }
};

export function getS3Params(dbGetResponse){
  const dbItemObj = JSON.parse(dbGetResponse.body);
  return {
    Bucket: 'fotopia-web-app-prod',
    Key: dbItemObj.key
   };
}

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
