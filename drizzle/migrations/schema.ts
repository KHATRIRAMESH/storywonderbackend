import { pgTable, unique, check, varchar, text, timestamp, integer, index, foreignKey, serial, boolean } from "drizzle-orm/pg-core"
import { sql } from "drizzle-orm"



export const users = pgTable("users", {
	id: varchar({ length: 255 }).primaryKey().notNull(),
	email: varchar({ length: 255 }).notNull(),
	firstName: varchar("first_name", { length: 255 }),
	lastName: varchar("last_name", { length: 255 }),
	profileImageUrl: text("profile_image_url"),
	subscriptionLevel: varchar("subscription_level", { length: 50 }).default('free'),
	subscriptionExpiresAt: timestamp("subscription_expires_at", { mode: 'string' }),
	storiesCreated: integer("stories_created").default(0),
	createdAt: timestamp("created_at", { mode: 'string' }).default(sql`CURRENT_TIMESTAMP`),
	updatedAt: timestamp("updated_at", { mode: 'string' }).default(sql`CURRENT_TIMESTAMP`),
}, (table) => [
	unique("users_email_key").on(table.email),
	check("users_subscription_level_check", sql`(subscription_level)::text = ANY ((ARRAY['free'::character varying, 'premium'::character varying, 'unlimited'::character varying])::text[])`),
]);

export const stories = pgTable("stories", {
	id: serial().primaryKey().notNull(),
	userId: varchar("user_id", { length: 255 }).notNull(),
	title: varchar({ length: 500 }).notNull(),
	status: varchar({ length: 50 }).default('generating'),
	childName: varchar("child_name", { length: 255 }).notNull(),
	childAge: integer("child_age").notNull(),
	childGender: varchar("child_gender", { length: 50 }).notNull(),
	interests: text().notNull(),
	theme: varchar({ length: 255 }).notNull(),
	style: varchar({ length: 255 }).notNull(),
	companions: text().notNull(),
	pageCount: integer("page_count").default(10),
	childImageUrl: text("child_image_url"),
	coverImageUrl: text("cover_image_url"),
	pdfUrl: text("pdf_url"),
	isPublic: boolean("is_public").default(false),
	createdAt: timestamp("created_at", { mode: 'string' }).default(sql`CURRENT_TIMESTAMP`),
	updatedAt: timestamp("updated_at", { mode: 'string' }).default(sql`CURRENT_TIMESTAMP`),
}, (table) => [
	index("idx_stories_created_at").using("btree", table.createdAt.asc().nullsLast().op("timestamp_ops")),
	index("idx_stories_status").using("btree", table.status.asc().nullsLast().op("text_ops")),
	index("idx_stories_user_id").using("btree", table.userId.asc().nullsLast().op("text_ops")),
	foreignKey({
			columns: [table.userId],
			foreignColumns: [users.id],
			name: "stories_user_id_fkey"
		}).onDelete("cascade"),
	check("stories_status_check", sql`(status)::text = ANY ((ARRAY['generating'::character varying, 'completed'::character varying, 'failed'::character varying])::text[])`),
	check("stories_child_age_check", sql`(child_age >= 1) AND (child_age <= 18)`),
	check("stories_page_count_check", sql`(page_count >= 1) AND (page_count <= 50)`),
]);

export const storyPages = pgTable("story_pages", {
	id: serial().primaryKey().notNull(),
	storyId: integer("story_id").notNull(),
	pageNumber: integer("page_number").notNull(),
	text: text().notNull(),
	imagePrompt: text("image_prompt"),
	imageUrl: text("image_url"),
	createdAt: timestamp("created_at", { mode: 'string' }).default(sql`CURRENT_TIMESTAMP`),
	updatedAt: timestamp("updated_at", { mode: 'string' }).default(sql`CURRENT_TIMESTAMP`),
}, (table) => [
	index("idx_story_pages_page_number").using("btree", table.storyId.asc().nullsLast().op("int4_ops"), table.pageNumber.asc().nullsLast().op("int4_ops")),
	index("idx_story_pages_story_id").using("btree", table.storyId.asc().nullsLast().op("int4_ops")),
	foreignKey({
			columns: [table.storyId],
			foreignColumns: [stories.id],
			name: "story_pages_story_id_fkey"
		}).onDelete("cascade"),
	unique("story_pages_story_id_page_number_key").on(table.storyId, table.pageNumber),
]);
