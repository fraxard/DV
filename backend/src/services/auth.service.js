const bcrypt = require('bcrypt');
const crypto = require('crypto');

const pool = require('../db');

const SESSION_DURATION_DAYS = 7;
const EMAIL_VERIFICATION_DURATION_MINUTES = 15;

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

  const token = crypto.randomBytes(32).toString('hex');

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
        password_hash,
        email_verified,
        onboarding_completed,
        created_at
      FROM users
      WHERE email = $1
    `,
    [normalizedEmail]
  );

  if (result.rows.length === 0) {
    const error = new Error('Invalid email or password.');
    error.statusCode = 401;
    throw error;
  }

  const user = result.rows[0];

  const passwordMatches = await bcrypt.compare(
    password,
    user.password_hash
  );

  if (!passwordMatches) {
    const error = new Error('Invalid email or password.');
    error.statusCode = 401;
    throw error;
  }

  delete user.password_hash;

  const session = await createSession(user.id);

  return {
    user,
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

  return result.rows[0];
};

module.exports = {
  register,
  login,
  logout,
  verifyEmail,
  resendEmailVerification,
  completeOnboarding,
};