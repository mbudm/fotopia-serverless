import Joi from 'joi';

export const requestSchema = Joi.object().keys({
  userid: Joi.string().guid().required(),
  birthtime: Joi.date().required(),
});

export const ddbParamsSchema = Joi.object().keys({
  TableName: Joi.string().required(),
  Key: Joi.object().keys({
    userid: Joi.string().guid().required(),
    birthtime: Joi.number().required(),
  }),
});
