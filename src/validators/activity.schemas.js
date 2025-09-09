import Joi from 'joi';

export const listQuerySchema = Joi.object({
  category: Joi.string().valid('social-media', 'physical', 'financial', 'challenges', 'office'),
  platform: Joi.string(),
  startDate: Joi.date().iso(),
  endDate: Joi.date().iso(),
  status: Joi.string().valid('todo', 'in-progress', 'done'),
  assignee_id: Joi.string(),
  tag: Joi.string(),
  page: Joi.number().integer().min(1).default(1),
  limit: Joi.number().integer().min(1).max(100).default(20),
});

export const createActivitySchema = Joi.object({
  category: Joi.string().valid('social-media', 'physical', 'financial', 'challenges', 'office').required(),
  platform: Joi.string().allow('', null),
  title: Joi.string().min(3).max(200).required(),
  description: Joi.string().allow('', null),
  timestamp: Joi.date().iso().required(),
  status: Joi.string().valid('todo', 'in-progress', 'done').default('todo'),
  due_date: Joi.date().iso().allow(null),
  tags: Joi.array().items(Joi.string()).default([]),
  assignee_id: Joi.string().allow(null),
  attachments: Joi.array().items(Joi.object({ name: Joi.string(), url: Joi.string().uri() })).default([]),
});

export const updateActivitySchema = createActivitySchema.fork(['timestamp'], (s) => s.optional());

export const metricsSchema = Joi.object({
  likes: Joi.number().integer().min(0).default(0),
  shares: Joi.number().integer().min(0).default(0),
  comments: Joi.number().integer().min(0).default(0),
  reach: Joi.number().integer().min(0).default(0),
}).min(1);

export const createCommentSchema = Joi.object({
  body: Joi.string().min(1).max(2000).required(),
});


