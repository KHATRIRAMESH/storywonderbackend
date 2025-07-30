import { eq, count, and, gte, sql } from 'drizzle-orm';
import { db } from '../db/config';
import { users, stories, type User, type NewUser } from '../db/schema';
import { getClerkUser } from '../clerkAuth';

export class UserService {
  /**
   * Get or create user in database from Clerk user data
   */
  async getOrCreateUser(clerkUserId: string): Promise<User | null> {
    try {
      // First, try to get user from database
      const existingUser = await db.select().from(users).where(eq(users.id, clerkUserId)).limit(1);

      if (existingUser.length > 0) {
        return existingUser[0];
      }

      // Handle development user
      if (clerkUserId === 'dev_user_123' && process.env.NODE_ENV === 'development') {
        console.log('🔧 Creating development user for testing');
        const newUser: NewUser = {
          id: 'dev_user_123',
          email: 'dev@example.com',
          firstName: 'Dev',
          lastName: 'User',
          profileImageUrl: null,
          subscriptionLevel: 'premium', // Give dev user premium access for testing
        };

        const insertedUsers = await db.insert(users).values(newUser).onConflictDoUpdate({
          target: users.id,
          set: {
            updatedAt: new Date(),
          },
        }).returning();

        return insertedUsers[0];
      }

      // If user doesn't exist, get data from Clerk and create
      const clerkUser = await getClerkUser(clerkUserId);
      if (!clerkUser) {
        return null;
      }

      const email = clerkUser.emailAddresses[0]?.emailAddress;
      if (!email) {
        throw new Error('User email not found');
      }

      // Create new user in database
      const newUser: NewUser = {
        id: clerkUserId,
        email,
        firstName: clerkUser.firstName,
        lastName: clerkUser.lastName,
        profileImageUrl: clerkUser.imageUrl || null,
        subscriptionLevel: (clerkUser.publicMetadata as any)?.subscriptionLevel || 'free',
      };

      const insertedUsers = await db.insert(users).values(newUser).returning();
      return insertedUsers[0];
    } catch (error) {
      console.error('Error getting or creating user:', error);
      return null;
    }
  }

  /**
   * Update user information
   */
  async updateUser(userId: string, updates: Partial<User>): Promise<User | null> {
    try {
      const updateData: Partial<NewUser> = {};

      if (updates.email) updateData.email = updates.email;
      if (updates.firstName) updateData.firstName = updates.firstName;
      if (updates.lastName) updateData.lastName = updates.lastName;
      if (updates.profileImageUrl) updateData.profileImageUrl = updates.profileImageUrl;
      if (updates.subscriptionLevel) updateData.subscriptionLevel = updates.subscriptionLevel;

      if (Object.keys(updateData).length === 0) {
        return await this.getOrCreateUser(userId);
      }

      updateData.updatedAt = new Date();

      const updatedUsers = await db
        .update(users)
        .set(updateData)
        .where(eq(users.id, userId))
        .returning();

      return updatedUsers.length > 0 ? updatedUsers[0] : null;
    } catch (error) {
      console.error('Error updating user:', error);
      return null;
    }
  }

  /**
   * Check if a user can access a specific story
   */
  async canAccessStory(userId: string, story: any): Promise<boolean> {
    try {
      // Basic ownership check
      if (story.userId === userId) {
        return true;
      }

      // Check if story is public
      if (story.isPublic) {
        return true;
      }

      // Check if user has admin role
      const user = await this.getOrCreateUser(userId);
      const clerkUser = await getClerkUser(userId);
      
      if (clerkUser?.publicMetadata?.role === 'admin') {
        return true;
      }

      return false;
    } catch (error) {
      console.error('Error checking story access:', error);
      return false;
    }
  }

  /**
   * Check if user has reached story generation limit
   */
  async hasReachedStoryLimit(userId: string): Promise<boolean> {
    try {
      const user = await this.getOrCreateUser(userId);
      if (!user) {
        return true;
      }

      // Define limits based on subscription
      const limits = {
        free: 5,
        premium: 50,
        pro: 50,
        unlimited: Infinity,
      };

      const userLimit = limits[user.subscriptionLevel] || limits.free;
      
      if (userLimit === Infinity) {
        return false;
      }

      // Get start of current month
      const currentMonth = new Date();
      currentMonth.setDate(1);
      currentMonth.setHours(0, 0, 0, 0);

      // Check stories created in current month
      const storyCount = await db
        .select({ count: count() })
        .from(stories)
        .where(
          and(
            eq(stories.userId, userId),
            gte(stories.createdAt, currentMonth)
          )
        );

      const storiesThisMonth = storyCount[0]?.count || 0;
      return storiesThisMonth >= userLimit;
    } catch (error) {
      console.error('Error checking story limit:', error);
      return true; // Err on the side of caution
    }
  }

  /**
   * Increment user's story count
   */
  async incrementStoryCount(userId: string): Promise<void> {
    try {
      await db
        .update(users)
        .set({ 
          storiesGenerated: sql`${users.storiesGenerated} + 1`,
          updatedAt: new Date()
        })
        .where(eq(users.id, userId));
    } catch (error) {
      console.error('Error incrementing story count:', error);
    }
  }

  /**
   * Get user's subscription information
   */
  async getSubscriptionInfo(userId: string) {
    try {
      const user = await this.getOrCreateUser(userId);
      if (!user) {
        throw new Error('User not found');
      }

      return {
        level: user.subscriptionLevel,
        features: this.getSubscriptionFeatures(user.subscriptionLevel),
        storiesGenerated: user.storiesGenerated,
      };
    } catch (error) {
      console.error('Error fetching subscription info:', error);
      throw error;
    }
  }

  private getSubscriptionFeatures(level: string) {
    const features = {
      free: {
        storiesPerMonth: 5,
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
      pro: {
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