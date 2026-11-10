const { test, describe, before, after } = require('node:test');
const assert = require('node:assert/strict');
const { startTestServer, stopTestServer, request, createTestUser, pool } = require('./testHelper');

describe('Vault & Asset Management Lifecycle Tests', () => {
  let userA = null;
  let userB = null;
  let createdAssetId = null;

  before(async () => {
    await startTestServer();
    userA = await createTestUser('asset_user_a');
    userB = await createTestUser('asset_user_b');
  });

  after(async () => {
    if (userA) await userA.cleanup();
    if (userB) await userB.cleanup();
    await stopTestServer();
  });

  test('Asset Creation: rejects missing required asset name', async () => {
    const res = await request(
      { path: '/api/vault/assets', method: 'POST' },
      { name: '', category: 'financial', estimatedValue: 100000 },
      userA.cookie
    );
    assert.equal(res.status, 400);
    assert.match(res.body.error.message, /name.*required/i);
  });

  test('Asset Creation: rejects missing or invalid category', async () => {
    const res = await request(
      { path: '/api/vault/assets', method: 'POST' },
      { name: 'Invalid Cat Asset', category: '', estimatedValue: 100000 },
      userA.cookie
    );
    assert.equal(res.status, 400);
    assert.match(res.body.error.message, /category.*required/i);
  });

  test('Asset Creation: successfully creates assets across standard categories', async () => {
    const categories = ['financial', 'property', 'insurance', 'crypto', 'investments'];

    for (const cat of categories) {
      const res = await request(
        { path: '/api/vault/assets', method: 'POST' },
        {
          name: `Sample ${cat} Asset`,
          category: cat,
          subcategory: 'Default',
          description: `Description for ${cat}`,
          estimatedValue: 250000,
          currency: 'INR',
          valuationDate: '2026-09-01',
          metadata: { note: 'Created in automated test' },
        },
        userA.cookie
      );

      assert.equal(res.status, 201);
      assert.ok(res.body.asset?.id);
      assert.equal(res.body.asset.name, `Sample ${cat} Asset`);
      assert.equal(res.body.asset.category, cat);
      assert.equal(Number(res.body.asset.estimated_value), 250000);

      if (!createdAssetId) {
        createdAssetId = res.body.asset.id;
      }
    }
  });

  test('Asset Retrieval: lists all assets for authenticated user', async () => {
    const res = await request(
      { path: '/api/vault/assets', method: 'GET' },
      null,
      userA.cookie
    );

    assert.equal(res.status, 200);
    assert.ok(Array.isArray(res.body.assets));
    assert.ok(res.body.assets.length >= 5);
  });

  test('Asset Retrieval: gets specific asset details by ID', async () => {
    const res = await request(
      { path: `/api/vault/assets/${createdAssetId}`, method: 'GET' },
      null,
      userA.cookie
    );

    assert.equal(res.status, 200);
    assert.equal(res.body.asset.id, createdAssetId);
  });

  test('Asset Update: updates fields while preserving untouched fields', async () => {
    const res = await request(
      { path: `/api/vault/assets/${createdAssetId}`, method: 'PUT' },
      {
        name: 'Updated Financial Asset Name',
        estimatedValue: 750000,
      },
      userA.cookie
    );

    assert.equal(res.status, 200);
    assert.equal(res.body.asset.name, 'Updated Financial Asset Name');
    assert.equal(Number(res.body.asset.estimated_value), 750000);
    assert.equal(res.body.asset.category, 'financial'); // Preserved
  });

  test('Multi-User IDOR Protection: User B cannot access User A asset', async () => {
    const res = await request(
      { path: `/api/vault/assets/${createdAssetId}`, method: 'GET' },
      null,
      userB.cookie
    );

    assert.equal(res.status, 404);
  });

  test('Multi-User IDOR Protection: User B cannot update User A asset', async () => {
    const res = await request(
      { path: `/api/vault/assets/${createdAssetId}`, method: 'PUT' },
      { name: 'Malicious Update' },
      userB.cookie
    );

    assert.equal(res.status, 404);
  });

  test('Multi-User IDOR Protection: User B cannot delete User A asset', async () => {
    const res = await request(
      { path: `/api/vault/assets/${createdAssetId}`, method: 'DELETE' },
      null,
      userB.cookie
    );

    assert.equal(res.status, 404);
  });

  test('Asset Deletion: owner can delete asset successfully', async () => {
    const res = await request(
      { path: `/api/vault/assets/${createdAssetId}`, method: 'DELETE' },
      null,
      userA.cookie
    );

    assert.equal(res.status, 200);

    // Verify deletion in DB
    const checkDb = await pool.query('SELECT id FROM assets WHERE id = $1', [createdAssetId]);
    assert.equal(checkDb.rows.length, 0);
  });
});
