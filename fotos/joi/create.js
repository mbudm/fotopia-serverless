import Joi from 'joi';

export const requestSchema = Joi.object().keys({
  userid: Joi.string().guid().required(),
  birthtime: Joi.date().required(),
  people: Joi.array().items(Joi.string()).unique(),
  tags: Joi.array().items(Joi.string()).unique()
});

export const paramsSchema = Joi.object().keys({
  TableName: Joi.string().required(),
  Item: Joi.object().keys({
    userid: Joi.string().guid().required(),
    id: Joi.string().guid().required(),
    birthtime: Joi.number().required(),
    tags: Joi.array().items(Joi.string()).unique(),
    people: Joi.array().items(Joi.string()).unique(),
    image: Joi.string(),
    meta: Joi.object(),
    createdAt: Joi.number().required(),
    updatedAt: Joi.number().required(),
  }),
});
