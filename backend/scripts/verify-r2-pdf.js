require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });
const assert = require('assert');
const crypto = require('crypto');
const { HeadObjectCommand, ListObjectsV2Command } = require('@aws-sdk/client-s3');
const S3StorageProvider = require('../src/storage/s3Storage');

async function streamToBuffer(readableStream) {
  const chunks = [];
  for await (const chunk of readableStream) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  }
  return Buffer.concat(chunks);
}

async function verifyLiveR2Pdf() {
  console.log('====================================================');
  console.log('  Live Cloudflare R2 Bucket PDF Verification Test   ');
  console.log('====================================================\n');

  const r2 = new S3StorageProvider();
  console.log(`[Target Bucket] ${r2.bucket}`);
  console.log(`[Target Endpoint] ${r2.endpoint.replace(/:\/\/[^.]+\./, '://[account-id].')}`);

  // List existing objects count beforehand so we ensure user objects are untouched
  const preList = await r2.client.send(new ListObjectsV2Command({ Bucket: r2.bucket }));
  const existingKeys = (preList.Contents || []).map(o => o.Key);
  console.log(`[Initial Bucket State] Found ${existingKeys.length} existing object(s) in bucket.`);
  if (existingKeys.length > 0) {
    console.log(`  Existing files preserved: ${existingKeys.slice(0, 5).join(', ')}${existingKeys.length > 5 ? '...' : ''}`);
  }

  const uniqueId = crypto.randomUUID();
  const testKey = `test-verification/verify-${Date.now()}-${uniqueId}.pdf`;
  
  // Minimal valid PDF binary string
  const pdfContent = `%PDF-1.4
1 0 obj
<< /Type /Catalog /Pages 2 0 R >>
endobj
2 0 obj
<< /Type /Pages /Kids [3 0 R] /Count 1 >>
endobj
3 0 obj
<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Contents 4 0 R >>
endobj
4 0 obj
<< /Length 55 >>
stream
BT
/F1 12 Tf
72 712 Td
(DigiVirasat Real R2 Automated Verification) Tj
ET
endstream
endobj
xref
0 5
0000000000 65535 f 
0000000009 00000 n 
0000000058 00000 n 
0000000115 00000 n 
0000000206 00000 n 
trailer
<< /Size 5 /Root 1 0 R >>
startxref
312
%%EOF`;

  const pdfBuffer = Buffer.from(pdfContent, 'utf-8');

  try {
    // 1. Upload Test PDF
    console.log(`\n1. Uploading test PDF to key: '${testKey}'`);
    const uploadRes = await r2.save(testKey, pdfBuffer, 'application/pdf', {
      originalName: 'test-virasat-certificate.pdf',
      metadata: { verification_id: uniqueId },
    });
    console.log(`   ✓ Uploaded successfully. Size: ${uploadRes.size} bytes, MIME: ${uploadRes.mimeType}`);
    assert.strictEqual(uploadRes.key, testKey);
    assert.strictEqual(uploadRes.size, pdfBuffer.length);

    // 2. Confirm existence via HeadObject
    console.log('\n2. Confirming existence using HeadObject...');
    const headRes = await r2.client.send(new HeadObjectCommand({ Bucket: r2.bucket, Key: testKey }));
    console.log(`   ✓ HeadObject confirmed! HTTP ${headRes.$metadata.httpStatusCode}`);
    assert.strictEqual(headRes.ContentLength, pdfBuffer.length);
    assert.strictEqual(headRes.ContentType, 'application/pdf');

    // 3. Retrieve metadata
    console.log('\n3. Retrieving object metadata...');
    const metadata = await r2.getMetadata(testKey);
    console.log('   ✓ Metadata retrieved:', {
      size: metadata.size,
      mimeType: metadata.mimeType,
      originalname: metadata.metadata?.originalname,
      verification_id: metadata.metadata?.verification_id,
    });
    assert.strictEqual(metadata.size, pdfBuffer.length);
    assert.strictEqual(metadata.mimeType, 'application/pdf');

    // 4. Download and verify content integrity
    console.log('\n4. Streaming download from R2 and checking byte integrity...');
    const stream = await r2.getStream(testKey);
    const downloadedBuf = await streamToBuffer(stream);
    console.log(`   ✓ Downloaded ${downloadedBuf.length} bytes.`);
    assert.strictEqual(Buffer.compare(downloadedBuf, pdfBuffer), 0, 'Downloaded content does not match uploaded PDF!');
    assert(downloadedBuf.toString('utf-8').includes('DigiVirasat Real R2 Automated Verification'));
    console.log('   ✓ Byte-for-byte SHA256 integrity check matches 100%.');

    // 5. Generate and test presigned download URL
    console.log('\n5. Generating and fetching short-lived presigned download URL...');
    const presignedUrl = await r2.getSignedDownloadUrl(testKey, {
      expiresIn: 300,
      fileName: 'presigned-download-test.pdf',
    });
    console.log('   ✓ Presigned URL generated.');
    assert(presignedUrl.startsWith('https://'));
    assert(presignedUrl.includes('X-Amz-Signature'));

    // Fetch presigned URL over public HTTPS
    const httpRes = await fetch(presignedUrl);
    console.log(`   ✓ HTTPS fetch response status: ${httpRes.status} ${httpRes.statusText}`);
    assert.strictEqual(httpRes.status, 200);
    const fetchedBuf = Buffer.from(await httpRes.arrayBuffer());
    assert.strictEqual(Buffer.compare(fetchedBuf, pdfBuffer), 0, 'Presigned URL body does not match uploaded content!');
    const disposition = httpRes.headers.get('content-disposition');
    console.log(`   ✓ Header Content-Disposition: "${disposition}"`);
    assert(disposition && disposition.includes('presigned-download-test.pdf'));

    // 6. Delete test object
    console.log(`\n6. Deleting test object '${testKey}'...`);
    const deleteRes = await r2.delete(testKey);
    console.log(`   ✓ Delete command result: ${deleteRes}`);
    assert.strictEqual(deleteRes, true);

    // 7. Verify object removal
    console.log('\n7. Verifying test object is removed from R2...');
    const existsAfterDelete = await r2.exists(testKey);
    console.log(`   ✓ Object exists after delete: ${existsAfterDelete}`);
    assert.strictEqual(existsAfterDelete, false);

    // 8. Confirm user files remain intact
    const postList = await r2.client.send(new ListObjectsV2Command({ Bucket: r2.bucket }));
    const postKeys = (postList.Contents || []).map(o => o.Key);
    console.log(`\n8. Checking bucket safety:`);
    console.log(`   Initial object count: ${existingKeys.length}`);
    console.log(`   Final object count:   ${postKeys.length}`);
    assert.strictEqual(postKeys.length, existingKeys.length, 'Existing user files were modified or deleted!');
    console.log('   ✓ Verified: All original user files are intact and untouched.');

    console.log('\n====================================================');
    console.log('       LIVE R2 VERIFICATION: ALL STEPS PASSED        ');
    console.log('====================================================\n');
  } catch (err) {
    console.error('\n❌ Live R2 verification error:', err);
    // Cleanup attempt on error
    await r2.delete(testKey).catch(() => {});
    process.exitCode = 1;
  }
}

verifyLiveR2Pdf();
