import dynamodb from './lib/dynamodb';
import s3 from './lib/s3';
import lambda from './lib/lambda';
import { success, failure } from "./lib/responses";

export function invokeLambda(params){
  const invoked = lambda.invoke(params);
  console.log('has a promise method?', invoked.promise);
  return invoked.promise();
}

export async function deleteItem(event, context, callback){
  const userid = event.pathParameters.userid;
  const birthtime = event.pathParameters.birthtime;
  try {
    const params = getInvokeGetParams(userid, birthtime);
    console.log('invole params', params);
    const dbGetResponse = await invokeLambda(params);
    console.log('dbGetResponse', dbGetResponse);
    const s3Params = getS3Params(dbGetResponse);
    console.log('s3Params', s3Params);
    await s3.deleteObject(s3Params).promise();
    const ddbParams = getDynamoDbParams(userid, birthtime);
    await dynamodb.delete(ddbParams).promise();
    return callback(null, success(ddbParams.Key));
  } catch(err){
    console.error(err, userid, birthtime);
    return callback(null, failure(err));
  }
};

export function getS3Params(dbGetResponse){
  const payload = JSON.parse(dbGetResponse.Payload);
  const body = JSON.parse(payload.body);
  console.log('dbGetResponse body',body);
  return {
    Bucket: 'fotopia-web-app-prod',
    Key: body.key
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
    InvocationType: 'RequestResponse',
    FunctionName: process.env.LAMBDA_GET,
    LogType: 'Tail',
    Payload: JSON.stringify({
      pathParameters: {
        userid,
        birthtime
      }
    })
  }
}

