const fs = require('fs');
const path = require('path');
const IStorageService = require('./storage.interface');

class LocalStorageProvider extends IStorageService {
  constructor(options = {}) {
    super();
    // Default base storage directory is backend/uploads unless overridden by env
    const rootDir = options.baseDir || process.env.STORAGE_LOCAL_DIR || path.join(__dirname, '..', '..', 'uploads');
    this.baseDir = path.resolve(rootDir);

    // Ensure base uploads directory exists
    if (!fs.existsSync(this.baseDir)) {
      fs.mkdirSync(this.baseDir, { recursive: true });
    }
  }

  /**
   * Safely resolves a storageKey within the base directory to prevent path traversal.
   * @param {string} storageKey
   * @returns {string} Absolute normalized file path
   */
  _resolveSafePath(storageKey) {
    if (!storageKey || typeof storageKey !== 'string') {
      throw new Error('Invalid storage key provided');
    }

    // Disallow null bytes or backward path elements
    if (storageKey.indexOf('\0') !== -1) {
      throw new Error('Storage key contains invalid characters');
    }

    const safeKey = storageKey.replace(/\\/g, '/');
    const fullPath = path.resolve(this.baseDir, safeKey);

    // Path traversal check: the resolved path MUST begin with this.baseDir + separator
    const baseWithSep = this.baseDir.endsWith(path.sep) ? this.baseDir : this.baseDir + path.sep;
    if (fullPath !== this.baseDir && !fullPath.startsWith(baseWithSep)) {
      throw new Error('Path traversal detected: invalid storage key');
    }

    return fullPath;
  }

  async save(storageKey, buffer, mimeType) {
    const fullPath = this._resolveSafePath(storageKey);
    const parentDir = path.dirname(fullPath);

    await fs.promises.mkdir(parentDir, { recursive: true });
    await fs.promises.writeFile(fullPath, buffer);

    return {
      key: storageKey,
      size: buffer.length,
      mimeType,
    };
  }

  async getStream(storageKey) {
    const fullPath = this._resolveSafePath(storageKey);

    try {
      await fs.promises.access(fullPath, fs.constants.R_OK);
    } catch {
      throw new Error('File not found in storage');
    }

    return fs.createReadStream(fullPath);
  }

  async delete(storageKey) {
    try {
      const fullPath = this._resolveSafePath(storageKey);
      await fs.promises.unlink(fullPath);
      return true;
    } catch (err) {
      // If file didn't exist, treat as succeeded
      if (err.code === 'ENOENT') {
        return false;
      }
      throw err;
    }
  }

  async exists(storageKey) {
    try {
      const fullPath = this._resolveSafePath(storageKey);
      await fs.promises.access(fullPath, fs.constants.F_OK);
      return true;
    } catch {
      return false;
    }
  }
}

module.exports = LocalStorageProvider;
