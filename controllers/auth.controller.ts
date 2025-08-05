import { Request, Response } from 'express';
import { authService } from '../services/authService';
import { userService } from '../services/userService';
import { AuthenticatedRequest } from '../middlewares/passportAuthMiddleware';

export class AuthController {
  /**
   * Register new user with email and password
   */
  async register(req: Request, res: Response) {
    try {
      const { email, password, firstName, lastName } = req.body;

      // Validate required fields
      if (!email || !password) {
        return res.status(400).json({
          error: 'Bad Request',
          message: 'Email and password are required',
        });
      }

      // Check if user already exists
      const existingUser = await userService.getUserByEmail(email);
      if (existingUser) {
        return res.status(409).json({
          error: 'Conflict',
          message: 'User with this email already exists',
        });
      }

      // Create user and session
      const result = await authService.registerUser(
        email,
        password,
        firstName,
        lastName,
      );

      if (!result) {
        return res.status(500).json({
          error: 'Internal Server Error',
          message: 'Failed to create user',
        });
      }

      res.status(201).json({
        message: 'User registered successfully. Please check your email for verification code.',
        token: result.token,
        user: {
          id: result.user.id,
          email: result.user.email,
          firstName: result.user.firstName,
          lastName: result.user.lastName,
          subscriptionLevel: result.user.subscriptionLevel,
          emailVerified: false,
        },
        requiresEmailVerification: true,
      });
    } catch (error) {
      console.error('Registration error:', error);
      res.status(500).json({
        error: 'Internal Server Error',
        message: 'Registration failed',
      });
    }
  }

  async emailVerification(req: Request, res: Response) {
    try {
      const { email, verificationCode } = req.body;

      // Validate required fields
      if (!email || !verificationCode) {
        return res.status(400).json({
          error: 'Bad Request',
          message: 'Email and verification code are required',
        });
      }

      // Verify email
      const result = await authService.verifyEmail(email, verificationCode);

      if (!result) {
        return res.status(500).json({
          error: 'Internal Server Error',
          message: 'Email verification failed',
        });
      }

      if (!result.success) {
        return res.status(400).json({
          error: 'Bad Request',
          message: result.message,
        });
      }

      res.json({
        success: true,
        message: result.message,
      });
    } catch (error) {
      console.error('Email verification error:', error);
      res.status(500).json({
        error: 'Internal Server Error',
        message: 'Email verification failed',
      });
    }
  }

  /**
   * Resend verification email
   */
  async resendVerificationEmail(req: Request, res: Response) {
    try {
      const { email } = req.body;

      if (!email) {
        return res.status(400).json({
          error: 'Bad Request',
          message: 'Email is required',
        });
      }

      const result = await authService.resendVerificationEmail(email);

      if (!result) {
        return res.status(400).json({
          error: 'Bad Request',
          message: 'Failed to resend verification email',
        });
      }

      res.json({
        success: true,
        message: 'Verification email sent successfully',
      });
    } catch (error) {
      console.error('Resend verification email error:', error);
      res.status(500).json({
        error: 'Internal Server Error',
        message: 'Failed to resend verification email',
      });
    }
  }

  /**
   * Get verification status for authenticated user
   */
  async getVerificationStatus(req: AuthenticatedRequest, res: Response) {
    try {
      const user = req.user;

      if (!user) {
        return res.status(401).json({
          error: 'Unauthorized',
          message: 'User not authenticated',
        });
      }

      const status = await authService.getVerificationStatus(user.id);

      if (!status) {
        return res.status(404).json({
          error: 'Not Found',
          message: 'User not found',
        });
      }

      res.json({
        success: true,
        emailVerified: status.emailVerified,
        hasUnverifiedCode: status.hasUnverifiedCode,
      });
    } catch (error) {
      console.error('Get verification status error:', error);
      res.status(500).json({
        error: 'Internal Server Error',
        message: 'Failed to get verification status',
      });
    }
  }

