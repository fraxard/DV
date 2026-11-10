const { test, describe, before, after } = require('node:test');
const assert = require('node:assert/strict');
const crypto = require('crypto');
const { startTestServer, stopTestServer, request, pool, createTestUser } = require('./testHelper');
const LocalStorageProvider = require('../src/storage/localStorage');

describe('Security, Rate Limiting & Isolation Tests', () => {
  let userA = null;
  let userB = null;

  before(async () => {
    await startTestServer();
    userA = await createTestUser('sec_user_a');
    userB = await createTestUser('sec_user_b');
  });

  after(async () => {
    if (userA) await userA.cleanup();
    if (userB) await userB.cleanup();
    await stopTestServer();
  });

  test('Rate Limiter: login rate limiter triggers HTTP 429 on excessive attempts', async () => {
    const attackEmail = `bruteforce_${Date.now()}@test.com`;
    let lastRes = null;

    // Send 11 rapid attempts (limit is 10)
    for (let i = 0; i < 11; i++) {
      lastRes = await request(
        { path: '/api/auth/login', method: 'POST' },
        { email: attackEmail, password: 'WrongPassword!' }
      );
    }

    assert.equal(lastRes.status, 429);
    assert.equal(lastRes.body.error.code, 'RATE_LIMIT_EXCEEDED');
    assert.ok(lastRes.headers['retry-after']);
    assert.match(lastRes.body.error.message, /too many login attempts/i);
  });

  test('Rate Limiter: OTP verification rate limiter triggers HTTP 429 on excessive invalid OTP guesses', async () => {
    const testUserId = crypto.randomUUID();
    let lastRes = null;

    // Send 6 rapid attempts (limit is 5)
    for (let i = 0; i < 6; i++) {
      lastRes = await request(
        { path: '/api/auth/verify-email', method: 'POST' },
        { token: '999999', userId: testUserId }
      );
    }

    assert.equal(lastRes.status, 429);
    assert.equal(lastRes.body.error.code, 'RATE_LIMIT_EXCEEDED');
    assert.ok(lastRes.headers['retry-after']);
  });

  test('SQL Injection: safely rejects SQL injection payloads in email and password fields', async () => {
    const sqliPayloads = [
      "' OR '1'='1",
      "admin'--",
      "'; DROP TABLE users; --",
      "' UNION SELECT null, null, null--",
    ];

    for (const payload of sqliPayloads) {
      const res = await request(
        { path: '/api/auth/login', method: 'POST' },
        { email: payload, password: payload }
      );
      assert.equal(res.status, 401);
      assert.match(res.body.error.message, /invalid email or password/i);
    }
  });

  test('Path Traversal: LocalStorageProvider rejects dangerous storage keys', async () => {
    const storage = new LocalStorageProvider();

    const maliciousKeys = [
      '../../etc/passwd',
      '..\\..\\windows\\system32',
      'users/../../../secret.txt',
      'users/test\0/hidden.txt',
      '/absolute/path/attack.txt',
    ];

    for (const key of maliciousKeys) {
      await assert.rejects(
        async () => {
          await storage.save(key, Buffer.from('attack'), 'text/plain');
        },
        /(Path traversal|invalid)/i
      );
    }
  });

  test('Multi-User Isolation: User B cannot access or modify User A profile', async () => {
    // User B tries to update profile details - only affects User B's own record derived from session
    const res = await request(
      { path: '/api/auth/profile', method: 'PUT' },
      { name: 'User B New Name', dateOfBirth: '1995-01-01', gender: 'Female' },
      userB.cookie
    );
    assert.equal(res.status, 200);
    assert.equal(res.body.user.id, userB.id);

    // Verify User A profile is untouched in DB
    const checkUserA = await pool.query('SELECT name FROM users WHERE id = $1', [userA.id]);
    assert.equal(checkUserA.rows[0].name, userA.name);
  });
});
