import Joi from 'joi';

export const requestSchema = Joi.object().keys({
  username: Joi.string().required(),
  id: Joi.string().guid().required(),
});

export const ddbParamsSchema = Joi.object().keys({
  TableName: Joi.string().required(),
  Key: Joi.object().keys({
    username: Joi.string().required(),
    id: Joi.string().guid().required(),
  }),
});
