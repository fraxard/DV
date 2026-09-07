const router = require('express').Router();

// Health check — useful for Render's health checks and local verification
router.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    env: process.env.NODE_ENV ?? 'development',
    timestamp: new Date().toISOString(),
  });
});

router.use('/auth', require('./auth.routes'));
router.use('/vault', require('./vault.routes'));
router.use('/documents', require('./document.routes'));
router.use('/nominees', require('./nominee.routes'));
router.use('/dashboard', require('./dashboard.routes'));
router.use('/activity', require('./activity.routes'));
router.use('/custom-categories', require('./customCategory.routes'));
router.use('/tasks', require('./task.routes'));
router.use('/support', require('./support.routes'));

module.exports = router;
