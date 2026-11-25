const { test, describe, before, after } = require('node:test');
const assert = require('node:assert/strict');
const crypto = require('crypto');
const { startTestServer, stopTestServer, request, pool } = require('./testHelper');
const { verifyEmailRateLimiter } = require('../src/middleware/rateLimit.middleware');

describe('Authentication, OTP Security & Domain Tests', () => {
  before(async () => {
    await startTestServer();
  });

  after(async () => {
    await stopTestServer();
    await pool.end();
  });

  const testEmail = `auth_test_${Date.now()}_${crypto.randomInt(100, 999)}@digivirasat.test`;
  const testPassword = 'SecurePassword123!';
  let userCookie = null;
  let userId = null;

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

  test('Registration: registers user and NEVER exposes OTP in response', async () => {
    const res = await request(
      { path: '/api/auth/register', method: 'POST' },
      { name: 'Auth Test User', email: testEmail, password: testPassword }
    );

    assert.equal(res.status, 201);
    assert.ok(res.body.user);
    assert.equal(res.body.user.email, testEmail);
    assert.equal(res.body.user.email_verified, false);
    assert.ok(res.sessionCookie, 'dv_session cookie must be set');

    // SECURITY CHECK: Ensure OTP is never exposed in API payload
    assert.equal(res.body.devVerificationToken, undefined, 'devVerificationToken must never be returned');
    assert.equal(res.body.verificationToken, undefined, 'verificationToken must never be returned');
    assert.equal(res.body.token, undefined, 'token must never be returned');

    userId = res.body.user.id;
    userCookie = res.sessionCookie;

    // Verify OTP was stored in DB as SHA-256 hash
    const dbToken = await pool.query(
      'SELECT token_hash, expires_at FROM email_verification_tokens WHERE user_id = $1',
      [userId]
    );
    assert.equal(dbToken.rows.length, 1, 'OTP record must exist in database');
    assert.equal(dbToken.rows[0].token_hash.length, 64, 'Token must be stored as SHA-256 hex string');
  });

  test('Resend Verification: resends email and NEVER exposes OTP in response', async () => {
    const res = await request(
      { path: '/api/auth/resend-verification', method: 'POST' },
      null,
      userCookie
    );

    assert.equal(res.status, 200);
    assert.equal(res.body.message, 'Verification email resent.');
    // SECURITY CHECK:
    assert.equal(res.body.devVerificationToken, undefined, 'Resend must not leak devVerificationToken');
    assert.equal(res.body.verificationToken, undefined, 'Resend must not leak verificationToken');
    assert.equal(res.body.token, undefined, 'Resend must not leak token');
  });

  test('Registration: rejects duplicate email with 409 Conflict', async () => {
    const res = await request(
      { path: '/api/auth/register', method: 'POST' },
      { name: 'Duplicate Attempt', email: testEmail, password: testPassword }
    );
    assert.equal(res.status, 409);
    assert.match(res.body.error.message, /already exists/i);
  });

  test('OTP Verification: rejects malformed tokens (non-6 digits)', async () => {
    const nonDigit = await request(
      { path: '/api/auth/verify-email', method: 'POST' },
      { token: 'abcdef' },
      userCookie
    );
    assert.equal(nonDigit.status, 400);

    const shortToken = await request(
      { path: '/api/auth/verify-email', method: 'POST' },
      { token: '123' },
      userCookie
    );
    assert.equal(shortToken.status, 400);

    const longToken = await request(
      { path: '/api/auth/verify-email', method: 'POST' },
      { token: '1234567' },
      userCookie
    );
    assert.equal(longToken.status, 400);
  });

  test('OTP Verification: rejects incorrect 6-digit token', async () => {
    const res = await request(
      { path: '/api/auth/verify-email', method: 'POST' },
      { token: '000000' },
      userCookie
    );
    assert.equal(res.status, 400);
    assert.match(res.body.error.message, /invalid or expired/i);
  });

  test('OTP Verification: rejects expired token', async () => {
    const expiredToken = '123456';
    const expiredHash = crypto.createHash('sha256').update(expiredToken).digest('hex');

    // Set an expired token in DB
    await pool.query(
      `UPDATE email_verification_tokens
       SET token_hash = $1, expires_at = NOW() - INTERVAL '5 minutes'
       WHERE user_id = $2`,
      [expiredHash, userId]
    );

    const res = await request(
      { path: '/api/auth/verify-email', method: 'POST' },
      { token: expiredToken },
      userCookie
    );
    assert.equal(res.status, 400);
    assert.match(res.body.error.message, /invalid or expired/i);
  });

  test('OTP Verification: successfully verifies with valid 6-digit token and is one-time use', async () => {
    // Reset rate limiter so positive verification has fresh quota
    verifyEmailRateLimiter.reset();

    const validToken = '852963';
    const validHash = crypto.createHash('sha256').update(validToken).digest('hex');

    // Place fresh valid token in DB for this user
    await pool.query(
      'DELETE FROM email_verification_tokens WHERE user_id = $1',
      [userId]
    );
    await pool.query(
      `INSERT INTO email_verification_tokens (user_id, token_hash, expires_at)
       VALUES ($1, $2, NOW() + INTERVAL '10 minutes')`,
      [userId, validHash]
    );

    const res = await request(
      { path: '/api/auth/verify-email', method: 'POST' },
      { token: validToken },
      userCookie
    );
    assert.equal(res.status, 200);
    assert.equal(res.body.user.email_verified, true);

    // Verify token was deleted from database
    const tokenCheck = await pool.query(
      'SELECT id FROM email_verification_tokens WHERE user_id = $1',
      [userId]
    );
    assert.equal(tokenCheck.rows.length, 0, 'Token must be deleted after successful use');

    // Replay attack prevention: second attempt with same token must fail
    const replayRes = await request(
      { path: '/api/auth/verify-email', method: 'POST' },
      { token: validToken },
      userCookie
    );
    assert.equal(replayRes.status, 400);
  });

  test('OTP Rate Limiting: blocks after exceeding attempt limit (429 Too Many Requests)', async () => {
    // Reset limiter first to ensure test isolation
    verifyEmailRateLimiter.reset();

    // 5 attempts are allowed by verifyEmailRateLimiter
    for (let i = 0; i < 5; i++) {
      const res = await request(
        { path: '/api/auth/verify-email', method: 'POST' },
        { token: '999999' },
        userCookie
      );
      assert.equal(res.status, 400);
    }

    // 6th attempt should be blocked with 429
    const blockedRes = await request(
      { path: '/api/auth/verify-email', method: 'POST' },
      { token: '999999' },
      userCookie
    );
    assert.equal(blockedRes.status, 429);
    assert.equal(blockedRes.body.error.code, 'RATE_LIMIT_EXCEEDED');

    // Clean up rate limiter state for subsequent tests
    verifyEmailRateLimiter.reset();
  });

  test('CORS: allows primary domain https://digivirasat.in and secondary domain https://digitalvirasat.in', async () => {
    // Primary domain preflight
    const primaryRes = await request({
      path: '/api/auth/me',
      method: 'OPTIONS',
      headers: {
        'Origin': 'https://digivirasat.in',
        'Access-Control-Request-Method': 'GET',
      },
    });
    assert.equal(primaryRes.headers['access-control-allow-origin'], 'https://digivirasat.in');
    assert.equal(primaryRes.headers['access-control-allow-credentials'], 'true');

    // Secondary domain preflight
    const secondaryRes = await request({
      path: '/api/auth/me',
      method: 'OPTIONS',
      headers: {
        'Origin': 'https://digitalvirasat.in',
        'Access-Control-Request-Method': 'GET',
      },
    });
    assert.equal(secondaryRes.headers['access-control-allow-origin'], 'https://digitalvirasat.in');
    assert.equal(secondaryRes.headers['access-control-allow-credentials'], 'true');

    // Unauthorized origin rejected
    const unauthorizedRes = await request({
      path: '/api/auth/me',
      method: 'OPTIONS',
      headers: {
        'Origin': 'https://malicious-attacker.com',
        'Access-Control-Request-Method': 'GET',
      },
    });
    assert.notEqual(unauthorizedRes.headers['access-control-allow-origin'], 'https://malicious-attacker.com');
  });

  test('Login: rejects invalid credentials', async () => {
    const res = await request(
      { path: '/api/auth/login', method: 'POST' },
      { email: testEmail, password: 'WrongPassword999!' }
    );
    assert.equal(res.status, 401);
  });

  test('Login: succeeds with valid credentials and sets session', async () => {
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

  test('Logout: invalidates session and clears cookie', async () => {
    const res = await request(
      { path: '/api/auth/logout', method: 'POST' },
      null,
      userCookie
    );
    assert.equal(res.status, 204);

    const afterLogout = await request(
      { path: '/api/auth/me', method: 'GET' },
      null,
      userCookie
    );
    assert.equal(afterLogout.status, 401);

    // Clean up test user from DB
    if (userId) {
      await pool.query('DELETE FROM users WHERE id = $1', [userId]);
    }
  });
});
