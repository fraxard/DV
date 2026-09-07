const bcrypt = require('bcrypt');
const crypto = require('crypto');

const path = require('path');
const pool = require('../db');
const storage = require('../storage');
const { Errors } = require('../utils/errors');
const { sendVerificationEmail } = require('./email.service');

const SESSION_DURATION_DAYS = 7;
const EMAIL_VERIFICATION_DURATION_MINUTES = 10;

const formatUser = (user) => {
  if (!user) return null;

  let formattedDob = null;
  if (user.date_of_birth) {
    if (typeof user.date_of_birth === 'string') {
      formattedDob = user.date_of_birth.split('T')[0];
    } else if (user.date_of_birth instanceof Date) {
      const year = user.date_of_birth.getFullYear();
      const month = String(user.date_of_birth.getMonth() + 1).padStart(2, '0');
      const day = String(user.date_of_birth.getDate()).padStart(2, '0');
      formattedDob = `${year}-${month}-${day}`;
    }
  }

  return {
    id: user.id,
    email: user.email,
    name: user.name,
    avatar_url: user.avatar_url
      ? `/api/auth/avatar/${user.id}?t=${new Date(user.updated_at || Date.now()).getTime()}`
      : null,
    email_verified: user.email_verified,
    onboarding_completed: user.onboarding_completed,
    date_of_birth: formattedDob,
    gender: user.gender || null,
    phone: user.phone,
    country: user.country,
    created_at: user.created_at,
  };
};

const createSession = async (userId) => {
  const sessionId = crypto.randomUUID();

  const expiresAt = new Date(
    Date.now() + SESSION_DURATION_DAYS * 24 * 60 * 60 * 1000
  );

  await pool.query(
    `
      INSERT INTO sessions (id, user_id, expires_at)
      VALUES ($1, $2, $3)
    `,
    [sessionId, userId, expiresAt]
  );

  return {
    id: sessionId,
    expiresAt,
  };
};

const createEmailVerificationToken = async (userId) => {
  // Invalidate any previous verification tokens.
  await pool.query(
    `
      DELETE FROM email_verification_tokens
      WHERE user_id = $1
    `,
    [userId]
  );

  const token = crypto.randomInt(100000, 1000000).toString();

  const tokenHash = crypto
    .createHash('sha256')
    .update(token)
    .digest('hex');

  const expiresAt = new Date(
    Date.now() + EMAIL_VERIFICATION_DURATION_MINUTES * 60 * 1000
  );

  await pool.query(
    `
      INSERT INTO email_verification_tokens (
        user_id,
        token_hash,
        expires_at
      )
      VALUES ($1, $2, $3)
    `,
    [userId, tokenHash, expiresAt]
  );

  return {
    token,
    expiresAt,
  };
};

const register = async ({ name, email, password }) => {
  const normalizedEmail = email.trim().toLowerCase();

  const existingUser = await pool.query(
    `
      SELECT id
      FROM users
      WHERE email = $1
    `,
    [normalizedEmail]
  );

  if (existingUser.rows.length > 0) {
    const error = new Error(
      'An account with this email already exists.'
    );
    error.statusCode = 409;
    throw error;
  }

  const passwordHash = await bcrypt.hash(password, 12);

  const result = await pool.query(
    `
      INSERT INTO users (
        email,
        password_hash,
        name
      )
      VALUES ($1, $2, $3)
      RETURNING
        id,
        email,
        name,
        email_verified,
        onboarding_completed,
        created_at
    `,
    [normalizedEmail, passwordHash, name.trim()]
  );

  const user = result.rows[0];

  const verification = await createEmailVerificationToken(user.id);

  await sendVerificationEmail({
    email: user.email,
    token: verification.token,
  });

  const session = await createSession(user.id);

  return {
    user,
    session,
    verificationToken: verification.token,
    verificationExpiresAt: verification.expiresAt,
  };
};

const login = async ({ email, password }) => {
  const normalizedEmail = email.trim().toLowerCase();

  const result = await pool.query(
    `
      SELECT
        id,
        email,
        name,
        avatar_url,
        password_hash,
        email_verified,
        onboarding_completed,
        date_of_birth,
        gender,
        created_at,
        updated_at
      FROM users
      WHERE email = $1
    `,
    [normalizedEmail]
  );

  if (result.rows.length === 0) {
    throw Errors.unauthorized('Invalid email or password.');
  }

  const user = result.rows[0];

  const passwordMatches = await bcrypt.compare(
    password,
    user.password_hash
  );

  if (!passwordMatches) {
    throw Errors.unauthorized('Invalid email or password.');
  }

  delete user.password_hash;

  const session = await createSession(user.id);

  return {
    user: formatUser(user),
    session,
  };
};

