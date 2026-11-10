const crypto = require('crypto');
const { Readable } = require('stream');
const IStorageService = require('./storage.interface');

/**
 * Cloudflare R2 / AWS S3 Compatible Storage Provider.
 * Implements AWS Signature Version 4 (SigV4) using native Node.js crypto.
 * Zero external dependencies required.
 */
class S3StorageProvider extends IStorageService {
  constructor(options = {}) {
    super();
    this.endpoint = options.endpoint || process.env.S3_ENDPOINT || process.env.R2_ENDPOINT;
    this.bucket = options.bucket || process.env.S3_BUCKET || process.env.R2_BUCKET;
    this.accessKeyId = options.accessKeyId || process.env.S3_ACCESS_KEY_ID || process.env.R2_ACCESS_KEY_ID;
    this.secretAccessKey = options.secretAccessKey || process.env.S3_SECRET_ACCESS_KEY || process.env.R2_SECRET_ACCESS_KEY;
    this.region = options.region || process.env.S3_REGION || process.env.R2_REGION || 'auto';

    if (!this.endpoint || !this.bucket || !this.accessKeyId || !this.secretAccessKey) {
      this.isConfigured = false;
    } else {
      this.isConfigured = true;
      // Clean up endpoint trailing slash
      this.endpoint = this.endpoint.replace(/\/+$/, '');
    }
  }

  _ensureConfigured() {
    if (!this.isConfigured) {
      throw new Error(
        'S3/R2 Storage driver is selected but required environment variables (S3_ENDPOINT, S3_BUCKET, S3_ACCESS_KEY_ID, S3_SECRET_ACCESS_KEY) are missing.'
      );
    }
  }

  /**
   * Helper: generates AWS SigV4 signed headers for an S3 request.
   */
  _signRequest(method, path, headers = {}, payloadHash = 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855') {
    const url = new URL(`${this.endpoint}/${this.bucket}/${path.replace(/^\/+/, '')}`);
    const host = url.host;
    const now = new Date();
    const amzDate = now.toISOString().replace(/[:-]|\.\d{3}/g, '');
    const dateStamp = amzDate.slice(0, 8);

    headers['host'] = host;
    headers['x-amz-date'] = amzDate;
    headers['x-amz-content-sha256'] = payloadHash;

    const sortedHeaderKeys = Object.keys(headers).map(k => k.toLowerCase()).sort();
    const canonicalHeaders = sortedHeaderKeys.map(k => `${k}:${headers[k].trim()}\n`).join('');
    const signedHeaders = sortedHeaderKeys.join(';');

    const canonicalRequest = [
      method,
      url.pathname,
      '', // query string
      canonicalHeaders,
      signedHeaders,
      payloadHash,
    ].join('\n');

    const canonicalRequestHash = crypto.createHash('sha256').update(canonicalRequest).digest('hex');
    const credentialScope = `${dateStamp}/${this.region}/s3/aws4_request`;
    const stringToSign = [
      'AWS4-HMAC-SHA256',
      amzDate,
      credentialScope,
      canonicalRequestHash,
    ].join('\n');

    const kDate = crypto.createHmac('sha256', 'AWS4' + this.secretAccessKey).update(dateStamp).digest();
    const kRegion = crypto.createHmac('sha256', kDate).update(this.region).digest();
    const kService = crypto.createHmac('sha256', kRegion).update('s3').digest();
    const kSigning = crypto.createHmac('sha256', kService).update('aws4_request').digest();
    const signature = crypto.createHmac('sha256', kSigning).update(stringToSign).digest('hex');

    const authorization = `AWS4-HMAC-SHA256 Credential=${this.accessKeyId}/${credentialScope}, SignedHeaders=${signedHeaders}, Signature=${signature}`;
    headers['Authorization'] = authorization;

    return { url: url.toString(), headers };
  }

  async save(storageKey, buffer, mimeType) {
    this._ensureConfigured();
    const payloadHash = crypto.createHash('sha256').update(buffer).digest('hex');
    const headers = {
      'content-type': mimeType || 'application/octet-stream',
      'content-length': buffer.length.toString(),
    };

    const { url, headers: signedHeaders } = this._signRequest('PUT', storageKey, headers, payloadHash);

    const response = await fetch(url, {
      method: 'PUT',
      headers: signedHeaders,
      body: buffer,
    });

    if (!response.ok) {
      const errText = await response.text();
      throw new Error(`S3 Storage save failed (HTTP ${response.status}): ${errText}`);
    }

    return {
      key: storageKey,
      size: buffer.length,
      mimeType,
    };
  }

  async getStream(storageKey) {
    this._ensureConfigured();
    const { url, headers: signedHeaders } = this._signRequest('GET', storageKey);

    const response = await fetch(url, {
      method: 'GET',
      headers: signedHeaders,
    });

    if (!response.ok) {
      if (response.status === 404) {
        throw new Error('File not found in storage');
      }
      const errText = await response.text();
      throw new Error(`S3 Storage get failed (HTTP ${response.status}): ${errText}`);
    }

    // Node 18+ Web ReadableStream to Node.js stream.Readable
    if (response.body) {
      return Readable.fromWeb(response.body);
    }
    throw new Error('Empty response stream from S3');
  }

  async delete(storageKey) {
    this._ensureConfigured();
    const { url, headers: signedHeaders } = this._signRequest('DELETE', storageKey);

    const response = await fetch(url, {
      method: 'DELETE',
      headers: signedHeaders,
    });

    return response.ok || response.status === 404;
  }

  async exists(storageKey) {
    this._ensureConfigured();
    const { url, headers: signedHeaders } = this._signRequest('HEAD', storageKey);

    try {
      const response = await fetch(url, {
        method: 'HEAD',
        headers: signedHeaders,
      });
      return response.ok;
    } catch {
      return false;
    }
  }
}

module.exports = S3StorageProvider;
