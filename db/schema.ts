import { pgTable, text, integer, timestamp, boolean, serial, jsonb, pgEnum, uuid } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';

// Enums
export const subscriptionLevelEnum = pgEnum('subscription_level', ['free', 'premium', 'pro']);
export const storyStatusEnum = pgEnum('story_status', ['generating', 'completed', 'failed']);
export const pageStatusEnum = pgEnum('page_status', ['pending', 'generating', 'completed', 'failed']);
export const authProviderEnum = pgEnum('auth_provider', ['google', 'apple', 'email']);

// Users table - Updated for OAuth
export const users = pgTable('users', {
  id: text('id').primaryKey(), // UUID - explicitly set in application code
  email: text('email').notNull().unique(),
  firstName: text('first_name'),
  lastName: text('last_name'),
  profileImageUrl: text('profile_image_url'),
  password: text('password'), // For email auth (hashed)
  emailVerified: boolean('email_verified').default(false),
  subscriptionLevel: subscriptionLevelEnum('subscription_level').default('free').notNull(),
  storiesGenerated: integer('stories_generated').default(0).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// OAuth accounts table - Links users to OAuth providers
export const oauthAccounts = pgTable('oauth_accounts', {
  id: text('id').primaryKey(), // UUID - explicitly set in application code
  userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  provider: authProviderEnum('provider').notNull(),
  providerAccountId: text('provider_account_id').notNull(), // OAuth provider's user ID
  accessToken: text('access_token'),
  refreshToken: text('refresh_token'),
  tokenType: text('token_type'),
  scope: text('scope'),
  idToken: text('id_token'),
  expiresAt: timestamp('expires_at'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// User sessions table - For JWT session management
export const userSessions = pgTable('user_sessions', {
  id: text('id').primaryKey(), // UUID - explicitly set in application code
  userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  token: text('token').notNull().unique(), // JWT token or session identifier
  expiresAt: timestamp('expires_at').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
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

// Story characters table - For character images and metadata
export const storyCharacters = pgTable('story_characters', {
  id: serial('id').primaryKey(),
  storyId: integer('story_id').notNull().references(() => stories.id, { onDelete: 'cascade' }),
  name: text('name').notNull(),
  imageUrl: text('image_url'),
  description: text('description'),
  metadata: jsonb('metadata'), // Additional character info like traits, role, etc.
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

// Relations
export const usersRelations = relations(users, ({ many }) => ({
  stories: many(stories),
  oauthAccounts: many(oauthAccounts),
  sessions: many(userSessions),
}));

export const oauthAccountsRelations = relations(oauthAccounts, ({ one }) => ({
  user: one(users, {
    fields: [oauthAccounts.userId],
    references: [users.id],
  }),
}));

export const userSessionsRelations = relations(userSessions, ({ one }) => ({
  user: one(users, {
    fields: [userSessions.userId],
    references: [users.id],
  }),
}));

export const storiesRelations = relations(stories, ({ one, many }) => ({
  user: one(users, {
    fields: [stories.userId],
    references: [users.id],
  }),
  pages: many(storyPages),
  characters: many(storyCharacters),
}));

export const storyPagesRelations = relations(storyPages, ({ one }) => ({
  story: one(stories, {
    fields: [storyPages.storyId],
    references: [stories.id],
  }),
}));

export const storyCharactersRelations = relations(storyCharacters, ({ one }) => ({
  story: one(stories, {
    fields: [storyCharacters.storyId],
    references: [stories.id],
  }),
}));

// Export types
export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
export type OAuthAccount = typeof oauthAccounts.$inferSelect;
export type NewOAuthAccount = typeof oauthAccounts.$inferInsert;
export type UserSession = typeof userSessions.$inferSelect;
export type NewUserSession = typeof userSessions.$inferInsert;
export type Story = typeof stories.$inferSelect;
export type NewStory = typeof stories.$inferInsert;
export type StoryPage = typeof storyPages.$inferSelect;
export type NewStoryPage = typeof storyPages.$inferInsert;
export type StoryCharacter = typeof storyCharacters.$inferSelect;
export type NewStoryCharacter = typeof storyCharacters.$inferInsert;
