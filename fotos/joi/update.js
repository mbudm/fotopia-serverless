import Joi from 'joi';

export const requestSchema = Joi.object().keys({
  username: Joi.string().required(),
  birthtime: Joi.date().required(),
  people: Joi.array().items(Joi.string()).unique(),
  tags: Joi.array().items(Joi.string()).unique(),
  meta: Joi.object(),
});

export const ddbParamsSchema = Joi.object().keys({
  TableName: Joi.string().required(),
  Key: Joi.object().keys({
    username: Joi.string().required(),
    birthtime: Joi.number().required(),
  }),
  ExpressionAttributeNames: Joi.object().required(),
  ExpressionAttributeValues: Joi.object().required(),
  UpdateExpression: Joi.string().required(),
  ReturnValues: Joi.string().required(),
});
