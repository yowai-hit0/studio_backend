/**
 * Validate request body against Joi schema
 * @param {Joi.Schema} schema - Joi validation schema
 * @param {Object} options - Validation options
 * @returns {Function} Express middleware
 */
export const validate = (schema, options = {}) => {
  return (req, res, next) => {
    let dataToValidate;

    if (options.params) {
      dataToValidate = req.params;
    } else if (options.query) {
      dataToValidate = req.query;
    } else {
      dataToValidate = req.body;
    }

    const { error, value } = schema.validate(dataToValidate, {
      abortEarly: false,
      stripUnknown: true,
      allowUnknown: false,
    });

    if (error) {
      const errorDetails = error.details.map(detail => ({
        field: detail.path.join('.'),
        message: detail.message,
      }));

      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors: errorDetails,
      });
    }

    next();
  };
};