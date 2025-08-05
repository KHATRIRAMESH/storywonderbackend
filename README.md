# Storybook Server 📚

A Node.js/TypeScript backend server for generating personalized children's stories using OpenAI's GPT and DALL-E models, with Clerk authentication integration.

## Features

- 🎨 AI-powered story generation using OpenAI GPT-4
- 🖼️ Automatic illustration generation with DALL-E 3
- 👤 User authentication (Clerk integration ready)
- 📖 Personalized stories based on child's details
- 🎯 Content safety filters for child-appropriate content
- 📄 PDF generation for story downloads
- 🔒 Authorization and access control
- 📊 User subscription management

## Prerequisites

- Node.js (v18 or higher)
- npm or yarn
- OpenAI API key
- Clerk account (optional, for production authentication)

## Installation

1. **Clone the repository:**
   ```bash
   git clone <repository-url>
   cd storybook-server
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Environment setup:**
   ```bash
   cp .env.example .env
   ```

4. **Configure environment variables in `.env`:**
   ```env
   # Required
   OPENAI_API_KEY=your_openai_api_key_here
   
   # Optional - Server Configuration
   PORT=3000
   NODE_ENV=development
   
   # Optional - Clerk Configuration (for production)
   CLERK_SECRET_KEY=your_clerk_secret_key_here
   CLERK_PUBLISHABLE_KEY=your_clerk_publishable_key_here
   ```

5. **Build the project:**
   ```bash
   npm run build
   ```

6. **Start the server:**
   ```bash
   # Development mode (uses ts-node, no build needed)
   npm run dev
   
   # Production mode (uses compiled JavaScript from dist/)
   npm run build
   npm start
   ```

## API Endpoints

### Health Check
- `GET /health` - Server health status

### Stories
- `GET /api/stories` - Get user's stories
- `GET /api/stories/:id` - Get specific story
- `POST /api/stories` - Create new story
- `GET /api/stories/:id/download` - Download story PDF

### Authentication
All story endpoints require authentication. For development, the server uses mock authentication. For production, integrate with Clerk.

## Story Creation Request Format

```json
{
  "childName": "Emma",
  "childAge": 7,
  "childGender": "female",
  "interests": "unicorns, painting, and adventures",
  "theme": "magical forest",
  "style": "whimsical",
  "companions": "a talking rabbit and a wise owl",
  "pageCount": 10
}
```

## Authentication

### Development Mode
The server includes mock authentication for development. It accepts:
- `Authorization: Bearer <any-token>` header
- `x-clerk-user-id` header
- Default test user if no credentials provided

### Production Mode (Clerk Integration)
To enable Clerk authentication:

1. **Configure environment variables** for authentication (JWT, OAuth)

2. **Set up database migrations** using Drizzle

3. **Configure authentication providers** (Google, Apple OAuth)

## Project Structure

```
├── app.ts                 # Express app configuration
├── server.ts              # Server entry point
├── config/
│   └── config.ts          # Environment configuration
├── controllers/
│   └── storyController.controller.ts  # Story API controllers
├── services/
│   ├── openAI.ts          # OpenAI integration & story service
│   └── userService.ts     # User management service
├── routes/
│   └── storyRoutes.route.ts  # Story API routes
├── middlewares/
│   └── errorHandler.ts    # Global error handling
├── utils/
│   └── auth.ts            # JWT authentication utilities
└── public/
    └── uploads/           # File uploads directory
```

## Story Generation Process

1. **User submits story parameters** (child details, preferences)
2. **Story content generation** using OpenAI GPT-4
3. **Image generation** for cover and each page using DALL-E 3
4. **Content safety filtering** ensures child-appropriate content
5. **PDF compilation** (ready for implementation)
6. **Storage** in memory (database integration ready)

## Safety Features

- **Content filtering**: Automatically sanitizes image prompts
- **Fallback images**: Uses safe alternatives if content policy violations occur
- **Age-appropriate content**: Tailored story generation based on child's age
- **Error handling**: Graceful degradation for API failures

## Development Scripts

```bash
# Start development server with hot reload (no build needed)
npm run dev

# Build TypeScript to JavaScript in dist/ directory
npm run build

# Start production server (requires build first)
npm start

# Clean build directory
npm run clean

# Clean and rebuild
npm run build:clean

# Run linting
npm run lint

# Run tests (when implemented)
npm test
```

## Environment Variables

| Variable | Description | Required | Default |
|----------|-------------|----------|---------|
| `OPENAI_API_KEY` | OpenAI API key for story generation | Yes | - |
| `PORT` | Server port | No | 3000 |
| `NODE_ENV` | Environment mode | No | development |
| `CLERK_SECRET_KEY` | Clerk secret key for authentication | No | - |
| `CLERK_PUBLISHABLE_KEY` | Clerk publishable key | No | - |

## API Response Examples

### Get Stories
```json
{
  "stories": [
    {
      "id": 1,
      "title": "Emma's Magical Forest Adventure",
      "status": "completed",
      "childName": "Emma",
      "childAge": 7,
      "createdAt": "2024-01-15T10:30:00Z",
      "coverImageUrl": "https://...",
      "pageCount": 10
    }
  ]
}
```

### Story Details
```json
{
  "id": 1,
  "title": "Emma's Magical Forest Adventure",
  "status": "completed",
  "pages": [
    {
      "text": "Once upon a time, Emma discovered a magical forest...",
      "imageUrl": "https://...",
      "imagePrompt": "Emma walking into a magical forest"
    }
  ],
  "coverImageUrl": "https://...",
  "pdfUrl": "/downloads/story_1.pdf"
}
```

## Troubleshooting

### Common Issues

1. **OpenAI API errors:**
   - Verify API key is correct
   - Check API usage limits
   - Ensure billing is set up

2. **Build errors:**
   - Run `npm install` to ensure dependencies are installed
   - Check TypeScript configuration in `tsconfig.json`

3. **Authentication issues:**
   - Verify environment variables are set
   - Check request headers format

### Error Codes

- `401` - Unauthorized (missing or invalid authentication)
- `403` - Forbidden (insufficient permissions)
- `404` - Story not found
- `500` - Server error (check logs for details)

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make changes with proper TypeScript types
4. Test your changes
5. Submit a pull request

## License

MIT License - see LICENSE file for details

## Next Steps for Production

1. **Database Integration**: Replace in-memory storage with PostgreSQL/MongoDB
2. **File Storage**: Implement cloud storage (AWS S3, Google Cloud Storage)
3. **PDF Generation**: Complete PDF creation with proper formatting
4. **Clerk Authentication**: Full integration with Clerk for user management
5. **Rate Limiting**: Implement API rate limiting
6. **Monitoring**: Add logging and monitoring solutions
7. **Tests**: Add comprehensive test suite
8. **Docker**: Containerize the application
9. **CI/CD**: Set up deployment pipeline

---

Happy storytelling! 📖✨