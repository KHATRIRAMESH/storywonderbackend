#!/usr/bin/env ts-node

import * as dotenv from 'dotenv';
dotenv.config();

import { migrate } from 'drizzle-orm/node-postgres/migrator';
import { db } from '../db/config';

async function runMigrations() {
  const command = process.argv[2];

  try {
    switch (command) {
      case 'up':
        console.log('🔄 Running database migrations...');
        await migrate(db, { migrationsFolder: './drizzle/migrations' });
        console.log('✅ Database migrations completed successfully');
        break;
        
      case 'generate':
        console.log('� Generating migration files...');
        console.log('Please run: npm run db:generate');
        break;
        
      case 'push':
        console.log('� Pushing schema changes to database...');
        console.log('Please run: npm run db:push');
        break;
        
      default:
        console.log(`
Usage: npm run migrate [command]

Commands:
  up        Run pending migrations
  generate  Generate migration files (use: npm run db:generate)
  push      Push schema changes to database (use: npm run db:push)
        `);
        process.exit(1);
    }

    process.exit(0);
  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  }
}

runMigrations();
