# 📚 Storybook Server - Comprehensive Summary & Workflow Index

## 🏗️ Architecture Overview

**Tech Stack:**
- **Backend Framework**: Express.js with TypeScript
- **Authentication**: Passport.js (JWT + OAuth2)
- **Database**: PostgreSQL with Drizzle ORM
- **AI Integration**: OpenAI GPT for story generation
- **File Handling**: Multer for uploads
- **Development**: Hot reload with nodemon + ts-node

**Design Pattern**: NestJS-inspired modular architecture with clear separation of concerns

---

## 📁 Project Structure

```
storybook-server/
├── 🚀 Core Application
│   ├── server.ts                 # Application entry point
│   ├── app.ts                    # Express app configuration
│   └── config/
│       ├── config.ts            # Environment configuration
│       ├── database.ts          # PostgreSQL connection
│       └── passport.ts          # Passport.js strategies
│
├── 🛣️ API Layer
│   ├── routes/
│   │   ├── auth.route.ts        # Authentication endpoints
│   │   └── story.route.ts       # Story management endpoints
│   └── controllers/
│       ├── auth.controller.ts   # Authentication logic
│       ├── user.controller.ts   # User management logic
│       └── story.controller.ts  # Story operations logic
│
├── 🧠 Business Logic
│   └── services/
│       ├── authService.ts       # Authentication business logic
│       ├── userService.ts       # User operations
│       └── openAI.ts           # AI story generation
│
├── 💾 Data Layer
│   ├── db/
│   │   ├── schema.ts           # Database schema definitions
│   │   └── config.ts           # Database configuration
│   └── drizzle/                # Migrations & generated files
│
├── 🛡️ Middleware & Utilities
│   ├── middlewares/
│   │   └── errorHandler.ts    # Global error handling
│   ├── types/                  # TypeScript type definitions
│   └── utils/                  # Utility functions
│
└── 📖 Documentation
    ├── docs/                   # API documentation
    ├── PASSPORT_IMPLEMENTATION_PLAN.md
    └── SERVER_SUMMARY.md       # This file
```

---

## 🔄 **Workflow Index**

### **W1. Server Initialization Workflow**
```bash
# Development Setup
1. npm install                   # Install dependencies
2. cp .env.example .env         # Configure environment
3. npm run db:generate          # Generate migrations
4. npm run db:migrate           # Run migrations
5. npm run dev                  # Start development server

# Production Setup
1. npm run build:clean          # Clean build
2. npm run db:migrate           # Apply migrations
3. npm start                    # Start production server
```

### **W2. Database Management Workflow**
```bash
# Migration Commands
npm run db:generate             # Generate new migration
npm run db:migrate             # Apply pending migrations
npm run db:push                # Push schema changes
npm run db:studio              # Open Drizzle Studio
npm run db:reset               # Reset database (dev only)

# Manual Migration Script
npm run migrate up             # Apply migrations
npm run migrate down           # Rollback migrations
npm run migrate reset          # Reset to clean state
```

### **W3. Authentication Workflow**
```
1. User Registration/Login
   ├── POST /api/auth/register     # Email/password signup
   ├── POST /api/auth/login        # Email/password signin
   ├── GET /api/auth/google        # Google OAuth start
   ├── GET /api/auth/apple         # Apple OAuth start
   └── GET /api/auth/verify        # JWT verification

2. OAuth Flow
   ├── Redirect to OAuth provider
   ├── Handle callback with authorization code
   ├── Exchange code for user profile
   ├── Link/create user account
   └── Issue JWT token

3. Session Management
   ├── JWT token validation
   ├── Automatic session renewal
   └── Secure logout with token invalidation
```

### **W4. Story Generation Workflow**
```
1. Story Creation Request
   ├── POST /api/stories/generate
   ├── Validate user subscription limits
   ├── Queue story for generation
   └── Return story ID for tracking

2. AI Generation Process
   ├── Call OpenAI API with prompts
   ├── Generate story content & pages
   ├── Create images for each page
   ├── Store generated content
   └── Update story status

3. Story Management
   ├── GET /api/stories           # List user stories
   ├── GET /api/stories/:id       # Get specific story
   ├── PUT /api/stories/:id       # Update story
   └── DELETE /api/stories/:id    # Delete story
```

### **W5. User Profile Workflow**
```
1. Profile Operations
   ├── GET /api/auth/profile      # Get user profile
   ├── PUT /api/auth/profile      # Update profile
   ├── GET /api/auth/subscription # Get subscription info
   └── GET /api/auth/stats        # Get user statistics

2. Profile Image Upload
   ├── POST /api/auth/profile/avatar
   ├── Validate file type/size
   ├── Store in public/uploads
   └── Update user record
```

