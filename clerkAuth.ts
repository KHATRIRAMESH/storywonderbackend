import { Request } from 'express';
import { createClerkClient, verifyToken } from '@clerk/backend';

// Check if running in development mode
const isDevelopment = process.env.NODE_ENV === 'development';

// Initialize Clerk client with environment variables
const clerkClient = createClerkClient({
  secretKey: process.env.CLERK_SECRET_KEY!,
});

/**
 * Extract and verify Clerk user ID from the request
 */
export async function getClerkUserId(req: Request): Promise<string | null> {
  try {
    // Development mode: allow custom user ID header for testing
    if (process.env.NODE_ENV === 'development') {
      const testUserId = req.headers['x-test-user-id'] as string;
      if (testUserId) {
        return testUserId;
      }
    }

    // Option 1: Check for Authorization header with Bearer token
    const authHeader = req.headers.authorization;
    console.log('🔍 Checking Authorization header:', authHeader);
    if (authHeader?.startsWith('Bearer ')) {
      const token = authHeader.substring(7);

      try {
        // Add timeout for token verification to prevent hanging
        const verificationPromise = verifyToken(token, {
          secretKey: process.env.CLERK_SECRET_KEY!,
          jwtKey: process.env.CLERK_JWT_KEY,
          // Add clock tolerance for JWT timing issues - increased for development
          clockSkewInMs: 300000, // 5 minutes tolerance for development
        });

        // Set a timeout of 5 seconds for token verification
        const timeoutPromise = new Promise((_, reject) =>
          setTimeout(
            () => reject(new Error('Token verification timeout')),
            5000,
          ),
        );

        const payload = (await Promise.race([
          verificationPromise,
          timeoutPromise,
        ])) as any;
        console.log('Token payload:', payload);

        if (payload.sub) {
          return payload.sub;
        }
      } catch (tokenError: any) {
        console.warn('Token verification failed:', tokenError);

        // In development, always use fallback for any token verification failure
        if (process.env.NODE_ENV === 'development') {
          console.log('🔧 Development mode: Using fallback for token verification failure');
          
          // For any JWT timing issues in development, use fallback
          if (tokenError.reason === 'token-not-active-yet' || 
              tokenError.message?.includes('not before') ||
              tokenError.message?.includes('JWT cannot be used prior')) {
            console.log('🔧 JWT timing issue detected, using development fallback');
            return 'dev_user_123';
          }
          
          // For any other token issues in development, also use fallback
          if (token.startsWith('dev_') || 
              token.includes('test') || 
              token.includes('dev') ||
              tokenError.reason) {
            console.log('🔧 Development token issue, using fallback user');
            return 'dev_user_123';
          }
        }
      }
    }

    // Option 2: Check for custom headers (for development)
    const clerkUserId = req.headers['x-clerk-user-id'] as string;
    if (clerkUserId) {
      // In development, allow custom user ID header
      if (process.env.NODE_ENV === 'development') {
        return clerkUserId;
      }
    }

    // Option 3: Check for session-based auth (if using Clerk middleware)
    if ((req as any).auth?.userId) {
      return (req as any).auth.userId;
    }

    // Option 4: Check for Next.js specific headers
    const nextAuthSession = req.headers['x-clerk-session-id'] as string;
    if (nextAuthSession && process.env.NODE_ENV === 'development') {
      return 'dev_user_123';
    }

    return null;
  } catch (error) {
    console.error('Error extracting Clerk user ID:', error);
    return null;
  }
}

/**
 * Verify Clerk session token
 */
export async function verifyClerkToken(token: string): Promise<string | null> {
  try {
    const payload = await verifyToken(token, {
      secretKey: process.env.CLERK_SECRET_KEY!,
    });
    return payload.sub || null;
  } catch (error) {
    console.error('Error verifying Clerk token:', error);
    return null;
  }
}

/**
 * Get user information from Clerk
 */
export async function getClerkUser(userId: string) {
  try {
    const user = await clerkClient.users.getUser(userId);
    return user;
  } catch (error) {
    console.error('Error fetching Clerk user:', error);
    return null;
  }
}

/**
 * Middleware to authenticate requests using Clerk
 */
export async function clerkAuthMiddleware(req: Request, res: any, next: any) {
  console.log(`🔍 Auth middleware called for ${req.method} ${req.path}`);

  try {
    // Check for bypass header for testing
    const bypassAuth = req.headers['x-dev-bypass-auth'];
    if (bypassAuth === 'true' && isDevelopment) {
      console.log('🔧 Development mode: Bypassing authentication for testing');
      (req as any).userId = 'dev_user_123';
      return next();
    }

    console.log('🔍 Attempting to get Clerk user ID...');
    // Try to get user ID from Clerk
    const userId = await getClerkUserId(req);
    console.log(`🔍 Clerk user ID result: ${userId}`);

    if (!userId) {
      if (isDevelopment) {
        console.log('🔧 Development mode: Auth failed, using fallback user');
        (req as any).userId = 'dev_user_123';
        return next();
      }

      return res.status(401).json({
        error: 'Unauthorized',
        message: 'Please provide valid authentication credentials',
      });
    }

    // Attach user ID to request for use in controllers
    (req as any).userId = userId;
    console.log('✅ Authentication successful, calling next()');
    next();
  } catch (error) {
    console.error('Authentication error:', error);

    if (isDevelopment) {
      console.log(
        '🔧 Development mode: Using fallback authentication due to error',
      );
      (req as any).userId = 'dev_user_123';
      return next();
    }

    return res.status(401).json({
      error: 'Authentication failed',
      message: 'Invalid authentication credentials',
    });
  }
}

// Alias for backward compatibility
export const requireAuth = clerkAuthMiddleware;
