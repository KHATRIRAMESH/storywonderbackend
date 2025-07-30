import 'dotenv/config';
import { Client } from 'pg';

async function ensureTestUser() {
  const client = new Client({
    connectionString: process.env.DATABASE_URL,
  });

  try {
    await client.connect();
    console.log('Connected to database');

    // Check if test user exists
    const userExists = await client.query(`
      SELECT EXISTS (
        SELECT 1 FROM users WHERE id = 'dev_user_123'
      );
    `);

    if (!userExists.rows[0].exists) {
      console.log('Creating test user...');
      await client.query(`
        INSERT INTO users (id, email, first_name, last_name, subscription_level, stories_generated)
        VALUES ('dev_user_123', 'dev@test.com', 'Dev', 'User', 'premium', 0);
      `);
      console.log('Test user created successfully');
    } else {
      console.log('Test user already exists');
    }

  } catch (error) {
    console.error('Error ensuring test user:', error);
  } finally {
    await client.end();
  }
}

ensureTestUser();