  /**
   * Login user with email and password
   */
  async login(req: Request, res: Response) {
    try {
      const { email, password } = req.body;

      // Validate required fields
      if (!email || !password) {
        return res.status(400).json({
          error: 'Bad Request',
          message: 'Email and password are required',
        });
      }

      // Authenticate user
      const result = await authService.authenticateUser(email, password);

      if (!result) {
        return res.status(401).json({
          error: 'Unauthorized',
          message: 'Invalid email or password',
        });
      }

      res.json({
        message: 'Login successful',
        token: result.token,
        user: {
          id: result.user.id,
          email: result.user.email,
          firstName: result.user.firstName,
          lastName: result.user.lastName,
          subscriptionLevel: result.user.subscriptionLevel,
        },
      });
    } catch (error) {
      console.error('Login error:', error);
      res.status(500).json({
        error: 'Internal Server Error',
        message: 'Login failed',
      });
    }
  }

  /**
   * Logout user (invalidate session)
   */
  async logout(req: AuthenticatedRequest, res: Response) {
    try {
      const sessionId = req.headers.authorization?.replace('Bearer ', '');

      if (sessionId) {
        await authService.invalidateSession(sessionId);
      }

      res.json({
        message: 'Logout successful',
      });
    } catch (error) {
      console.error('Logout error:', error);
      res.status(500).json({
        error: 'Internal Server Error',
        message: 'Logout failed',
      });
    }
  }

  /**
   * Verify authentication status
   */
  async verifyAuth(req: AuthenticatedRequest, res: Response) {
    console.log('Verifying authentication for user:', req.user);
    try {
      const user = req.user;

      if (!user) {
        return res.status(401).json({
          authenticated: false,
          message: 'User not authenticated',
        });
      }

      res.json({
        authenticated: true,
        user: {
          id: user.id,
          email: user.email,
          firstName: user.firstName,
          lastName: user.lastName,
          subscriptionLevel: user.subscriptionLevel,
        },
      });
    } catch (error) {
      console.error('Error verifying authentication:', error);
      res.status(500).json({
        authenticated: false,
        message: 'Authentication verification failed',
      });
    }
  }

  /**
   * Handle successful OAuth authentication
   * This method is called after Passport middleware has authenticated the user
   */
  async handleOAuthSuccess(req: AuthenticatedRequest, res: Response) {
    try {
      const user = req.user;

      if (!user) {
        return res.redirect(
          `${process.env.FRONTEND_URL}/sign-in?error=oauth_failed`,
        );
      }

      // Create session for OAuth user
      const result = await authService.createSessionForUser(user.id);

      if (!result) {
        return res.redirect(
          `${process.env.FRONTEND_URL}/sign-in?error=session_failed`,
        );
      }

      // Set secure cookie and redirect
      res.cookie('auth_token', result.token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
      });

      res.redirect(`${process.env.FRONTEND_URL}/auth/callback?success=true`);
    } catch (error) {
      console.error('OAuth success handler error:', error);
      res.redirect(`${process.env.FRONTEND_URL}/sign-in?error=oauth_failed`);
    }
  }

  /**
   * Get authentication token for frontend API calls
   * This allows the frontend to retrieve the token from httpOnly cookie
   */
  async getAuthToken(req: AuthenticatedRequest, res: Response) {
    try {
      const token = req.cookies.auth_token;

      if (!token) {
        return res.status(401).json({
          success: false,
          message: 'No authentication token found',
        });
      }

      // Verify the token is valid
      const jwt = require('jsonwebtoken');
      try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET!) as any;

        res.json({
          success: true,
          token: token,
          user: {
            id: decoded.userId,
            email: decoded.email,
          },
        });
      } catch (jwtError) {
        res.status(401).json({
          success: false,
          message: 'Invalid authentication token',
        });
      }
    } catch (error) {
      console.error('Error getting auth token:', error);
      res.status(500).json({
        success: false,
        message: 'Server error while retrieving token',
      });
    }
  }

  /**
   * Debug endpoint to check cookies and headers
   */
  async debugAuth(req: Request, res: Response) {
    console.log('🔍 Debug Auth - Cookies:', req.cookies);
    console.log('🔍 Debug Auth - Headers:', req.headers);
    console.log('🔍 Debug Auth - User Agent:', req.get('user-agent'));
    console.log('🔍 Debug Auth - Origin:', req.get('origin'));

    res.json({
      cookies: req.cookies || {},
      hasAuthToken: !!(req.cookies && req.cookies.auth_token),
      authTokenLength: req.cookies?.auth_token?.length || 0,
      headers: {
        origin: req.get('origin'),
        userAgent: req.get('user-agent'),
        authorization: req.get('authorization'),
        cookie: req.get('cookie'),
      },
    });
  }
}

export const authController = new AuthController();
