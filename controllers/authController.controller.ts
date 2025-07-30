import { Request, Response } from 'express';
import { userService } from '../services/userService';
import { getClerkUser } from '../clerkAuth';

export class AuthController {
  /**
   * Get current authenticated user's profile
   */
  async getUserProfile(req: Request, res: Response) {
    try {
      const userId = (req as any).userId;
      
      if (!userId) {
        return res.status(401).json({ message: 'User not authenticated' });
      }

      const user = await userService.getOrCreateUser(userId);
      
      if (!user) {
        return res.status(404).json({ message: 'User not found' });
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
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
      };

      res.json(userProfile);
    } catch (error) {
      console.error('Error fetching user profile:', error);
      res.status(500).json({ message: 'Failed to fetch user profile' });
    }
  }

  /**
   * Update user profile
   */
  async updateUserProfile(req: Request, res: Response) {
    try {
      const userId = (req as any).userId;
      const updates = req.body;

      if (!userId) {
        return res.status(401).json({ message: 'User not authenticated' });
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
        return res.status(400).json({ message: 'No valid updates provided' });
      }

      const updatedUser = await userService.updateUser(userId, filteredUpdates);
      
      if (!updatedUser) {
        return res.status(404).json({ message: 'User not found' });
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
        createdAt: updatedUser.createdAt,
        updatedAt: updatedUser.updatedAt,
      };

      res.json(userProfile);
    } catch (error) {
      console.error('Error updating user profile:', error);
      res.status(500).json({ message: 'Failed to update user profile' });
    }
  }

  /**
   * Get user subscription information
   */
  async getUserSubscription(req: Request, res: Response) {
    try {
      const userId = (req as any).userId;
      
      if (!userId) {
        return res.status(401).json({ message: 'User not authenticated' });
      }

      const subscriptionInfo = await userService.getSubscriptionInfo(userId);
      
      res.json(subscriptionInfo);
    } catch (error) {
      console.error('Error fetching subscription info:', error);
      res.status(500).json({ message: 'Failed to fetch subscription information' });
    }
  }

  /**
   * Verify authentication status
   */
  async verifyAuth(req: Request, res: Response) {
    try {
      const userId = (req as any).userId;
      
      if (!userId) {
        return res.status(401).json({ 
          authenticated: false, 
          message: 'User not authenticated' 
        });
      }

      // Check if user exists in our database
      const user = await userService.getOrCreateUser(userId);
      
      if (!user) {
        return res.status(404).json({ 
          authenticated: false, 
          message: 'User not found' 
        });
      }

      res.json({
        authenticated: true,
        userId: user.id,
        email: user.email,
        subscriptionLevel: user.subscriptionLevel,
      });
    } catch (error) {
      console.error('Error verifying authentication:', error);
      res.status(500).json({ 
        authenticated: false, 
        message: 'Authentication verification failed' 
      });
    }
  }

  /**
   * Get user statistics
   */
  async getUserStats(req: Request, res: Response) {
    try {
      const userId = (req as any).userId;
      
      if (!userId) {
        return res.status(401).json({ message: 'User not authenticated' });
      }

      const user = await userService.getOrCreateUser(userId);
      
      if (!user) {
        return res.status(404).json({ message: 'User not found' });
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
      res.status(500).json({ message: 'Failed to fetch user statistics' });
    }
  }
}

export const authController = new AuthController();
