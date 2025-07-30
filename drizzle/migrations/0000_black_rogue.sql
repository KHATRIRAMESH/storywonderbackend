CREATE TYPE "public"."page_status" AS ENUM('pending', 'generating', 'completed', 'failed');--> statement-breakpoint
CREATE TYPE "public"."story_status" AS ENUM('generating', 'completed', 'failed');--> statement-breakpoint
CREATE TYPE "public"."subscription_level" AS ENUM('free', 'premium', 'pro');--> statement-breakpoint
CREATE TABLE "stories" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"title" text NOT NULL,
	"child_name" text NOT NULL,
	"child_age" integer NOT NULL,
	"child_gender" text,
	"interests" text[],
	"theme" text NOT NULL,
	"setting" text,
	"style" text DEFAULT 'cartoon',
	"companions" text[],
	"page_count" integer DEFAULT 10 NOT NULL,
	"child_image_url" text,
	"status" "story_status" DEFAULT 'generating' NOT NULL,
	"pdf_url" text,
	"thumbnail_url" text,
	"metadata" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "story_pages" (
	"id" serial PRIMARY KEY NOT NULL,
	"story_id" integer NOT NULL,
	"page_number" integer NOT NULL,
	"content" text NOT NULL,
	"image_url" text,
	"image_prompt" text,
	"status" "page_status" DEFAULT 'pending' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" text PRIMARY KEY NOT NULL,
	"email" text NOT NULL,
	"first_name" text,
	"last_name" text,
	"profile_image_url" text,
	"subscription_level" "subscription_level" DEFAULT 'free' NOT NULL,
	"stories_generated" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
ALTER TABLE "stories" ADD CONSTRAINT "stories_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "story_pages" ADD CONSTRAINT "story_pages_story_id_stories_id_fk" FOREIGN KEY ("story_id") REFERENCES "public"."stories"("id") ON DELETE cascade ON UPDATE no action;