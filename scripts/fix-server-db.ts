import 'dotenv/config';
import { db } from '../db/config';

async function fixServerDatabase() {
  try {
    console.log('🔧 Fixing server database schema...');

    // Test the current connection to see what database we're actually using
    const currentDb = await db.execute('SELECT current_database(), current_schema();');
    console.log('Current database:', currentDb.rows[0]);

    // Get the actual table structure that the server sees
    const tables = await db.execute(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name IN ('stories', 'story_pages', 'users');
    `);
    console.log('Available tables:', tables.rows);

    // Check stories table columns
    const storiesColumns = await db.execute(`
      SELECT column_name, data_type, is_nullable 
      FROM information_schema.columns 
      WHERE table_name = 'stories' AND table_schema = 'public'
      ORDER BY ordinal_position;
    `);
    console.log('Stories table columns:');
    storiesColumns.rows.forEach((row: any) => console.log(`  ${row.column_name}: ${row.data_type}`));

    // Check story_pages table columns
    const pagesColumns = await db.execute(`
      SELECT column_name, data_type, is_nullable 
      FROM information_schema.columns 
      WHERE table_name = 'story_pages' AND table_schema = 'public'
      ORDER BY ordinal_position;
    `);
    console.log('Story_pages table columns:');
    pagesColumns.rows.forEach((row: any) => console.log(`  ${row.column_name}: ${row.data_type}`));

    // Add missing columns
    const storiesColumnNames = storiesColumns.rows.map((row: any) => row.column_name);
    const pagesColumnNames = pagesColumns.rows.map((row: any) => row.column_name);

    // Fix stories table
    if (!storiesColumnNames.includes('metadata')) {
      console.log('Adding metadata column to stories...');
      await db.execute('ALTER TABLE stories ADD COLUMN metadata JSONB;');
      console.log('✅ Added metadata column');
    } else {
      console.log('✅ metadata column already exists');
    }

    // Fix story_pages table
    if (!pagesColumnNames.includes('status')) {
      console.log('Adding status column to story_pages...');
      // First create the enum if it doesn't exist
      await db.execute(`
        DO $$ BEGIN
          CREATE TYPE page_status AS ENUM('pending', 'generating', 'completed', 'failed');
        EXCEPTION
          WHEN duplicate_object THEN null;
        END $$;
      `);
      await db.execute('ALTER TABLE story_pages ADD COLUMN status page_status DEFAULT \'pending\' NOT NULL;');
      console.log('✅ Added status column to story_pages');
    } else {
      console.log('✅ status column already exists in story_pages');
    }

    console.log('✅ Database schema fixed successfully');

  } catch (error) {
    console.error('❌ Error fixing database schema:', error);
  }
}

fixServerDatabase();
