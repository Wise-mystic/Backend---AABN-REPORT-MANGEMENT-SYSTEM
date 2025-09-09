export function notFoundHandler(req, res, next) {
  res.status(404).json({ success: false, error: 'not_found', message: 'Route not found' });
}

export function errorHandler(err, req, res, next) {
  const status = err.status || 500;
  const error = err.code || err.name || 'internal_error';
  const message = err.message || 'Something went wrong';
  const details = err.details || undefined;

  if (status >= 500) {
    console.error(err);
  }

  res.status(status).json({ success: false, error, message, details });
}


