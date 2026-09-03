const { AppError } = require('../utils/errors');

/**
 * Central Express error handler.
 * Must be the last middleware registered in app.js (4-argument signature).
 *
 * Handles:
 *   - AppError instances  → structured JSON response with the given status
 *   - CORS errors         → 403
 *   - Unknown errors      → 500, with stack logged in development
 */
// eslint-disable-next-line no-unused-vars
function errorHandler(err, req, res, next) {
  // ── AppError (operational, expected) ───────────────────────────────────
  if (err instanceof AppError) {
    return res.status(err.statusCode).json({
      error: {
        message: err.message,
        ...(err.code && { code: err.code }),
      },
    });
  }

  // ── CORS rejection ─────────────────────────────────────────────────────
  if (err.message?.startsWith('CORS:')) {
    return res.status(403).json({
      error: { message: 'Request not allowed from this origin.' },
    });
  }

  // ── Unknown / programming error ────────────────────────────────────────
  // Log full detail for debugging; never expose internals to client.
  console.error('[Unhandled Error]', err);

  return res.status(500).json({
    error: {
      message: 'Something went wrong. Please try again.',
      ...(process.env.NODE_ENV !== 'production' && { detail: err.message }),
    },
  });
}

module.exports = errorHandler;