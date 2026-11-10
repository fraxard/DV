const { test, describe, before, after } = require('node:test');
const assert = require('node:assert/strict');
const { startTestServer, stopTestServer, request, createTestUser, pool } = require('./testHelper');

describe('Custom Asset Categories & Dynamic Fields Lifecycle Tests', () => {
  let userA = null;
  let userB = null;
  let categoryId = null;

  before(async () => {
    await startTestServer();
    userA = await createTestUser('cat_user_a');
    userB = await createTestUser('cat_user_b');
  });

  after(async () => {
    if (userA) await userA.cleanup();
    if (userB) await userB.cleanup();
    await stopTestServer();
  });

  test('Custom Category: rejects forbidden secret identifier in category name or key', async () => {
    const res = await request(
      { path: '/api/custom-categories', method: 'POST' },
      {
        name: 'Private Seed Phrase Vault',
        fields: [{ label: 'Normal Field', type: 'text' }],
      },
      userA.cookie
    );
    assert.equal(res.status, 400);
    assert.match(res.body.error.message, /disallowed.*secret/i);
  });

  test('Custom Category: rejects forbidden secret identifier in custom field label', async () => {
    const res = await request(
      { path: '/api/custom-categories', method: 'POST' },
      {
        name: 'Family Heirlooms',
        fields: [
          { label: 'Item Name', type: 'text' },
          { label: 'Master Password', type: 'text' },
        ],
      },
      userA.cookie
    );
    assert.equal(res.status, 400);
    assert.match(res.body.error.message, /disallowed.*password/i);
  });

  test('Custom Category: successfully creates a custom category with dynamic fields', async () => {
    const res = await request(
      { path: '/api/custom-categories', method: 'POST' },
      {
        name: 'Fine Art Collection',
        description: 'Paintings, sculptures, and collectibles',
        fields: [
          { label: 'Artist Name', type: 'text', isRequired: true, orderIndex: 0 },
          { label: 'Year Created', type: 'number', isRequired: false, orderIndex: 1 },
          { label: 'Appraisal Report Link', type: 'url', isRequired: false, orderIndex: 2 },
        ],
      },
      userA.cookie
    );

    assert.equal(res.status, 201);
    assert.ok(res.body.category?.id);
    assert.equal(res.body.category.name, 'Fine Art Collection');
    assert.equal(res.body.category.key, 'fine_art_collection');
    assert.equal(res.body.category.fields.length, 3);

    categoryId = res.body.category.id;
  });

  test('Custom Category: lists all custom categories belonging to authenticated user', async () => {
    const res = await request(
      { path: '/api/custom-categories', method: 'GET' },
      null,
      userA.cookie
    );

    assert.equal(res.status, 200);
    assert.ok(Array.isArray(res.body.categories));
    assert.ok(res.body.categories.some((c) => c.id === categoryId));
  });

  test('Multi-User IDOR: User B cannot access, edit, or delete User A category', async () => {
    const getRes = await request(
      { path: `/api/custom-categories/${categoryId}`, method: 'GET' },
      null,
      userB.cookie
    );
    assert.equal(getRes.status, 404);

    const putRes = await request(
      { path: `/api/custom-categories/${categoryId}`, method: 'PUT' },
      { name: 'Hijacked Name' },
      userB.cookie
    );
    assert.equal(putRes.status, 404);

    const delRes = await request(
      { path: `/api/custom-categories/${categoryId}`, method: 'DELETE' },
      null,
      userB.cookie
    );
    assert.equal(delRes.status, 404);
  });

  test('Custom Category: owner can update custom category and fields', async () => {
    const res = await request(
      { path: `/api/custom-categories/${categoryId}`, method: 'PUT' },
      {
        name: 'Fine Art & Antique Collection',
        description: 'Updated art descriptions',
      },
      userA.cookie
    );

    assert.equal(res.status, 200);
    assert.equal(res.body.category.name, 'Fine Art & Antique Collection');
  });

  test('Custom Category: owner can delete custom category', async () => {
    const res = await request(
      { path: `/api/custom-categories/${categoryId}`, method: 'DELETE' },
      null,
      userA.cookie
    );

    assert.equal(res.status, 200);

    const checkDb = await pool.query('SELECT id FROM custom_asset_categories WHERE id = $1', [categoryId]);
    assert.equal(checkDb.rows.length, 0);
  });
});
