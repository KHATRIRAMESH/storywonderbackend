import * as dotenv from 'dotenv';
dotenv.config();

import app from "./app";
import config from "./config/config";
import pool from "./config/database";
import { createTables } from "./database/migrations";

const PORT = config.port || 3000;

async function startServer() {
  try {
    // Test database connection
    const client = await pool.connect();
    console.log('📦 Database connection established');
    client.release();

    // Run migrations if needed
    if (process.env.AUTO_MIGRATE === 'true') {
      console.log('🔄 Running database migrations...');
      await createTables();
    }

    app.listen(PORT, () => {
      console.log(`🚀 Server running on port ${PORT}`);
      console.log(`📚 Storybook Server is ready!`);
      console.log(`🔗 Health check: http://localhost:${PORT}/health`);
      console.log(`📖 Stories API: http://localhost:${PORT}/api/stories`);
      console.log(`🔧 Run 'npm run db:up' to create database tables`);
    });
  } catch (error) {
    console.error('❌ Failed to start server:', error);
    process.exit(1);
  }
}

startServer();
