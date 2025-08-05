import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

export interface AuthenticatedRequest extends Request {
  userId?: string;
}

/**
 * Authentication middleware that requires a valid JWT token
 */
export async function requireAuth(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ message: 'Authentication required' });
    }

    const token = authHeader.substring(7);
    
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET!) as any;
      req.userId = decoded.userId;
      next();
    } catch (jwtError) {
      return res.status(401).json({ message: 'Invalid token' });
    }
  } catch (error) {
    console.error('Authentication error:', error);
    return res.status(500).json({ message: 'Authentication failed' });
  }
}/**
 * Optional authentication middleware that doesn't require authentication
 * but sets userId if token is present
 */
export async function optionalAuth(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    const authHeader = req.headers.authorization;
    
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.substring(7);
      
      try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET!) as any;
        req.userId = decoded.userId;
      } catch (jwtError) {
        // For optional auth, just continue without setting userId
        console.log('Optional auth: Invalid token, continuing without authentication');
      }
    }
    
    next();
  } catch (error) {
    console.error('Optional authentication error:', error);
    next(); // Continue without authentication for optional auth
  }
}

/**
 * Generate JWT token
 */
export function generateJWT(userId: string, email?: string, sessionId?: string): string {
  const payload: any = {
    userId,
    ...(email && { email }),
    ...(sessionId && { sessionId })
  };
  
  const secret = process.env.JWT_SECRET || 'fallback-secret-for-development';
  const options: any = { 
    expiresIn: process.env.JWT_EXPIRES_IN || '7d' 
  };
  
  return jwt.sign(payload, secret, options);
}

/**
 * Verify JWT token
 */
export function verifyJWT(token: string): any {
  const secret = process.env.JWT_SECRET || 'fallback-secret-for-development';
  return jwt.verify(token, secret);
}
