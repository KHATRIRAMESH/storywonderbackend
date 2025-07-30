# Storybook Server API Documentation

## Base URL
```
http://localhost:8000/api
```

## Authentication

All story endpoints require authentication. Include one of the following in your requests:

### Bearer Token (Recommended)
```http
Authorization: Bearer your-token-here
```

### Custom Header
```http
x-clerk-user-id: your-user-id-here
```

### Development Mode
In development, any token will work, or requests without authentication will use a default test user.

## Endpoints

### Health Check

**GET** `/health`

Check server status.

**Response:**
```json
{
  "status": "OK",
  "timestamp": "2024-01-15T10:30:00.000Z"
}
```

---

### Get User Stories

**GET** `/api/stories`

Retrieve all stories for the authenticated user.

**Headers:**
- `Authorization: Bearer <token>` (required)

**Response:**
```json
[
  {
    "id": 1,
    "title": "Emma's Magical Forest Adventure",
    "status": "completed",
    "userId": "user_123",
    "childName": "Emma",
    "childAge": 7,
    "childGender": "female",
    "interests": "unicorns and painting",
    "theme": "magical forest",
    "style": "whimsical",
    "companions": "a talking rabbit",
    "pageCount": 10,
    "coverImageUrl": "https://...",
    "createdAt": "2024-01-15T10:30:00.000Z",
    "updatedAt": "2024-01-15T10:35:00.000Z"
  }
]
```

**Status Codes:**
- `200` - Success
- `401` - Unauthorized

---

### Get Story by ID

**GET** `/api/stories/:id`

Retrieve a specific story by ID.

**Headers:**
- `Authorization: Bearer <token>` (required)

**Parameters:**
- `id` (path) - Story ID

**Response:**
```json
{
  "id": 1,
  "title": "Emma's Magical Forest Adventure",
  "status": "completed",
  "userId": "user_123",
  "childName": "Emma",
  "childAge": 7,
  "childGender": "female",
  "interests": "unicorns and painting",
  "theme": "magical forest",
  "style": "whimsical",
  "companions": "a talking rabbit",
  "pageCount": 10,
  "pages": [
    {
      "text": "Once upon a time, in a magical forest far away, there lived a little girl named Emma who loved unicorns and painting...",
      "imageUrl": "https://...",
      "imagePrompt": "Emma walking into a magical forest with paintbrush in hand"
    },
    {
      "text": "As Emma ventured deeper into the forest, she met a talking rabbit who spoke in rhymes...",
      "imageUrl": "https://...",
      "imagePrompt": "Emma talking to a friendly rabbit in the forest"
    }
  ],
  "coverImageUrl": "https://...",
  "pdfUrl": "/downloads/story_1.pdf",
  "createdAt": "2024-01-15T10:30:00.000Z",
  "updatedAt": "2024-01-15T10:35:00.000Z"
}
```

