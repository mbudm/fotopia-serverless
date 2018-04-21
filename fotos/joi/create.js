import Joi from 'joi';

export const requestSchema = Joi.object().keys({
  username: Joi.string().required(),
  birthtime: Joi.date().required(),
  img_key: Joi.string().required(),
  people: Joi.array().items(Joi.string()).unique(),
  tags: Joi.array().items(Joi.string()).unique(),
  meta: Joi.object(),
});

export const ddbParamsSchema = Joi.object().keys({
  TableName: Joi.string().required(),
  Item: Joi.object().keys({
    username: Joi.string().required(),
    id: Joi.string().guid().required(),
    birthtime: Joi.number().required(),
    tags: Joi.array().items(Joi.string()).unique(),
    people: Joi.array().items(Joi.string()).unique(),
    img_key: Joi.string().required(),
    meta: Joi.object(),
    createdAt: Joi.number().required(),
    updatedAt: Joi.number().required(),
  }),
});
