import { pgTable, text, integer, timestamp, boolean, serial, jsonb, pgEnum } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';

// Enums
export const subscriptionLevelEnum = pgEnum('subscription_level', ['free', 'premium', 'pro']);
export const storyStatusEnum = pgEnum('story_status', ['generating', 'completed', 'failed']);
export const pageStatusEnum = pgEnum('page_status', ['pending', 'generating', 'completed', 'failed']);

// Users table
export const users = pgTable('users', {
  id: text('id').primaryKey(), // Clerk user ID
  email: text('email').notNull().unique(),
  firstName: text('first_name'),
  lastName: text('last_name'),
  profileImageUrl: text('profile_image_url'),
  subscriptionLevel: subscriptionLevelEnum('subscription_level').default('free').notNull(),
  storiesGenerated: integer('stories_generated').default(0).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// Stories table
export const stories = pgTable('stories', {
  id: serial('id').primaryKey(),
  userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  title: text('title').notNull(),
  childName: text('child_name').notNull(),
  childAge: integer('child_age').notNull(),
  childGender: text('child_gender'),
  interests: text('interests').array(),
  theme: text('theme').notNull(),
  setting: text('setting'),
  style: text('style').default('cartoon'),
  companions: text('companions').array(),
  pageCount: integer('page_count').default(10).notNull(),
  childImageUrl: text('child_image_url'),
  status: storyStatusEnum('status').default('generating').notNull(),
  pdfUrl: text('pdf_url'),
  thumbnailUrl: text('thumbnail_url'),
  metadata: jsonb('metadata'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// Story pages table
export const storyPages = pgTable('story_pages', {
  id: serial('id').primaryKey(),
  storyId: integer('story_id').notNull().references(() => stories.id, { onDelete: 'cascade' }),
  pageNumber: integer('page_number').notNull(),
  content: text('content').notNull(),
  imageUrl: text('image_url'),
  imagePrompt: text('image_prompt'),
  status: pageStatusEnum('status').default('pending').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// Relations
export const usersRelations = relations(users, ({ many }) => ({
  stories: many(stories),
}));

export const storiesRelations = relations(stories, ({ one, many }) => ({
  user: one(users, {
    fields: [stories.userId],
    references: [users.id],
  }),
  pages: many(storyPages),
}));

export const storyPagesRelations = relations(storyPages, ({ one }) => ({
  story: one(stories, {
    fields: [storyPages.storyId],
    references: [stories.id],
  }),
}));

// Export types
export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
export type Story = typeof stories.$inferSelect;
export type NewStory = typeof stories.$inferInsert;
export type StoryPage = typeof storyPages.$inferSelect;
export type NewStoryPage = typeof storyPages.$inferInsert;
