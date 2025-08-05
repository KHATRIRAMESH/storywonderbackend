# Authentication Architecture Refactor

## Overview

This document outlines the refactored authentication system that follows a clean, scalable pattern using Passport.js middleware for all authentication concerns.

## Architecture Pattern

### Before (Problematic)
- Authentication logic scattered between controllers and middleware
- Passport configuration mixed with business logic in controllers
- Inconsistent authentication patterns across routes
- Hard to maintain and extend

### After (Clean & Scalable)
- **Separation of Concerns**: Passport middleware handles authentication, controllers handle business logic
- **Consistent Interface**: All controllers use `AuthenticatedRequest` type
- **Centralized Configuration**: All Passport strategies in one place
- **Middleware-First**: Authentication happens at the middleware layer

## File Structure

```
storybook-server/
├── config/
│   └── passport.ts                    # Passport strategies configuration
├── middlewares/
│   ├── passportAuthMiddleware.ts      # Passport middleware functions
│   └── authMiddleware.ts             # Legacy (deprecated)
├── controllers/
│   ├── auth.controller.ts            # Clean business logic only
│   ├── user.controller.ts            # Uses AuthenticatedRequest
│   └── story.controller.ts           # Uses AuthenticatedRequest
└── routes/
    ├── auth.route.ts                 # Routes with proper middleware
    └── story.route.ts                # Routes with proper middleware
```

## Key Components

### 1. Passport Configuration (`config/passport.ts`)
- **JWT Strategy**: For token-based authentication
- **Google OAuth Strategy**: For Google sign-in
- **Apple OAuth Strategy**: For Apple sign-in
- All strategies are configured once and reused

### 2. Passport Middleware (`middlewares/passportAuthMiddleware.ts`)
```typescript
// Available middleware functions:
- authenticateJWT         # Required JWT authentication
- optionalJWT            # Optional JWT authentication
- authenticateGoogle     # Google OAuth initiation
- authenticateGoogleCallback # Google OAuth callback
- authenticateApple      # Apple OAuth initiation
- authenticateAppleCallback  # Apple OAuth callback
- developmentAuth        # Development mode fallback
```

### 3. AuthenticatedRequest Interface
```typescript
interface AuthenticatedRequest extends Request {
  user?: any;  // Populated by Passport middleware
}
```

### 4. Clean Controllers
Controllers now focus purely on business logic:
```typescript
async login(req: Request, res: Response) {
  // Pure business logic - no Passport calls
  const result = await authService.authenticateUser(email, password);
  res.json({ token: result.token, user: result.user });
}

async handleOAuthSuccess(req: AuthenticatedRequest, res: Response) {
  // User already authenticated by middleware
  const user = req.user;
  const result = await authService.createSessionForUser(user.id);
  res.redirect(`${FRONTEND_URL}/auth/callback`);
}
```

## Route Configuration Examples

### Authentication Routes
```typescript
// Public routes
router.post('/register', authController.register);
router.post('/login', authController.login);

// OAuth routes with middleware chain
router.get('/google', authenticateGoogle);
router.get('/google/callback', 
  authenticateGoogleCallback, 
  authController.handleOAuthSuccess
);

// Protected routes
router.post('/logout', authenticateJWT, authController.logout);
router.get('/verify', optionalJWT, authController.verifyAuth);
```

### Protected Resource Routes
```typescript
// All story routes require authentication
router.use(authenticateJWT);

router.get('/', storyController.getStories);
router.post('/', storyController.createStory);
router.get('/:id', storyController.getStoryById);
```

## Benefits of New Architecture

### 1. **Separation of Concerns**
- **Middleware**: Handles authentication (token validation, OAuth flows)
- **Controllers**: Handle business logic (user registration, data processing)
- **Routes**: Define endpoint structure and middleware chain

### 2. **Consistency**
- All authentication uses Passport middleware
- Consistent `AuthenticatedRequest` interface
- Uniform error handling across authentication methods

### 3. **Scalability**
- Easy to add new OAuth providers
- Simple to modify authentication logic
- Clear testing boundaries

### 4. **Maintainability**
- Single source of truth for authentication configuration
- No duplicated authentication logic
- Clear middleware composition in routes

### 5. **Security**
- Centralized authentication logic reduces security bugs
- Consistent token validation
- Proper error handling for all auth methods

## Migration Notes

### Controllers Updated
- `AuthController`: Removed inline Passport calls, added `handleOAuthSuccess`
- `UserController`: Uses `AuthenticatedRequest` type
- `StoryController`: Uses `AuthenticatedRequest` type, fixed user ID access

### Middleware Changes
- **New**: `passportAuthMiddleware.ts` - Passport-based middleware
- **Deprecated**: `authMiddleware.ts` - Custom JWT middleware (legacy)

### Route Changes
- All routes use new Passport middleware
- OAuth flows simplified with middleware chain
- Consistent authentication patterns

## Environment Variables Required

```env
# JWT
JWT_SECRET=your_jwt_secret

# Frontend URL for OAuth redirects
FRONTEND_URL=http://localhost:3002

# Google OAuth
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret

# Apple OAuth (optional)
APPLE_CLIENT_ID=your_apple_client_id
APPLE_TEAM_ID=your_apple_team_id
APPLE_KEY_ID=your_apple_key_id
APPLE_PRIVATE_KEY_PATH=path_to_private_key

# Session
SESSION_SECRET=your_session_secret
```

## Testing the New Architecture

### 1. JWT Authentication
```bash
# Login to get token
curl -X POST http://localhost:8000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"password"}'

# Use token for protected routes
curl -X GET http://localhost:8000/api/auth/profile \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

### 2. OAuth Flows
```bash
# Initiate Google OAuth
curl http://localhost:8000/api/auth/google

# Callback handled automatically by middleware
```

### 3. Protected Resources
```bash
# Access stories (requires authentication)
curl -X GET http://localhost:8000/api/stories \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

## Future Enhancements

1. **Role-Based Access Control**: Add role-based middleware
2. **Rate Limiting**: Add authentication rate limiting
3. **Refresh Tokens**: Implement refresh token rotation
4. **Multi-Factor Authentication**: Add MFA support
5. **Session Management**: Enhanced session handling

This architecture provides a solid foundation for authentication that can easily be extended and maintained as the application grows.
