const router = require('express').Router();
const { requireAuth } = require('../middleware/auth.middleware');
const { handleUpload } = require('../middleware/upload.middleware');
const documentController = require('../controllers/document.controller');

// All document routes require authentication
router.use(requireAuth);

// Document CRUD & download
router.post('/', handleUpload('file'), documentController.uploadDocument);
router.get('/', documentController.listDocuments);
router.get('/:id', documentController.getDocument);
router.get('/:id/download', documentController.downloadDocument);
router.put('/:id', documentController.updateDocument);
router.delete('/:id', documentController.deleteDocument);

module.exports = router;
