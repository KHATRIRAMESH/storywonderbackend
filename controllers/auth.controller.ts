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
      const result = await authService.registerUser(email, password, firstName, lastName);
      
      if (!result) {
        return res.status(500).json({
          error: 'Internal Server Error',
          message: 'Failed to create user',
        });
      }

      res.status(201).json({
        message: 'User registered successfully',
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
      console.error('Registration error:', error);
      res.status(500).json({
        error: 'Internal Server Error',
        message: 'Registration failed',
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
    try {
      const user = req.user;
      
      if (!user) {
        return res.status(401).json({ 
          authenticated: false, 
          message: 'User not authenticated' 
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
        message: 'Authentication verification failed' 
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
        return res.redirect(`${process.env.FRONTEND_URL}/sign-in?error=oauth_failed`);
      }

      // Create session for OAuth user
      const result = await authService.createSessionForUser(user.id);
      
      if (!result) {
        return res.redirect(`${process.env.FRONTEND_URL}/sign-in?error=session_failed`);
      }

      // Set secure cookie and redirect
      res.cookie('auth_token', result.token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
      });

      res.redirect(`${process.env.FRONTEND_URL}/auth/callback`);
    } catch (error) {
      console.error('OAuth success handler error:', error);
      res.redirect(`${process.env.FRONTEND_URL}/sign-in?error=oauth_failed`);
    }
  }
}

export const authController = new AuthController();
