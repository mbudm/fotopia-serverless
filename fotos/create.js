
import uuid from 'uuid';
import dynamodb from './lib/dynamodb';
import { success, failure } from "./lib/responses";
import Joi from 'joi';
import { requestSchema, paramsSchema } from './joi/create';

export async function createItem(event, context, callback){
  try {
    const request = await validateRequest(event.body);
    const dbResult = await dynamodb.put(getCreateParams(request)).promise();
    return callback(null, success(dbResult));
  } catch(err){
    return callback(null, failure(err));
  }
};

export function validateRequest(requestBody){
    const data = JSON.parse(requestBody);
    const result = Joi.validate(data, requestSchema);
    if (result.error !== null) {
      throw result.error;
    }else{
      return data;
    }
}

export function getCreateParams(data){
    const timestamp = new Date().getTime();
    const params = {
      TableName: process.env.DYNAMODB_TABLE,
      Item: {
        userid: data.userid,
        id: uuid.v1(),
        birthtime: new Date(data.birthtime).getTime(),
        tags: data.tags,
        people: data.people, // for rekognition categorisation
        image: data.image, // s3 object (image) url?
        meta: data.meta, // whatever metadata we've got for this item, or just store this as s3 object?
        createdAt: timestamp,
        updatedAt: timestamp,
      },
    };

    const result = Joi.validate(params, paramsSchema);
    if (result.error !== null) {
      throw result.error;
    }else{
      return params;
    }
}
