export function validate(schema, location = 'body') {
  return (req, res, next) => {
    const data = location === 'query' ? req.query : req.body;
    const { error, value } = schema.validate(data, { abortEarly: false, stripUnknown: true });
    if (error) {
      return res.status(400).json({ success: false, error: 'validation_error', message: 'Invalid request data', details: error.details });
    }
    if (location === 'query') {
      // In Express 5, req.query is a getter-only property. Mutate the object instead of reassigning.
      const target = req.query || {};
      // Clear existing keys
      for (const key of Object.keys(target)) delete target[key];
      Object.assign(target, value);
    } else {
      req.body = value;
    }
    next();
  };
}


