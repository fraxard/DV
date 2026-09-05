const router = require('express').Router();
const { requireAuth } = require('../middleware/auth.middleware');
const assetController = require('../controllers/asset.controller');
const assetNomineeController = require('../controllers/assetNominee.controller');

// All vault asset routes require authentication
router.use(requireAuth);

// Asset CRUD
router.get('/assets', assetController.listAssets);
router.get('/assets/:id', assetController.getAsset);
router.post('/assets', assetController.createAsset);
router.put('/assets/:id', assetController.updateAsset);
router.delete('/assets/:id', assetController.deleteAsset);

// Asset Nominee assignments
router.get('/assets/:id/nominees', assetNomineeController.listAssetNominees);
router.post('/assets/:id/nominees', assetNomineeController.assignNominee);
router.put('/assets/:id/nominees/:nomineeId', assetNomineeController.updateNomineeAllocation);
router.delete('/assets/:id/nominees/:nomineeId', assetNomineeController.removeNominee);

module.exports = router;
