import express, { Request, Response } from 'express';
import cors from 'cors';
import path from 'path';
import authRoutes from './routes/auth.route';
import storyRoutes from './routes/story.route';
import { errorHandler } from './middlewares/errorHandler';

const app = express();

// CORS configuration to allow Next.js frontend
app.use(
  cors({
    origin: [
      'https://storywonder.vercel.app/',
      'http://localhost:3000',
      'http://localhost:3001',
      'https://localhost:3000',
      'http://127.0.0.1:3000',
      'https://127.0.0.1:3000',
    ],
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
    allowedHeaders: [
      'Content-Type',
      'Authorization',
      'X-Requested-With',
      'Accept',
      'Origin',
    ],
  }),
);

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve static files
app.use('/uploads', express.static(path.join(__dirname, '../public/uploads')));

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/stories', storyRoutes);

//home route
app.get('/', (req: Request, res: Response) => {
  res.send('Welcome to the Storybook Server API!');
});
// Health check endpoint
app.get('/health', (req: Request, res: Response) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

// Global error handler (should be after routes)
app.use(errorHandler);

export default app;
