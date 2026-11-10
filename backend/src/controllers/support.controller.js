const supportService = require('../services/support.service');
const pool = require('../db');
const { SESSION_COOKIE_NAME } = require('../config/session');

/**
 * Optional session check so that authenticated requests attach the user_id
 * without blocking unauthenticated requests from the public landing page.
 */
async function extractOptionalUser(req) {
  if (req.user?.id) return req.user.id;
  const sessionId = req.cookies?.[SESSION_COOKIE_NAME];
  if (!sessionId) return null;

  try {
    const result = await pool.query(
      `
        SELECT user_id
        FROM sessions
        WHERE id = $1 AND expires_at > NOW()
      `,
      [sessionId]
    );
    return result.rows.length > 0 ? result.rows[0].user_id : null;
  } catch {
    return null;
  }
}

const submitSupport = async (req, res) => {
  const { name, email, subject, message } = req.body;
  const userId = await extractOptionalUser(req);
  const ipAddress =
    (req.headers['x-forwarded-for'] || '').split(',')[0].trim() ||
    req.socket.remoteAddress ||
    req.ip ||
    null;

  const result = await supportService.submitSupportRequest({
    name,
    email,
    subject,
    message,
    userId,
    ipAddress,
  });

  const responseMessage = result.emailNotificationSent
    ? 'Thank you for reaching out. Your message has been received and our support team has been notified.'
    : 'Your support request has been securely recorded. Our team will review your message shortly.';

  return res.status(201).json({
    success: true,
    message: responseMessage,
    data: {
      id: result.id,
      name: result.name,
      email: result.email,
      subject: result.subject,
      status: result.status,
      emailDeliveryStatus: result.emailDeliveryStatus,
      createdAt: result.createdAt,
    },
    emailNotificationSent: result.emailNotificationSent,
  });
};

module.exports = {
  submitSupport,
};
