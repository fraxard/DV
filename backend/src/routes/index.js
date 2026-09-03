const router = require('express').Router();

// Health check — useful for Render's health checks and local verification
router.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    env: process.env.NODE_ENV ?? 'development',
    timestamp: new Date().toISOString(),
  });
});

// Auth routes will be mounted here in Step 6
// router.use('/auth', require('./auth.routes'));

module.exports = router;