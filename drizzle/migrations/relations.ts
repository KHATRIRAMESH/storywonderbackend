import { relations } from "drizzle-orm/relations";
import { users, stories, storyPages } from "./schema";

export const storiesRelations = relations(stories, ({one, many}) => ({
	user: one(users, {
		fields: [stories.userId],
		references: [users.id]
	}),
	storyPages: many(storyPages),
}));

export const usersRelations = relations(users, ({many}) => ({
	stories: many(stories),
}));

export const storyPagesRelations = relations(storyPages, ({one}) => ({
	story: one(stories, {
		fields: [storyPages.storyId],
		references: [stories.id]
	}),
}));