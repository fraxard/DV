const router = require('express').Router();
const supportController = require('../controllers/support.controller');

// Centralized Support / Contact endpoints
// Handles both POST /api/support and legacy POST /api/support/contact
router.post('/', supportController.submitSupport);
router.post('/contact', supportController.submitSupport);

module.exports = router;
