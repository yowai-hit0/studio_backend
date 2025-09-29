import Joi from 'joi';

export const createAppointmentValidator = Joi.object({
  serviceId: Joi.number().integer().positive().required()
    .messages({
      'number.base': 'Service ID must be a number',
      'number.integer': 'Service ID must be an integer',
      'number.positive': 'Service ID must be positive',
      'any.required': 'Service ID is required',
    }),
  
  appointmentDate: Joi.date().iso().min('now').required()
    .messages({
      'date.base': 'Appointment date must be a valid date',
      'date.format': 'Appointment date must be in ISO format (YYYY-MM-DD)',
      'date.min': 'Appointment date cannot be in the past',
      'any.required': 'Appointment date is required',
    }),
  
  appointmentTime: Joi.string().pattern(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/)
    .required()
    .messages({
      'string.pattern.base': 'Appointment time must be in HH:MM format (24-hour)',
      'any.required': 'Appointment time is required',
    }),
  
  customerName: Joi.string().min(2).max(100).required()
    .messages({
      'string.min': 'Customer name must be at least 2 characters long',
      'string.max': 'Customer name cannot exceed 100 characters',
      'any.required': 'Customer name is required',
    }),
  
  customerEmail: Joi.string().email().required()
    .messages({
      'string.email': 'Please provide a valid email address',
      'any.required': 'Customer email is required',
    }),
  
  customerPhone: Joi.string().min(10).max(15).required()
    .messages({
      'string.min': 'Phone number must be at least 10 digits',
      'string.max': 'Phone number cannot exceed 15 digits',
      'any.required': 'Customer phone is required',
    }),
  
  specialRequests: Joi.string().max(500).optional().allow('')
    .messages({
      'string.max': 'Special requests cannot exceed 500 characters',
    }),
});

export const updateAppointmentValidator = Joi.object({
  serviceId: Joi.number().integer().positive().optional(),
  appointmentDate: Joi.date().iso().min('now').optional(),
  appointmentTime: Joi.string().pattern(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/).optional(),
  customerName: Joi.string().min(2).max(100).optional(),
  customerEmail: Joi.string().email().optional(),
  customerPhone: Joi.string().min(10).max(15).optional(),
  status: Joi.string().valid('PENDING', 'CONFIRMED', 'COMPLETED', 'CANCELLED', 'NO_SHOW').optional(),
  specialRequests: Joi.string().max(500).optional().allow(''),
}).min(1);

export const appointmentIdValidator = Joi.object({
  id: Joi.number().integer().positive().required()
    .messages({
      'number.base': 'Appointment ID must be a number',
      'number.integer': 'Appointment ID must be an integer',
      'number.positive': 'Appointment ID must be positive',
      'any.required': 'Appointment ID is required',
    }),
});

export const appointmentQueryValidator = Joi.object({
  page: Joi.number().integer().positive().min(1).default(1),
  limit: Joi.number().integer().positive().min(1).max(100).default(10),
  search: Joi.string().max(100).optional().allow(''),
  status: Joi.string().valid('PENDING', 'CONFIRMED', 'COMPLETED', 'CANCELLED', 'NO_SHOW').optional(),
  dateFrom: Joi.date().iso().optional(),
  dateTo: Joi.date().iso().min(Joi.ref('dateFrom')).optional(),
  serviceId: Joi.number().integer().positive().optional(),
  sortBy: Joi.string().valid('appointmentDate', 'createdAt', 'customerName').default('appointmentDate'),
  sortOrder: Joi.string().valid('asc', 'desc').default('asc'),
});

export const checkAvailabilityValidator = Joi.object({
  serviceId: Joi.number().integer().positive().required(),
  date: Joi.date().iso().min('now').required(),
});

export const appointmentStatusValidator = Joi.object({
  status: Joi.string().valid('PENDING', 'CONFIRMED', 'COMPLETED', 'CANCELLED', 'NO_SHOW').required()
    .messages({
      'any.only': 'Status must be one of: PENDING, CONFIRMED, COMPLETED, CANCELLED, NO_SHOW',
      'any.required': 'Status is required',
    }),
});

export const calendarQueryValidator = Joi.object({
  year: Joi.number().integer().min(2020).max(2030).required(),
  month: Joi.number().integer().min(1).max(12).required(),
});

export const availableDatesValidator = Joi.object({
  serviceId: Joi.number().integer().positive().required(),
  startDate: Joi.date().iso().min('now').optional(),
  endDate: Joi.date().iso().min(Joi.ref('startDate')).optional(),
});