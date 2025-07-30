import { Router } from 'express';
import { authController } from '../controllers/authController.controller';
import { clerkAuthMiddleware } from '../clerkAuth';

const router = Router();

// Apply Clerk authentication middleware to all routes
router.use(clerkAuthMiddleware);

// User profile routes
router.get('/profile', authController.getUserProfile);
router.put('/profile', authController.updateUserProfile);

// Subscription and stats routes
router.get('/subscription', authController.getUserSubscription);
router.get('/stats', authController.getUserStats);

// Authentication verification
router.get('/verify', authController.verifyAuth);

export default router;
