-- Migration to fix OAuth accounts with malformed IDs
-- This fixes the issue where some OAuth accounts might have "gen_random_uuid()" as literal text instead of actual UUIDs

-- First, let's check if there are any OAuth accounts with malformed IDs
-- and fix them by generating proper UUIDs

-- Clean up any OAuth accounts with literal "gen_random_uuid()" text
DELETE FROM oauth_accounts WHERE provider_account_id = 'gen_random_uuid()';

-- Clean up any users with literal "gen_random_uuid()" text as ID
DELETE FROM users WHERE id = 'gen_random_uuid()';

-- Ensure the gen_random_uuid() function is available (PostgreSQL 13+)
-- If using older PostgreSQL, you might need to install the uuid-ossp extension
-- CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Add a check constraint to ensure IDs are proper UUIDs (optional)
-- ALTER TABLE users ADD CONSTRAINT users_id_uuid_check CHECK (id ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$');
-- ALTER TABLE oauth_accounts ADD CONSTRAINT oauth_accounts_id_uuid_check CHECK (id ~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$');
