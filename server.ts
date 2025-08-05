import * as dotenv from 'dotenv';
dotenv.config();

import app from './app';
import config from './config/config';
import pool from './config/database';

const PORT = config.port || 8000;

async function startServer() {
  try {
    const client = await pool.connect();
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
