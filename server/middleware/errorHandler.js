import { isProduction } from '../config/env.js';

export function errorHandler(err, req, res, next) {
  console.error(`[ERROR] ${req.method} ${req.url}:`, err);

  const statusCode = err.status || err.statusCode || 500;
  const message = err.message || 'An internal clinical system error occurred.';

  const response = {
    error: message,
    code: err.code || 'INTERNAL_SERVER_ERROR'
  };

  if (!isProduction) {
    response.stack = err.stack;
  }

  res.status(statusCode).json(response);
}
