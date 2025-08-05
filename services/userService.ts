import { eq, count, and, gte, sql } from 'drizzle-orm';
import { db } from '../db/config';
import {
  users,
  stories,
  oauthAccounts,
  userSessions,
  type User,
  type NewUser,
  type OAuthAccount,
  type NewOAuthAccount,
  type UserSession,
  type NewUserSession,
} from '../db/schema';
import { v4 as uuidv4 } from 'uuid';
import bcrypt from 'bcryptjs';

// Utility functions (previously in utils/auth.ts)
async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 12);
}

function generateSessionId(): string {
  return uuidv4();
}

export interface OAuthUserData {
  provider: 'google' | 'apple';
  providerAccountId: string;
  email: string;
  firstName: string;
  lastName: string;
  profileImageUrl: string | null;
  accessToken: string;
  refreshToken?: string;
  idToken?: string;
}

export class UserService {
  /**
   * Get user by ID
   */
  async getUserById(userId: string): Promise<User | null> {
    try {
      const result = await db
        .select()
        .from(users)
        .where(eq(users.id, userId))
        .limit(1);

      return result.length > 0 ? result[0] : null;
    } catch (error) {
      console.error('Error getting user by ID:', error);
      return null;
    }
  }

  /**
   * Get user by email
   */
  async getUserByEmail(email: string): Promise<User | null> {
    try {
      const result = await db
        .select()
        .from(users)
        .where(eq(users.email, email))
        .limit(1);

      return result.length > 0 ? result[0] : null;
    } catch (error) {
      console.error('Error getting user by email:', error);
      return null;
    }
  }

  /**
   * Create a new user with email/password
   */
  async createUser(
    email: string,
    password: string,
    firstName?: string,
    lastName?: string,
  ): Promise<User | null> {
    try {
      const hashedPassword = await hashPassword(password);
      const userId = uuidv4();

      const newUser: NewUser = {
        id: userId, // Explicitly set the ID
        email,
        password: hashedPassword,
        firstName: firstName || null,
        lastName: lastName || null,
        emailVerified: false,
        subscriptionLevel: 'free',
      };

      const result = await db.insert(users).values(newUser).returning();
      return result[0] || null;
    } catch (error) {
      console.error('Error creating user:', error);
      return null;
    }
  }

  /**
   * Find or create OAuth user
   */
  async findOrCreateOAuthUser(oauthData: OAuthUserData): Promise<User | null> {
    try {
      console.log('🔍 Looking for OAuth user:', {
        provider: oauthData.provider,
        providerAccountId: oauthData.providerAccountId,
        email: oauthData.email,
        firstName: oauthData.firstName,
        lastName: oauthData.lastName,
      });

      // Check if OAuth account already exists
      const existingAccount = await db
        .select({
          user: users,
          account: oauthAccounts,
        })
        .from(oauthAccounts)
        .innerJoin(users, eq(oauthAccounts.userId, users.id))
        .where(
          and(
            eq(oauthAccounts.provider, oauthData.provider),
            eq(oauthAccounts.providerAccountId, oauthData.providerAccountId),
          ),
        )
        .limit(1);

      if (existingAccount.length > 0) {
        console.log(
          '✅ Found existing OAuth account for user:',
          existingAccount[0].user.id,
        );

        // Update existing OAuth account tokens
        await db
          .update(oauthAccounts)
          .set({
            accessToken: oauthData.accessToken,
            refreshToken: oauthData.refreshToken,
            idToken: oauthData.idToken,
            updatedAt: new Date(),
          })
          .where(
            and(
              eq(oauthAccounts.provider, oauthData.provider),
              eq(oauthAccounts.providerAccountId, oauthData.providerAccountId),
            ),
          );

        return existingAccount[0].user;
      }

      console.log(
        '❌ No existing OAuth account found, checking for user by email...',
      );

      // Check if user exists with this email
      let user = await this.getUserByEmail(oauthData.email);

      if (!user) {
        console.log('👤 Creating new user for OAuth login...');
        // Create new user with explicit UUID
        const userId = uuidv4();
        const newUser: NewUser = {
          id: userId, // Explicitly set the ID
          email: oauthData.email,
          firstName: oauthData.firstName || null,
          lastName: oauthData.lastName || null,
          profileImageUrl: oauthData.profileImageUrl,
          emailVerified: true, // OAuth emails are considered verified
          subscriptionLevel: 'free',
        };

        const result = await db.insert(users).values(newUser).returning();
        user = result[0];
        console.log('✅ Created new user:', user.id);
      } else {
        console.log('✅ Found existing user by email:', user.id);
      }

      // Create OAuth account link
      console.log('🔗 Creating OAuth account link...');
      const oauthAccountId = uuidv4();
      const newOAuthAccount: NewOAuthAccount = {
        id: oauthAccountId, // Explicitly set the ID
        userId: user.id,
        provider: oauthData.provider,
        providerAccountId: oauthData.providerAccountId,
        accessToken: oauthData.accessToken,
        refreshToken: oauthData.refreshToken,
        idToken: oauthData.idToken,
      };

      await db.insert(oauthAccounts).values(newOAuthAccount);
      console.log('✅ Created OAuth account link:', oauthAccountId);

      return user;
    } catch (error) {
      console.error('❌ Error finding or creating OAuth user:', error);
      return null;
    }
  }

