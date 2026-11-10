const { test, describe, before, after } = require('node:test');
const assert = require('node:assert/strict');
const { startTestServer, stopTestServer, request, createMultipart, createTestUser, pool } = require('./testHelper');

describe('Document Management & Storage Lifecycle Tests', () => {
  let userA = null;
  let userB = null;
  let assetA = null;
  let uploadedDocId = null;

  before(async () => {
    await startTestServer();
    userA = await createTestUser('doc_user_a');
    userB = await createTestUser('doc_user_b');

    // Create an asset to link document to
    const assetRes = await request(
      { path: '/api/vault/assets', method: 'POST' },
      { name: 'Document Test Asset', category: 'property', estimatedValue: 5000000 },
      userA.cookie
    );
    assetA = assetRes.body.asset;
  });

  after(async () => {
    if (userA) await userA.cleanup();
    if (userB) await userB.cleanup();
    await stopTestServer();
  });

  test('Document Upload: rejects invalid file extension or disallowed MIME type', async () => {
    const invalidFile = createMultipart(
      { name: 'Dangerous Script' },
      {
        name: 'file',
        filename: 'malicious.exe',
        contentType: 'application/x-msdownload',
        buffer: Buffer.from('MZ0000FAKEEXEC'),
      }
    );

    const res = await request(
      { path: '/api/documents', method: 'POST', headers: invalidFile.headers },
      invalidFile.body,
      userA.cookie
    );

    assert.equal(res.status, 400);
    assert.match(res.body.error.message, /invalid file type/i);
  });

  test('Document Upload: successfully uploads a valid PDF document attached to an asset', async () => {
    const validFile = createMultipart(
      {
        name: 'Property Deed',
        description: 'Original registered deed copy',
        assetId: assetA.id,
      },
      {
        name: 'file',
        filename: 'property_deed.pdf',
        contentType: 'application/pdf',
        buffer: Buffer.from('%PDF-1.4 Mock valid PDF binary content for DigiVirasat automated testing %%EOF'),
      }
    );

    const res = await request(
      { path: '/api/documents', method: 'POST', headers: validFile.headers },
      validFile.body,
      userA.cookie
    );

    assert.equal(res.status, 201);
    assert.ok(res.body.document?.id);
    assert.equal(res.body.document.name, 'Property Deed');
    assert.equal(res.body.document.asset_id, assetA.id);
    assert.equal(res.body.document.file_name, 'property_deed.pdf');

    uploadedDocId = res.body.document.id;
  });

  test('Document Listing: lists user documents and filters by assetId', async () => {
    const resAll = await request(
      { path: '/api/documents', method: 'GET' },
      null,
      userA.cookie
    );
    assert.equal(resAll.status, 200);
    assert.ok(Array.isArray(resAll.body.documents));
    assert.ok(resAll.body.documents.some((d) => d.id === uploadedDocId));

    const resFiltered = await request(
      { path: `/api/documents?assetId=${assetA.id}`, method: 'GET' },
      null,
      userA.cookie
    );
    assert.equal(resFiltered.status, 200);
    assert.equal(resFiltered.body.documents.length, 1);
    assert.equal(resFiltered.body.documents[0].id, uploadedDocId);
  });

  test('Document Download: returns binary file stream with correct Content-Disposition', async () => {
    const res = await request(
      { path: `/api/documents/${uploadedDocId}/download`, method: 'GET' },
      null,
      userA.cookie
    );

    assert.equal(res.status, 200);
    assert.match(res.headers['content-type'], /application\/pdf/i);
    assert.match(res.headers['content-disposition'], /attachment/i);
    assert.ok(res.body.includes('%PDF-1.4'));
  });

  test('Multi-User IDOR: User B cannot download or view User A document', async () => {
    const getRes = await request(
      { path: `/api/documents/${uploadedDocId}`, method: 'GET' },
      null,
      userB.cookie
    );
    assert.equal(getRes.status, 404);

    const dlRes = await request(
      { path: `/api/documents/${uploadedDocId}/download`, method: 'GET' },
      null,
      userB.cookie
    );
    assert.equal(dlRes.status, 404);

    const delRes = await request(
      { path: `/api/documents/${uploadedDocId}`, method: 'DELETE' },
      null,
      userB.cookie
    );
    assert.equal(delRes.status, 404);
  });

  test('Document Update: updates document name and description', async () => {
    const res = await request(
      { path: `/api/documents/${uploadedDocId}`, method: 'PUT' },
      { name: 'Updated Property Deed Title', description: 'Updated notes' },
      userA.cookie
    );

    assert.equal(res.status, 200);
    assert.equal(res.body.document.name, 'Updated Property Deed Title');
  });

  test('Document Deletion: deletes document from DB and storage', async () => {
    const res = await request(
      { path: `/api/documents/${uploadedDocId}`, method: 'DELETE' },
      null,
      userA.cookie
    );
    assert.equal(res.status, 200);

    // Verify row deleted from DB
    const checkDb = await pool.query('SELECT id FROM documents WHERE id = $1', [uploadedDocId]);
    assert.equal(checkDb.rows.length, 0);
  });
});
