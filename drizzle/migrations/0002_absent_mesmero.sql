ALTER TABLE "oauth_accounts" ALTER COLUMN "id" DROP DEFAULT;--> statement-breakpoint
ALTER TABLE "user_sessions" ALTER COLUMN "id" DROP DEFAULT;--> statement-breakpoint
ALTER TABLE "users" ALTER COLUMN "id" DROP DEFAULT;