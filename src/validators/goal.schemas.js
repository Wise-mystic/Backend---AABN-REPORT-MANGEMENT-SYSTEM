import Joi from 'joi';

export const createGoalSchema = Joi.object({
  name: Joi.string().min(2).max(120).required(),
  type: Joi.string().valid('activities', 'likes', 'shares', 'comments', 'reach').required(),
  target: Joi.number().integer().min(1).required(),
  period: Joi.string().valid('weekly', 'monthly', 'quarterly').default('monthly'),
  category: Joi.string().valid('social-media', 'physical', 'financial', 'challenges', 'office', 'all').default('all'),
});


