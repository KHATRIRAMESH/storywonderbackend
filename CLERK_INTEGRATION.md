# Clerk Authentication Integration with Next.js Frontend

This API server is configured to work with a Next.js frontend running on `localhost:3000` using Clerk authentication.

## CORS Configuration

The server is configured to accept requests from:
- `http://localhost:3000`
- `https://localhost:3000`
- `http://127.0.0.1:3000`
- `https://127.0.0.1:3000`

## Authentication Endpoints

Base URL: `http://localhost:8000/api/auth`

### 1. Verify Authentication
```
GET /api/auth/verify
```
**Headers:**
```
Authorization: Bearer <clerk_session_token>
```
**Response:**
```json
{
  "authenticated": true,
  "userId": "user_123",
  "email": "user@example.com",
  "subscriptionLevel": "premium"
}
```

### 2. Get User Profile
```
GET /api/auth/profile
```
**Headers:**
```
Authorization: Bearer <clerk_session_token>
```
**Response:**
```json
{
  "id": "user_123",
  "email": "user@example.com",
  "firstName": "John",
  "lastName": "Doe",
  "profileImageUrl": "https://...",
  "subscriptionLevel": "premium",
  "storiesGenerated": 5,
  "createdAt": "2025-07-30T11:06:26.118Z",
  "updatedAt": "2025-07-30T11:06:26.118Z"
}
```

### 3. Update User Profile
```
PUT /api/auth/profile
```
**Headers:**
```
Authorization: Bearer <clerk_session_token>
Content-Type: application/json
```
**Body:**
```json
{
  "firstName": "UpdatedName",
  "lastName": "UpdatedLastName",
  "profileImageUrl": "https://new-image-url.com"
}
```

### 4. Get Subscription Info
```
GET /api/auth/subscription
```
**Response:**
```json
{
  "level": "premium",
  "features": {
    "storiesPerMonth": 50,
    "maxPages": 20,
    "customCharacters": true,
    "pdfDownload": true,
    "support": "priority"
  },
  "storiesGenerated": 5
}
```

### 5. Get User Statistics
```
GET /api/auth/stats
```
**Response:**
```json
{
  "storiesGenerated": 5,
  "subscriptionLevel": "premium",
  "subscriptionFeatures": {
    "storiesPerMonth": 50,
    "maxPages": 20,
    "customCharacters": true,
    "pdfDownload": true,
    "support": "priority"
  },
  "hasReachedStoryLimit": false,
  "memberSince": "2025-07-30T11:06:26.118Z"
}
```

## Next.js Integration Example

### 1. Install Clerk in your Next.js app:
```bash
npm install @clerk/nextjs
```

### 2. Create a custom hook for API calls:

```typescript
// hooks/useAuthenticatedFetch.ts
import { useAuth } from '@clerk/nextjs';
import { useCallback } from 'react';

export function useAuthenticatedFetch() {
  const { getToken } = useAuth();

  const authenticatedFetch = useCallback(async (url: string, options: RequestInit = {}) => {
    const token = await getToken();
    
    return fetch(`http://localhost:8000${url}`, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
        ...options.headers,
      },
    });
  }, [getToken]);

  return authenticatedFetch;
}
```

### 3. Use in your components:

```typescript
// components/UserProfile.tsx
import { useAuthenticatedFetch } from '@/hooks/useAuthenticatedFetch';
import { useEffect, useState } from 'react';

export function UserProfile() {
  const authenticatedFetch = useAuthenticatedFetch();
  const [profile, setProfile] = useState(null);

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const response = await authenticatedFetch('/api/auth/profile');
        const data = await response.json();
        setProfile(data);
      } catch (error) {
        console.error('Failed to fetch profile:', error);
      }
    };

    fetchProfile();
  }, [authenticatedFetch]);

  if (!profile) return <div>Loading...</div>;

  return (
    <div>
      <h1>Welcome, {profile.firstName} {profile.lastName}</h1>
      <p>Email: {profile.email}</p>
      <p>Subscription: {profile.subscriptionLevel}</p>
      <p>Stories Generated: {profile.storiesGenerated}</p>
    </div>
  );
}
```

### 4. Verify authentication:

```typescript
// components/AuthStatus.tsx
import { useAuthenticatedFetch } from '@/hooks/useAuthenticatedFetch';
import { useEffect, useState } from 'react';

export function AuthStatus() {
  const authenticatedFetch = useAuthenticatedFetch();
  const [authStatus, setAuthStatus] = useState(null);

  useEffect(() => {
    const verifyAuth = async () => {
      try {
        const response = await authenticatedFetch('/api/auth/verify');
        const data = await response.json();
        setAuthStatus(data);
      } catch (error) {
        console.error('Auth verification failed:', error);
      }
    };

    verifyAuth();
  }, [authenticatedFetch]);

  return (
    <div>
      {authStatus?.authenticated ? (
        <p>✅ Authenticated as {authStatus.email}</p>
      ) : (
        <p>❌ Not authenticated</p>
      )}
    </div>
  );
}
```

## Development Mode

In development mode, the server provides fallback authentication:
- Uses `dev_user_123` as the fallback user ID
- Accepts various development tokens
- Bypasses authentication with `x-dev-bypass-auth: true` header

## Environment Variables Required

Make sure your `.env` file contains:
```
CLERK_SECRET_KEY=your_clerk_secret_key
CLERK_JWT_KEY=your_clerk_jwt_key  # optional
DATABASE_URL=your_database_url
NODE_ENV=development
```

## Error Handling

All endpoints return appropriate HTTP status codes:
- `200`: Success
- `401`: Unauthorized (invalid or missing token)
- `404`: User not found
- `500`: Server error

Error responses follow the format:
```json
{
  "error": "Error Type",
  "message": "Descriptive error message"
}
```
