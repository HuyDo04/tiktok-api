const Joi = require('joi');

const validateQuery = (schema) => (req, res, next) => {
  if (!schema.query) return next();

  const { error, value } = schema.query.validate(req.query, {
    abortEarly: false, // báo tất cả lỗi
    allowUnknown: true, // cho phép query không trong schema
    stripUnknown: true, // loại bỏ key không có trong schema
  });

  if (error) {
    const messages = error.details.map(d => d.message).join(', ');
    return res.status(400).json({
      status: 'error',
      message: messages,
    });
  }

  req.query = value;
  next();
};

module.exports = validateQuery;
