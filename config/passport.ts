import passport from 'passport';
import { Strategy as JwtStrategy, ExtractJwt } from 'passport-jwt';
import { Strategy as GoogleStrategy } from 'passport-google-oauth20';
import { Strategy as AppleStrategy } from 'passport-apple';
import { userService } from '../services/userService';

// JWT Strategy
passport.use(
  new JwtStrategy(
    {
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      secretOrKey: process.env.JWT_SECRET!,
      passReqToCallback: false,
    },
    async (payload, done) => {
      try {
        console.log('🔍 JWT Strategy: Validating token payload:', payload);
        
        // JWT validation for authenticated users
        const user = await userService.getUserById(payload.userId);
        if (user) {
          console.log('✅ JWT Strategy: User found:', user.email);
          return done(null, user);
        }
        
        console.log('❌ JWT Strategy: User not found for payload:', payload);
        return done(null, false);
      } catch (error) {
        console.error('JWT Strategy error:', error);
        return done(error, false);
      }
    }
  )
);

// Google OAuth Strategy
if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) {
  passport.use(
    new GoogleStrategy(
      {
        clientID: process.env.GOOGLE_CLIENT_ID,
        clientSecret: process.env.GOOGLE_CLIENT_SECRET,
        callbackURL: '/api/auth/google/callback',
      },
      async (accessToken, refreshToken, profile, done) => {
        try {
          const user = await userService.findOrCreateOAuthUser({
            provider: 'google',
            providerAccountId: profile.id,
            email: profile.emails?.[0]?.value || '',
            firstName: profile.name?.givenName || '',
            lastName: profile.name?.familyName || '',
            profileImageUrl: profile.photos?.[0]?.value || null,
            accessToken,
            refreshToken,
          });
          return done(null, user || false);
        } catch (error) {
          return done(error as Error, undefined);
        }
      }
    )
  );
}

// Apple OAuth Strategy
if (process.env.APPLE_CLIENT_ID && process.env.APPLE_TEAM_ID && process.env.APPLE_KEY_ID) {
  passport.use(
    new AppleStrategy(
      {
        clientID: process.env.APPLE_CLIENT_ID,
        teamID: process.env.APPLE_TEAM_ID,
        keyID: process.env.APPLE_KEY_ID,
        privateKeyLocation: process.env.APPLE_PRIVATE_KEY_PATH || '',
        callbackURL: '/api/auth/apple/callback',
        passReqToCallback: false,
      },
      async (accessToken: any, refreshToken: any, idToken: any, profile: any, done: any) => {
        try {
          const user = await userService.findOrCreateOAuthUser({
            provider: 'apple',
            providerAccountId: profile.id,
            email: profile.email || '',
            firstName: profile.name?.firstName || '',
            lastName: profile.name?.lastName || '',
            profileImageUrl: null, // Apple doesn't provide profile images
            accessToken,
            refreshToken,
            idToken,
          });
          return done(null, user);
        } catch (error) {
          return done(error as Error, undefined);
        }
      }
    )
  );
}

// Serialize user for session
passport.serializeUser((user: any, done) => {
  done(null, user.id);
});

// Deserialize user from session
passport.deserializeUser(async (id: string, done) => {
  try {
    const user = await userService.getUserById(id);
    done(null, user);
  } catch (error) {
    done(error, null);
  }
});

export default passport;
