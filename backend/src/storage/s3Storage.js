const {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
  HeadObjectCommand,
} = require('@aws-sdk/client-s3');
const { getSignedUrl } = require('@aws-sdk/s3-request-presigner');
const IStorageService = require('./storage.interface');

/**
 * Cloudflare R2 / AWS S3 Compatible Storage Provider.
 * Built on AWS SDK for JavaScript v3 with full support for Cloudflare R2:
 * - Account-specific endpoint
 * - Auto region
 * - Path-style addressing
 * - Short-lived presigned download URLs
 * - Direct object streaming and HeadObject metadata
 */
class S3StorageProvider extends IStorageService {
  constructor(options = {}) {
    super();

    this.accountId = options.accountId !== undefined ? options.accountId : process.env.R2_ACCOUNT_ID;
    this.endpoint =
      options.endpoint !== undefined
        ? options.endpoint
        : (process.env.R2_ENDPOINT ||
           process.env.S3_ENDPOINT ||
           (this.accountId ? `https://${this.accountId}.r2.cloudflarestorage.com` : null));

    this.bucket =
      options.bucket !== undefined
        ? options.bucket
        : (process.env.R2_BUCKET || process.env.S3_BUCKET || 'digivirasat-vault');

    this.accessKeyId =
      options.accessKeyId !== undefined
        ? options.accessKeyId
        : (process.env.R2_ACCESS_KEY_ID || process.env.S3_ACCESS_KEY_ID);

    this.secretAccessKey =
      options.secretAccessKey !== undefined
        ? options.secretAccessKey
        : (process.env.R2_SECRET_ACCESS_KEY || process.env.S3_SECRET_ACCESS_KEY);

    this.region =
      options.region !== undefined
        ? options.region
        : (process.env.R2_REGION || process.env.S3_REGION || 'auto');

    if (!this.endpoint || !this.bucket || !this.accessKeyId || !this.secretAccessKey) {
      const missing = [];
      if (!this.endpoint) missing.push('R2_ENDPOINT (or R2_ACCOUNT_ID)');
      if (!this.bucket) missing.push('R2_BUCKET');
      if (!this.accessKeyId) missing.push('R2_ACCESS_KEY_ID');
      if (!this.secretAccessKey) missing.push('R2_SECRET_ACCESS_KEY');

      throw new Error(
        `Cloudflare R2 storage driver initialization failed: missing required environment variable(s): ${missing.join(', ')}.`
      );
    }

    // Clean up endpoint trailing slash
    this.endpoint = this.endpoint.replace(/\/+$/, '');

    // Initialize AWS SDK v3 S3Client configured for Cloudflare R2
    this.client = new S3Client({
      region: this.region,
      endpoint: this.endpoint,
      credentials: {
        accessKeyId: this.accessKeyId,
        secretAccessKey: this.secretAccessKey,
      },
      // Force path-style addressing for Cloudflare R2 bucket domain compatibility
      forcePathStyle: true,
    });
  }

  /**
   * Upload binary file buffer to R2.
   * @param {string} storageKey - Unique object key (e.g. users/<userId>/<docId>.<ext>)
   * @param {Buffer} buffer - File buffer
   * @param {string} mimeType - MIME type
   * @param {object} [options] - Optional originalName or metadata
   */
  async save(storageKey, buffer, mimeType, options = {}) {
    if (!storageKey || typeof storageKey !== 'string') {
      throw new Error('Invalid storageKey provided for upload.');
    }
    if (!buffer || !Buffer.isBuffer(buffer)) {
      throw new Error('Valid binary buffer required for upload.');
    }

    const cleanKey = storageKey.replace(/^\/+/, '');
    const metadata = {};

    if (options.originalName) {
      // Store URI-encoded original name to handle special/Unicode characters
      metadata.originalname = encodeURIComponent(options.originalName);
    }
    if (options.metadata && typeof options.metadata === 'object') {
      Object.assign(metadata, options.metadata);
    }

    try {
      const command = new PutObjectCommand({
        Bucket: this.bucket,
        Key: cleanKey,
        Body: buffer,
        ContentType: mimeType || 'application/octet-stream',
        ContentLength: buffer.length,
        Metadata: Object.keys(metadata).length > 0 ? metadata : undefined,
      });

      await this.client.send(command);

      return {
        key: cleanKey,
        size: buffer.length,
        mimeType: mimeType || 'application/octet-stream',
      };
    } catch (err) {
      console.error(`R2 save failed for key '${cleanKey}':`, err.message);
      throw new Error(`Failed to store file in object storage: ${err.message}`);
    }
  }

