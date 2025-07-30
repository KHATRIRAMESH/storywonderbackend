import pool from '../config/database';

export async function createTables() {
  const client = await pool.connect();
  
  try {
    console.log('🔄 Creating database tables...');

    // Create users table
    await client.query(`
      CREATE TABLE IF NOT EXISTS users (
        id VARCHAR(255) PRIMARY KEY, -- Clerk user ID
        email VARCHAR(255) UNIQUE NOT NULL,
        first_name VARCHAR(255),
        last_name VARCHAR(255),
        profile_image_url TEXT,
        subscription_level VARCHAR(50) DEFAULT 'free' CHECK (subscription_level IN ('free', 'premium', 'unlimited')),
        subscription_expires_at TIMESTAMP,
        stories_created INTEGER DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // Create stories table
    await client.query(`
      CREATE TABLE IF NOT EXISTS stories (
        id SERIAL PRIMARY KEY,
        user_id VARCHAR(255) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        title VARCHAR(500) NOT NULL,
        status VARCHAR(50) DEFAULT 'generating' CHECK (status IN ('generating', 'completed', 'failed')),
        child_name VARCHAR(255) NOT NULL,
        child_age INTEGER NOT NULL CHECK (child_age >= 1 AND child_age <= 18),
        child_gender VARCHAR(50) NOT NULL,
        interests TEXT NOT NULL,
        theme VARCHAR(255) NOT NULL,
        style VARCHAR(255) NOT NULL,
        companions TEXT NOT NULL,
        page_count INTEGER DEFAULT 10 CHECK (page_count >= 1 AND page_count <= 50),
        child_image_url TEXT,
        cover_image_url TEXT,
        pdf_url TEXT,
        is_public BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // Create story_pages table
    await client.query(`
      CREATE TABLE IF NOT EXISTS story_pages (
        id SERIAL PRIMARY KEY,
        story_id INTEGER NOT NULL REFERENCES stories(id) ON DELETE CASCADE,
        page_number INTEGER NOT NULL,
        text TEXT NOT NULL,
        image_prompt TEXT,
        image_url TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(story_id, page_number)
      );
    `);

    // Create indexes for better performance
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_stories_user_id ON stories(user_id);
      CREATE INDEX IF NOT EXISTS idx_stories_status ON stories(status);
      CREATE INDEX IF NOT EXISTS idx_stories_created_at ON stories(created_at);
      CREATE INDEX IF NOT EXISTS idx_story_pages_story_id ON story_pages(story_id);
      CREATE INDEX IF NOT EXISTS idx_story_pages_page_number ON story_pages(story_id, page_number);
    `);

    // Create updated_at trigger function
    await client.query(`
      CREATE OR REPLACE FUNCTION update_updated_at_column()
      RETURNS TRIGGER AS $$
      BEGIN
          NEW.updated_at = CURRENT_TIMESTAMP;
          RETURN NEW;
      END;
      $$ language 'plpgsql';
    `);

    // Create triggers for updated_at
    await client.query(`
      DROP TRIGGER IF EXISTS update_users_updated_at ON users;
      CREATE TRIGGER update_users_updated_at
          BEFORE UPDATE ON users
          FOR EACH ROW
          EXECUTE FUNCTION update_updated_at_column();

      DROP TRIGGER IF EXISTS update_stories_updated_at ON stories;
      CREATE TRIGGER update_stories_updated_at
          BEFORE UPDATE ON stories
          FOR EACH ROW
          EXECUTE FUNCTION update_updated_at_column();

      DROP TRIGGER IF EXISTS update_story_pages_updated_at ON story_pages;
      CREATE TRIGGER update_story_pages_updated_at
          BEFORE UPDATE ON story_pages
          FOR EACH ROW
          EXECUTE FUNCTION update_updated_at_column();
    `);

    console.log('✅ Database tables created successfully');
  } catch (error) {
    console.error('❌ Error creating tables:', error);
    throw error;
  } finally {
    client.release();
  }
}

export async function dropTables() {
  const client = await pool.connect();
  
  try {
    console.log('🗑️  Dropping database tables...');
    
    await client.query('DROP TABLE IF EXISTS story_pages CASCADE;');
    await client.query('DROP TABLE IF EXISTS stories CASCADE;');
    await client.query('DROP TABLE IF EXISTS users CASCADE;');
    await client.query('DROP FUNCTION IF EXISTS update_updated_at_column() CASCADE;');
    
    console.log('✅ Database tables dropped successfully');
  } catch (error) {
    console.error('❌ Error dropping tables:', error);
    throw error;
  } finally {
    client.release();
  }
}
