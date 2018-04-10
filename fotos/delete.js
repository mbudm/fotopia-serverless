import dynamodb from './lib/dynamodb';
import s3 from './lib/s3';
import lambda from './lib/lambda';
import { success, failure } from './lib/responses';
import { getDynamoDbParams, validateRequest } from './get';

export function getS3Params(dbGetResponse) {
  const payload = JSON.parse(dbGetResponse.Payload);
  const body = JSON.parse(payload.body);
  return {
    Bucket: 'fotopia-web-app-prod',
    Key: body.img_key,
  };
}

export function getInvokeGetParams(request) {
  return {
    InvocationType: 'RequestResponse',
    FunctionName: process.env.IS_OFFLINE ? 'get' : `${process.env.LAMBDA_PREFIX}get`,
    LogType: 'Tail',
    Payload: JSON.stringify({
      pathParameters: {
        ...request,
      },
    }),
  };
}

export async function deleteItem(event, context, callback) {
  try {
    const request = validateRequest(event.pathParameters);
    const params = getInvokeGetParams(request);
    const dbGetResponse = await lambda.invoke(params).promise();
    const s3Params = getS3Params(dbGetResponse);
    await s3.deleteObject(s3Params).promise();
    const ddbParams = getDynamoDbParams(request);
    await dynamodb.delete(ddbParams).promise();
    return callback(null, success(ddbParams.Key));
  } catch (err) {
    return callback(null, failure(err));
  }
}
