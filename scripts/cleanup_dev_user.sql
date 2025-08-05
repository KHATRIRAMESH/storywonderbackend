-- Clean up development user and related data
-- Remove development user stories
DELETE FROM story_pages WHERE story_id IN (
  SELECT id FROM stories WHERE user_id = 'dev_user_123'
);

DELETE FROM story_characters WHERE story_id IN (
  SELECT id FROM stories WHERE user_id = 'dev_user_123'
);

DELETE FROM stories WHERE user_id = 'dev_user_123';

-- Remove development user sessions
DELETE FROM user_sessions WHERE user_id = 'dev_user_123';

-- Remove development user OAuth accounts (if any)
DELETE FROM oauth_accounts WHERE user_id = 'dev_user_123';

-- Remove development user
DELETE FROM users WHERE id = 'dev_user_123' OR email = 'dev@example.com';

-- Verify cleanup
SELECT 'Users' as table_name, COUNT(*) as remaining_records FROM users WHERE id = 'dev_user_123' OR email = 'dev@example.com'
UNION ALL
SELECT 'OAuth Accounts' as table_name, COUNT(*) as remaining_records FROM oauth_accounts WHERE user_id = 'dev_user_123'
UNION ALL
SELECT 'User Sessions' as table_name, COUNT(*) as remaining_records FROM user_sessions WHERE user_id = 'dev_user_123'
UNION ALL
SELECT 'Stories' as table_name, COUNT(*) as remaining_records FROM stories WHERE user_id = 'dev_user_123';
