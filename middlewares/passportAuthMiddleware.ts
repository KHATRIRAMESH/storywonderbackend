import { Request, Response, NextFunction } from 'express';
import passport from '../config/passport';

export interface AuthenticatedRequest extends Request {
  user?: any;
}

/**
 * JWT Authentication middleware using Passport
 */
export const authenticateJWT = (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  passport.authenticate('jwt', { session: false }, (err: any, user: any, info: any) => {
    if (err) {
      console.error('JWT authentication error:', err);
      return res.status(500).json({
        error: 'Internal Server Error',
        message: 'Authentication error',
      });
    }

    if (!user) {
      console.log('❌ Authentication failed:', info?.message || 'User not found');
      return res.status(401).json({
        error: 'Unauthorized',
        message: 'Invalid or missing authentication token',
      });
    }

    console.log('✅ User authenticated:', user.email);
    req.user = user;
    next();
  })(req, res, next);
};

/**
 * Optional JWT Authentication middleware - doesn't fail if no token
 */
export const optionalJWT = (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  passport.authenticate('jwt', { session: false }, (err: any, user: any, info: any) => {
    if (err) {
      console.error('Optional JWT authentication error:', err);
    }

    // Set user if available, but don't fail if not
    req.user = user || null;
    next();
  })(req, res, next);
};

/**
 * Google OAuth authentication middleware
 */
export const authenticateGoogle = passport.authenticate('google', {
  scope: ['profile', 'email'],
  session: false,
});

/**
 * Google OAuth callback middleware
 */
export const authenticateGoogleCallback = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  passport.authenticate('google', { session: false }, (err: any, user: any, info: any) => {
    if (err) {
      console.error('Google OAuth error:', err);
      return res.redirect(`${process.env.FRONTEND_URL}/sign-in?error=oauth_failed`);
    }

    if (!user) {
      return res.redirect(`${process.env.FRONTEND_URL}/sign-in?error=oauth_failed`);
    }

    // Attach user to request for controller to handle
    req.user = user;
    next();
  })(req, res, next);
};

/**
 * Apple OAuth authentication middleware
 */
export const authenticateApple = passport.authenticate('apple', {
  session: false,
});

/**
 * Apple OAuth callback middleware
 */
export const authenticateAppleCallback = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  passport.authenticate('apple', { session: false }, (err: any, user: any, info: any) => {
    if (err) {
      console.error('Apple OAuth error:', err);
      return res.redirect(`${process.env.FRONTEND_URL}/sign-in?error=oauth_failed`);
    }

    if (!user) {
      return res.redirect(`${process.env.FRONTEND_URL}/sign-in?error=oauth_failed`);
    }

    // Attach user to request for controller to handle
    req.user = user;
    next();
  })(req, res, next);
};
