const LocalStorageProvider = require('./localStorage');
const S3StorageProvider = require('./s3Storage');

const driver = (process.env.STORAGE_DRIVER || 'local').toLowerCase();

let storageInstance = null;

switch (driver) {
  case 's3':
  case 'r2':
    // Explicitly initialize S3/R2 provider; fails fast if required credentials are missing
    storageInstance = new S3StorageProvider();
    break;

  case 'local':
    storageInstance = new LocalStorageProvider();
    break;

  default:
    throw new Error(
      `Unsupported STORAGE_DRIVER: '${driver}'. Valid options are 'local' or 'r2'.`
    );
}

module.exports = storageInstance;
