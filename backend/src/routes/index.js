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

module.exports = router;
