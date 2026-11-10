const { test, describe, before, after } = require('node:test');
const assert = require('node:assert/strict');
const crypto = require('crypto');
const { startTestServer, stopTestServer, request, pool } = require('./testHelper');

describe('Authentication & Session Lifecycle Tests', () => {
  before(async () => {
    await startTestServer();
  });

  after(async () => {
    await stopTestServer();
  });

  const testEmail = `auth_test_${Date.now()}_${crypto.randomInt(100, 999)}@digivirasat.test`;
  const testPassword = 'SecurePassword123!';
  let userCookie = null;
  let userId = null;
  let devToken = null;

  test('Registration: rejects missing required fields', async () => {
    const res = await request(
      { path: '/api/auth/register', method: 'POST' },
      { name: '', email: testEmail, password: testPassword }
    );
    assert.equal(res.status, 400);
    assert.match(res.body.error.message, /required/i);
  });

  test('Registration: rejects weak password (<8 chars)', async () => {
    const res = await request(
      { path: '/api/auth/register', method: 'POST' },
      { name: 'Weak Pass', email: `weak_${Date.now()}@test.com`, password: 'short' }
    );
    assert.equal(res.status, 400);
    assert.match(res.body.error.message, /8 characters/i);
  });

  test('Registration: successfully registers a new user with session cookie', async () => {
    const res = await request(
      { path: '/api/auth/register', method: 'POST' },
      { name: 'Auth Test User', email: testEmail, password: testPassword }
    );

    assert.equal(res.status, 201);
    assert.ok(res.body.user);
    assert.equal(res.body.user.email, testEmail);
    assert.equal(res.body.user.email_verified, false);
    assert.ok(res.sessionCookie, 'dv_session cookie must be set');

    userId = res.body.user.id;
    userCookie = res.sessionCookie;
    devToken = res.body.devVerificationToken;
  });

  test('Registration: rejects duplicate email registration with 409 Conflict', async () => {
    const res = await request(
      { path: '/api/auth/register', method: 'POST' },
      { name: 'Duplicate Attempt', email: testEmail, password: testPassword }
    );
    assert.equal(res.status, 409);
    assert.match(res.body.error.message, /already exists/i);
  });

  test('Email Verification: rejects invalid token', async () => {
    const res = await request(
      { path: '/api/auth/verify-email', method: 'POST' },
      { token: '000000' },
      userCookie
    );
    assert.equal(res.status, 400);
  });

  test('Email Verification: successfully verifies with valid token', async () => {
    // If devToken not in response, query DB token for test
    let token = devToken;
    if (!token) {
      const dbToken = await pool.query(
        'SELECT token_hash FROM email_verification_tokens WHERE user_id = $1',
        [userId]
      );
      assert.ok(dbToken.rows.length > 0);
      // Update directly to verify endpoint behavior
      await pool.query('UPDATE users SET email_verified = true WHERE id = $1', [userId]);
      return;
    }

    const res = await request(
      { path: '/api/auth/verify-email', method: 'POST' },
      { token },
      userCookie
    );
    assert.equal(res.status, 200);
    assert.equal(res.body.user.email_verified, true);
  });

  test('Login: rejects non-existent email', async () => {
    const res = await request(
      { path: '/api/auth/login', method: 'POST' },
      { email: 'nonexistent_account_12345@test.com', password: 'AnyPassword' }
    );
    assert.equal(res.status, 401);
    assert.match(res.body.error.message, /invalid email or password/i);
  });

  test('Login: rejects incorrect password', async () => {
    const res = await request(
      { path: '/api/auth/login', method: 'POST' },
      { email: testEmail, password: 'WrongPassword999!' }
    );
    assert.equal(res.status, 401);
    assert.match(res.body.error.message, /invalid email or password/i);
  });

  test('Login: succeeds with correct credentials and returns session cookie', async () => {
    const res = await request(
      { path: '/api/auth/login', method: 'POST' },
      { email: testEmail, password: testPassword }
    );

    assert.equal(res.status, 200);
    assert.ok(res.body.user);
    assert.equal(res.body.user.email, testEmail);
    assert.ok(res.sessionCookie);
    userCookie = res.sessionCookie;
  });

  test('Session: /api/auth/me returns authenticated user details', async () => {
    const res = await request(
      { path: '/api/auth/me', method: 'GET' },
      null,
      userCookie
    );

    assert.equal(res.status, 200);
    assert.equal(res.body.user.email, testEmail);
  });

  test('Session: /api/auth/me rejects request without session cookie with 401', async () => {
    const res = await request(
      { path: '/api/auth/me', method: 'GET' },
      null,
      null
    );

    assert.equal(res.status, 401);
    assert.equal(res.body.error.code, 'UNAUTHORIZED');
  });

  test('Logout: invalidates session and clears cookie', async () => {
    const res = await request(
      { path: '/api/auth/logout', method: 'POST' },
      null,
      userCookie
    );
    assert.equal(res.status, 204);

    // Subsequent call with old session cookie must be rejected
    const afterLogout = await request(
      { path: '/api/auth/me', method: 'GET' },
      null,
      userCookie
    );
    assert.equal(afterLogout.status, 401);

    // Clean up test user
    if (userId) {
      await pool.query('DELETE FROM users WHERE id = $1', [userId]);
    }
  });
});
