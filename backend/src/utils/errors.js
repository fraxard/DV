/**
 * AppError — operational errors with HTTP status codes.
 * Throw these from controllers/services to produce structured API error responses.
 * Programming errors (bugs) should be allowed to propagate as regular Errors.
 */
class AppError extends Error {
  /**
   * @param {string} message   — human-readable, returned in the response
   * @param {number} statusCode — HTTP status code
   * @param {string} [code]    — optional machine-readable code for the frontend
   */
  constructor(message, statusCode, code) {
    super(message);
    this.name = 'AppError';
    this.statusCode = statusCode;
    this.code = code ?? null;
    // Maintains clean stack trace in V8
    Error.captureStackTrace(this, this.constructor);
  }
}

// ── Common factory helpers ─────────────────────────────────────────────────

const Errors = {
  badRequest: (message, code) => new AppError(message, 400, code),
  unauthorized: (message = 'Authentication required', code) =>
    new AppError(message, 401, code),
  forbidden: (message = 'Access denied', code) =>
    new AppError(message, 403, code),
  notFound: (message = 'Not found', code) =>
    new AppError(message, 404, code),
  conflict: (message, code) => new AppError(message, 409, code),
  unprocessable: (message, code) => new AppError(message, 422, code),
  internal: (message = 'Internal server error', code) =>
    new AppError(message, 500, code),
};

module.exports = { AppError, Errors };