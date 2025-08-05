import * as dotenv from 'dotenv';
dotenv.config();

import app from './app';
import config from './config/config';
import pool from './config/database';

const PORT = config.port || 8000;

async function startServer() {
  try {
    // Test database connection
    const client = await pool.connect();
    // console.log('📦 Database connection established');
    client.release();

    app.listen(PORT, () => {
      console.log(`🚀 Server running on port ${PORT}`);
    });
  } catch (error) {
    console.error('❌ Failed to start server:', error);
    process.exit(1);
  }
}

startServer();
