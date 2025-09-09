import Joi from 'joi';

export const createInviteSchema = Joi.object({
  email: Joi.string().email().required(),
  role: Joi.string().valid('member', 'manager', 'admin').default('member'),
});

export const acceptInviteSchema = Joi.object({
  token: Joi.string().length(48).required(),
  name: Joi.string().min(2).max(100).allow('', null),
  password: Joi.string().min(8).allow('', null),
});