**Status Codes:**
- `200` - Success
- `401` - Unauthorized
- `403` - Forbidden (user doesn't have access to this story)
- `404` - Story not found

---

### Create New Story

**POST** `/api/stories`

Create a new personalized story.

**Headers:**
- `Authorization: Bearer <token>` (required)
- `Content-Type: application/json`

**Request Body:**
```json
{
  "childName": "Emma",
  "childAge": 7,
  "childGender": "female",
  "interests": "unicorns and painting",
  "theme": "magical forest",
  "style": "whimsical",
  "companions": "a talking rabbit",
  "pageCount": 10
}
```

**Field Descriptions:**
- `childName` (string, required) - Name of the child protagonist
- `childAge` (number, required) - Age of the child (1-12)
- `childGender` (string, required) - Gender of the child
- `interests` (string, required) - Child's interests and hobbies
- `theme` (string, required) - Story theme or setting
- `style` (string, required) - Story style (e.g., whimsical, adventure, mystery)
- `companions` (string, required) - Supporting characters
- `pageCount` (number, optional) - Number of pages (default: 10, max: 20)

**Response:**
```json
{
  "id": 2,
  "title": "Emma's Adventure",
  "status": "generating",
  "userId": "user_123",
  "childName": "Emma",
  "childAge": 7,
  "childGender": "female",
  "interests": "unicorns and painting",
  "theme": "magical forest",
  "style": "whimsical",
  "companions": "a talking rabbit",
  "pageCount": 10,
  "createdAt": "2024-01-15T10:30:00.000Z",
  "updatedAt": "2024-01-15T10:30:00.000Z"
}
```

**Status Codes:**
- `201` - Story creation started
- `400` - Invalid request data
- `401` - Unauthorized
- `500` - Server error during story creation

---

### Download Story PDF

**GET** `/api/stories/:id/download`

Download a story as PDF.

**Headers:**
- `Authorization: Bearer <token>` (required)

**Parameters:**
- `id` (path) - Story ID

**Response:**
- Content-Type: `application/pdf`
- Content-Disposition: `attachment; filename="story_title.pdf"`

**Status Codes:**
- `200` - PDF download successful
- `401` - Unauthorized
- `403` - Forbidden (user doesn't have access to this story)
- `404` - Story or PDF not found
- `500` - Error generating or retrieving PDF

---

## Story Status Values

- `generating` - Story is being created (AI generation in progress)
- `completed` - Story generation completed successfully
- `failed` - Story generation failed

## Error Response Format

All error responses follow this format:

```json
{
  "error": "Error Type",
  "message": "Detailed error description"
}
```

## Rate Limiting

Currently no rate limiting is implemented. In production, consider:
- 10 story creations per day for free users
- 100 story creations per day for premium users

## Example Usage

### JavaScript/Node.js

```javascript
// Create a new story
const response = await fetch('http://localhost:8000/api/stories', {
  method: 'POST',
  headers: {
    'Authorization': 'Bearer your-token',
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    childName: 'Alex',
    childAge: 6,
    childGender: 'male',
    interests: 'dinosaurs and soccer',
    theme: 'prehistoric adventure',
    style: 'exciting',
    companions: 'a friendly T-Rex',
    pageCount: 8
  })
});

const story = await response.json();
console.log('Story created:', story.id);
```

### Python

```python
import requests

url = 'http://localhost:8000/api/stories'
headers = {
    'Authorization': 'Bearer your-token',
    'Content-Type': 'application/json'
}
data = {
    'childName': 'Sofia',
    'childAge': 5,
    'childGender': 'female',
    'interests': 'butterflies and music',
    'theme': 'garden adventure',
    'style': 'gentle',
    'companions': 'singing birds',
    'pageCount': 6
}

response = requests.post(url, headers=headers, json=data)
story = response.json()
print(f"Story created: {story['id']}")
```

### cURL

```bash
# Create story
curl -X POST http://localhost:8000/api/stories \
  -H "Authorization: Bearer your-token" \
  -H "Content-Type: application/json" \
  -d '{
    "childName": "Maya",
    "childAge": 8,
    "childGender": "female",
    "interests": "astronomy and cats",
    "theme": "space exploration",
    "style": "scientific",
    "companions": "a space cat",
    "pageCount": 12
  }'

# Get story
curl -H "Authorization: Bearer your-token" \
  http://localhost:8000/api/stories/1

# Download PDF
curl -H "Authorization: Bearer your-token" \
  http://localhost:8000/api/stories/1/download \
  -o story.pdf
```

## Testing

Use the provided test scripts:

```bash
# Shell script test
./test-api.sh

# Node.js test client
node examples/test-client.js
```

## Notes

- Story generation is asynchronous - check the `status` field
- Image generation may take 30-60 seconds per image
- PDFs are generated on-demand for the first download
- All content is filtered for child safety
- Stories are currently stored in memory (will be lost on server restart)