---

## 🔌 **API Endpoints Reference**

### **Authentication Endpoints**
| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| `POST` | `/api/auth/register` | User registration | ❌ |
| `POST` | `/api/auth/login` | User login | ❌ |
| `POST` | `/api/auth/logout` | User logout | ✅ |
| `GET` | `/api/auth/profile` | Get user profile | ✅ |
| `PUT` | `/api/auth/profile` | Update profile | ✅ |
| `GET` | `/api/auth/subscription` | Get subscription | ✅ |
| `GET` | `/api/auth/stats` | Get user stats | ✅ |
| `GET` | `/api/auth/google` | Google OAuth | ❌ |
| `GET` | `/api/auth/google/callback` | Google callback | ❌ |
| `GET` | `/api/auth/apple` | Apple OAuth | ❌ |
| `GET` | `/api/auth/apple/callback` | Apple callback | ❌ |
| `GET` | `/api/auth/verify` | Verify JWT token | ❌ |

### **Story Management Endpoints**
| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| `GET` | `/api/stories` | List user stories | ✅ |
| `POST` | `/api/stories/generate` | Generate new story | ✅ |
| `GET` | `/api/stories/:id` | Get story details | ✅ |
| `PUT` | `/api/stories/:id` | Update story | ✅ |
| `DELETE` | `/api/stories/:id` | Delete story | ✅ |
| `GET` | `/api/stories/:id/pages` | Get story pages | ✅ |

### **Utility Endpoints**
| Method | Endpoint | Description | Auth Required |
|--------|----------|-------------|---------------|
| `GET` | `/` | Welcome message | ❌ |
| `GET` | `/health` | Health check | ❌ |

---

## 🗄️ **Database Schema**

### **Core Tables**
```sql
-- Users table (Updated for OAuth)
users:
  - id (UUID, primary key)
  - email (unique, not null)
  - firstName, lastName
  - profileImageUrl
  - password (hashed, for email auth)
  - emailVerified (boolean)
  - subscriptionLevel (enum: free, premium, pro)
  - storiesGenerated (integer)
  - createdAt, updatedAt

-- OAuth accounts (Links users to providers)
oauthAccounts:
  - id (UUID, primary key)
  - userId (foreign key to users)
  - provider (enum: google, apple, email)
  - providerAccountId
  - accessToken, refreshToken
  - expiresAt
  - createdAt, updatedAt

-- User sessions (JWT management)
userSessions:
  - id (UUID, primary key)
  - userId (foreign key to users)
  - token (unique)
  - expiresAt
  - createdAt

-- Stories table
stories:
  - id (UUID, primary key)
  - userId (foreign key to users)
  - title, description
  - prompt (user input)
  - status (enum: generating, completed, failed)
  - totalPages (integer)
  - completedPages (integer)
  - errorMessage
  - createdAt, updatedAt

-- Story pages
storyPages:
  - id (UUID, primary key)
  - storyId (foreign key to stories)
  - pageNumber (integer)
  - content (text)
  - imageUrl
  - status (enum: pending, generating, completed, failed)
  - createdAt, updatedAt
```

### **Enums**
- `subscription_level`: free, premium, pro
- `story_status`: generating, completed, failed
- `page_status`: pending, generating, completed, failed
- `auth_provider`: google, apple, email

---

## 🔐 **Security Implementation**

### **Authentication Security**
- **JWT Tokens**: Secure token-based authentication
- **Password Hashing**: bcryptjs with salt rounds
- **OAuth Integration**: Google & Apple Sign-In
- **Session Management**: Automatic token expiration
- **CORS Configuration**: Restricted to allowed origins

### **Data Protection**
- **SQL Injection Prevention**: Drizzle ORM parameterized queries
- **Input Validation**: Express validator middleware
- **Error Handling**: Sanitized error responses
- **File Upload Security**: Type and size validation

---

## 🧪 **Development Workflows**

### **W6. Local Development Workflow**
```bash
# Setup
1. git clone <repository>
2. cd storybook-server
3. npm install
4. cp .env.example .env
5. Configure environment variables

# Database Setup
6. npm run db:generate
7. npm run db:migrate
8. npm run db:studio  # Optional: view data

# Development
9. npm run dev        # Start with hot reload
10. npm run lint      # Check code quality
```

