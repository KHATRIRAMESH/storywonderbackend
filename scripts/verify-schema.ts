import 'dotenv/config';
import { Client } from 'pg';

async function verifyAndFixSchema() {
  const client = new Client({
    connectionString: process.env.DATABASE_URL,
  });

  try {
    await client.connect();
    console.log('Connected to database');

    // Get the current stories table structure
    const tableInfo = await client.query(`
      SELECT column_name, data_type, is_nullable, column_default
      FROM information_schema.columns 
      WHERE table_name = 'stories' AND table_schema = 'public'
      ORDER BY ordinal_position;
    `);

    console.log('Current stories table structure:');
    tableInfo.rows.forEach(row => {
      console.log(`  ${row.column_name}: ${row.data_type} (nullable: ${row.is_nullable}) default: ${row.column_default}`);
    });

    // Test a simple query to see what happens
    try {
      const testQuery = await client.query('SELECT id, user_id, title FROM stories LIMIT 1;');
      console.log('✅ Basic query works');
    } catch (error) {
      console.error('❌ Basic query failed:', error);
    }

    // Test the problematic query with metadata
    try {
      const metadataQuery = await client.query('SELECT metadata FROM stories LIMIT 1;');
      console.log('✅ Metadata query works');
    } catch (error) {
      console.error('❌ Metadata query failed:', error);
      
      // Try to add the metadata column if it's really missing
      try {
        await client.query('ALTER TABLE stories ADD COLUMN metadata JSONB;');
        console.log('✅ Added metadata column');
      } catch (addError) {
        console.error('❌ Failed to add metadata column:', addError);
      }
    }

    // Test the full query that's failing
    try {
      const fullQuery = await client.query(`
        SELECT "id", "user_id", "title", "child_name", "child_age", "child_gender", 
               "interests", "theme", "setting", "style", "companions", "page_count", 
               "child_image_url", "status", "pdf_url", "thumbnail_url", "metadata", 
               "created_at", "updated_at" 
        FROM "stories" 
        WHERE "user_id" = $1 
        ORDER BY "created_at" DESC LIMIT 1;
      `, ['dev_user_123']);
      
      console.log('✅ Full query works');
      console.log('Query result:', fullQuery.rows);
    } catch (error) {
      console.error('❌ Full query failed:', error);
    }

    // Check if there are any connection issues
    const connectionInfo = await client.query('SELECT current_database(), current_schema();');
    console.log('Connection info:', connectionInfo.rows[0]);

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await client.end();
  }
}

verifyAndFixSchema();
