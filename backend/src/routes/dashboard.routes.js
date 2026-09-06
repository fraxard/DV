const router = require('express').Router();
const { requireAuth } = require('../middleware/auth.middleware');
const dashboardController = require('../controllers/dashboard.controller');

// All dashboard endpoints require authentication
router.use(requireAuth);

router.get('/', dashboardController.getDashboard);

module.exports = router;
