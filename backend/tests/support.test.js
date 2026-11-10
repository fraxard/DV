const { test, describe, before, after } = require('node:test');
const assert = require('node:assert/strict');
const { startTestServer, stopTestServer, request, createTestUser, pool } = require('./testHelper');

describe('Support & Contact Submission Lifecycle Tests', () => {
  let user = null;

  before(async () => {
    await startTestServer();
    user = await createTestUser('support_user');
  });

  after(async () => {
    if (user) await user.cleanup();
    await stopTestServer();
  });

  test('Input validation rejects invalid payloads with 400', async () => {
    // Missing name
    let res = await request(
      { path: '/api/support', method: 'POST' },
      {
        email: 'test@example.com',
        subject: 'Help',
        message: 'Need help with vault assets.',
      }
    );
    assert.equal(res.status, 400);

    // Invalid email
    res = await request(
      { path: '/api/support', method: 'POST' },
      {
        name: 'Tester',
        email: 'invalid-email',
        subject: 'Help',
        message: 'Need help with vault assets.',
      }
    );
    assert.equal(res.status, 400);

    // Short message (< 10 chars)
    res = await request(
      { path: '/api/support', method: 'POST' },
      {
        name: 'Tester',
        email: 'test@example.com',
        subject: 'Help',
        message: 'Hi',
      }
    );
    assert.equal(res.status, 400);
  });

  test('Unauthenticated support submission succeeds with 201', async () => {
    const res = await request(
      { path: '/api/support', method: 'POST' },
      {
        name: 'Public Visitor',
        email: 'visitor@example.com',
        subject: 'Question about DigiVirasat',
        message: 'I would like to inquire about the security of DigiVirasat.',
      }
    );

    assert.equal(res.status, 201);
    const data = res.body;
    assert.equal(data.success, true);
    assert.ok(data.data.id);

    // Verify record in database has user_id = null
    const dbRes = await pool.query('SELECT * FROM support_submissions WHERE id = $1', [data.data.id]);
    assert.equal(dbRes.rows.length, 1);
    assert.equal(dbRes.rows[0].user_id, null);
    assert.equal(dbRes.rows[0].email, 'visitor@example.com');

    // Clean up ticket
    await pool.query('DELETE FROM support_submissions WHERE id = $1', [data.data.id]);
  });

  test('Authenticated support submission links user ID', async () => {
    const res = await request(
      { path: '/api/support', method: 'POST' },
      {
        name: user.name,
        email: user.email,
        subject: 'Inquiry regarding asset allocation',
        message: 'How do I allocate one asset across multiple nominees?',
      },
      user.cookie
    );

    assert.equal(res.status, 201);
    const data = res.body;
    assert.equal(data.success, true);
    assert.ok(data.data.id);

    // Verify record in database has user_id = user.id
    const dbRes = await pool.query('SELECT * FROM support_submissions WHERE id = $1', [data.data.id]);
    assert.equal(dbRes.rows.length, 1);
    assert.equal(dbRes.rows[0].user_id, user.id);

    // Clean up ticket
    await pool.query('DELETE FROM support_submissions WHERE id = $1', [data.data.id]);
  });

  test('Legacy /contact endpoint alias succeeds with 201', async () => {
    const res = await request(
      { path: '/api/support/contact', method: 'POST' },
      {
        name: 'Legacy Contact',
        email: 'legacy@example.com',
        subject: 'Legacy endpoint check',
        message: 'Verifying backwards compatibility for contact forms.',
      }
    );

    assert.equal(res.status, 201);
    const data = res.body;
    assert.equal(data.success, true);

    await pool.query('DELETE FROM support_submissions WHERE id = $1', [data.data.id]);
  });

  test('Rate limiter triggers 429 when max submissions exceeded', async () => {
    const uniqueEmail = `spam-test-${Date.now()}@example.com`;
    const payload = {
      name: 'Rate Limit Tester',
      email: uniqueEmail,
      subject: 'Spamming support',
      message: 'Testing rate limit threshold behavior on support submission.',
    };

    const ticketIds = [];
    let blocked = false;

    try {
      for (let i = 0; i < 7; i++) {
        const res = await request(
          {
            path: '/api/support',
            method: 'POST',
            headers: {
              'X-Forwarded-For': `198.51.100.${Math.floor(Date.now() % 200)}`,
            },
          },
          payload
        );

        if (res.status === 429) {
          blocked = true;
          break;
        } else if (res.status === 201) {
          if (res.body?.data?.id) ticketIds.push(res.body.data.id);
        }
      }

      assert.equal(blocked, true, 'Rate limiter should return 429 after 5 submissions');
    } finally {
      if (ticketIds.length > 0) {
        await pool.query('DELETE FROM support_submissions WHERE id = ANY($1)', [ticketIds]);
      }
    }
  });
});
