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
    if (authHeader?.startsWith('Bearer ')) {
      const token = authHeader.substring(7);
      
      try {
        // For Next.js Clerk integration, verify the session token
        const payload = await verifyToken(token, {
          secretKey: process.env.CLERK_SECRET_KEY!,
          jwtKey: process.env.CLERK_JWT_KEY,
        });
        
        if (payload.sub) {
          return payload.sub;
        }
      } catch (tokenError) {
        console.warn('Token verification failed:', tokenError);
        
        // In development, allow mock tokens for testing
        if (process.env.NODE_ENV === 'development') {
          if (token.startsWith('dev_')) {
            return 'dev_user_123';
          }
          // Handle Next.js development tokens
          if (token.includes('test') || token.includes('dev')) {
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
  try {
    // Check for bypass header for testing
    const bypassAuth = req.headers['x-dev-bypass-auth'];
    if (bypassAuth === 'true' && isDevelopment) {
      console.log('🔧 Development mode: Bypassing authentication for testing');
      (req as any).userId = 'dev_user_123';
      return next();
    }

    // Try to get user ID from Clerk
    const userId = await getClerkUserId(req);
    
    if (!userId) {
      if (isDevelopment) {
        console.log('🔧 Development mode: Auth failed, using fallback user');
        (req as any).userId = 'dev_user_123';
        return next();
      }
      
      return res.status(401).json({ 
        error: 'Unauthorized', 
        message: 'Please provide valid authentication credentials' 
      });
    }

    // Attach user ID to request for use in controllers
    (req as any).userId = userId;
    next();
  } catch (error) {
    console.error('Authentication error:', error);
    
    if (isDevelopment) {
      console.log('🔧 Development mode: Using fallback authentication due to error');
      (req as any).userId = 'dev_user_123';
      return next();
    }
    
    return res.status(401).json({ 
      error: 'Authentication failed', 
      message: 'Invalid authentication credentials' 
    });
  }
}

// Alias for backward compatibility
export const requireAuth = clerkAuthMiddleware;
