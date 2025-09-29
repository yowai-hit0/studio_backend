import Joi from 'joi';

export const createUserValidator = Joi.object({
  username: Joi.string().alphanum().min(3).max(30).required()
    .messages({
      'string.alphanum': 'Username must only contain letters and numbers',
      'string.min': 'Username must be at least 3 characters long',
      'string.max': 'Username cannot exceed 30 characters',
      'any.required': 'Username is required',
    }),
  
  email: Joi.string().email().required()
    .messages({
      'string.email': 'Please provide a valid email address',
      'any.required': 'Email is required',
    }),
  
  password: Joi.string().min(6).required()
    .messages({
      'string.min': 'Password must be at least 6 characters long',
      'any.required': 'Password is required',
    }),
  
  fullName: Joi.string().min(2).max(100).required()
    .messages({
      'string.min': 'Full name must be at least 2 characters long',
      'string.max': 'Full name cannot exceed 100 characters',
      'any.required': 'Full name is required',
    }),
  
  role: Joi.string().valid('ADMIN', 'PHOTOGRAPHER').required()
    .messages({
      'any.only': 'Role must be either ADMIN or PHOTOGRAPHER',
      'any.required': 'Role is required',
    }),
});

export const updateUserValidator = Joi.object({
  username: Joi.string().alphanum().min(3).max(30).optional(),
  email: Joi.string().email().optional(),
  fullName: Joi.string().min(2).max(100).optional(),
  role: Joi.string().valid('ADMIN', 'PHOTOGRAPHER').optional(),
}).min(1);

export const userIdValidator = Joi.object({
  id: Joi.number().integer().positive().required()
    .messages({
      'number.base': 'User ID must be a number',
      'number.integer': 'User ID must be an integer',
      'number.positive': 'User ID must be positive',
      'any.required': 'User ID is required',
    }),
});

export const userStatusValidator = Joi.object({
  isActive: Joi.boolean().required()
    .messages({
      'boolean.base': 'isActive must be a boolean',
      'any.required': 'isActive is required',
    }),
});

export const userQueryValidator = Joi.object({
  page: Joi.number().integer().positive().min(1).default(1),
  limit: Joi.number().integer().positive().min(1).max(100).default(10),
  search: Joi.string().max(100).optional().allow(''),
  role: Joi.string().valid('ADMIN', 'PHOTOGRAPHER').optional(),
  isActive: Joi.boolean().optional(),
  sortBy: Joi.string().valid('username', 'email', 'fullName', 'role', 'createdAt').default('createdAt'),
  sortOrder: Joi.string().valid('asc', 'desc').default('desc'),
});