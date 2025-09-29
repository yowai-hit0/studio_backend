import Joi from 'joi';

export const createServiceValidator = Joi.object({
  name: Joi.string().min(2).max(100).required()
    .messages({
      'string.min': 'Service name must be at least 2 characters long',
      'string.max': 'Service name cannot exceed 100 characters',
      'any.required': 'Service name is required',
    }),
  
  description: Joi.string().min(10).max(500).required()
    .messages({
      'string.min': 'Description must be at least 10 characters long',
      'string.max': 'Description cannot exceed 500 characters',
      'any.required': 'Description is required',
    }),
  
  durationMinutes: Joi.number().integer().positive().min(15).max(480).required()
    .messages({
      'number.base': 'Duration must be a number',
      'number.integer': 'Duration must be an integer',
      'number.positive': 'Duration must be positive',
      'number.min': 'Duration must be at least 15 minutes',
      'number.max': 'Duration cannot exceed 480 minutes (8 hours)',
      'any.required': 'Duration is required',
    }),
  
  price: Joi.number().positive().precision(2).max(10000).required()
    .messages({
      'number.base': 'Price must be a number',
      'number.positive': 'Price must be positive',
      'number.precision': 'Price can have up to 2 decimal places',
      'number.max': 'Price cannot exceed 10000',
      'any.required': 'Price is required',
    }),
});

export const updateServiceValidator = Joi.object({
  name: Joi.string().min(2).max(100).optional(),
  description: Joi.string().min(10).max(500).optional(),
  durationMinutes: Joi.number().integer().positive().min(15).max(480).optional(),
  price: Joi.number().positive().precision(2).max(10000).optional(),
  isActive: Joi.boolean().optional(),
}).min(1);

export const serviceIdValidator = Joi.object({
  id: Joi.number().integer().positive().required()
    .messages({
      'number.base': 'Service ID must be a number',
      'number.integer': 'Service ID must be an integer',
      'number.positive': 'Service ID must be positive',
      'any.required': 'Service ID is required',
    }),
});

export const serviceQueryValidator = Joi.object({
  page: Joi.number().integer().positive().min(1).default(1),
  limit: Joi.number().integer().positive().min(1).max(100).default(10),
  search: Joi.string().max(100).optional().allow(''),
  isActive: Joi.boolean().optional(),
  sortBy: Joi.string().valid('name', 'price', 'durationMinutes', 'createdAt').default('name'),
  sortOrder: Joi.string().valid('asc', 'desc').default('asc'),
});