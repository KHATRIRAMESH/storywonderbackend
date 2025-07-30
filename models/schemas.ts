// Database table schemas and types

export interface User {
  id: string; // Clerk user ID
  email: string;
  firstName?: string;
  lastName?: string;
  profileImageUrl?: string;
  subscriptionLevel: 'free' | 'premium' | 'unlimited';
  subscriptionExpiresAt?: Date;
  storiesCreated: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface Story {
  id: number;
  userId: string;
  title: string;
  status: 'generating' | 'completed' | 'failed';
  childName: string;
  childAge: number;
  childGender: string;
  interests: string;
  theme: string;
  style: string;
  companions: string;
  pageCount: number;
  childImageUrl?: string;
  coverImageUrl?: string;
  pdfUrl?: string;
  isPublic: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface StoryPage {
  id: number;
  storyId: number;
  pageNumber: number;
  text: string;
  imagePrompt?: string;
  imageUrl?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateStoryRequest {
  childName: string;
  childAge: number;
  childGender: string;
  interests: string;
  theme: string;
  companions: string;
  pageCount: number;
  childImageUrl?: string;
}

export interface StoryWithPages extends Story {
  pages?: StoryPage[];
}
