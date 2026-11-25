const pool = require('../db');
const { SESSION_COOKIE_NAME } = require('../config/session');
const subscriptionService = require('../services/subscription.service');

const requireAuth = async (req, res, next) => {
  const sessionId = req.cookies?.[SESSION_COOKIE_NAME];

  if (!sessionId) {
    return res.status(401).json({
      error: {
        message: 'Authentication required.',
        code: 'UNAUTHORIZED',
      },
    });
  }

  const result = await pool.query(
    `
      SELECT
        s.id AS session_id,
        s.expires_at,
        u.id,
        u.email,
        u.name,
        u.avatar_url,
        u.email_verified,
        u.onboarding_completed,
        u.date_of_birth,
        u.gender,
        u.created_at,
        sub.id AS sub_id,
        sub.status AS sub_status,
        sub.trial_starts_at,
        sub.trial_ends_at,
        sub.current_period_starts_at,
        sub.current_period_ends_at
      FROM sessions s
      JOIN users u ON u.id = s.user_id
      LEFT JOIN subscriptions sub ON sub.user_id = u.id
      WHERE s.id = $1
        AND s.expires_at > NOW()
    `,
    [sessionId]
  );

  if (result.rows.length === 0) {
    return res.status(401).json({
      error: {
        message: 'Invalid or expired session.',
        code: 'SESSION_EXPIRED',
      },
    });
  }

  const row = result.rows[0];
  const user = {
    id: row.id,
    email: row.email,
    name: row.name,
    avatar_url: row.avatar_url,
    email_verified: row.email_verified,
    onboarding_completed: row.onboarding_completed,
    date_of_birth: row.date_of_birth,
    gender: row.gender,
    created_at: row.created_at,
  };

  let subObj = null;
  if (row.sub_id) {
    subObj = subscriptionService.formatSubscription({
      id: row.sub_id,
      user_id: row.id,
      status: row.sub_status,
      trial_starts_at: row.trial_starts_at,
      trial_ends_at: row.trial_ends_at,
      current_period_starts_at: row.current_period_starts_at,
      current_period_ends_at: row.current_period_ends_at,
    });
  } else {
    subObj = await subscriptionService.getSubscriptionByUserId(row.id);
  }

  user.subscription = subObj;
  req.user = user;

  next();
};

module.exports = {
  requireAuth,
};
