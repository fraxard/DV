const { requireAuth } = require('../middleware/auth.middleware');
const router = require('express').Router();

const authController = require('../controllers/auth.controller');

router.post('/register', authController.register);
router.post('/login', authController.login);

router.post('/verify-email', authController.verifyEmail);

router.post(
  '/resend-verification',
  requireAuth,
  authController.resendVerification
);

router.post('/logout', authController.logout);

router.get('/me', requireAuth, authController.me);

module.exports = router;