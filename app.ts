import express from 'express';
import cors from 'cors';
import path from 'path';
import itemRoutes from './routes/itemRoutes.route';
import storyRoutes from './routes/storyRoutes.route';
import { errorHandler } from './middlewares/errorHandler';

const app = express();

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve static files
app.use('/uploads', express.static(path.join(__dirname, '../public/uploads')));

// Routes
app.use('/api/items', itemRoutes);
app.use('/api/stories', storyRoutes);

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

// Global error handler (should be after routes)
app.use(errorHandler);

export default app;