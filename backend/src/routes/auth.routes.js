const { requireAuth } = require('../middleware/auth.middleware');
const { handleUpload } = require('../middleware/upload.middleware');
const router = require('express').Router();

const authController = require('../controllers/auth.controller');

router.post('/register', authController.register);
router.post('/login', authController.login);

router.post('/verify-email', authController.verifyEmail);

router.put(
  '/onboarding',
  requireAuth,
  authController.completeOnboarding
);

router.post(
  '/resend-verification',
  requireAuth,
  authController.resendVerification
);

router.post('/logout', authController.logout);

router.get('/me', requireAuth, authController.me);

// Profile management
router.put('/profile', requireAuth, authController.updateProfile);
router.post('/profile/avatar', requireAuth, handleUpload('avatar'), authController.uploadAvatar);
router.get('/avatar/:userId', authController.getAvatar);

// Profile email change with OTP re-verification
router.post('/profile/request-email-change', requireAuth, authController.requestEmailChange);
router.post('/profile/verify-email-change', requireAuth, authController.verifyEmailChange);
router.post('/profile/resend-email-change', requireAuth, authController.resendEmailChange);

module.exports = router;