const subscriptionService = require('../services/subscription.service');

/**
 * Access Control Middleware:
 * Gates access to protected features (vault, dashboard, documents, nominees, tasks, activity, etc.)
 * based on whether the user has an active 3-month trial (TRIAL_ACTIVE) or paid plan (ACTIVE).
 * 
 * If expired (TRIAL_EXPIRED or EXPIRED), halts request with HTTP 402 Payment Required
 * and structured machine-readable error payload.
 */
const requireActiveSubscription = async (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({
      error: {
        code: 'UNAUTHORIZED',
        message: 'Authentication required.',
      },
    });
  }

  let sub = req.user.subscription;
  if (!sub) {
    sub = await subscriptionService.getSubscriptionByUserId(req.user.id);
    req.user.subscription = sub;
  }

  const status = sub?.status || 'EXPIRED';
  const isActive = status === 'TRIAL_ACTIVE' || status === 'ACTIVE';

  if (!isActive) {
    return res.status(402).json({
      error: {
        code: 'SUBSCRIPTION_REQUIRED',
        message: 'Your free trial or subscription has expired. Please renew to continue using DigiVirasat.',
        status,
        plan_price: 999,
        plan_duration_months: 12,
      },
    });
  }

  next();
};

module.exports = {
  requireActiveSubscription,
};
