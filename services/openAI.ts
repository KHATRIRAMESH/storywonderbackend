import OpenAI from 'openai';
import * as fs from 'fs';
import * as path from 'path';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export class OpenAIService {
  async generateStory(
    childName: string,
    childAge: number,
    interests: string,
    pageCount: number = 10,
  ) {
    try {
      const prompt = `Create a magical children's story for ${childName}, age ${childAge}, who loves ${interests}. 
      The story should be ${pageCount} pages long and include adventure, friendship, and valuable life lessons.
      
      Return a JSON object with:
      - title: The story title
      - pages: Array of ${pageCount} pages, each with "text" and "imagePrompt" fields
      - coverImagePrompt: Description for the cover illustration
      
      Make it age-appropriate, engaging, and magical.`;

      const response = await openai.chat.completions.create({
        model: 'gpt-4o', // Latest model
        messages: [{ role: 'user', content: prompt }],
        response_format: { type: 'json_object' },
        temperature: 0.8,
      });

      const content = response.choices[0].message.content;
      if (!content) throw new Error('No content generated');

      return JSON.parse(content);
    } catch (error: any) {
      console.error('Story generation error:', error);
      throw new Error(`Failed to generate story: ${error.message}`);
    }
  }

  private sanitizeImagePrompt(prompt: string): string {
    // Remove potentially problematic words and replace with safe alternatives
    const safeMappings = {
      weapon: 'toy',
      sword: 'magic wand',
      gun: 'water squirter',
      knife: 'utensil',
      fight: 'play',
      battle: 'adventure',
      war: 'game',
      kill: 'help',
      death: 'sleep',
      dead: 'resting',
      blood: 'red paint',
      violence: 'fun',
      scary: 'exciting',
      frightening: 'mysterious',
    };

    let sanitized = prompt.toLowerCase();
    for (const [bad, good] of Object.entries(safeMappings)) {
      sanitized = sanitized.replace(new RegExp(bad, 'gi'), good);
    }

    return sanitized;
  }

  async generateImage(prompt: string): Promise<string> {
    try {
      // First attempt with sanitized prompt
      const sanitizedPrompt = this.sanitizeImagePrompt(prompt);
      const safePrompt = `Cute children's book illustration: ${sanitizedPrompt}. Colorful, whimsical, friendly characters, cartoon style, safe for all ages, bright and cheerful.`;

      console.log(
        `🎨 Generating image with prompt: ${safePrompt.substring(0, 100)}...`,
      );

      const response = await openai.images.generate({
        model: 'dall-e-3',
        prompt: safePrompt,
        n: 1,
        size: '1024x1024',
        quality: 'standard',
      });

      const imageUrl = response.data?.[0]?.url;
      if (imageUrl) {
        console.log(`✅ Image generated successfully`);
        return imageUrl;
      }

      throw new Error('No image URL returned');
    } catch (error: any) {
      console.error('Primary image generation failed:', error.message);

      // If content policy violation, try with extremely safe fallback
      if (
        error.message?.includes('content_policy_violation') ||
        error.message?.includes('content filters')
      ) {
        console.log('🔄 Trying fallback safe image generation...');

        try {
          const ultraSafePrompt = `Happy cartoon illustration for children: cute animals in a magical garden with flowers and rainbows. Bright colors, friendly faces, storybook art style.`;

          const fallbackResponse = await openai.images.generate({
            model: 'dall-e-3',
            prompt: ultraSafePrompt,
            n: 1,
            size: '1024x1024',
            quality: 'standard',
          });

          const fallbackUrl = fallbackResponse.data?.[0]?.url;
          if (fallbackUrl) {
            console.log(`✅ Fallback image generated successfully`);
            return fallbackUrl;
          }
        } catch (fallbackError) {
          console.error(
            'Fallback image generation also failed:',
            fallbackError,
          );
        }
      }

      // If all fails, return placeholder
      console.log('🎨 Using placeholder image for content policy compliance');
      return 'https://via.placeholder.com/1024x1024/87CEEB/FFFFFF?text=Story+Illustration';
    }
  }
}

export const openaiService = new OpenAIService();

import pool from '../config/database';
import { Story, StoryPage, CreateStoryRequest, StoryWithPages } from '../models/schemas';
import { userService } from './userService';
import { eq, desc, asc, and } from 'drizzle-orm';
import { db } from '../db/config';
import { stories, storyPages, type NewStory, type NewStoryPage } from '../db/schema';

export class StoryService {
  async createStory(userId: string, storyData: CreateStoryRequest): Promise<any> {
    try {
      // Check if user has reached story limit
      const hasReachedLimit = await userService.hasReachedStoryLimit(userId);
      if (hasReachedLimit) {
        throw new Error('Story generation limit reached for current subscription');
      }

      // Create story in database
      const newStory: NewStory = {
        userId,
        title: `${storyData.childName}'s Adventure`,
        childName: storyData.childName,
        childAge: storyData.childAge,
        childGender: storyData.childGender,
        interests: storyData.interests ? [storyData.interests] : [],
        theme: storyData.theme,
        style: storyData.style,
        companions: storyData.companions ? [storyData.companions] : [],
        pageCount: storyData.pageCount,
        childImageUrl: storyData.childImageUrl || null,
        status: 'generating'
      };

      const insertedStories = await db.insert(stories).values(newStory).returning();
      const story = insertedStories[0];

      // Generate story content asynchronously
      this.generateStoryContent(story).catch(error => {
        console.error(`Failed to generate story ${story.id}:`, error);
        this.updateStoryStatus(story.id, 'failed');
      });

      // Increment user's story count
      await userService.incrementStoryCount(userId);

      return story;
    } catch (error) {
      console.error('Error creating story:', error);
      throw error;
    }
  }

