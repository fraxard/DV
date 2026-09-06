/**
 * DigiVirasat Phase 5.1: Recent Activity Server-Side Pagination Test Suite
 */

require('dotenv').config({ path: require('path').join(__dirname, '.env') });
const assert = require('assert');
const http = require('http');
const crypto = require('crypto');
const bcrypt = require('bcrypt');
const pool = require('./src/db');
const app = require('./src/app');
const { logActivity, listActivities, listActivitiesPaginated } = require('./src/services/activity.service');
const taskService = require('./src/services/task.service');

const colors = {
  green: (s) => `\x1b[32m${s}\x1b[0m`,
  red: (s) => `\x1b[31m${s}\x1b[0m`,
  bold: (s) => `\x1b[1m${s}\x1b[0m`,
  cyan: (s) => `\x1b[36m${s}\x1b[0m`,
};

async function createTestUser(email, name = 'Activity Test User') {
  await pool.query('DELETE FROM users WHERE email = $1', [email]);
  const pwdHash = await bcrypt.hash('Password123!', 10);
  const userRes = await pool.query(
    `INSERT INTO users (name, email, password_hash, email_verified, onboarding_completed)
     VALUES ($1, $2, $3, true, true)
     RETURNING id, email, name`,
    [name, email, pwdHash]
  );
  const userId = userRes.rows[0].id;
  const sessionId = crypto.randomUUID();
  await pool.query(
    `INSERT INTO sessions (id, user_id, expires_at)
     VALUES ($1, $2, NOW() + INTERVAL '2 hours')`,
    [sessionId, userId]
  );
  return {
    id: userId,
    email,
    cookie: `dv_session=${sessionId}`,
  };
}

async function request(url, options = {}, cookie = '') {
  const headers = {
    'Content-Type': 'application/json',
    ...(options.headers || {}),
  };
  if (cookie) {
    headers['Cookie'] = cookie;
  }

  const res = await fetch(url, {
    ...options,
    headers,
  });

  const text = await res.text();
  let json = null;
  try {
    json = JSON.parse(text);
  } catch (e) {}

  return {
    status: res.status,
    headers: res.headers,
    data: json,
    rawText: text,
  };
}

