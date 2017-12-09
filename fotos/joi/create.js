import Joi from 'joi';

export const requestSchema = Joi.object().keys({
  userid: Joi.string().guid().required(),
  birthtime: Joi.date().required(),
  imageBuffer: Joi.binary().encoding('base64').required(),
  people: Joi.array().items(Joi.string()).unique(),
  tags: Joi.array().items(Joi.string()).unique(),
  meta: Joi.object()
});

export const ddbParamsSchema = Joi.object().keys({
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

export const s3ParamsSchema =  Joi.object().keys({
  Bucket: Joi.string().required(),
  Key: Joi.string().guid().required(),
  Body: Joi.binary().encoding('base64').required()
});
