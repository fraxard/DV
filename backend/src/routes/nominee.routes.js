const router = require('express').Router();
const { requireAuth } = require('../middleware/auth.middleware');
const nomineeController = require('../controllers/nominee.controller');

// All nominee routes require authentication
router.use(requireAuth);

router.get('/dashboard-summary', nomineeController.getDashboardSummary);
router.get('/stats', nomineeController.getNomineeStats);
router.get('/', nomineeController.listNominees);
router.get('/:id', nomineeController.getNominee);
router.post('/', nomineeController.createNominee);
router.put('/:id', nomineeController.updateNominee);
router.delete('/:id', nomineeController.deleteNominee);

module.exports = router;
