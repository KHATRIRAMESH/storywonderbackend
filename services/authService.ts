import { eq, and } from 'drizzle-orm';
import bcrypt from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';
import { db } from '../db/config';
import { users, userSessions, oauthAccounts } from '../db/schema';
import { generateJWT, verifyJWT } from '../middlewares/authMiddleware';

export interface RegisterUserResult {
  user: {
    id: string;
    email: string;
    firstName?: string;
    lastName?: string;
    subscriptionLevel: 'free' | 'premium' | 'pro';
  };
  token: string;
}

export interface AuthenticateUserResult {
  user: {
    id: string;
    email: string;
    firstName?: string;
    lastName?: string;
    subscriptionLevel: 'free' | 'premium' | 'pro';
  };
  token: string;
}

export interface SessionResult {
  token: string;
  expiresAt: Date;
}

export class AuthService {
  /**
   * Register a new user with email and password
   */
  async registerUser(
    email: string, 
    password: string, 
    firstName?: string, 
    lastName?: string
  ): Promise<RegisterUserResult | null> {
    try {
      // Hash password
      const hashedPassword = await bcrypt.hash(password, 12);
      const userId = uuidv4();

      // Create user in database
      const [newUser] = await db.insert(users).values({
        id: userId,
        email: email.toLowerCase().trim(),
        password: hashedPassword,
        firstName: firstName?.trim(),
        lastName: lastName?.trim(),
        subscriptionLevel: 'free',
        storiesGenerated: 0,
        createdAt: new Date(),
        updatedAt: new Date(),
      }).returning();

      if (!newUser) {
        throw new Error('Failed to create user');
      }

      // Create initial session
      const sessionResult = await this.createSessionForUser(newUser.id);
      
      if (!sessionResult) {
        throw new Error('Failed to create session');
      }

      return {
        user: {
          id: newUser.id,
          email: newUser.email,
          firstName: newUser.firstName || undefined,
          lastName: newUser.lastName || undefined,
          subscriptionLevel: newUser.subscriptionLevel,
        },
        token: sessionResult.token,
      };
    } catch (error) {
      console.error('Error registering user:', error);
      return null;
    }
  }

  /**
   * Authenticate user with email and password
   */
  async authenticateUser(email: string, password: string): Promise<AuthenticateUserResult | null> {
    try {
      // Find user by email
      const [user] = await db
        .select()
        .from(users)
        .where(eq(users.email, email.toLowerCase().trim()))
        .limit(1);

      if (!user || !user.password) {
        return null;
      }

      // Verify password
      const isValidPassword = await bcrypt.compare(password, user.password);
      
      if (!isValidPassword) {
        return null;
      }

      // Create session
      const sessionResult = await this.createSessionForUser(user.id);
      
      if (!sessionResult) {
        throw new Error('Failed to create session');
      }

      return {
        user: {
          id: user.id,
          email: user.email,
          firstName: user.firstName || undefined,
          lastName: user.lastName || undefined,
          subscriptionLevel: user.subscriptionLevel,
        },
        token: sessionResult.token,
      };
    } catch (error) {
      console.error('Error authenticating user:', error);
      return null;
    }
  }

  /**
   * Create a new session for a user
   */
  async createSessionForUser(userId: string): Promise<SessionResult | null> {
    try {
      const sessionId = uuidv4();
      const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

      // Create session in database
      await db.insert(userSessions).values({
        id: sessionId,
        userId,
        token: sessionId, // Use sessionId as token identifier
        expiresAt,
        createdAt: new Date(),
      });

      // Get user email for JWT
      const [user] = await db
        .select({ email: users.email })
        .from(users)
        .where(eq(users.id, userId))
        .limit(1);

      if (!user) {
        throw new Error('User not found');
      }

      // Generate JWT token
      const token = generateJWT(userId, user.email, sessionId);

      return {
        token,
        expiresAt,
      };
    } catch (error) {
      console.error('Error creating session:', error);
      return null;
    }
  }

