/**
 * Production-ready in-memory rate limiter with sliding window tracking.
 * Automatically cleans up expired windows to prevent memory bloat.
 */

function createRateLimiter(options = {}) {
  const windowMs = options.windowMs || 15 * 60 * 1000; // Default: 15 minutes
  const max = options.max || 5; // Default: 5 requests per window
  const message = options.message || 'Too many requests. Please try again later.';
  const keyGenerator = options.keyGenerator || ((req) => {
    return (
      (req.headers['x-forwarded-for'] || '').split(',')[0].trim() ||
      req.socket?.remoteAddress ||
      req.ip ||
      'unknown'
    );
  });

  // Map of key -> { count: number, resetTime: number }
  const hits = new Map();

  // Periodic cleanup every 5 minutes
  const cleanupInterval = setInterval(() => {
    const now = Date.now();
    for (const [key, record] of hits.entries()) {
      if (now > record.resetTime) {
        hits.delete(key);
      }
    }
  }, 5 * 60 * 1000);

  // Unref interval so it does not block Node process exit (especially in tests)
  if (cleanupInterval.unref) {
    cleanupInterval.unref();
  }

  const middleware = (req, res, next) => {
    // Allow bypassing rate limiter in automated test runs if explicitly disabled
    if (process.env.DISABLE_RATE_LIMIT === 'true') {
      return next();
    }

    const key = keyGenerator(req);
    const now = Date.now();
    let record = hits.get(key);

    if (!record || now > record.resetTime) {
      record = { count: 1, resetTime: now + windowMs };
      hits.set(key, record);
    } else {
      record.count += 1;
    }

    const remaining = Math.max(0, max - record.count);
    const resetSeconds = Math.ceil((record.resetTime - now) / 1000);

    res.setHeader('X-RateLimit-Limit', max);
    res.setHeader('X-RateLimit-Remaining', remaining);
    res.setHeader('X-RateLimit-Reset', Math.ceil(record.resetTime / 1000));

    if (record.count > max) {
      res.setHeader('Retry-After', resetSeconds);
      return res.status(429).json({
        error: {
          message,
          code: 'RATE_LIMIT_EXCEEDED',
          retryAfter: resetSeconds,
        },
      });
    }

    next();
  };

  middleware.reset = () => {
    hits.clear();
  };

  return middleware;
}

// ── Specific rate limiters for auth flows ───────────────────────────────────

// Login: 5 requests per 15 minutes per IP + email
const loginRateLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000,
  max: 10, // Generous enough for mistyped passwords, strictly prevents brute forcing
  message: 'Too many login attempts. Please wait 15 minutes before trying again.',
  keyGenerator: (req) => {
    const ip = (req.headers['x-forwarded-for'] || '').split(',')[0].trim() || req.ip || 'ip';
    const email = (req.body?.email || '').toLowerCase().trim();
    return `login:${ip}:${email}`;
  },
});

// Register: 10 account creations per hour per IP
const registerRateLimiter = createRateLimiter({
  windowMs: 60 * 60 * 1000,
  max: 10,
  message: 'Too many account registration attempts. Please try again in an hour.',
  keyGenerator: (req) => {
    const ip = (req.headers['x-forwarded-for'] || '').split(',')[0].trim() || req.ip || 'ip';
    return `register:${ip}`;
  },
});

// OTP Verification: 5 attempts per 15 minutes to prevent brute forcing 6-digit codes
const verifyEmailRateLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000,
  max: 5,
  message: 'Too many verification attempts. Please wait 15 minutes before trying again.',
  keyGenerator: (req) => {
    const ip = (req.headers['x-forwarded-for'] || '').split(',')[0].trim() || req.ip || 'ip';
    const userId = req.user?.id || req.body?.userId || 'anon';
    return `verify-otp:${ip}:${userId}`;
  },
});

// Resend Verification: max 3 resends per 15 minutes per user
const resendVerificationRateLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000,
  max: 3,
  message: 'You have requested too many verification codes. Please wait 15 minutes before requesting another.',
  keyGenerator: (req) => {
    const ip = (req.headers['x-forwarded-for'] || '').split(',')[0].trim() || req.ip || 'ip';
    const userId = req.user?.id || 'anon';
    return `resend-otp:${ip}:${userId}`;
  },
});

module.exports = {
  createRateLimiter,
  loginRateLimiter,
  registerRateLimiter,
  verifyEmailRateLimiter,
  resendVerificationRateLimiter,
};