const verifyEmail = async (token) => {
  const tokenHash = crypto
    .createHash('sha256')
    .update(token)
    .digest('hex');

  const result = await pool.query(
    `
      SELECT
        evt.id AS token_id,
        evt.user_id,
        evt.expires_at,
        u.id,
        u.email,
        u.name,
        u.email_verified,
        u.onboarding_completed,
        u.created_at
      FROM email_verification_tokens evt
      JOIN users u ON u.id = evt.user_id
      WHERE evt.token_hash = $1
    `,
    [tokenHash]
  );

  if (result.rows.length === 0) {
    const error = new Error(
      'Invalid or expired verification token.'
    );
    error.statusCode = 400;
    throw error;
  }

  const verification = result.rows[0];

  if (new Date(verification.expires_at) < new Date()) {
    await pool.query(
      `
        DELETE FROM email_verification_tokens
        WHERE id = $1
      `,
      [verification.token_id]
    );

    const error = new Error(
      'Invalid or expired verification token.'
    );
    error.statusCode = 400;
    throw error;
  }

  await pool.query(
    `
      UPDATE users
      SET
        email_verified = true,
        updated_at = current_timestamp
      WHERE id = $1
    `,
    [verification.user_id]
  );

  await pool.query(
    `
      DELETE FROM email_verification_tokens
      WHERE id = $1
    `,
    [verification.token_id]
  );

  return {
    id: verification.id,
    email: verification.email,
    name: verification.name,
    email_verified: true,
    onboarding_completed: verification.onboarding_completed,
    created_at: verification.created_at,
  };
};

const resendEmailVerification = async (userId) => {
  const result = await pool.query(
    `
      SELECT
        id,
        email,
        name,
        email_verified
      FROM users
      WHERE id = $1
    `,
    [userId]
  );

  if (result.rows.length === 0) {
    const error = new Error('User not found.');
    error.statusCode = 404;
    throw error;
  }

  const user = result.rows[0];

  if (user.email_verified) {
    const error = new Error('Email is already verified.');
    error.statusCode = 400;
    throw error;
  }

  const verification = await createEmailVerificationToken(user.id);

  await sendVerificationEmail({
    email: user.email,
    token: verification.token,
  });

  return {
    user,
    verificationToken: verification.token,
    verificationExpiresAt: verification.expiresAt,
  };
};

const logout = async (sessionId) => {
  if (!sessionId) return;

  await pool.query(
    `
      DELETE FROM sessions
      WHERE id = $1
    `,
    [sessionId]
  );
};

const completeOnboarding = async ({
  userId,
  name,
  dateOfBirth,
  phone,
  country,
}) => {
  const result = await pool.query(
    `
      UPDATE users
      SET
        name = $1,
        date_of_birth = $2,
        phone = $3,
        country = $4,
        onboarding_completed = true,
        updated_at = current_timestamp
      WHERE id = $5
      RETURNING
        id,
        email,
        name,
        email_verified,
        onboarding_completed,
        date_of_birth,
        phone,
        country,
        created_at
    `,
    [
      name.trim(),
      dateOfBirth,
      phone.trim(),
      country.trim(),
      userId,
    ]
  );

  if (result.rows.length === 0) {
    const error = new Error('User not found.');
    error.statusCode = 404;
    throw error;
  }

  return formatUser(result.rows[0]);
};

const getUserById = async (userId) => {
  const result = await pool.query(
    `
      SELECT
        id,
        email,
        name,
        avatar_url,
        email_verified,
        onboarding_completed,
        date_of_birth,
        gender,
        phone,
        country,
        created_at,
        updated_at
      FROM users
      WHERE id = $1
    `,
    [userId]
  );

  if (result.rows.length === 0) {
    return null;
  }

  return formatUser(result.rows[0]);
};

