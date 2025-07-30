import 'dotenv/config';
import { db } from '../db/config';

async function dropStyleColumn() {
  try {
    console.log('🔧 Dropping style column from stories table...');

    // Check if the style column exists
    const columns = await db.execute(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'stories' AND column_name = 'style' AND table_schema = 'public';
    `);

    if (columns.rows.length > 0) {
      console.log('Style column exists, dropping it...');
      await db.execute('ALTER TABLE stories DROP COLUMN style;');
      console.log('✅ Style column dropped successfully');
    } else {
      console.log('✅ Style column does not exist, nothing to drop');
    }

    console.log('✅ Database schema updated successfully');

  } catch (error) {
    console.error('❌ Error dropping style column:', error);
  }
}

dropStyleColumn();
