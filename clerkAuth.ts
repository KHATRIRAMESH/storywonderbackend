import { Request } from 'express';

/**
 * Extract the user ID from the request
 * This is a simplified version for development - replace with proper Clerk integration
 */
export function getClerkUserId(req: Request): string | null {
  try {
    // Option 1: Check for Authorization header with Bearer token
    const authHeader = req.headers.authorization;
    if (authHeader?.startsWith('Bearer ')) {
      const token = authHeader.substring(7);
      // For development, extract user ID from token or use a mock
      // In production, verify this token with Clerk
      return `user_${token.substring(0, 10)}`; // Mock user ID based on token
    }

    // Option 2: Check for custom headers
    const clerkUserId = req.headers['x-clerk-user-id'] as string;
    if (clerkUserId) {
      return clerkUserId;
    }

    // Option 3: Check for session-based auth
    if ((req as any).auth?.userId) {
      return (req as any).auth.userId;
    }

    // Option 4: Default development user for testing
    return 'dev_user_123';
  } catch (error) {
    console.error('Error extracting Clerk user ID:', error);
    return null;
  }
}

/**
 * Verify session token (mock implementation for development)
 */
export async function verifyClerkToken(token: string): Promise<string | null> {
  try {
    // Mock verification - replace with actual Clerk token verification
    if (token && token.length > 10) {
      return `user_${token.substring(0, 10)}`;
    }
    return null;
  } catch (error) {
    console.error('Error verifying token:', error);
    return null;
  }
}

/**
 * Get user information (mock implementation for development)
 */
export async function getClerkUser(userId: string) {
  try {
    // Mock user data - replace with actual Clerk user fetch
    return {
      id: userId,
      emailAddresses: [{ emailAddress: 'user@example.com' }],
      firstName: 'Test',
      lastName: 'User',
      profileImageUrl: 'https://via.placeholder.com/150',
      createdAt: new Date(),
      publicMetadata: {
        subscriptionLevel: 'free',
        role: 'user'
      }
    };
  } catch (error) {
    console.error('Error fetching user:', error);
    return null;
  }
}

/**
 * Middleware to authenticate requests
 */
export function requireAuth(req: Request, res: any, next: any) {
  const userId = getClerkUserId(req);
  
  if (!userId) {
    return res.status(401).json({ 
      error: 'Unauthorized', 
      message: 'Please provide valid authentication credentials' 
    });
  }

  // Attach user ID to request for use in controllers
  (req as any).userId = userId;
  next();
}