const updateProfile = async (userId, { name, dateOfBirth, gender }) => {
  if (!name || typeof name !== 'string' || !name.trim()) {
    throw Errors.badRequest('Name is required.');
  }

  const hasDob = dateOfBirth !== undefined;
  const cleanDob = hasDob && dateOfBirth && typeof dateOfBirth === 'string' && dateOfBirth.trim()
    ? dateOfBirth.trim()
    : null;

  const hasGender = gender !== undefined;
  const cleanGender = hasGender && gender && typeof gender === 'string' && gender.trim()
    ? gender.trim()
    : null;

  const result = await pool.query(
    `
      UPDATE users
      SET
        name = $1,
        date_of_birth = CASE WHEN $2::boolean THEN $3::date ELSE date_of_birth END,
        gender = CASE WHEN $4::boolean THEN $5::varchar ELSE gender END,
        updated_at = current_timestamp
      WHERE id = $6
      RETURNING
        id,
        email,
        name,
        avatar_url,
        email_verified,
        onboarding_completed,
        date_of_birth,
        gender,
        phone,
        country,
        created_at,
        updated_at
    `,
    [name.trim(), hasDob, cleanDob, hasGender, cleanGender, userId]
  );

  if (result.rows.length === 0) {
    throw Errors.notFound('User not found.');
  }

  return formatUser(result.rows[0]);
};

const uploadAvatar = async (userId, file) => {
  if (!file || !file.buffer) {
    throw Errors.badRequest('Avatar image file is required.');
  }

  const allowedTypes = new Set(['image/jpeg', 'image/jpg', 'image/png', 'image/webp']);
  if (!allowedTypes.has(file.mimetype.toLowerCase())) {
    throw Errors.badRequest('Invalid image type. Only JPG, PNG, and WebP are allowed.');
  }

  const ext = path.extname(file.originalname || '').toLowerCase() || '.jpg';
  const fileKey = crypto.randomUUID();
  const storageKey = `avatars/${userId}/${fileKey}${ext}`;

  await storage.save(storageKey, file.buffer, file.mimetype);

  const result = await pool.query(
    `
      UPDATE users
      SET
        avatar_url = $1,
        updated_at = current_timestamp
      WHERE id = $2
      RETURNING
        id,
        email,
        name,
        avatar_url,
        email_verified,
        onboarding_completed,
        date_of_birth,
        gender,
        phone,
        country,
        created_at,
        updated_at
    `,
    [storageKey, userId]
  );

  if (result.rows.length === 0) {
    throw Errors.notFound('User not found.');
  }

  return formatUser(result.rows[0]);
};

const getAvatarStream = async (userId) => {
  const result = await pool.query(
    `
      SELECT avatar_url
      FROM users
      WHERE id = $1
    `,
    [userId]
  );

  if (result.rows.length === 0 || !result.rows[0].avatar_url) {
    throw Errors.notFound('Avatar not found.');
  }

  const storageKey = result.rows[0].avatar_url;
  const stream = await storage.getStream(storageKey);
  const ext = path.extname(storageKey).toLowerCase();
  const mimeType = ext === '.png' ? 'image/png' : ext === '.webp' ? 'image/webp' : 'image/jpeg';

  return { stream, mimeType };
};

const requestEmailChange = async (userId, newEmail) => {
  if (!newEmail || typeof newEmail !== 'string') {
    throw Errors.badRequest('New email address is required.');
  }

  const normalizedEmail = newEmail.trim().toLowerCase();
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(normalizedEmail)) {
    throw Errors.badRequest('Invalid email address format.');
  }

  const userResult = await pool.query(
    `SELECT id, email FROM users WHERE id = $1`,
    [userId]
  );

  if (userResult.rows.length === 0) {
    throw Errors.notFound('User not found.');
  }

  const currentEmail = userResult.rows[0].email.toLowerCase();
  if (normalizedEmail === currentEmail) {
    throw Errors.badRequest('New email must be different from your current email.');
  }

  // Check uniqueness against other users
  const conflictCheck = await pool.query(
    `SELECT id FROM users WHERE email = $1 AND id != $2`,
    [normalizedEmail, userId]
  );

  if (conflictCheck.rows.length > 0) {
    throw Errors.conflict('An account with this email already exists.');
  }

  // Clear previous tokens for this user
  await pool.query(
    `DELETE FROM email_verification_tokens WHERE user_id = $1`,
    [userId]
  );

  const token = crypto.randomInt(100000, 1000000).toString();
  const tokenHash = crypto
    .createHash('sha256')
    .update(token)
    .digest('hex');

  const expiresAt = new Date(
    Date.now() + EMAIL_VERIFICATION_DURATION_MINUTES * 60 * 1000
  );

  await pool.query(
    `
      INSERT INTO email_verification_tokens (
        user_id,
        token_hash,
        expires_at,
        pending_email
      )
      VALUES ($1, $2, $3, $4)
    `,
    [userId, tokenHash, expiresAt, normalizedEmail]
  );

  try {
    await sendVerificationEmail({
      email: normalizedEmail,
      token,
    });
  } catch (emailErr) {
    console.error('Failed to send verification email for email change:', emailErr);
    // Don't fail completely in dev if resend key is testing/unconfigured
  }

  return {
    message: 'Verification code sent to new email.',
    pendingEmail: normalizedEmail,
    expiresAt,
    token: process.env.NODE_ENV !== 'production' ? token : undefined,
  };
};

