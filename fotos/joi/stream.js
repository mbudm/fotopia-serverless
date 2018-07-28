import Joi from 'joi';

export const getSchema = Joi.object().keys({
  Key: Joi.string().required(),
  Bucket: Joi.string().required(),
});

export const putSchema = Joi.object().keys({
  Body: Joi.binary().required(),
  Bucket: Joi.string().required(),
  ContentType: Joi.string().required(),
  Key: Joi.string().required(),
});

export const peopleSchema = Joi.array().items(Joi.object().keys({
  name: Joi.string().allow(''),
  id: Joi.string().guid().required(),
  keyFaceId: Joi.string().guid().required(),
  faces: Joi.array().items(Joi.object().keys({
    FaceId: Joi.string().guid().required(),
    ExternalImageId: Joi.string().guid().required(),
    img_thumb_key: Joi.string().required(),
    userIdentityId: Joi.string().required(),
    People: Joi.array().items(Joi.object().keys({
      Person: Joi.string().guid().required(),
      Match: Joi.number(),
    })),
    FaceMatches: Joi.array(),
  })),
}));
