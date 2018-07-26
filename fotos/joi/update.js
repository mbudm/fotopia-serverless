import Joi from 'joi';

export const requestSchema = Joi.object().keys({
  userIdentityId: Joi.string(),
  birthtime: Joi.date(),
  img_key: Joi.string(),
  people: Joi.array().items(Joi.string()).unique(),
  faces: Joi.array().items(Joi.object()),
  tags: Joi.array().items(Joi.string()).unique(),
  meta: Joi.object(),
});

export const ddbParamsSchema = Joi.object().keys({
  TableName: Joi.string().required(),
  Key: Joi.object().keys({
    username: Joi.string().required(),
    id: Joi.string().guid().required(),
  }),
  ExpressionAttributeNames: Joi.object().required(),
  ExpressionAttributeValues: Joi.object().required(),
  UpdateExpression: Joi.string().required(),
  ReturnValues: Joi.string().required(),
});
