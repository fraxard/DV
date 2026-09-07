const router = require('express').Router();
const { Errors } = require('../utils/errors');

/**
 * Support / Contact Endpoint (Phase 1 Status)
 * Validates input parameters properly.
 * Explains that backend support ingestion/ticket architecture is not yet implemented.
 */
router.post('/contact', (req, res) => {
  const { name, email, subject, message } = req.body;

  if (!name || typeof name !== 'string' || !name.trim()) {
    throw Errors.badRequest('Name is required.');
  }

  if (!email || typeof email !== 'string' || !email.trim()) {
    throw Errors.badRequest('Email address is required.');
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email.trim())) {
    throw Errors.badRequest('Invalid email address format.');
  }

  if (!subject || typeof subject !== 'string' || !subject.trim()) {
    throw Errors.badRequest('Subject is required.');
  }

  if (!message || typeof message !== 'string' || !message.trim()) {
    throw Errors.badRequest('Message is required.');
  }

  return res.status(501).json({
    error: {
      code: 'SUPPORT_BACKEND_NOT_CONFIGURED',
      message: 'Support ticket ingestion is not yet configured on this server. Backend endpoint is pending Phase 2.',
    },
  });
});

module.exports = router;