  /**
   * Validate a JWT token and return user information
   */
  async validateToken(token: string): Promise<any | null> {
    try {
      // Verify JWT
      const payload = verifyJWT(token);
      
      if (!payload || !payload.sessionId || !payload.userId) {
        return null;
      }

      // Check if session exists and is valid
      const [session] = await db
        .select()
        .from(userSessions)
        .where(
          and(
            eq(userSessions.id, payload.sessionId),
            eq(userSessions.userId, payload.userId)
          )
        )
        .limit(1);

      if (!session || session.expiresAt < new Date()) {
        // Clean up expired session
        if (session) {
          await this.invalidateSession(payload.sessionId);
        }
        return null;
      }

      // Get user information
      const [user] = await db
        .select()
        .from(users)
        .where(eq(users.id, payload.userId))
        .limit(1);

      if (!user) {
        return null;
      }

      return {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        subscriptionLevel: user.subscriptionLevel,
        sessionId: session.id,
      };
    } catch (error) {
      console.error('Error validating token:', error);
      return null;
    }
  }

  /**
   * Invalidate a session (logout)
   */
  async invalidateSession(sessionId: string): Promise<boolean> {
    try {
      await db
        .delete(userSessions)
        .where(eq(userSessions.id, sessionId));
      
      return true;
    } catch (error) {
      console.error('Error invalidating session:', error);
      return false;
    }
  }

  /**
   * Clean up expired sessions
   */
  async cleanupExpiredSessions(): Promise<void> {
    try {
      await db
        .delete(userSessions)
        .where(eq(userSessions.expiresAt, new Date()));
      
      console.log('Cleaned up expired sessions');
    } catch (error) {
      console.error('Error cleaning up expired sessions:', error);
    }
  }

  /**
   * Create or update OAuth account
   */
  async createOrUpdateOAuthAccount(
    provider: 'google' | 'apple',
    providerId: string,
    email: string,
    profile: any
  ): Promise<{ user: any; isNewUser: boolean } | null> {
    try {
      // Check if OAuth account exists
      const [existingOAuthAccount] = await db
        .select()
        .from(oauthAccounts)
        .where(
          and(
            eq(oauthAccounts.provider, provider),
            eq(oauthAccounts.providerAccountId, providerId)
          )
        )
        .limit(1);

      if (existingOAuthAccount) {
        // Get existing user
        const [user] = await db
          .select()
          .from(users)
          .where(eq(users.id, existingOAuthAccount.userId))
          .limit(1);

        if (user) {
          return { user, isNewUser: false };
        }
      }

      // Check if user exists with same email
      const [existingUser] = await db
        .select()
        .from(users)
        .where(eq(users.email, email.toLowerCase().trim()))
        .limit(1);

      let userId: string;

      if (existingUser) {
        userId = existingUser.id;
      } else {
        // Create new user
        const newUserId = uuidv4();
        const [newUser] = await db.insert(users).values({
          id: newUserId,
          email: email.toLowerCase().trim(),
          firstName: profile.given_name || profile.name?.givenName,
          lastName: profile.family_name || profile.name?.familyName,
          profileImageUrl: profile.picture,
          subscriptionLevel: 'free',
          storiesGenerated: 0,
          createdAt: new Date(),
          updatedAt: new Date(),
        }).returning();

        if (!newUser) {
          throw new Error('Failed to create user');
        }

        userId = newUser.id;
      }

      // Create OAuth account link
      const oauthAccountId = uuidv4();
      await db.insert(oauthAccounts).values({
        id: oauthAccountId,
        userId,
        provider,
        providerAccountId: providerId,
        accessToken: profile.accessToken,
        refreshToken: profile.refreshToken,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      // Get user data
      const [user] = await db
        .select()
        .from(users)
        .where(eq(users.id, userId))
        .limit(1);

      return { user, isNewUser: !existingUser };
    } catch (error) {
      console.error('Error creating/updating OAuth account:', error);
      return null;
    }
  }

  /**
   * Refresh an OAuth token
   */
  async refreshOAuthToken(provider: 'google' | 'apple', userId: string): Promise<boolean> {
    try {
      // This would implement OAuth token refresh logic
      // For now, we'll return true as a placeholder
      console.log(`Refreshing ${provider} token for user ${userId}`);
      return true;
    } catch (error) {
      console.error('Error refreshing OAuth token:', error);
      return false;
    }
  }
}

export const authService = new AuthService();
