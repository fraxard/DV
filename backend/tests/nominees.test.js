const { test, describe, before, after } = require('node:test');
const assert = require('node:assert/strict');
const { startTestServer, stopTestServer, request, createTestUser, pool } = require('./testHelper');

describe('Nominee Management & Asset Allocation Lifecycle Tests', () => {
  let userA = null;
  let userB = null;
  let assetId = null;
  let nominee1Id = null;
  let nominee2Id = null;

  before(async () => {
    await startTestServer();
    userA = await createTestUser('nom_user_a');
    userB = await createTestUser('nom_user_b');

    // Create a test asset for allocations
    const assetRes = await request(
      { path: '/api/vault/assets', method: 'POST' },
      { name: 'Nominee Test Asset', category: 'financial', estimatedValue: 1000000 },
      userA.cookie
    );
    assetId = assetRes.body.asset.id;
  });

  after(async () => {
    if (userA) await userA.cleanup();
    if (userB) await userB.cleanup();
    await stopTestServer();
  });

  test('Nominee Creation: rejects missing full name', async () => {
    const res = await request(
      { path: '/api/nominees', method: 'POST' },
      { fullName: '', email: 'nominee@example.com', relationship: 'Spouse' },
      userA.cookie
    );
    assert.equal(res.status, 400);
    assert.match(res.body.error.message, /full name.*required/i);
  });

  test('Nominee Creation: rejects invalid email address', async () => {
    const res = await request(
      { path: '/api/nominees', method: 'POST' },
      { fullName: 'Jane Doe', email: 'not-an-email', relationship: 'Spouse' },
      userA.cookie
    );
    assert.equal(res.status, 400);
    assert.match(res.body.error.message, /invalid nominee email/i);
  });

  test('Nominee Creation: successfully creates two nominees for user', async () => {
    const res1 = await request(
      { path: '/api/nominees', method: 'POST' },
      { fullName: 'Primary Nominee', email: 'primary@example.com', phone: '+919876543210', relationship: 'Spouse' },
      userA.cookie
    );
    assert.equal(res1.status, 201);
    nominee1Id = res1.body.nominee.id;

    const res2 = await request(
      { path: '/api/nominees', method: 'POST' },
      { fullName: 'Secondary Nominee', email: 'secondary@example.com', phone: '+919876543211', relationship: 'Child' },
      userA.cookie
    );
    assert.equal(res2.status, 201);
    nominee2Id = res2.body.nominee.id;
  });

  test('Nominee Allocation: successfully assigns nominee 1 with 60% allocation', async () => {
    const res = await request(
      { path: `/api/vault/assets/${assetId}/nominees`, method: 'POST' },
      { nomineeId: nominee1Id, allocationPercentage: 60, canView: true, canDownloadDocs: true },
      userA.cookie
    );
    assert.equal(res.status, 201);
    assert.equal(Number(res.body.assignment.allocation_percentage), 60);
  });

  test('Nominee Allocation: successfully assigns nominee 2 with 40% allocation (total = 100%)', async () => {
    const res = await request(
      { path: `/api/vault/assets/${assetId}/nominees`, method: 'POST' },
      { nomineeId: nominee2Id, allocationPercentage: 40, canView: true, canDownloadDocs: false },
      userA.cookie
    );
    assert.equal(res.status, 201);
    assert.equal(Number(res.body.assignment.allocation_percentage), 40);

    // Verify list allocations
    const listRes = await request(
      { path: `/api/vault/assets/${assetId}/nominees`, method: 'GET' },
      null,
      userA.cookie
    );
    assert.equal(listRes.status, 200);
    assert.equal(listRes.body.total_allocated_percentage, 100);
    assert.equal(listRes.body.remaining_percentage, 0);
  });

  test('Nominee Allocation: rejects over-allocation (>100% total)', async () => {
    // Attempting to update nominee 2 from 40% to 50% (would make total 110%)
    const res = await request(
      { path: `/api/vault/assets/${assetId}/nominees/${nominee2Id}`, method: 'PUT' },
      { allocationPercentage: 50 },
      userA.cookie
    );
    assert.equal(res.status, 400);
    assert.match(res.body.error.message, /cannot exceed 100%/i);
  });

  test('Nominee Allocation: rejects negative or zero allocation', async () => {
    const res = await request(
      { path: `/api/vault/assets/${assetId}/nominees/${nominee2Id}`, method: 'PUT' },
      { allocationPercentage: -10 },
      userA.cookie
    );
    assert.equal(res.status, 400);
  });

  test('Multi-User IDOR: User B cannot access User A nominees or allocations', async () => {
    const getRes = await request(
      { path: `/api/nominees/${nominee1Id}`, method: 'GET' },
      null,
      userB.cookie
    );
    assert.equal(getRes.status, 404);

    const allocRes = await request(
      { path: `/api/vault/assets/${assetId}/nominees`, method: 'GET' },
      null,
      userB.cookie
    );
    assert.equal(allocRes.status, 404);
  });

  test('Nominee Deletion: deleting a nominee cascades and cleans up asset allocations', async () => {
    const res = await request(
      { path: `/api/nominees/${nominee2Id}`, method: 'DELETE' },
      null,
      userA.cookie
    );
    assert.equal(res.status, 200);

    // Total allocated on asset should now be reduced from 100% to 60%
    const listRes = await request(
      { path: `/api/vault/assets/${assetId}/nominees`, method: 'GET' },
      null,
      userA.cookie
    );
    assert.equal(listRes.status, 200);
    assert.equal(listRes.body.total_allocated_percentage, 60);
    assert.equal(listRes.body.remaining_percentage, 40);
  });
});
