
import uuid from 'uuid';
import dynamodb from './lib/dynamodb';
import s3 from './lib/s3';
import { success, failure } from "./lib/responses";
import Joi from 'joi';
import { requestSchema, ddbParamsSchema, s3ParamsSchema } from './joi/create';

export async function createItem(event, context, callback){
  const id = uuid.v1();
  try {
    const request = validateRequest(event.body);
    const s3Params = getS3Params(request, id);
    const s3Object = await s3.putObject(s3Params).promise();
    const ddbParams = getDynamoDbParams(request, s3Object.Location, id);
    await dynamodb.put(ddbParams).promise();
    return callback(null, success(ddbParams.Item));
  } catch(err){
    return callback(null, failure(err));
  }
};

export function getS3Params(requestBody, id){
  const params = {
    Bucket: process.env.S3_BUCKET,
    Key: `${id}__${requestBody.filename}`,
    Body: requestBody.imageBuffer
  }
  const result = Joi.validate(params, s3ParamsSchema);
  if (result.error !== null) {
    throw result.error;
  }else{
    return params;
  }
}

export function validateRequest(requestBody){
    const data = JSON.parse(requestBody);
    const result = Joi.validate(data, requestSchema);
    if (result.error !== null) {
      throw result.error;
    }else{
      return data;
    }
}

export function getDynamoDbParams(data, image, id){
    const timestamp = new Date().getTime();
    const params = {
      TableName: process.env.DYNAMODB_TABLE,
      Item: {
        userid: data.userid,
        id: id,
        birthtime: new Date(data.birthtime).getTime(),
        tags: data.tags,
        people: data.people, // for rekognition categorisation
        image: image, // s3 object (image) url?
        meta: data.meta, // whatever metadata we've got for this item, or just store this as s3 object?
        createdAt: timestamp,
        updatedAt: timestamp,
      },
    };

    const result = Joi.validate(params, ddbParamsSchema);
    if (result.error !== null) {
      throw result.error;
    }else{
      return params;
    }
}
