const router = require('express').Router();
const { requireAuth } = require('../middleware/auth.middleware');
const { listActivities } = require('../services/activity.service');

// All activity routes require authentication
router.use(requireAuth);

router.get('/', async (req, res) => {
  const limit = req.query.limit ? parseInt(req.query.limit, 10) : 20;
  const activities = await listActivities(req.user.id, limit);
  res.json({ activities });
});

module.exports = router;