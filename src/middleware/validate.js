'use strict';

const Joi = require('joi');

const validate = (schema) => (req, res, next) => {
  const validationParts = ['body', 'params', 'query'];
  let error = null;

  for (const part of validationParts) {
    if (schema[part]) {
      const { error: validationError, value } = schema[part].validate(req[part], {
        errors: { label: 'key' },
        allowUnknown: true,
      });

      if (validationError) {
        error = validationError;
        break; // Stop on first error
      }
      if(part === 'query') {
        Object.assign(req[part], value)
      } else {
        req[part] = value; // Overwrite with validated value (e.g., for default values)
      }
      
    }
  }

  if (error) {
    const errorMessage = error.details.map((details) => details.message).join(', ');
    return next(new Error(errorMessage));
  }

  return next();
};

module.exports = validate;
