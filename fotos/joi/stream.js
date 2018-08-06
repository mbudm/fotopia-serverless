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
  userIdentityId: Joi.string().required(),
  thumbnail: Joi.string().required(),
  faces: Joi.array().items(Joi.object().keys({
    FaceId: Joi.string().guid().required().label('FaceId in a face object in the people schema'),
    ExternalImageId: Joi.string().guid().required(),
  })).label('facess array'),
})).label('people array');
