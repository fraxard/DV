const router = require('express').Router();
const { requireAuth } = require('../middleware/auth.middleware');
const { handleUpload } = require('../middleware/upload.middleware');
const {
  loginRateLimiter,
  registerRateLimiter,
  verifyEmailRateLimiter,
  resendVerificationRateLimiter,
} = require('../middleware/rateLimit.middleware');
const authController = require('../controllers/auth.controller');

// Registration & Login with rate limiting
router.post('/register', registerRateLimiter, authController.register);
router.post('/login', loginRateLimiter, authController.login);

// Email verification with OTP brute-force protection
router.post('/verify-email', verifyEmailRateLimiter, authController.verifyEmail);

router.put(
  '/onboarding',
  requireAuth,
  authController.completeOnboarding
);

router.post(
  '/resend-verification',
  requireAuth,
  resendVerificationRateLimiter,
  authController.resendVerification
);

router.post('/logout', authController.logout);

router.get('/me', requireAuth, authController.me);

// Profile management
router.put('/profile', requireAuth, authController.updateProfile);
router.post('/profile/avatar', requireAuth, handleUpload('avatar'), authController.uploadAvatar);
router.get('/avatar/:userId', authController.getAvatar);

// Profile email change with OTP re-verification
router.post('/profile/request-email-change', requireAuth, resendVerificationRateLimiter, authController.requestEmailChange);
router.post('/profile/verify-email-change', requireAuth, verifyEmailRateLimiter, authController.verifyEmailChange);
router.post('/profile/resend-email-change', requireAuth, resendVerificationRateLimiter, authController.resendEmailChange);

module.exports = router;
