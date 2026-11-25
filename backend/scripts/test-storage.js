require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });
const assert = require('assert');
const { S3Client, HeadBucketCommand } = require('@aws-sdk/client-s3');
const S3StorageProvider = require('../src/storage/s3Storage');
const LocalStorageProvider = require('../src/storage/localStorage');

async function streamToBuffer(readableStream) {
  const chunks = [];
  for await (const chunk of readableStream) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  }
  return Buffer.concat(chunks);
}

async function runStorageTestSuite() {
  console.log('====================================================');
  console.log('   DigiVirasat — Cloudflare R2 Storage Test Suite   ');
  console.log('====================================================\n');

  let passes = 0;
  let failures = 0;

  async function step(name, fn) {
    process.stdout.write(`• ${name} ... `);
    try {
      await fn();
      console.log('✓ PASS');
      passes++;
    } catch (err) {
      console.log(`❌ FAIL\n  Error: ${err.message}`);
      failures++;
    }
  }

  // ── 1. Configuration & Resilience ─────────────────────────
  console.log('── 1. Configuration & Validation ──');

  await step('Missing configuration produces clear initialization error', async () => {
    assert.throws(
      () => new S3StorageProvider({ endpoint: '', bucket: '', accessKeyId: '', secretAccessKey: '' }),
      /missing required environment variable/i
    );
  });

  await step('Invalid credentials produce authentication error', async () => {
    const badProvider = new S3StorageProvider({
      endpoint: process.env.R2_ENDPOINT,
      bucket: process.env.R2_BUCKET,
      accessKeyId: 'INVALID_ACCESS_KEY_123',
      secretAccessKey: 'INVALID_SECRET_KEY_123',
    });
    let failed = false;
    try {
      await badProvider.save('test/invalid-cred.txt', Buffer.from('test'), 'text/plain');
    } catch (err) {
      failed = true;
      assert(/failed to store|403|SignatureDoesNotMatch|InvalidAccessKeyId/i.test(err.message));
    }
    assert.strictEqual(failed, true, 'Expected upload with bad credentials to fail');
  });

  await step('Cloudflare R2 client initializes and accesses bucket', async () => {
    const s3 = new S3StorageProvider();
    assert.strictEqual(s3.bucket, 'digivirasat-vault');
    assert(s3.endpoint.includes('r2.cloudflarestorage.com'));
    const headRes = await s3.client.send(new HeadBucketCommand({ Bucket: s3.bucket }));
    assert(headRes.$metadata.httpStatusCode === 200);
  });

  // ── 2. Cloudflare R2 Core Operations ───────────────────────
  console.log('\n── 2. Cloudflare R2 Storage Operations ──');
  const r2 = new S3StorageProvider();
  const testKey = `test/automated-verify-${Date.now()}.txt`;
  const testPayload = `DigiVirasat R2 Verification Payload — ${new Date().toISOString()}`;
  const testBuffer = Buffer.from(testPayload, 'utf8');

  await step('Upload test object to R2 with metadata', async () => {
    const result = await r2.save(testKey, testBuffer, 'text/plain', {
      originalName: 'verify-document.txt',
      metadata: { testrun: 'automated' },
    });
    assert.strictEqual(result.key, testKey);
    assert.strictEqual(result.size, testBuffer.length);
    assert.strictEqual(result.mimeType, 'text/plain');
  });

  await step('Confirm object existence in R2 (HeadObject)', async () => {
    const exists = await r2.exists(testKey);
    assert.strictEqual(exists, true);
    const nonExistent = await r2.exists('test/this-file-does-not-exist-12345.xyz');
    assert.strictEqual(nonExistent, false);
  });

  await step('Retrieve object metadata without downloading body', async () => {
    const meta = await r2.getMetadata(testKey);
    assert.strictEqual(meta.size, testBuffer.length);
    assert.strictEqual(meta.mimeType, 'text/plain');
    assert(meta.lastModified instanceof Date);
  });

  await step('Stream download from R2 and verify content integrity', async () => {
    const stream = await r2.getStream(testKey);
    const downloaded = await streamToBuffer(stream);
    assert.strictEqual(downloaded.toString('utf8'), testPayload);
  });

  await step('Generate short-lived presigned download URL and fetch via HTTP', async () => {
    const signedUrl = await r2.getSignedDownloadUrl(testKey, {
      expiresIn: 300,
      fileName: 'custom-download-name.txt',
    });
    assert(signedUrl.startsWith('https://'));
    assert(signedUrl.includes('X-Amz-Signature'));

    // Fetch the presigned URL
    const res = await fetch(signedUrl);
    assert.strictEqual(res.status, 200);
    const fetchedText = await res.text();
    assert.strictEqual(fetchedText, testPayload);

    // Verify response headers
    const contentDisposition = res.headers.get('content-disposition');
    assert(contentDisposition && contentDisposition.includes('custom-download-name.txt'));
  });

  await step('Delete object from R2 and verify removal', async () => {
    const delResult = await r2.delete(testKey);
    assert.strictEqual(delResult, true);
    const stillExists = await r2.exists(testKey);
    assert.strictEqual(stillExists, false);
  });

  await step('Idempotent delete handles already-deleted objects safely', async () => {
    const secondDel = await r2.delete(testKey);
    assert.strictEqual(secondDel, true);
  });

  // ── 3. Local Storage Driver Compatibility ─────────────────
  console.log('\n── 3. Local Storage Driver Fallback & Compatibility ──');
  const local = new LocalStorageProvider({ baseDir: require('path').resolve(__dirname, '../uploads') });
  const localKey = `test/local-verify-${Date.now()}.txt`;

  await step('Local storage save, exists, metadata, stream, delete', async () => {
    await local.save(localKey, testBuffer, 'text/plain');
    assert.strictEqual(await local.exists(localKey), true);

    const meta = await local.getMetadata(localKey);
    assert.strictEqual(meta.size, testBuffer.length);

    const stream = await local.getStream(localKey);
    const downloaded = await streamToBuffer(stream);
    assert.strictEqual(downloaded.toString('utf8'), testPayload);

    const presigned = await local.getSignedDownloadUrl(localKey);
    assert.strictEqual(presigned, null); // Local storage correctly returns null

    await local.delete(localKey);
    assert.strictEqual(await local.exists(localKey), false);

    // Idempotent local delete
    const secondDel = await local.delete(localKey);
    assert.strictEqual(secondDel, false);
  });

  // ── 4. Driver Switching ────────────────────────────────────
  console.log('\n── 4. Storage Driver Selection ──');
  await step('Driver factory correctly instantiates configured driver', async () => {
    // Current env has STORAGE_DRIVER=r2
    const storageModule = require('../src/storage');
    assert(storageModule instanceof S3StorageProvider);
  });

  console.log('\n====================================================');
  console.log(`Results: ${passes} passed, ${failures} failed`);
  console.log('====================================================\n');

  if (failures > 0) {
    process.exitCode = 1;
  }
}

runStorageTestSuite();