  async getUserStories(userId: string): Promise<any[]> {
    try {
      const userStories = await db
        .select()
        .from(stories)
        .where(eq(stories.userId, userId))
        .orderBy(desc(stories.createdAt));

      return userStories;
    } catch (error) {
      console.error('Error fetching user stories:', error);
      return [];
    }
  }

  async getStoryById(storyId: number): Promise<any | null> {
    try {
      // Get story
      const story = await db
        .select()
        .from(stories)
        .where(eq(stories.id, storyId))
        .limit(1);

      if (story.length === 0) {
        return null;
      }

      // Get story pages
      const pages = await db
        .select()
        .from(storyPages)
        .where(eq(storyPages.storyId, storyId))
        .orderBy(asc(storyPages.pageNumber));

      return {
        ...story[0],
        pages
      };
    } catch (error) {
      console.error('Error fetching story:', error);
      return null;
    }
  }

  async deleteStory(storyId: number, userId: string): Promise<boolean> {
    try {
      const result = await db
        .delete(stories)
        .where(and(eq(stories.id, storyId), eq(stories.userId, userId)))
        .returning({ id: stories.id });

      return result.length > 0;
    } catch (error) {
      console.error('Error deleting story:', error);
      return false;
    }
  }

  async updateStoryStatus(storyId: number, status: 'generating' | 'completed' | 'failed'): Promise<void> {
    try {
      await db
        .update(stories)
        .set({ 
          status: status as any,
          updatedAt: new Date()
        })
        .where(eq(stories.id, storyId));
    } catch (error) {
      console.error('Error updating story status:', error);
    }
  }

  private async generateStoryContent(story: any): Promise<void> {
    try {
      console.log(`🚀 Starting story generation for: ${story.title}`);
      
      // Generate the story content
      const storyContent = await openaiService.generateStory(
        story.childName,
        story.childAge,
        story.interests,
        story.pageCount
      );

      // Update story with generated content
      await db
        .update(stories)
        .set({ 
          title: storyContent.title || story.title,
          updatedAt: new Date()
        })
        .where(eq(stories.id, story.id));

      // Generate cover image
      const coverPrompt = storyContent.coverImagePrompt || 
        `Children's book cover featuring ${story.childName}, a ${story.childAge}-year-old who loves ${story.interests}`;
      
      const coverImageUrl = await openaiService.generateImage(coverPrompt);
      
      await db
        .update(stories)
        .set({ thumbnailUrl: coverImageUrl })
        .where(eq(stories.id, story.id));

      // Save story pages and generate images
      if (storyContent.pages) {
        for (let i = 0; i < storyContent.pages.length; i++) {
          const page = storyContent.pages[i];
          
          // Insert page
          const newPage: NewStoryPage = {
            storyId: story.id,
            pageNumber: i + 1,
            content: page.text,
            imagePrompt: page.imagePrompt
          };

          const insertedPages = await db.insert(storyPages).values(newPage).returning();
          const pageId = insertedPages[0].id;

          // Generate image for page
          if (page.imagePrompt) {
            console.log(`🎨 Generating image for page ${i + 1}/${storyContent.pages.length}`);
            const imageUrl = await openaiService.generateImage(page.imagePrompt);
            
            await db
              .update(storyPages)
              .set({ imageUrl })
              .where(eq(storyPages.id, pageId));
          }
        }
      }

      await this.updateStoryStatus(story.id, 'completed');
      
      console.log(`✅ Story generation completed for: ${story.title}`);
    } catch (error) {
      console.error('Error generating story content:', error);
      await this.updateStoryStatus(story.id, 'failed');
      throw error;
    }
  }

  async downloadPDF(story: any, res: any): Promise<void> {
    try {
      if (!story.pdfUrl) {
        // Generate PDF if it doesn't exist
        await this.generatePDF(story);
      }

      if (story.pdfUrl && fs.existsSync(story.pdfUrl)) {
        const filename = `${story.title.replace(/[^a-z0-9]/gi, '_').toLowerCase()}.pdf`;
        res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
        res.setHeader('Content-Type', 'application/pdf');
        
        const fileStream = fs.createReadStream(story.pdfUrl);
        fileStream.pipe(res);
      } else {
        throw new Error('PDF file not found');
      }
    } catch (error) {
      console.error('Error downloading PDF:', error);
      throw error;
    }
  }

  private async generatePDF(story: any): Promise<void> {
    try {
      console.log(`📄 PDF generation for story ${story.id} would be implemented here`);
      
      // For now, just set a mock PDF URL
      const pdfDir = path.join(process.cwd(), 'generated-pdfs');
      if (!fs.existsSync(pdfDir)) {
        fs.mkdirSync(pdfDir, { recursive: true });
      }
      
      const pdfPath = path.join(pdfDir, `story_${story.id}.pdf`);
      
      // Create a simple placeholder PDF file
      fs.writeFileSync(pdfPath, 'PDF placeholder content');
      
      // Update story with PDF URL
      await db
        .update(stories)
        .set({ pdfUrl: pdfPath })
        .where(eq(stories.id, story.id));
      
      story.pdfUrl = pdfPath;
    } catch (error) {
      console.error('Error generating PDF:', error);
      throw error;
    }
  }
}

export const storyService = new StoryService();
