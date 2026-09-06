const router = require('express').Router();
const { requireAuth } = require('../middleware/auth.middleware');
const { listActivitiesPaginated } = require('../services/activity.service');

// All activity routes require authentication
router.use(requireAuth);

router.get('/', async (req, res) => {
  const page = req.query.page !== undefined ? req.query.page : 1;
  const limit = req.query.limit !== undefined ? req.query.limit : 5;
  const { activities, pagination } = await listActivitiesPaginated(req.user.id, { page, limit });
  res.json({ activities, pagination });
});

module.exports = router;