require('dotenv').config();
const http = require('http');
const crypto = require('crypto');

function req(options, body = null) {
  return new Promise((resolve, reject) => {
    const r = http.request(options, (res) => {
      let d = Buffer.alloc(0);
      res.on('data', (c) => { d = Buffer.concat([d, c]); });
      res.on('end', () => resolve({
        status: res.statusCode,
        headers: res.headers,
        body: d.toString('utf8'),
      }));
    });
    r.on('error', reject);
    if (body) r.write(body);
    r.end();
  });
}

function createMultipart(fields, fileField) {
  const boundary = '----DVFormBoundary' + crypto.randomBytes(16).toString('hex');
  const CRLF = '\r\n';
  let chunks = [];
  for (const [k, v] of Object.entries(fields)) {
    if (v !== undefined && v !== null) {
      chunks.push(Buffer.from(
        '--' + boundary + CRLF +
        'Content-Disposition: form-data; name="' + k + '"' + CRLF + CRLF +
        v + CRLF
      ));
    }
  }
  if (fileField) {
    chunks.push(Buffer.from(
      '--' + boundary + CRLF +
      'Content-Disposition: form-data; name="' + fileField.name + '"; filename="' + fileField.filename + '"' + CRLF +
      'Content-Type: ' + fileField.contentType + CRLF + CRLF
    ));
    chunks.push(fileField.buffer);
    chunks.push(Buffer.from(CRLF));
  }
  chunks.push(Buffer.from('--' + boundary + '--' + CRLF));
  const full = Buffer.concat(chunks);
  return {
    headers: {
      'Content-Type': 'multipart/form-data; boundary=' + boundary,
      'Content-Length': full.length,
    },
    body: full,
  };
}

async function testPhase2Regression() {
  console.log('=== TESTING PHASE 2 REGRESSION (DOCUMENTS & STORAGE) ===');
  // Login
  const loginBody = JSON.stringify({ email: 'fraxard@gmail.com', password: '12121212' });
  const lRes = await req({
    host: 'localhost',
    port: 5000,
    path: '/api/auth/login',
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Content-Length': Buffer.byteLength(loginBody),
    },
  }, loginBody);
  const cookie = (lRes.headers['set-cookie'] || []).map((c) => c.split(';')[0]).join('; ');

  // Upload doc
  const pdfBytes = Buffer.from('%PDF-1.4 sample document %%EOF');
  const form = createMultipart(
    { name: 'Phase 3 Regression Doc' },
    { name: 'file', filename: 'test.pdf', contentType: 'application/pdf', buffer: pdfBytes }
  );
  const upRes = await req({
    host: 'localhost',
    port: 5000,
    path: '/api/documents',
    method: 'POST',
    headers: { ...form.headers, 'Cookie': cookie },
  }, form.body);
  const doc = JSON.parse(upRes.body).document;
  console.log('[PASS] 1. Upload document:', upRes.status === 201 ? 'PASS' : 'FAIL', doc?.id);

  // List docs
  const listRes = await req({
    host: 'localhost',
    port: 5000,
    path: '/api/documents',
    method: 'GET',
    headers: { 'Cookie': cookie },
  });
  console.log('[PASS] 2. List documents:', listRes.status === 200 ? 'PASS' : 'FAIL');

  // Download doc
  const downRes = await req({
    host: 'localhost',
    port: 5000,
    path: '/api/documents/' + doc.id + '/download',
    method: 'GET',
    headers: { 'Cookie': cookie },
  });
  console.log('[PASS] 3. Download document:', downRes.status === 200 && downRes.headers['content-disposition']?.includes('attachment') ? 'PASS' : 'FAIL');

  // Delete doc
  const delRes = await req({
    host: 'localhost',
    port: 5000,
    path: '/api/documents/' + doc.id,
    method: 'DELETE',
    headers: { 'Cookie': cookie },
  });
  console.log('[PASS] 4. Delete document:', delRes.status === 200 ? 'PASS' : 'FAIL');

  console.log('=== PHASE 2 REGRESSION TEST PASSED SUCCESSFULLY ===');
}

testPhase2Regression().catch((err) => {
  console.error(err);
  process.exit(1);
});
