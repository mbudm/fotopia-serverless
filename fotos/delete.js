import dynamodb from './lib/dynamodb';
import createS3Client from './lib/s3';
import lambda from './lib/lambda';
import { success, failure } from './lib/responses';
import { INVOCATION_REQUEST_RESPONSE } from './lib/constants';
import logger from './lib/logger';
import { getDynamoDbParams, validateRequest } from './get';
import { safeLength } from './create';

export function getBodyFromDbGetResponse(dbGetResponse) {
  const payload = JSON.parse(dbGetResponse.Payload);
  return JSON.parse(payload.body);
}
export function getS3Params(dbGetResponse) {
  const body = getBodyFromDbGetResponse(dbGetResponse);
  return {
    Bucket: process.env.S3_BUCKET,
    Key: body.img_key,
  };
}

export function getInvokeGetParams(request) {
  return {
    InvocationType: INVOCATION_REQUEST_RESPONSE,
    FunctionName: process.env.IS_OFFLINE ? 'get' : `${process.env.LAMBDA_PREFIX}get`,
    LogType: 'Tail',
    Payload: JSON.stringify({
      pathParameters: {
        ...request,
      },
    }),
  };
}


export function getLogFields(dbGetResponse) {
  const body = getBodyFromDbGetResponse(dbGetResponse);
  return {
    imageId: body.id,
    imageUsername: body.username,
    imageFamilyGroup: body.group,
    imageKey: body.img_key,
    imageWidth: body.meta && body.meta.width,
    imageHeight: body.meta && body.meta.height,
    imageUserIdentityId: body.userIdentityId,
    imageBirthtime: body.birthtime,
    imageCreatedAt: body.createdAt,
    imageUpdatedAt: body.updatedAt,
    imageFacesCount: safeLength(body.faces),
    imageTagCount: safeLength(body.tags),
  };
}

export async function deleteItem(event, context, callback) {
  const startTime = Date.now();
  const s3 = createS3Client();
  try {
    const request = validateRequest(event.pathParameters);
    const params = getInvokeGetParams(request);
    const dbGetResponse = await lambda.invoke(params).promise();
    const s3Params = getS3Params(dbGetResponse);
    await s3.deleteObject(s3Params).promise();
    const ddbParams = getDynamoDbParams(request);
    await dynamodb.delete(ddbParams).promise();
    logger(context, startTime, getLogFields(dbGetResponse));
    return callback(null, success(ddbParams.Key));
  } catch (err) {
    logger(context, startTime, { err, ...event.pathParameters });
    return callback(null, failure(err));
  }
}
