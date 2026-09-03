const pool = require('../db');

const requireAuth = async (req, res, next) => {
  const sessionId = req.cookies.dv_session;

  if (!sessionId) {
    return res.status(401).json({
      error: {
        message: 'Authentication required.',
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
        u.email_verified,
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
      },
    });
  }

  req.user = result.rows[0];

  next();
};

module.exports = {
  requireAuth,
};