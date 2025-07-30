import 'dotenv/config';
import { Client } from 'pg';

async function addMissingColumns() {
  const client = new Client({
    connectionString: process.env.DATABASE_URL,
  });

  try {
    await client.connect();
    console.log('Connected to database');

    // Check and add missing columns to stories table
    const columnsResult = await client.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'stories' AND table_schema = 'public';
    `);

    const existingColumns = columnsResult.rows.map(row => row.column_name);
    console.log('Existing columns:', existingColumns);

    // Add metadata column if missing
    if (!existingColumns.includes('metadata')) {
      console.log('Adding metadata column...');
      await client.query('ALTER TABLE stories ADD COLUMN metadata JSONB;');
      console.log('✅ metadata column added');
    } else {
      console.log('✅ metadata column already exists');
    }

    // Check and ensure all expected columns exist
    const expectedColumns = [
      'id', 'user_id', 'title', 'child_name', 'child_age', 'child_gender',
      'interests', 'theme', 'setting', 'style', 'companions', 'page_count',
      'child_image_url', 'status', 'pdf_url', 'thumbnail_url', 'metadata',
      'created_at', 'updated_at'
    ];

    const missingColumns = expectedColumns.filter(col => !existingColumns.includes(col));
    
    if (missingColumns.length > 0) {
      console.log('Missing columns:', missingColumns);
      
      // Add any other missing columns with appropriate defaults
      for (const col of missingColumns) {
        if (col === 'created_at' && !existingColumns.includes('created_at')) {
          await client.query('ALTER TABLE stories ADD COLUMN created_at TIMESTAMP DEFAULT NOW() NOT NULL;');
          console.log('✅ created_at column added');
        }
        if (col === 'updated_at' && !existingColumns.includes('updated_at')) {
          await client.query('ALTER TABLE stories ADD COLUMN updated_at TIMESTAMP DEFAULT NOW() NOT NULL;');
          console.log('✅ updated_at column added');
        }
      }
    } else {
      console.log('✅ All expected columns exist');
    }

    // Update the table to ensure it matches our schema
    console.log('Schema update completed successfully');

  } catch (error) {
    console.error('Error updating schema:', error);
  } finally {
    await client.end();
  }
}

addMissingColumns();
