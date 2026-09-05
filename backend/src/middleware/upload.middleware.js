const multer = require('multer');
const path = require('path');
const { Errors } = require('../utils/errors');

const MAX_FILE_SIZE = 15 * 1024 * 1024; // 15 MB

const ALLOWED_MIME_TYPES = new Set([
  'application/pdf',
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/webp',
]);

const ALLOWED_EXTENSIONS = new Set([
  '.pdf',
  '.jpg',
  '.jpeg',
  '.png',
  '.webp',
]);

const fileFilter = (req, file, cb) => {
  const ext = path.extname(file.originalname).toLowerCase();
  const mime = file.mimetype.toLowerCase();

  if (!ALLOWED_EXTENSIONS.has(ext) || !ALLOWED_MIME_TYPES.has(mime)) {
    return cb(
      Errors.badRequest(
        'Invalid file type. Only PDF, JPEG, PNG, and WebP files are allowed.'
      ),
      false
    );
  }

  cb(null, true);
};

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: MAX_FILE_SIZE,
    files: 1, // Single file upload per request
  },
  fileFilter,
});

/**
 * Wrapper middleware to handle Multer errors (e.g. LIMIT_FILE_SIZE)
 * and pass clean AppErrors to the global errorHandler.
 */
const handleUpload = (fieldName = 'file') => {
  const singleUpload = upload.single(fieldName);

  return (req, res, next) => {
    singleUpload(req, res, (err) => {
      if (err instanceof multer.MulterError) {
        if (err.code === 'LIMIT_FILE_SIZE') {
          return next(
            Errors.badRequest(`File size exceeds the 15 MB limit.`)
          );
        }
        return next(Errors.badRequest(`Upload error: ${err.message}`));
      } else if (err) {
        return next(err);
      }
      next();
    });
  };
};

module.exports = {
  handleUpload,
  MAX_FILE_SIZE,
  ALLOWED_MIME_TYPES,
  ALLOWED_EXTENSIONS,
};
