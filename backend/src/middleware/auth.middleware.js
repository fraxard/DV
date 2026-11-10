const pool = require('../db');
const { SESSION_COOKIE_NAME } = require('../config/session');

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
        u.created_at
      FROM sessions s
      JOIN users u ON u.id = s.user_id
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

  req.user = result.rows[0];

  next();
};

module.exports = {
  requireAuth,
};