  /**
   * Create user session
   */
  async createSession(userId: string): Promise<UserSession | null> {
    try {
      const sessionId = generateSessionId();
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + 7); // 7 days from now

      const newSession: NewUserSession = {
        id: uuidv4(), // Add explicit UUID for session ID
        userId,
        token: sessionId,
        expiresAt,
      };

      const result = await db
        .insert(userSessions)
        .values(newSession)
        .returning();
      return result[0] || null;
    } catch (error) {
      console.error('Error creating session:', error);
      return null;
    }
  }

  /**
   * Get session by token
   */
  async getSession(sessionId: string): Promise<UserSession | null> {
    try {
      const result = await db
        .select()
        .from(userSessions)
        .where(eq(userSessions.token, sessionId))
        .limit(1);

      return result.length > 0 ? result[0] : null;
    } catch (error) {
      console.error('Error getting session:', error);
      return null;
    }
  }

  /**
   * Delete session
   */
  async deleteSession(sessionId: string): Promise<boolean> {
    try {
      await db.delete(userSessions).where(eq(userSessions.token, sessionId));
      return true;
    } catch (error) {
      console.error('Error deleting session:', error);
      return false;
    }
  }
  /**
   * Update user session
   */

  async updateSession(
    sessionId: string,
    updates: Partial<UserSession>,
  ): Promise<UserSession | null> {
    try {
      const updateData: Partial<NewUserSession> = {};

      if (updates.expiresAt) updateData.expiresAt = updates.expiresAt;

      if (Object.keys(updateData).length === 0) {
        return await this.getSession(sessionId);
      }

      const updatedSessions = await db
        .update(userSessions)
        .set(updateData)
        .where(eq(userSessions.token, sessionId))
        .returning();

      return updatedSessions.length > 0 ? updatedSessions[0] : null;
    } catch (error) {
      console.error('Error updating session:', error);
      return null;
    }
  }

  /**
   * Update user information
   */
  async updateUser(
    userId: string,
    updates: Partial<User>,
  ): Promise<User | null> {
    try {
      const updateData: Partial<NewUser> = {};

      if (updates.email) updateData.email = updates.email;
      if (updates.firstName !== undefined)
        updateData.firstName = updates.firstName;
      if (updates.lastName !== undefined)
        updateData.lastName = updates.lastName;
      if (updates.profileImageUrl !== undefined)
        updateData.profileImageUrl = updates.profileImageUrl;
      if (updates.subscriptionLevel)
        updateData.subscriptionLevel = updates.subscriptionLevel;

      if (Object.keys(updateData).length === 0) {
        return await this.getUserById(userId);
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
      const user = await this.getUserById(userId);

      // For now, no admin role check since we removed Clerk
      // You can implement admin roles in the user schema if needed

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
      const user = await this.getUserById(userId);
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

      const userLimit =
        limits[user.subscriptionLevel as keyof typeof limits] || limits.free;

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
          and(eq(stories.userId, userId), gte(stories.createdAt, currentMonth)),
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
          updatedAt: new Date(),
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
      const user = await this.getUserById(userId);
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