const verifyEmailChange = async (userId, token) => {
  if (!token || typeof token !== 'string') {
    throw Errors.badRequest('Verification code is required.');
  }

  const tokenHash = crypto
    .createHash('sha256')
    .update(token.trim())
    .digest('hex');

  const tokenResult = await pool.query(
    `
      SELECT id, user_id, pending_email, expires_at
      FROM email_verification_tokens
      WHERE user_id = $1 AND token_hash = $2
    `,
    [userId, tokenHash]
  );

  if (tokenResult.rows.length === 0) {
    throw Errors.badRequest('Invalid verification code.');
  }

  const record = tokenResult.rows[0];

  if (new Date(record.expires_at) < new Date()) {
    await pool.query(
      `DELETE FROM email_verification_tokens WHERE id = $1`,
      [record.id]
    );
    throw Errors.badRequest('Verification code has expired. Please request a new one.');
  }

  if (!record.pending_email) {
    throw Errors.badRequest('No pending email change request found.');
  }

  // Double check uniqueness to prevent race conditions
  const conflictCheck = await pool.query(
    `SELECT id FROM users WHERE email = $1 AND id != $2`,
    [record.pending_email, userId]
  );

  if (conflictCheck.rows.length > 0) {
    throw Errors.conflict('An account with this email already exists.');
  }

  // Update user's email
  const updateResult = await pool.query(
    `
      UPDATE users
      SET
        email = $1,
        email_verified = true,
        updated_at = current_timestamp
      WHERE id = $2
      RETURNING
        id,
        email,
        name,
        avatar_url,
        email_verified,
        onboarding_completed,
        date_of_birth,
        gender,
        phone,
        country,
        created_at,
        updated_at
    `,
    [record.pending_email, userId]
  );

  // Clean up verification token
  await pool.query(
    `DELETE FROM email_verification_tokens WHERE id = $1`,
    [record.id]
  );

  return formatUser(updateResult.rows[0]);
};

const resendEmailChange = async (userId) => {
  const tokenResult = await pool.query(
    `
      SELECT id, pending_email
      FROM email_verification_tokens
      WHERE user_id = $1 AND pending_email IS NOT NULL
      ORDER BY created_at DESC
      LIMIT 1
    `,
    [userId]
  );

  if (tokenResult.rows.length === 0 || !tokenResult.rows[0].pending_email) {
    throw Errors.badRequest('No pending email change request found.');
  }

  const pendingEmail = tokenResult.rows[0].pending_email;

  await pool.query(
    `DELETE FROM email_verification_tokens WHERE user_id = $1`,
    [userId]
  );

  const token = crypto.randomInt(100000, 1000000).toString();
  const tokenHash = crypto
    .createHash('sha256')
    .update(token)
    .digest('hex');

  const expiresAt = new Date(
    Date.now() + EMAIL_VERIFICATION_DURATION_MINUTES * 60 * 1000
  );

  await pool.query(
    `
      INSERT INTO email_verification_tokens (
        user_id,
        token_hash,
        expires_at,
        pending_email
      )
      VALUES ($1, $2, $3, $4)
    `,
    [userId, tokenHash, expiresAt, pendingEmail]
  );

  try {
    await sendVerificationEmail({
      email: pendingEmail,
      token,
    });
  } catch (emailErr) {
    console.error('Failed to send verification email for email change:', emailErr);
  }

  return {
    message: 'Verification code resent.',
    pendingEmail,
    expiresAt,
    token: process.env.NODE_ENV !== 'production' ? token : undefined,
  };
};

module.exports = {
  register,
  login,
  logout,
  verifyEmail,
  resendEmailVerification,
  completeOnboarding,
  getUserById,
  updateProfile,
  uploadAvatar,
  getAvatarStream,
  requestEmailChange,
  verifyEmailChange,
  resendEmailChange,
  formatUser,
};