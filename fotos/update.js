import Joi from 'joi';
import dynamodb from './lib/dynamodb';
import { success, failure } from './lib/responses';
import logger from './lib/logger';
import { requestSchema, ddbParamsSchema } from './joi/update';
import { validateRequest } from './get';
import { safeLength } from './create';

export function validateBody(data) {
  const result = Joi.validate(data, requestSchema);
  if (result.error !== null) {
    throw result.error;
  } else {
    return data;
  }
}

export function getDynamoDbParams(pathParams, body) {
  const timestamp = new Date().getTime();
  const ExpressionAttributeNames = Object.keys(body).reduce((accum, key) => ({
    ...accum,
    [`#${key}`]: key,
  }), {});

  const ExpressionAttributeValues = Object.keys(body).reduce((accum, key) => ({
    ...accum,
    [`:${key}`]: body[key],
  }), {
    ':updatedAt': timestamp,
  });
  const updateKeyValues = Object.keys(body).map(key => `#${key} = :${key}`).join(', ');
  const params = {
    TableName: process.env.DYNAMODB_TABLE,
    Key: pathParams,
    ExpressionAttributeNames,
    ExpressionAttributeValues,
    UpdateExpression: `SET ${updateKeyValues}, updatedAt = :updatedAt`,
    ReturnValues: 'ALL_NEW',
  };

  const result = Joi.validate(params, ddbParamsSchema);
  if (result.error !== null) {
    throw result.error;
  } else {
    return params;
  }
}


export function getLogFields(pathParams, data, ddbResponse) {
  return {
    paramUsername: pathParams && pathParams.username,
    paramId: pathParams && pathParams.id,
    updateImagePeopleCount: data && safeLength(data.people),
    updateImageFacesCount: data && safeLength(data.faces),
    updateImageFaceMatchCount: data && safeLength(data.faceMatches),
    updateImageTagCount: data && safeLength(data.tags),
    updateImageBirthtime: data.birthtime,
    imageId: ddbResponse && ddbResponse.id,
    imageUsername: ddbResponse && ddbResponse.username,
    imageFamilyGroup: ddbResponse && ddbResponse.group,
    imagePeopleCount: ddbResponse && safeLength(ddbResponse.people),
    imageFaceMatchCount: ddbResponse && safeLength(ddbResponse.faceMatches),
    imageFacesCount: ddbResponse && safeLength(ddbResponse.faces),
    imageTagCount: ddbResponse && safeLength(ddbResponse.tags),
    imageKey: ddbResponse && ddbResponse.img_key,
    imageWidth: ddbResponse && ddbResponse.meta && ddbResponse.meta.width,
    imageHeight: ddbResponse && ddbResponse.meta && ddbResponse.meta.height,
    imageUserIdentityId: ddbResponse && ddbResponse.userIdentityId,
    imageBirthtime: ddbResponse && ddbResponse.birthtime,
    imageCreatedAt: ddbResponse && ddbResponse.createdAt,
    imageUpdatedAt: ddbResponse && ddbResponse.updatedAt,
  };
}

export async function updateItem(event, context, callback) {
  const startTime = Date.now();
  const data = event.body ? JSON.parse(event.body) : null;
  const pathParams = event.pathParameters;
  try {
    const requestBody = validateBody(data);
    const requestParams = validateRequest(pathParams);
    const ddbParams = getDynamoDbParams(requestParams, requestBody);
    const ddbResponse = await dynamodb.update(ddbParams).promise();
    logger(context, startTime, getLogFields(pathParams, data, ddbResponse));
    return callback(null, success(ddbResponse.Attributes));
  } catch (err) {
    logger(context, startTime, { err, ...getLogFields(pathParams, data) });
    return callback(null, failure(err));
  }
}