### **W7. Testing Workflow**
```bash
# Test API endpoints
npm run test          # Run test suite
curl -X GET http://localhost:3000/health  # Health check
./test-api.sh         # Custom API tests

# Database testing
npm run db:reset      # Reset to clean state
npm run migrate reset # Alternative reset method
```

### **W8. Production Deployment Workflow**
```bash
# Build preparation
1. npm run build:clean    # Clean and build
2. npm run lint          # Verify code quality
3. Set production environment variables

# Database migration
4. npm run db:migrate    # Apply migrations

# Start production server
5. npm start            # Start production server
6. Monitor logs and health endpoint
```

---

## 🛠️ **Configuration Management**

### **Environment Variables**
```env
# Server Configuration
PORT=3000
NODE_ENV=development
AUTO_MIGRATE=true

# Database
DATABASE_URL=postgresql://user:password@localhost/storybook
DB_HOST=localhost
DB_PORT=5432
DB_NAME=storybook
DB_USER=username
DB_PASSWORD=password

# Authentication
JWT_SECRET=your-super-secret-jwt-key
JWT_EXPIRES_IN=7d
SESSION_SECRET=your-session-secret

# OAuth Configuration
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret
APPLE_CLIENT_ID=your-apple-client-id
APPLE_TEAM_ID=your-apple-team-id
APPLE_KEY_ID=your-apple-key-id
APPLE_PRIVATE_KEY_PATH=./keys/apple-private-key.p8

# OpenAI
OPENAI_API_KEY=your-openai-api-key

# CORS
ALLOWED_ORIGINS=http://localhost:3000,https://storywonder.vercel.app
```

---

## 📊 **Monitoring & Health Checks**

### **Health Monitoring**
- **Health Endpoint**: `GET /health` - Server status check
- **Database Connection**: Automatic connection testing on startup
- **Error Logging**: Comprehensive error handling and logging
- **Performance Metrics**: Request timing and database query performance

### **Development Tools**
- **Database Studio**: `npm run db:studio` - Visual database management
- **Hot Reload**: Automatic server restart on file changes
- **TypeScript Compilation**: Real-time type checking
- **Linting**: Code quality enforcement with ESLint

---

## 🚀 **Quick Start Commands**

### **Essential Development Commands**
```bash
# Initial setup
npm install && cp .env.example .env

# Database setup
npm run db:generate && npm run db:migrate

# Start development
npm run dev

# Database management
npm run db:studio    # Open visual database editor
npm run db:reset     # Reset database (development only)

# Production build
npm run build:clean && npm start
```

### **Troubleshooting Commands**
```bash
# Clear build cache
npm run clean

# Reset dependencies
rm -rf node_modules package-lock.json && npm install

# Check database connection
npm run migrate status

# View detailed logs
npm run dev --verbose
```

---

## 📈 **Performance & Scalability**

### **Current Optimizations**
- **Connection Pooling**: PostgreSQL connection pool management
- **Async Operations**: Non-blocking I/O for all database operations
- **Error Boundaries**: Graceful error handling prevents crashes
- **Static File Serving**: Efficient serving of uploaded images

### **Scalability Considerations**
- **Modular Architecture**: Easy to extract services into microservices
- **Database Indexing**: Optimized queries with proper indexes
- **Caching Strategy**: Ready for Redis integration for session storage
- **Load Balancing**: Stateless design enables horizontal scaling

---

## 🔄 **Migration & Deployment Notes**

### **Database Migrations**
- **Drizzle ORM**: Type-safe migrations with automatic generation
- **Version Control**: Migration files tracked in Git
- **Rollback Support**: Safe rollback capabilities for production
- **Schema Validation**: Automatic schema drift detection

### **Deployment Checklist**
1. ✅ Environment variables configured
2. ✅ Database migrations applied
3. ✅ OAuth credentials configured
4. ✅ CORS origins updated for production
5. ✅ SSL/HTTPS enabled
6. ✅ Health check endpoint responsive
7. ✅ Error monitoring configured
8. ✅ Backup strategy implemented

---

## 📚 **Additional Documentation**

- **API Documentation**: `/docs/API.md`
- **Migration Guide**: `PASSPORT_IMPLEMENTATION_PLAN.md`
- **Authentication Details**: `AUTHENTICATION_MIGRATION_COMPLETE.md`
- **Database Schema**: `db/schema.ts` (commented)

---

**Last Updated**: August 4, 2025  
**Version**: 1.0.0  
**Status**: Production Ready ✅
