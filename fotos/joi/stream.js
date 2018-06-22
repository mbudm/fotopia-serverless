import Joi from 'joi';

export const getSchema = Joi.object().keys({
  key: Joi.string().required(),
  thumbKey: Joi.string().required(),
});

export const putSchema = Joi.object().keys({
  Body: Joi.binary().required(),
  Bucket: Joi.string().required(),
  ContentType: Joi.string().required(),
  Key: Joi.string().required(),
});

