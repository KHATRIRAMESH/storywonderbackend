import 'dotenv/config';
import { db } from '../db/config';
import { stories } from '../db/schema';
import { eq, desc } from 'drizzle-orm';

async function testDrizzleConnection() {
  try {
    console.log('Testing Drizzle ORM connection...');

    // Test basic connection
    const result = await db.execute('SELECT 1 as test');
    console.log('✅ Basic Drizzle connection works:', result);

    // Test schema access
    try {
      const storiesCount = await db.select().from(stories).limit(1);
      console.log('✅ Stories query works:', storiesCount);
    } catch (error) {
      console.error('❌ Stories query failed:', error);
    }

    // Test the specific failing query
    try {
      const userStories = await db
        .select()
        .from(stories)
        .where(eq(stories.userId, 'dev_user_123'))
        .orderBy(desc(stories.createdAt));
      
      console.log('✅ User stories query works:', userStories.length, 'stories found');
    } catch (error) {
      console.error('❌ User stories query failed:', error);
    }

  } catch (error) {
    console.error('Error testing Drizzle connection:', error);
  }
}

testDrizzleConnection();