async function runTests() {
  console.log(colors.bold('\n===================================================='));
  console.log(colors.bold('  DIGIVIRASAT PHASE 5.1: ACTIVITY PAGINATION TESTS'));
  console.log(colors.bold('====================================================\n'));

  // Start ephemeral server
  const server = http.createServer(app);
  await new Promise((resolve) => server.listen(0, resolve));
  const port = server.address().port;
  const API_URL = `http://localhost:${port}/api`;

  try {
    // Setup clean test users
    const userA = await createTestUser('user_a_pagination@test.digivirasat.internal', 'User A');
    const userB = await createTestUser('user_b_pagination@test.digivirasat.internal', 'User B');
    const userEmpty = await createTestUser('user_empty_pagination@test.digivirasat.internal', 'Empty User');

    // Clean any prior activity logs for these users
    await pool.query('DELETE FROM activity_logs WHERE user_id IN ($1, $2, $3)', [userA.id, userB.id, userEmpty.id]);

    // Insert 25 sequential activity logs for User A with slight delay / deterministic created_at
    const baseTime = Date.now() - 3600000; // 1 hour ago
    for (let i = 1; i <= 25; i++) {
      const createdAt = new Date(baseTime + i * 10000).toISOString();
      await pool.query(
        `INSERT INTO activity_logs (user_id, action, title, category, metadata, created_at)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [userA.id, 'create', `User A Event ${i.toString().padStart(2, '0')}`, 'financial', { seq: i }, createdAt]
      );
    }

    // Insert 5 activity logs for User B
    for (let i = 1; i <= 5; i++) {
      await pool.query(
        `INSERT INTO activity_logs (user_id, action, title, category, metadata, created_at)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [userB.id, 'create', `User B Event ${i}`, 'property', { seq: i }, new Date().toISOString()]
      );
    }

    // -------------------------------------------------------------------------
    // TEST 1: Default Pagination (page=1, limit=10)
    // -------------------------------------------------------------------------
    console.log('1. Testing default pagination (GET /api/activity)...');
    const res1 = await request(`${API_URL}/activity`, {}, userA.cookie);
    assert.strictEqual(res1.status, 200);
    assert.ok(Array.isArray(res1.data.activities), 'Activities must be an array');
    assert.strictEqual(res1.data.activities.length, 5, 'Default page size must be 5');
    assert.strictEqual(res1.data.pagination.page, 1, 'Default page must be 1');
    assert.strictEqual(res1.data.pagination.limit, 5, 'Default limit must be 5');
    assert.strictEqual(res1.data.pagination.total, 25, 'Total must match 25');
    assert.strictEqual(res1.data.pagination.totalPages, 5, 'Total pages must be 5 for 25 items @ 5/page');
    assert.strictEqual(res1.data.pagination.hasNextPage, true, 'Page 1 must have next page');
    assert.strictEqual(res1.data.pagination.hasPrevPage, false, 'Page 1 must not have previous page');
    console.log(colors.green('✓ Default pagination verified (5 items, page 1 of 5).'));

    // -------------------------------------------------------------------------
    // TEST 2: Explicit Pagination (page=2, limit=10)
    // -------------------------------------------------------------------------
    console.log('\n2. Testing explicit pagination (GET /api/activity?page=2&limit=10)...');
    const res2 = await request(`${API_URL}/activity?page=2&limit=10`, {}, userA.cookie);
    assert.strictEqual(res2.status, 200);
    assert.strictEqual(res2.data.activities.length, 10);
    assert.strictEqual(res2.data.pagination.page, 2);
    assert.strictEqual(res2.data.pagination.limit, 10);
    assert.strictEqual(res2.data.pagination.hasNextPage, true);
    assert.strictEqual(res2.data.pagination.hasPrevPage, true);
    // Verify page 2 contains items #15 down to #6 (newest first: 25..16 on p1, 15..6 on p2, 5..1 on p3)
    assert.strictEqual(res2.data.activities[0].title, 'User A Event 15');
    assert.strictEqual(res2.data.activities[9].title, 'User A Event 06');

    // Also check page 3 (final page with 5 items)
    const res2p3 = await request(`${API_URL}/activity?page=3&limit=10`, {}, userA.cookie);
    assert.strictEqual(res2p3.status, 200);
    assert.strictEqual(res2p3.data.activities.length, 5);
    assert.strictEqual(res2p3.data.pagination.page, 3);
    assert.strictEqual(res2p3.data.pagination.hasNextPage, false);
    assert.strictEqual(res2p3.data.pagination.hasPrevPage, true);
    assert.strictEqual(res2p3.data.activities[0].title, 'User A Event 05');
    assert.strictEqual(res2p3.data.activities[4].title, 'User A Event 01');
    console.log(colors.green('✓ Explicit pagination verified across pages 2 and 3.'));

    // -------------------------------------------------------------------------
    // TEST 3 & 4: Total Count and TotalPages
    // -------------------------------------------------------------------------
    console.log('\n3 & 4. Testing correct total count and totalPages...');
    assert.strictEqual(res1.data.pagination.total, 25);
    assert.strictEqual(res1.data.pagination.totalPages, 5);
    // Test with custom limit=7
    const resCustom = await request(`${API_URL}/activity?page=1&limit=7`, {}, userA.cookie);
    assert.strictEqual(resCustom.data.activities.length, 7);
    assert.strictEqual(resCustom.data.pagination.limit, 7);
    assert.strictEqual(resCustom.data.pagination.total, 25);
    assert.strictEqual(resCustom.data.pagination.totalPages, 4); // ceil(25/7) = 4
    console.log(colors.green('✓ Correct total count (25) and dynamic totalPages calculation verified.'));

    // -------------------------------------------------------------------------
    // TEST 5: Newest First Ordering
    // -------------------------------------------------------------------------
    console.log('\n5. Testing newest-first ordering...');
    const p1Items = res1.data.activities;
    for (let i = 0; i < p1Items.length - 1; i++) {
      const currTime = new Date(p1Items[i].created_at).getTime();
      const nextTime = new Date(p1Items[i + 1].created_at).getTime();
      assert.ok(currTime >= nextTime, `Item ${i} must be newer than item ${i + 1}`);
    }
    assert.strictEqual(p1Items[0].title, 'User A Event 25', 'First item on page 1 must be newest event');
    console.log(colors.green('✓ Newest-first chronological ordering verified.'));

    // -------------------------------------------------------------------------
    // TEST 6: Deterministic Ordering When Timestamps Match (id DESC tiebreaker)
    // -------------------------------------------------------------------------
    console.log('\n6. Testing deterministic ordering when timestamps match...');
    const identicalTime = new Date().toISOString();
    const tieRes1 = await pool.query(
      `INSERT INTO activity_logs (user_id, action, title, category, created_at)
       VALUES ($1, 'tie', 'Tiebreaker Alpha', 'other', $2) RETURNING id`,
      [userA.id, identicalTime]
    );
    const tieRes2 = await pool.query(
      `INSERT INTO activity_logs (user_id, action, title, category, created_at)
       VALUES ($1, 'tie', 'Tiebreaker Beta', 'other', $2) RETURNING id`,
      [userA.id, identicalTime]
    );

    const tiePage = await request(`${API_URL}/activity?page=1&limit=2`, {}, userA.cookie);
    assert.strictEqual(tiePage.status, 200);
    // Since Beta was inserted after Alpha, Beta's id is lexicographically / temporally greater
    // ORDER BY created_at DESC, id DESC ensures completely deterministic order
    assert.ok(tiePage.data.activities[0].id > tiePage.data.activities[1].id, 'UUID tiebreaker must order deterministically');
    console.log(colors.green('✓ Deterministic tiebreaker (id DESC) verified for matching timestamps.'));

    // Clean up tiebreaker test items
    await pool.query('DELETE FROM activity_logs WHERE id IN ($1, $2)', [tieRes1.rows[0].id, tieRes2.rows[0].id]);

    // -------------------------------------------------------------------------
    // TEST 7: Invalid Page Values Handled Safely
    // -------------------------------------------------------------------------
    console.log('\n7. Testing invalid page parameter normalization...');
    const invalidPages = ['-1', '0', 'abc', 'NaN', 'null'];
    for (const badPage of invalidPages) {
      const res = await request(`${API_URL}/activity?page=${badPage}`, {}, userA.cookie);
      assert.strictEqual(res.status, 200);
      assert.strictEqual(res.data.pagination.page, 1, `Invalid page "${badPage}" should safely normalize to 1`);
      assert.strictEqual(res.data.activities.length, 5);
    }
    console.log(colors.green('✓ Invalid page values safely normalized to page 1.'));

    // -------------------------------------------------------------------------
    // TEST 8: Excessive Limit Capping
    // -------------------------------------------------------------------------
    console.log('\n8. Testing excessive limit capping...');
    const resExcessive = await request(`${API_URL}/activity?limit=500`, {}, userA.cookie);
    assert.strictEqual(resExcessive.status, 200);
    assert.strictEqual(resExcessive.data.pagination.limit, 50, 'Excessive limit (500) must be capped to 50');

    const resNegativeLimit = await request(`${API_URL}/activity?limit=-10`, {}, userA.cookie);
    assert.strictEqual(resNegativeLimit.status, 200);
    assert.strictEqual(resNegativeLimit.data.pagination.limit, 5, 'Negative limit must normalize to default 5');
    console.log(colors.green('✓ Limit capping (max 50) and normalization verified.'));

    // -------------------------------------------------------------------------
    // TEST 9: Strict Cross-Tenant Isolation
    // -------------------------------------------------------------------------
    console.log('\n9. Testing strict cross-tenant isolation...');
    const resUserB = await request(`${API_URL}/activity?page=1&limit=50`, {}, userB.cookie);
    assert.strictEqual(resUserB.status, 200);
    assert.strictEqual(resUserB.data.pagination.total, 5, 'User B must only see their own 5 records');
    for (const act of resUserB.data.activities) {
      assert.ok(act.title.startsWith('User B'), `User B must not see User A activity. Found: ${act.title}`);
    }

    // User A querying all 50 items must not see any User B items
    const resUserAAll = await request(`${API_URL}/activity?page=1&limit=50`, {}, userA.cookie);
    assert.strictEqual(resUserAAll.data.pagination.total, 25);
    for (const act of resUserAAll.data.activities) {
      assert.ok(!act.title.startsWith('User B'), `User A must not see User B records. Found: ${act.title}`);
    }
    console.log(colors.green('✓ Strict multi-tenant isolation confirmed across all page queries.'));

    // -------------------------------------------------------------------------
    // TEST 10: Task Activity in Unified Stream
    // -------------------------------------------------------------------------
    console.log('\n10. Testing task activity integration in the unified stream...');
    const task = await taskService.createTask(userA.id, {
      title: 'Review insurance documents',
      category: 'insurance',
      dueDate: '2026-10-15',
    });
    assert.ok(task && task.id);

    // Fetch page 1 of activity for User A
    const resTaskAct = await request(`${API_URL}/activity?page=1&limit=10`, {}, userA.cookie);
    assert.strictEqual(resTaskAct.status, 200);
    assert.strictEqual(resTaskAct.data.pagination.total, 26, 'Total count must increment to 26 after task creation');
    const firstAct = resTaskAct.data.activities[0];
    assert.strictEqual(firstAct.title, 'Task added: Review insurance documents', 'Newest task activity must appear at top of page 1');
    assert.strictEqual(firstAct.category, 'tasks');
    console.log(colors.green('✓ Task activity appears at top of unified Recent Activity stream.'));

    // -------------------------------------------------------------------------
    // TEST 11: Empty Activity History
    // -------------------------------------------------------------------------
    console.log('\n11. Testing empty activity history behavior...');
    const resEmpty = await request(`${API_URL}/activity`, {}, userEmpty.cookie);
    assert.strictEqual(resEmpty.status, 200);
    assert.ok(Array.isArray(resEmpty.data.activities));
    assert.strictEqual(resEmpty.data.activities.length, 0);
    assert.strictEqual(resEmpty.data.pagination.page, 1);
    assert.strictEqual(resEmpty.data.pagination.limit, 5);
    assert.strictEqual(resEmpty.data.pagination.total, 0);
    assert.strictEqual(resEmpty.data.pagination.totalPages, 0);
    assert.strictEqual(resEmpty.data.pagination.hasNextPage, false);
    assert.strictEqual(resEmpty.data.pagination.hasPrevPage, false);
    console.log(colors.green('✓ Empty activity returns valid empty result with sensible pagination metadata.'));

    console.log(colors.bold('\n===================================================='));
    console.log(colors.bold(colors.green('  ALL PHASE 5.1 ACTIVITY PAGINATION TESTS PASSED!')));
    console.log(colors.bold('====================================================\n'));
  } finally {
    // Cleanup test users and activities
    await pool.query("DELETE FROM users WHERE email LIKE '%@test.digivirasat.internal'");
    await new Promise((resolve) => server.close(resolve));
    await pool.end();
  }
}

runTests().catch((err) => {
  console.error(colors.red('Test suite failed:'), err);
  process.exit(1);
});
