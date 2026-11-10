const { test, describe, before, after } = require('node:test');
const assert = require('node:assert/strict');
const { startTestServer, stopTestServer, request, createTestUser, pool } = require('./testHelper');

describe('Dashboard Metrics & Readiness Score Tests', () => {
  let user = null;
  let otherUser = null;

  before(async () => {
    await startTestServer();
  });

  after(async () => {
    await stopTestServer();
  });

  test('Empty state for newly registered unverified user', async () => {
    user = await createTestUser('dash_empty_user');
    await pool.query('UPDATE users SET email_verified = false WHERE id = $1', [user.id]);

    const res = await request(
      { path: '/api/dashboard', method: 'GET' },
      null,
      user.cookie
    );

    assert.equal(res.status, 200);
    const data = res.body;

    assert.equal(data.assets.total, 0);
    assert.equal(data.assets.totalValue, 0);
    assert.equal(data.readiness.score, 0);
    assert.equal(data.readiness.label, 'Getting Started');
    assert.deepEqual(data.needsAttention.map((i) => i.key), ['verify_email', 'add_assets']);

    await user.cleanup();
    user = null;
  });

  test('Readiness score increases with email verification', async () => {
    user = await createTestUser('dash_verified_user');
    await pool.query('UPDATE users SET email_verified = true WHERE id = $1', [user.id]);

    const res = await request(
      { path: '/api/dashboard', method: 'GET' },
      null,
      user.cookie
    );

    assert.equal(res.status, 200);
    const data = res.body;

    assert.equal(data.readiness.score, 15);
    assert.equal(data.readiness.components.verification, 15);
    assert.equal(data.readiness.label, 'Getting Started');
    assert.deepEqual(data.needsAttention.map((i) => i.key), ['add_assets']);

    await user.cleanup();
    user = null;
  });

  test('Asset additions reflect in score, categories, and attention items', async () => {
    user = await createTestUser('dash_assets_user');
    await pool.query('UPDATE users SET email_verified = true WHERE id = $1', [user.id]);

    // Add 1st asset
    const a1Res = await request(
      { path: '/api/vault/assets', method: 'POST' },
      {
        name: 'HDFC Bank Account',
        category: 'financial',
        estimatedValue: 100000,
        currency: 'INR',
      },
      user.cookie
    );
    assert.equal(a1Res.status, 201);

    let res = await request(
      { path: '/api/dashboard', method: 'GET' },
      null,
      user.cookie
    );
    let data = res.body;

    // 15 verification + 15 asset (1 asset) = 30
    assert.equal(data.assets.total, 1);
    assert.equal(data.assets.totalValue, 100000);
    assert.equal(data.readiness.score, 30);
    assert.equal(data.readiness.label, 'Early Stage');

    const attentionKeys = data.needsAttention.map((i) => i.key);
    assert.ok(attentionKeys.includes('add_nominee'));
    assert.ok(attentionKeys.includes('assign_nominees'));
    assert.ok(attentionKeys.includes('add_documents'));

    // Add 2nd asset
    const a2Res = await request(
      { path: '/api/vault/assets', method: 'POST' },
      {
        name: 'Residential Apartment',
        category: 'property',
        estimatedValue: 5000000,
        currency: 'INR',
      },
      user.cookie
    );
    assert.equal(a2Res.status, 201);

    res = await request(
      { path: '/api/dashboard', method: 'GET' },
      null,
      user.cookie
    );
    data = res.body;

    // 15 verification + 25 asset (2+ assets) = 40
    assert.equal(data.assets.total, 2);
    assert.equal(data.assets.totalValue, 5100000);
    assert.equal(data.readiness.score, 40);
    assert.equal(data.readiness.label, 'Early Stage');

    await user.cleanup();
    user = null;
  });

  test('Nominee coverage and allocation progression', async () => {
    user = await createTestUser('dash_alloc_user');
    await pool.query('UPDATE users SET email_verified = true WHERE id = $1', [user.id]);

    // Create 1 asset
    const aRes = await request(
      { path: '/api/vault/assets', method: 'POST' },
      {
        name: 'Mutual Funds Portfolio',
        category: 'investments',
        estimatedValue: 200000,
        currency: 'INR',
      },
      user.cookie
    );
    assert.equal(aRes.status, 201);
    const assetId = aRes.body.asset.id;

    // Create 1 nominee (10 pts)
    const n1Res = await request(
      { path: '/api/nominees', method: 'POST' },
      {
        fullName: 'Spouse Nominee',
        relationship: 'Spouse',
        email: 'spouse@example.com',
      },
      user.cookie
    );
    assert.equal(n1Res.status, 201);
    const nominee1Id = n1Res.body.nominee.id;

    let res = await request(
      { path: '/api/dashboard', method: 'GET' },
      null,
      user.cookie
    );
    let data = res.body;

    // 15 (verified) + 15 (1 asset) + 10 (1 nominee) = 40
    assert.equal(data.readiness.score, 40);
    assert.equal(data.readiness.components.nominees, 10);

    // Create 2nd nominee (20 pts)
    const n2Res = await request(
      { path: '/api/nominees', method: 'POST' },
      {
        fullName: 'Child Nominee',
        relationship: 'Child',
        email: 'child@example.com',
      },
      user.cookie
    );
    assert.equal(n2Res.status, 201);

    res = await request(
      { path: '/api/dashboard', method: 'GET' },
      null,
      user.cookie
    );
    data = res.body;

    // 15 (verified) + 15 (1 asset) + 20 (2+ nominees) = 50 ('In Progress')
    assert.equal(data.readiness.score, 50);
    assert.equal(data.readiness.label, 'In Progress');

    // Allocate 100% of asset to nominee1 (25 pts)
    const allocRes = await request(
      { path: `/api/vault/assets/${assetId}/nominees`, method: 'POST' },
      {
        nomineeId: nominee1Id,
        allocationPercentage: 100,
      },
      user.cookie
    );
    assert.equal(allocRes.status, 201);

    res = await request(
      { path: '/api/dashboard', method: 'GET' },
      null,
      user.cookie
    );
    data = res.body;

    // 15 + 15 + 20 + 25 = 75 ('Nearly Ready')
    assert.equal(data.readiness.score, 75);
    assert.equal(data.readiness.label, 'Nearly Ready');
    assert.equal(data.readiness.components.allocation, 25);

    await user.cleanup();
    user = null;
  });

  test('Multi-tenant dashboard metrics isolation', async () => {
    user = await createTestUser('dash_user_1');
    otherUser = await createTestUser('dash_user_2');

    // Add asset for user 1
    await request(
      { path: '/api/vault/assets', method: 'POST' },
      {
        name: 'User 1 Asset',
        category: 'crypto',
        estimatedValue: 999999,
        currency: 'INR',
      },
      user.cookie
    );

    // Query dashboard as other user
    const otherRes = await request(
      { path: '/api/dashboard', method: 'GET' },
      null,
      otherUser.cookie
    );
    assert.equal(otherRes.status, 200);
    const otherData = otherRes.body;

    assert.equal(otherData.assets.total, 0);
    assert.equal(otherData.assets.totalValue, 0);

    await user.cleanup();
    await otherUser.cleanup();
    user = null;
    otherUser = null;
  });
});
