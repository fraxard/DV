const isProd = process.env.NODE_ENV === 'production';

/**
 * Cookie options for the session cookie.
 * Applied when setting and clearing the session cookie in auth controller.
 */
const SESSION_COOKIE_NAME = 'dv_sid';

const SESSION_COOKIE_OPTIONS = {
  httpOnly: true,          // Not accessible via document.cookie
  secure: isProd,          // HTTPS only in production; HTTP allowed in dev
  sameSite: isProd ? 'none' : 'lax',
  // 'none' required in production because cookie crosses subdomains
  // (digivirasat.com → api.digivirasat.com); must be paired with secure:true
  // 'lax' is sufficient in dev (same-origin between localhost ports)
  maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days in milliseconds
  path: '/',
};

const SESSION_DURATION_DAYS = 7;

module.exports = {
  SESSION_COOKIE_NAME,
  SESSION_COOKIE_OPTIONS,
  SESSION_DURATION_DAYS,
};