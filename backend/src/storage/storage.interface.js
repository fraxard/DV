/**
 * Storage Interface contract for DigiVirasat document and asset storage.
 * All storage drivers (local disk, Cloudflare R2, AWS S3) must implement this contract.
 */
class IStorageService {
  /**
   * Save file data to storage under the specified storageKey.
   * @param {string} storageKey - Unique storage path/key (e.g., users/<user_id>/<doc_uuid>.<ext>)
   * @param {Buffer} buffer - Binary file buffer
   * @param {string} mimeType - File MIME type
   * @param {object} [options] - Additional metadata or options (e.g. originalName)
   * @returns {Promise<{ key: string, size: number, mimeType: string }>}
   */
  async save(storageKey, buffer, mimeType, options = {}) {
    throw new Error('save() must be implemented by storage driver');
  }

  /**
   * Retrieve a readable stream for the file stored under storageKey.
   * @param {string} storageKey
   * @returns {Promise<import('stream').Readable>}
   */
  async getStream(storageKey) {
    throw new Error('getStream() must be implemented by storage driver');
  }

  /**
   * Generate a short-lived presigned download URL for the file.
   * @param {string} storageKey
   * @param {object} [options] - Options like expiresIn, fileName, mimeType
   * @returns {Promise<string>} Presigned download URL
   */
  async getSignedDownloadUrl(storageKey, options = {}) {
    throw new Error('getSignedDownloadUrl() must be implemented by storage driver');
  }

  /**
   * Delete a file from storage.
   * @param {string} storageKey
   * @returns {Promise<boolean>}
   */
  async delete(storageKey) {
    throw new Error('delete() must be implemented by storage driver');
  }

  /**
   * Check if a file exists in storage.
   * @param {string} storageKey
   * @returns {Promise<boolean>}
   */
  async exists(storageKey) {
    throw new Error('exists() must be implemented by storage driver');
  }

  /**
   * Retrieve object metadata from storage without downloading the file body.
   * @param {string} storageKey
   * @returns {Promise<{ size: number, mimeType: string, lastModified?: Date, metadata?: object }>}
   */
  async getMetadata(storageKey) {
    throw new Error('getMetadata() must be implemented by storage driver');
  }
}

module.exports = IStorageService;
