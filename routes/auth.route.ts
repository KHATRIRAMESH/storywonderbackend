import { Router } from 'express';
import { authController } from '../controllers/auth.controller';
import { userController } from '../controllers/user.controller';
import {
  authenticateJWT,
  optionalJWT,
  authenticateGoogle,
  authenticateGoogleCallback,
  authenticateApple,
  authenticateAppleCallback,
} from '../middlewares/passportAuthMiddleware';

const router = Router();

// Public authentication routes
router.post('/register', authController.register);
router.post('/login', authController.login);

// Email verification routes (public)
router.post('/verify-email', authController.emailVerification);
router.post('/resend-verification', authController.resendVerificationEmail);

// OAuth routes with Passport middleware
router.get('/google', authenticateGoogle);
router.get(
  '/google/callback',
  authenticateGoogleCallback,
  authController.handleOAuthSuccess,
);
router.get('/apple', authenticateApple);
router.get(
  '/apple/callback',
  authenticateAppleCallback,
  authController.handleOAuthSuccess,
);

// Protected authentication routes
router.post('/logout', authenticateJWT, authController.logout);
router.get('/verify', optionalJWT, authController.verifyAuth);
router.get('/token', authController.getAuthToken);
router.get('/debug', authController.debugAuth);
router.get('/verification-status', authenticateJWT, authController.getVerificationStatus);

// Protected user routes (require authentication)
router.get('/profile', authenticateJWT, userController.getUserProfile);
router.put('/profile', authenticateJWT, userController.updateUserProfile);
router.get(
  '/subscription',
  authenticateJWT,
  userController.getUserSubscription,
);
router.get('/stats', authenticateJWT, userController.getUserStats);

export default router;
