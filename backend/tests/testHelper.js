require('dotenv').config({ path: require('path').resolve(__dirname, '../.env') });
const http = require('http');
const crypto = require('crypto');
const pool = require('../src/db');
const app = require('../src/app');

let testServer = null;
let serverPort = null;

async function startTestServer() {
  if (testServer) return serverPort;
  testServer = http.createServer(app);
  await new Promise((resolve) => testServer.listen(0, resolve));
  serverPort = testServer.address().port;
  return serverPort;
}

async function stopTestServer() {
  if (testServer) {
    await new Promise((resolve) => testServer.close(resolve));
    testServer = null;
    serverPort = null;
  }
}

function request(options, postData = null, cookie = null) {
  return new Promise((resolve, reject) => {
    const headers = { ...options.headers };
    if (cookie) {
      headers['Cookie'] = cookie;
    }

    let payload = postData;
    if (payload && typeof payload === 'object' && !(payload instanceof Buffer) && !headers['Content-Type']) {
      headers['Content-Type'] = 'application/json';
      payload = JSON.stringify(payload);
    }

    if (payload && !headers['Content-Length']) {
      headers['Content-Length'] = Buffer.isBuffer(payload) ? payload.length : Buffer.byteLength(payload);
    }

    const req = http.request(
      {
        hostname: '127.0.0.1',
        port: serverPort,
        ...options,
        headers,
      },
      (res) => {
        let body = '';
        res.on('data', (chunk) => (body += chunk));
        res.on('end', () => {
          let parsed = null;
          try {
            parsed = JSON.parse(body);
          } catch {
            parsed = body;
          }

          // Extract session cookie if set
          let sessionCookie = null;
          const setCookie = res.headers['set-cookie'];
          if (setCookie) {
            const match = (Array.isArray(setCookie) ? setCookie.join(';') : setCookie).match(/dv_session=([^;]+)/);
            if (match) {
              sessionCookie = `dv_session=${match[1]}`;
            }
          }

          resolve({
            status: res.statusCode,
            headers: res.headers,
            body: parsed,
            sessionCookie,
          });
        });
      }
    );

    req.on('error', reject);
    if (payload) {
      req.write(payload);
    }
    req.end();
  });
}

function createMultipart(fields = {}, fileField = null) {
  const boundary = '----DVTestBoundary' + crypto.randomBytes(16).toString('hex');
  const CRLF = '\r\n';
  const chunks = [];

  for (const [k, v] of Object.entries(fields)) {
    if (v !== undefined && v !== null) {
      chunks.push(
        Buffer.from(
          '--' + boundary + CRLF +
          'Content-Disposition: form-data; name="' + k + '"' + CRLF + CRLF +
          v + CRLF
        )
      );
    }
  }

  if (fileField) {
    chunks.push(
      Buffer.from(
        '--' + boundary + CRLF +
        'Content-Disposition: form-data; name="' + fileField.name + '"; filename="' + fileField.filename + '"' + CRLF +
        'Content-Type: ' + (fileField.contentType || 'application/octet-stream') + CRLF + CRLF
      )
    );
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

/**
 * Creates an isolated test user directly or through registration API.
 */
async function createTestUser(emailPrefix = 'testuser') {
  const unique = `${emailPrefix}_${Date.now()}_${crypto.randomInt(1000, 9999)}`;
  const email = `${unique}@digivirasat.test`;
  const password = 'TestPassword123!';
  const name = `Test User ${unique}`;

  const res = await request(
    { path: '/api/auth/register', method: 'POST' },
    { name, email, password }
  );

  const userId = res.body?.user?.id;
  const cookie = res.sessionCookie;

  // Mark email verified and onboarding completed in DB for full feature access
  if (userId) {
    await pool.query(
      `UPDATE users SET email_verified = true, onboarding_completed = true WHERE id = $1`,
      [userId]
    );
  }

  return {
    id: userId,
    email,
    password,
    name,
    cookie,
    cleanup: async () => {
      if (userId) {
        await pool.query(`DELETE FROM users WHERE id = $1`, [userId]);
      }
    },
  };
}

module.exports = {
  pool,
  app,
  startTestServer,
  stopTestServer,
  request,
  createMultipart,
  createTestUser,
};
