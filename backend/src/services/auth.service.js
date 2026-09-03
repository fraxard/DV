const bcrypt = require('bcrypt');
const crypto = require('crypto');

const pool = require('../db');

const SESSION_DURATION_DAYS = 7;

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
    const error = new Error('An account with this email already exists.');
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
        created_at
    `,
    [normalizedEmail, passwordHash, name.trim()]
  );

  const user = result.rows[0];

  const session = await createSession(user.id);

  return {
    user,
    session,
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

module.exports = {
  register,
  login,
  logout,
};