const pool = require('../db');
const { Errors, AppError } = require('../utils/errors');
const { sendSupportNotificationEmail } = require('./email.service');

// In-memory sliding window rate limiter
// Stores timestamps of recent submissions keyed by ip and lowercased email
const submissionHistory = new Map();
const RATE_LIMIT_WINDOW_MS = 10 * 60 * 1000; // 10 minutes
const MAX_SUBMISSIONS_PER_WINDOW = 5;

// Cleanup old rate limit entries every 15 minutes
setInterval(() => {
  const now = Date.now();
  for (const [key, timestamps] of submissionHistory.entries()) {
    const valid = timestamps.filter((t) => now - t < RATE_LIMIT_WINDOW_MS);
    if (valid.length === 0) {
      submissionHistory.delete(key);
    } else {
      submissionHistory.set(key, valid);
    }
  }
}, 15 * 60 * 1000).unref();

function checkRateLimit(key) {
  if (!key) return;
  const now = Date.now();
  const timestamps = submissionHistory.get(key) || [];
  const recent = timestamps.filter((t) => now - t < RATE_LIMIT_WINDOW_MS);

  if (recent.length >= MAX_SUBMISSIONS_PER_WINDOW) {
    throw new AppError(
      'Too many support submissions. Please wait a few minutes before submitting again.',
      429,
      'RATE_LIMIT_EXCEEDED'
    );
  }

  recent.push(now);
  submissionHistory.set(key, recent);
}

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function validateSupportInput({ name, email, subject, message }) {
  if (!name || typeof name !== 'string' || !name.trim()) {
    throw Errors.badRequest('Name is required.');
  }
  const trimmedName = name.trim();
  if (trimmedName.length < 2) {
    throw Errors.badRequest('Name must be at least 2 characters.');
  }
  if (trimmedName.length > 100) {
    throw Errors.badRequest('Name cannot exceed 100 characters.');
  }

  if (!email || typeof email !== 'string' || !email.trim()) {
    throw Errors.badRequest('Email address is required.');
  }
  const trimmedEmail = email.trim().toLowerCase();
  if (!EMAIL_REGEX.test(trimmedEmail)) {
    throw Errors.badRequest('Invalid email address format.');
  }
  if (trimmedEmail.length > 255) {
    throw Errors.badRequest('Email address cannot exceed 255 characters.');
  }

  if (!subject || typeof subject !== 'string' || !subject.trim()) {
    throw Errors.badRequest('Subject is required.');
  }
  const trimmedSubject = subject.trim();
  if (trimmedSubject.length < 3) {
    throw Errors.badRequest('Subject must be at least 3 characters.');
  }
  if (trimmedSubject.length > 200) {
    throw Errors.badRequest('Subject cannot exceed 200 characters.');
  }

  if (!message || typeof message !== 'string' || !message.trim()) {
    throw Errors.badRequest('Message is required.');
  }
  const trimmedMessage = message.trim();
  if (trimmedMessage.length < 10) {
    throw Errors.badRequest('Message must be at least 10 characters.');
  }
  if (trimmedMessage.length > 5000) {
    throw Errors.badRequest('Message cannot exceed 5000 characters.');
  }

  return {
    name: trimmedName,
    email: trimmedEmail,
    subject: trimmedSubject,
    message: trimmedMessage,
  };
}

async function submitSupportRequest({
  name,
  email,
  subject,
  message,
  userId = null,
  ipAddress = null,
}) {
  // 1. Validation
  const validated = validateSupportInput({ name, email, subject, message });

  // 2. Rate limiting check (per IP and per email)
  if (ipAddress) checkRateLimit(`ip:${ipAddress}`);
  checkRateLimit(`email:${validated.email}`);

  // 3. Database Persistence (Always save request first)
  const insertQuery = `
    INSERT INTO support_submissions (
      user_id,
      name,
      email,
      subject,
      message,
      status,
      email_delivery_status,
      ip_address
    )
    VALUES ($1, $2, $3, $4, $5, 'open', 'pending', $6)
    RETURNING
      id,
      user_id,
      name,
      email,
      subject,
      message,
      status,
      email_delivery_status,
      created_at,
      updated_at
  `;

  const insertResult = await pool.query(insertQuery, [
    userId || null,
    validated.name,
    validated.email,
    validated.subject,
    validated.message,
    ipAddress || null,
  ]);

  const submission = insertResult.rows[0];

  // 4. Dispatch Email Notification via Resend
  let emailDeliveryResult = { success: false, error: 'Not dispatched' };
  try {
    emailDeliveryResult = await sendSupportNotificationEmail({
      name: validated.name,
      email: validated.email,
      subject: validated.subject,
      message: validated.message,
      submissionId: submission.id,
      createdAt: submission.created_at,
    });
  } catch (emailErr) {
    emailDeliveryResult = { success: false, error: emailErr.message || 'Email delivery exception' };
  }

  // 5. Update Database with Email Delivery Outcome
  const newDeliveryStatus = emailDeliveryResult.success ? 'sent' : 'failed';
  const errorMessage = emailDeliveryResult.success ? null : (emailDeliveryResult.error || 'Delivery failed');

  await pool.query(
    `
      UPDATE support_submissions
      SET
        email_delivery_status = $1,
        error_message = $2,
        updated_at = current_timestamp
      WHERE id = $3
    `,
    [newDeliveryStatus, errorMessage, submission.id]
  );

  return {
    id: submission.id,
    name: submission.name,
    email: submission.email,
    subject: submission.subject,
    status: submission.status,
    emailDeliveryStatus: newDeliveryStatus,
    createdAt: submission.created_at,
    emailNotificationSent: emailDeliveryResult.success,
  };
}

module.exports = {
  submitSupportRequest,
  validateSupportInput,
  checkRateLimit,
};
