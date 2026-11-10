const { AppError } = require('../utils/errors');

/**
 * Central Express error handler.
 * Must be the last middleware registered in app.js (4-argument signature).
 *
 * Handles:
 *   - AppError instances or errors with an HTTP statusCode (<500) → structured JSON
 *   - PostgreSQL invalid UUID syntax (22P02)                     → 400
 *   - CORS errors                                                → 403
 *   - Unknown errors                                             → 500
 */
// eslint-disable-next-line no-unused-vars
function errorHandler(err, req, res, next) {
  const statusCode = err.statusCode || err.status;

  // Operational errors (AppError or standard errors with statusCode < 500)
  if (err instanceof AppError || (statusCode && typeof statusCode === 'number' && statusCode < 500)) {
    return res.status(statusCode).json({
      error: {
        message: err.message || 'Request failed.',
        ...(err.code && { code: err.code }),
      },
    });
  }

  // PostgreSQL invalid input syntax for type uuid
  if (err.code === '22P02') {
    return res.status(400).json({
      error: { message: 'Invalid ID format.', code: 'INVALID_ID' },
    });
  }

  // CORS rejection
  if (err.message?.startsWith('CORS:')) {
    return res.status(403).json({
      error: { message: 'Request not allowed from this origin.', code: 'FORBIDDEN' },
    });
  }

  // Unknown / programming error
  console.error('[Unhandled Error]', err);

  return res.status(statusCode || 500).json({
    error: {
      message: 'Something went wrong. Please try again.',
      ...(process.env.NODE_ENV !== 'production' && { detail: err.message }),
    },
  });
}

module.exports = errorHandler;
