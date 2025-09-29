import Joi from 'joi';

export const uploadPhotoValidator = Joi.object({
  albumId: Joi.number().integer().positive().required()
    .messages({
      'number.base': 'Album ID must be a number',
      'number.integer': 'Album ID must be an integer',
      'number.positive': 'Album ID must be positive',
      'any.required': 'Album ID is required',
    }),
});

export const bulkUploadValidator = Joi.object({
  albumId: Joi.number().integer().positive().required()
    .messages({
      'number.base': 'Album ID must be a number',
      'number.integer': 'Album ID must be an integer',
      'number.positive': 'Album ID must be positive',
      'any.required': 'Album ID is required',
    }),
});

export const updatePhotoValidator = Joi.object({
  filename: Joi.string().min(1).max(255).optional()
    .messages({
      'string.min': 'Filename must be at least 1 character long',
      'string.max': 'Filename cannot exceed 255 characters',
    }),
  sortOrder: Joi.number().integer().min(0).optional()
    .messages({
      'number.base': 'Sort order must be a number',
      'number.integer': 'Sort order must be an integer',
      'number.min': 'Sort order cannot be negative',
    }),
}).min(1);

export const reorderPhotoValidator = Joi.object({
  sortOrder: Joi.number().integer().min(0).required()
    .messages({
      'number.base': 'Sort order must be a number',
      'number.integer': 'Sort order must be an integer',
      'number.min': 'Sort order cannot be negative',
      'any.required': 'Sort order is required',
    }),
});

export const photoIdValidator = Joi.object({
  id: Joi.number().integer().positive().required()
    .messages({
      'number.base': 'Photo ID must be a number',
      'number.integer': 'Photo ID must be an integer',
      'number.positive': 'Photo ID must be positive',
      'any.required': 'Photo ID is required',
    }),
});

export const albumIdParamValidator = Joi.object({
  id: Joi.number().integer().positive().required()
    .messages({
      'number.base': 'Album ID must be a number',
      'number.integer': 'Album ID must be an integer',
      'number.positive': 'Album ID must be positive',
      'any.required': 'Album ID is required',
    }),
});