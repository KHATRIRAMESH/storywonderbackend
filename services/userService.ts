import { getClerkUser } from '../clerkAuth';

export interface Story {
  id: number;
  title: string;
  status: 'generating' | 'completed' | 'failed';
  userId: string;
  childName: string;
  childAge: number;
  childGender: string;
  interests: string;
  theme: string;
  style: string;
  companions: string;
  pageCount: number;
  childImageUrl?: string;
  pages?: Array<{
    text: string;
    imageUrl?: string;
    imagePrompt?: string;
  }>;
  coverImageUrl?: string;
  pdfUrl?: string;
  createdAt: Date;
  updatedAt: Date;
}

export class UserService {
  /**
   * Check if a user can access a specific story
   */
  async canAccessStory(userId: string, story: Story): Promise<boolean> {
    try {
      // Basic ownership check
      if (story.userId === userId) {
        return true;
      }

      // You can add more complex logic here:
      // - Check if user is admin
      // - Check if story is shared
      // - Check subscription level, etc.

      const user = await getClerkUser(userId);
      if (!user) {
        return false;
      }

      // Example: Check if user has admin role
      const isAdmin = user.publicMetadata?.role === 'admin';
      if (isAdmin) {
        return true;
      }

      // Example: Check if story is public
      if ((story as any).isPublic) {
        return true;
      }

      return false;
    } catch (error) {
      console.error('Error checking story access:', error);
      return false;
    }
  }

  /**
   * Get user profile information
   */
  async getUserProfile(userId: string) {
    try {
      const user = await getClerkUser(userId);
      if (!user) {
        throw new Error('User not found');
      }

      return {
        id: user.id,
        email: user.emailAddresses[0]?.emailAddress,
        firstName: user.firstName,
        lastName: user.lastName,
        profileImageUrl: user.profileImageUrl,
        createdAt: user.createdAt,
        metadata: user.publicMetadata,
      };
    } catch (error) {
      console.error('Error fetching user profile:', error);
      throw error;
    }
  }

  /**
   * Check if user has reached story generation limit
   */
  async hasReachedStoryLimit(userId: string): Promise<boolean> {
    try {
      const user = await getClerkUser(userId);
      if (!user) {
        return true;
      }

      // Check subscription level from user metadata
      const subscriptionLevel = user.publicMetadata?.subscriptionLevel || 'free';
      
      // Define limits based on subscription
      const limits = {
        free: 3,
        premium: 50,
        unlimited: Infinity,
      };

      const userLimit = limits[subscriptionLevel as keyof typeof limits] || limits.free;
      
      // In a real app, you'd query your database for user's story count
      // For now, return false (not reached limit)
      return false;
    } catch (error) {
      console.error('Error checking story limit:', error);
      return true; // Err on the side of caution
    }
  }

  /**
   * Get user's subscription information
   */
  async getSubscriptionInfo(userId: string) {
    try {
      const user = await getClerkUser(userId);
      if (!user) {
        throw new Error('User not found');
      }

      return {
      level: user.publicMetadata?.subscriptionLevel || 'free',
      expiresAt: (user.publicMetadata as any)?.subscriptionExpiresAt,
      features: this.getSubscriptionFeatures(user.publicMetadata?.subscriptionLevel as string),
    };
    } catch (error) {
      console.error('Error fetching subscription info:', error);
      throw error;
    }
  }

  private getSubscriptionFeatures(level: string) {
    const features = {
      free: {
        storiesPerMonth: 3,
        maxPages: 10,
        customCharacters: false,
        pdfDownload: true,
        support: 'community',
      },
      premium: {
        storiesPerMonth: 50,
        maxPages: 20,
        customCharacters: true,
        pdfDownload: true,
        support: 'priority',
      },
      unlimited: {
        storiesPerMonth: Infinity,
        maxPages: 30,
        customCharacters: true,
        pdfDownload: true,
        support: 'dedicated',
      },
    };

    return features[level as keyof typeof features] || features.free;
  }
}

export const userService = new UserService();
