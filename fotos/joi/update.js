import Joi from 'joi';

export const requestSchema = Joi.object().keys({
  userid: Joi.string().guid().required(),
  birthtime: Joi.date().required(),
  people: Joi.array().items(Joi.string()).unique(),
  tags: Joi.array().items(Joi.string()).unique(),
  meta: Joi.object(),
});

export const ddbParamsSchema = Joi.object().keys({
  TableName: Joi.string().required(),
  Key: Joi.object().keys({
    userid: Joi.string().guid().required(),
    birthtime: Joi.number().required(),
  }),
  ExpressionAttributeNames: Joi.object(),
  ExpressionAttributeValues: Joi.object(),
  UpdateExpression: Joi.string(),
  ReturnValues: Joi.string(),
});
