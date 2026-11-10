const isProd = process.env.NODE_ENV === 'production';

/**
 * Single source of truth for session cookie configuration across DigiVirasat.
 */
const SESSION_COOKIE_NAME = 'dv_session';

const SESSION_DURATION_DAYS = 7;

const SESSION_COOKIE_OPTIONS = {
  httpOnly: true,          // Not accessible via document.cookie
  secure: isProd,          // HTTPS only in production; HTTP allowed in dev
  sameSite: isProd ? 'none' : 'lax',
  maxAge: SESSION_DURATION_DAYS * 24 * 60 * 60 * 1000, // 7 days in milliseconds
  path: '/',
};

module.exports = {
  SESSION_COOKIE_NAME,
  SESSION_COOKIE_OPTIONS,
  SESSION_DURATION_DAYS,
};
