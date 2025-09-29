import Joi from 'joi';

export const createAlbumValidator = Joi.object({
  title: Joi.string().min(2).max(100).required()
    .messages({
      'string.min': 'Title must be at least 2 characters long',
      'string.max': 'Title cannot exceed 100 characters',
      'any.required': 'Title is required',
    }),
  
  description: Joi.string().max(500).optional().allow('')
    .messages({
      'string.max': 'Description cannot exceed 500 characters',
    }),
  
  shootDate: Joi.date().iso().max('now').optional()
    .messages({
      'date.base': 'Shoot date must be a valid date',
      'date.format': 'Shoot date must be in ISO format',
      'date.max': 'Shoot date cannot be in the future',
    }),
  
  coverPhotoUrl: Joi.string().uri().optional().allow('')
    .messages({
      'string.uri': 'Cover photo URL must be a valid URL',
    }),
  
  isPublished: Joi.boolean().default(false).optional(),
});

export const updateAlbumValidator = Joi.object({
  title: Joi.string().min(2).max(100).optional(),
  description: Joi.string().max(500).optional().allow(''),
  shootDate: Joi.date().iso().max('now').optional(),
  coverPhotoUrl: Joi.string().uri().optional().allow(''),
  isPublished: Joi.boolean().optional(),
}).min(1);

export const albumIdValidator = Joi.object({
  id: Joi.number().integer().positive().required()
    .messages({
      'number.base': 'Album ID must be a number',
      'number.integer': 'Album ID must be an integer',
      'number.positive': 'Album ID must be positive',
      'any.required': 'Album ID is required',
    }),
});

export const albumQueryValidator = Joi.object({
  page: Joi.number().integer().positive().min(1).default(1),
  limit: Joi.number().integer().positive().min(1).max(100).default(10),
  search: Joi.string().max(100).optional().allow(''),
  isPublished: Joi.boolean().optional(),
  createdBy: Joi.number().integer().positive().optional(),
  sortBy: Joi.string().valid('title', 'shootDate', 'createdAt', 'updatedAt').default('createdAt'),
  sortOrder: Joi.string().valid('asc', 'desc').default('desc'),
  includePhotos: Joi.boolean().default(false),
});

export const publishAlbumValidator = Joi.object({
  isPublished: Joi.boolean().required()
    .messages({
      'boolean.base': 'isPublished must be a boolean',
      'any.required': 'isPublished is required',
    }),
});