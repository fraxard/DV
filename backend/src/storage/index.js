const LocalStorageProvider = require('./localStorage');
const S3StorageProvider = require('./s3Storage');

const driver = (process.env.STORAGE_DRIVER || 'local').toLowerCase();

let storageInstance = null;

switch (driver) {
  case 's3':
  case 'r2':
    storageInstance = new S3StorageProvider();
    break;

  case 'local':
  default:
    storageInstance = new LocalStorageProvider();
    break;
}

module.exports = storageInstance;
