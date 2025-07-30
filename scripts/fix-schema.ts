import 'dotenv/config';
import { Client } from 'pg';

async function fixSchema() {
  const client = new Client({
    connectionString: process.env.DATABASE_URL,
  });

  try {
    await client.connect();
    console.log('Connected to database');

    // Check if stories table exists and what columns it has
    const tableExists = await client.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'stories'
      );
    `);

    if (!tableExists.rows[0].exists) {
      console.log('Stories table does not exist. Creating from scratch...');
      
      // Create enums first
      await client.query(`
        DO $$ BEGIN
          CREATE TYPE story_status AS ENUM('generating', 'completed', 'failed');
        EXCEPTION
          WHEN duplicate_object THEN null;
        END $$;
      `);

      await client.query(`
        DO $$ BEGIN
          CREATE TYPE page_status AS ENUM('pending', 'generating', 'completed', 'failed');
        EXCEPTION
          WHEN duplicate_object THEN null;
        END $$;
      `);

      await client.query(`
        DO $$ BEGIN
          CREATE TYPE subscription_level AS ENUM('free', 'premium', 'pro');
        EXCEPTION
          WHEN duplicate_object THEN null;
        END $$;
      `);

      // Create stories table
      await client.query(`
        CREATE TABLE IF NOT EXISTS stories (
          id SERIAL PRIMARY KEY,
          user_id TEXT NOT NULL,
          title TEXT NOT NULL,
          child_name TEXT NOT NULL,
          child_age INTEGER NOT NULL,
          child_gender TEXT,
          interests TEXT[],
          theme TEXT NOT NULL,
          setting TEXT,
          style TEXT DEFAULT 'cartoon',
          companions TEXT[],
          page_count INTEGER DEFAULT 10 NOT NULL,
          child_image_url TEXT,
          status story_status DEFAULT 'generating' NOT NULL,
          pdf_url TEXT,
          thumbnail_url TEXT,
          metadata JSONB,
          created_at TIMESTAMP DEFAULT NOW() NOT NULL,
          updated_at TIMESTAMP DEFAULT NOW() NOT NULL
        );
      `);

      console.log('Stories table created successfully');
    } else {
      // Check current columns
      const columns = await client.query(`
        SELECT column_name, data_type, is_nullable
        FROM information_schema.columns 
        WHERE table_name = 'stories' 
        ORDER BY ordinal_position;
      `);

      console.log('Current stories table columns:');
      columns.rows.forEach(row => {
        console.log(`  ${row.column_name}: ${row.data_type} (nullable: ${row.is_nullable})`);
      });

      // Check if setting column exists
      const settingExists = columns.rows.some(row => row.column_name === 'setting');
      
      if (!settingExists) {
        console.log('Adding missing setting column...');
        await client.query('ALTER TABLE stories ADD COLUMN setting TEXT;');
        console.log('Setting column added successfully');
      }
    }

    // Create users table if it doesn't exist
    await client.query(`
      CREATE TABLE IF NOT EXISTS users (
        id TEXT PRIMARY KEY,
        email TEXT NOT NULL UNIQUE,
        first_name TEXT,
        last_name TEXT,
        profile_image_url TEXT,
        subscription_level subscription_level DEFAULT 'free' NOT NULL,
        stories_generated INTEGER DEFAULT 0 NOT NULL,
        created_at TIMESTAMP DEFAULT NOW() NOT NULL,
        updated_at TIMESTAMP DEFAULT NOW() NOT NULL
      );
    `);

    // Create story_pages table if it doesn't exist
    await client.query(`
      CREATE TABLE IF NOT EXISTS story_pages (
        id SERIAL PRIMARY KEY,
        story_id INTEGER NOT NULL REFERENCES stories(id) ON DELETE CASCADE,
        page_number INTEGER NOT NULL,
        content TEXT NOT NULL,
        image_url TEXT,
        image_prompt TEXT,
        status page_status DEFAULT 'pending' NOT NULL,
        created_at TIMESTAMP DEFAULT NOW() NOT NULL,
        updated_at TIMESTAMP DEFAULT NOW() NOT NULL
      );
    `);

    console.log('Schema check and fix completed successfully');

  } catch (error) {
    console.error('Error fixing schema:', error);
  } finally {
    await client.end();
  }
}

fixSchema();
