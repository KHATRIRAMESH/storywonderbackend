#!/usr/bin/env ts-node

import * as dotenv from 'dotenv';
dotenv.config();

import { createTables, dropTables } from '../database/migrations';

async function runMigrations() {
  const command = process.argv[2];

  try {
    switch (command) {
      case 'up':
        console.log('🔄 Running database migrations...');
        await createTables();
        console.log('✅ Database migrations completed successfully');
        break;
        
      case 'down':
        console.log('🗑️  Rolling back database migrations...');
        await dropTables();
        console.log('✅ Database rollback completed successfully');
        break;
        
      case 'reset':
        console.log('🔄 Resetting database...');
        await dropTables();
        await createTables();
        console.log('✅ Database reset completed successfully');
        break;
        
      default:
        console.log('Usage: npm run migrate [up|down|reset]');
        console.log('  up    - Create tables');
        console.log('  down  - Drop tables');
        console.log('  reset - Drop and recreate tables');
        process.exit(1);
    }
  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  }
  
  process.exit(0);
}

runMigrations();
