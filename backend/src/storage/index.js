const LocalStorageProvider = require('./localStorage');

const driver = process.env.STORAGE_DRIVER || 'local';

let storageInstance = null;

switch (driver.toLowerCase()) {
  case 'local':
  default:
    storageInstance = new LocalStorageProvider();
    break;

  // Cloudflare R2 / S3 driver will be plugged in here in future phases:
  // case 'r2':
  //   storageInstance = new R2StorageProvider(...);
  //   break;
}

module.exports = storageInstance;
