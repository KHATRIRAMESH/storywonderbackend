import { Response } from 'express';
import { userService } from '../services/userService';
import { AuthenticatedRequest } from '../middlewares/passportAuthMiddleware';

export class UserController {
  /**
   * Get current authenticated user's profile
   */
  async getUserProfile(req: AuthenticatedRequest, res: Response) {
    try {
      const userId = req.user?.id;
      
      if (!userId) {
        return res.status(401).json({ 
          error: 'Unauthorized',
          message: 'User not authenticated' 
        });
      }

      const user = await userService.getUserById(userId);
      
      if (!user) {
        return res.status(404).json({ 
          error: 'Not Found',
          message: 'User not found' 
        });
      }

      // Remove sensitive information before sending response
      const userProfile = {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        profileImageUrl: user.profileImageUrl,
        subscriptionLevel: user.subscriptionLevel,
        storiesGenerated: user.storiesGenerated,
        emailVerified: user.emailVerified,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
      };

      res.json(userProfile);
    } catch (error) {
      console.error('Error fetching user profile:', error);
      res.status(500).json({ 
        error: 'Internal Server Error',
        message: 'Failed to fetch user profile' 
      });
    }
  }

  /**
   * Update current authenticated user's profile
   */
  async updateUserProfile(req: AuthenticatedRequest, res: Response) {
    try {
      const userId = req.user?.id;
      const updates = req.body;

      if (!userId) {
        return res.status(401).json({ 
          error: 'Unauthorized',
          message: 'User not authenticated' 
        });
      }

      // Validate allowed updates
      const allowedUpdates = ['firstName', 'lastName', 'profileImageUrl'];
      const filteredUpdates: any = {};
      
      for (const key of allowedUpdates) {
        if (updates[key] !== undefined) {
          filteredUpdates[key] = updates[key];
        }
      }

      if (Object.keys(filteredUpdates).length === 0) {
        return res.status(400).json({ 
          error: 'Bad Request',
          message: 'No valid updates provided' 
        });
      }

      const updatedUser = await userService.updateUser(userId, filteredUpdates);
      
      if (!updatedUser) {
        return res.status(404).json({ 
          error: 'Not Found',
          message: 'User not found' 
        });
      }

      // Remove sensitive information before sending response
      const userProfile = {
        id: updatedUser.id,
        email: updatedUser.email,
        firstName: updatedUser.firstName,
        lastName: updatedUser.lastName,
        profileImageUrl: updatedUser.profileImageUrl,
        subscriptionLevel: updatedUser.subscriptionLevel,
        storiesGenerated: updatedUser.storiesGenerated,
        emailVerified: updatedUser.emailVerified,
        createdAt: updatedUser.createdAt,
        updatedAt: updatedUser.updatedAt,
      };

      res.json(userProfile);
    } catch (error) {
      console.error('Error updating user profile:', error);
      res.status(500).json({ 
        error: 'Internal Server Error',
        message: 'Failed to update user profile' 
      });
    }
  }

  /**
   * Get current authenticated user's subscription status
   */
  async getUserSubscription(req: AuthenticatedRequest, res: Response) {
    try {
      const userId = req.user?.id;
      
      if (!userId) {
        return res.status(401).json({ 
          error: 'Unauthorized',
          message: 'User not authenticated' 
        });
      }

      const subscriptionInfo = await userService.getSubscriptionInfo(userId);
      
      res.json(subscriptionInfo);
    } catch (error) {
      console.error('Error fetching subscription info:', error);
      res.status(500).json({ 
        error: 'Internal Server Error',
        message: 'Failed to fetch subscription information' 
      });
    }
  }

  /**
   * Get user statistics
   */
  async getUserStats(req: AuthenticatedRequest, res: Response) {
    try {
      const userId = req.user?.id;
      
      if (!userId) {
        return res.status(401).json({ 
          error: 'Unauthorized',
          message: 'User not authenticated' 
        });
      }

      const user = await userService.getUserById(userId);
      
      if (!user) {
        return res.status(404).json({ 
          error: 'Not Found',
          message: 'User not found' 
        });
      }

      const subscriptionInfo = await userService.getSubscriptionInfo(userId);
      const hasReachedLimit = await userService.hasReachedStoryLimit(userId);

      const stats = {
        storiesGenerated: user.storiesGenerated,
        subscriptionLevel: user.subscriptionLevel,
        subscriptionFeatures: subscriptionInfo.features,
        hasReachedStoryLimit: hasReachedLimit,
        memberSince: user.createdAt,
      };

      res.json(stats);
    } catch (error) {
      console.error('Error fetching user stats:', error);
      res.status(500).json({ 
        error: 'Internal Server Error',
        message: 'Failed to fetch user statistics' 
      });
    }
  }
}

export const userController = new UserController();