  /**
   * Retrieve a readable stream for the object stored under storageKey.
   * @param {string} storageKey
   * @returns {Promise<import('stream').Readable>}
   */
  async getStream(storageKey) {
    if (!storageKey || typeof storageKey !== 'string') {
      throw new Error('Invalid storageKey provided.');
    }

    const cleanKey = storageKey.replace(/^\/+/, '');

    try {
      const command = new GetObjectCommand({
        Bucket: this.bucket,
        Key: cleanKey,
      });

      const response = await this.client.send(command);

      if (!response.Body) {
        throw new Error('Object body is empty.');
      }

      return response.Body;
    } catch (err) {
      if (err.name === 'NoSuchKey' || err.$metadata?.httpStatusCode === 404) {
        throw new Error('File not found in storage');
      }
      console.error(`R2 getStream failed for key '${cleanKey}':`, err.message);
      throw new Error(`Failed to retrieve file from object storage: ${err.message}`);
    }
  }

  /**
   * Generate a short-lived presigned download URL for the object.
   * @param {string} storageKey
   * @param {object} [options]
   * @param {number} [options.expiresIn=900] - Expiry in seconds (default: 15 minutes)
   * @param {string} [options.fileName] - Custom attachment filename in response header
   * @param {string} [options.mimeType] - Override response content type
   * @returns {Promise<string>} Presigned URL
   */
  async getSignedDownloadUrl(storageKey, options = {}) {
    if (!storageKey || typeof storageKey !== 'string') {
      throw new Error('Invalid storageKey provided.');
    }

    const cleanKey = storageKey.replace(/^\/+/, '');
    const expiresIn = options.expiresIn || 900; // 15 minutes default

    const commandInput = {
      Bucket: this.bucket,
      Key: cleanKey,
    };

    if (options.fileName) {
      commandInput.ResponseContentDisposition = `attachment; filename="${encodeURIComponent(options.fileName)}"`;
    }
    if (options.mimeType) {
      commandInput.ResponseContentType = options.mimeType;
    }

    try {
      const command = new GetObjectCommand(commandInput);
      return await getSignedUrl(this.client, command, { expiresIn });
    } catch (err) {
      console.error(`R2 getSignedDownloadUrl failed for key '${cleanKey}':`, err.message);
      throw new Error(`Failed to generate signed download URL: ${err.message}`);
    }
  }

  /**
   * Delete an object from R2.
   * Handles missing/already-deleted objects safely and idempotently.
   * @param {string} storageKey
   * @returns {Promise<boolean>}
   */
  async delete(storageKey) {
    if (!storageKey || typeof storageKey !== 'string') {
      return false;
    }

    const cleanKey = storageKey.replace(/^\/+/, '');

    try {
      const command = new DeleteObjectCommand({
        Bucket: this.bucket,
        Key: cleanKey,
      });

      await this.client.send(command);
      return true;
    } catch (err) {
      // If object not found, deletion is effectively achieved
      if (err.name === 'NoSuchKey' || err.$metadata?.httpStatusCode === 404) {
        return true;
      }
      console.error(`R2 delete failed for key '${cleanKey}':`, err.message);
      throw new Error(`Failed to delete object from storage: ${err.message}`);
    }
  }

  /**
   * Check whether an object exists in R2 without downloading it.
   * @param {string} storageKey
   * @returns {Promise<boolean>}
   */
  async exists(storageKey) {
    if (!storageKey || typeof storageKey !== 'string') {
      return false;
    }

    const cleanKey = storageKey.replace(/^\/+/, '');

    try {
      const command = new HeadObjectCommand({
        Bucket: this.bucket,
        Key: cleanKey,
      });

      await this.client.send(command);
      return true;
    } catch (err) {
      if (err.name === 'NotFound' || err.name === 'NoSuchKey' || err.$metadata?.httpStatusCode === 404) {
        return false;
      }
      return false;
    }
  }

  /**
   * Retrieve metadata for an object in R2 without downloading its content.
   * @param {string} storageKey
   * @returns {Promise<{ size: number, mimeType: string, lastModified: Date, metadata: object }>}
   */
  async getMetadata(storageKey) {
    if (!storageKey || typeof storageKey !== 'string') {
      throw new Error('Invalid storageKey provided.');
    }

    const cleanKey = storageKey.replace(/^\/+/, '');

    try {
      const command = new HeadObjectCommand({
        Bucket: this.bucket,
        Key: cleanKey,
      });

      const res = await this.client.send(command);
      return {
        size: res.ContentLength || 0,
        mimeType: res.ContentType || 'application/octet-stream',
        lastModified: res.LastModified,
        metadata: res.Metadata || {},
      };
    } catch (err) {
      if (err.name === 'NotFound' || err.name === 'NoSuchKey' || err.$metadata?.httpStatusCode === 404) {
        throw new Error('File not found in storage');
      }
      throw new Error(`Failed to retrieve object metadata: ${err.message}`);
    }
  }
}

module.exports = S3StorageProvider;
