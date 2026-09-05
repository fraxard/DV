const router = require('express').Router();
const { requireAuth } = require('../middleware/auth.middleware');
const assetController = require('../controllers/asset.controller');

// All vault asset routes require authentication
router.use(requireAuth);

router.get('/assets', assetController.listAssets);
router.get('/assets/:id', assetController.getAsset);
router.post('/assets', assetController.createAsset);
router.put('/assets/:id', assetController.updateAsset);
router.delete('/assets/:id', assetController.deleteAsset);

module.exports = router;
