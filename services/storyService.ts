import { Story, StoryPage, CreateStoryRequest } from '../models/schemas';
import fs from 'fs';
import { userService } from './userService';
import { eq, desc, asc, and } from 'drizzle-orm';
import { db } from '../db/config';
import {
  stories,
  storyPages,
  storyCharacters,
  type NewStory,
  type NewStoryPage,
  type NewStoryCharacter,
} from '../db/schema';
import { gcsService } from './gcsService';
import { openaiService } from './openAI';

export class StoryService {
  async createStory(
    userId: string,
    storyData: CreateStoryRequest,
  ): Promise<any> {
    try {
      console.log('🏭 StoryService.createStory called with:', {
        userId,
        storyData,
      });

      // Check if user has reached story limit
      console.log('🔍 Checking story limit for user:', userId);
      const hasReachedLimit = await userService.hasReachedStoryLimit(userId);
      if (hasReachedLimit) {
        console.log('❌ User has reached story limit');
        throw new Error(
          'Story generation limit reached for current subscription',
        );
      }
      console.log('✅ Story limit check passed');

      // Child image is already uploaded to GCS via middleware if provided
      // No need to re-upload here, just use the provided URL

      // Create story in database
      const newStory: NewStory = {
        userId,
        title: `${storyData.childName}'s Adventure`,
        childName: storyData.childName,
        childAge: storyData.childAge,
        childGender: storyData.childGender,
        interests: storyData.interests ? [storyData.interests] : [],
        theme: storyData.theme,
        setting: null,
        companions: storyData.companions ? [storyData.companions] : [],
        pageCount: storyData.pageCount,
        childImageUrl: storyData.childImageUrl || null,
        status: 'generating',
      };

      console.log('💾 Inserting story into database:', newStory);
      const insertedStories = await db
        .insert(stories)
        .values(newStory)
        .returning();
      const story = insertedStories[0];
      console.log('✅ Story inserted successfully:', story.id);

      // Generate story content asynchronously
      console.log('🎨 Starting async story content generation');
      this.generateStoryContent(story).catch((error) => {
        console.error(`Failed to generate story ${story.id}:`, error);
        this.updateStoryStatus(story.id, 'failed');
      });

      // Increment user's story count
      console.log('📊 Incrementing user story count');
      await userService.incrementStoryCount(userId);
      console.log('✅ User story count updated');

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

  async getStoryById(storyId: number): Promise<any> {
    try {
      const story = await db
        .select()
        .from(stories)
        .where(eq(stories.id, storyId))
        .limit(1);

      if (story.length === 0) {
        return null;
      }

      const storyData = story[0];

      // Get story pages
      const pages = await db
        .select()
        .from(storyPages)
        .where(eq(storyPages.storyId, storyId))
        .orderBy(asc(storyPages.pageNumber));

      // Get story characters
      const characters = await db
        .select()
        .from(storyCharacters)
        .where(eq(storyCharacters.storyId, storyId));

      // If PDF URL exists and is a GCS path, generate a fresh signed URL
      let pdfDownloadUrl = storyData.pdfUrl;
      if (pdfDownloadUrl && gcsService.isConfigured()) {
        try {
          // Check if it's a GCS URL, generate fresh signed URL
          if (
            pdfDownloadUrl.includes('googleapis.com') ||
            pdfDownloadUrl.includes('storage.cloud.google.com')
          ) {
            const pdfPath = gcsService.generateAssetPath(
              storyId,
              storyData.userId,
              'pdf',
              'story.pdf',
            );
            pdfDownloadUrl = await gcsService.getSignedUrl(
              pdfPath,
              24 * 60 * 60,
            ); // 24 hour expiry
          }
        } catch (error) {
          console.error('Error generating PDF signed URL:', error);
          // Keep original URL if signed URL generation fails
        }
      }

      return {
        ...storyData,
        pages,
        characters,
        pdfDownloadUrl,
      };
    } catch (error) {
      console.error('Error fetching story by ID:', error);
      throw error;
    }
  }

  async getStoryPages(storyId: number): Promise<any[]> {
    try {
      const pages = await db
        .select()
        .from(storyPages)
        .where(eq(storyPages.storyId, storyId))
        .orderBy(asc(storyPages.pageNumber));

      return pages;
    } catch (error) {
      console.error('Error fetching story pages:', error);
      return [];
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

  async updateStoryStatus(
    storyId: number,
    status: 'generating' | 'completed' | 'failed',
  ): Promise<void> {
    try {
      await db
        .update(stories)
        .set({
          status: status as any,
          updatedAt: new Date(),
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
        story.pageCount,
      );

      // Update story with generated content
      await db
        .update(stories)
        .set({
          title: storyContent.title || story.title,
          updatedAt: new Date(),
        })
        .where(eq(stories.id, story.id));

      // Generate and upload cover image to GCS
      const coverPrompt =
        storyContent.coverImagePrompt ||
        `Children's book cover featuring ${story.childName}, a ${story.childAge}-year-old who loves ${story.interests}`;

      console.log(`🎨 Generating and uploading cover image...`);
      const coverImageUrl = await openaiService.generateImage(coverPrompt);

      // Upload cover image to GCS
      const coverGCSPath = gcsService.generateAssetPath(
        story.id,
        story.userId,
        'thumbnails',
        'cover.png',
      );
      const coverGCSUrl = await gcsService.uploadImageFromUrl(
        coverImageUrl,
        coverGCSPath,
        'image/png',
      );

      await db
        .update(stories)
        .set({ thumbnailUrl: coverGCSUrl })
        .where(eq(stories.id, story.id));

      // Save story pages and generate images with GCS upload
      if (storyContent.pages) {
        for (let i = 0; i < storyContent.pages.length; i++) {
          const page = storyContent.pages[i];

          // Insert page with content first
          const newPage: NewStoryPage = {
            storyId: story.id,
            pageNumber: i + 1,
            content: page.text,
            imagePrompt: page.imagePrompt,
            status: 'generating',
          };

          const insertedPages = await db
            .insert(storyPages)
            .values(newPage)
            .returning();
          const pageId = insertedPages[0].id;

          try {
            // Generate image for page
            if (page.imagePrompt) {
              console.log(
                `🎨 Generating image for page ${i + 1}/${storyContent.pages.length}`,
              );
              const tempImageUrl = await openaiService.generateImage(
                page.imagePrompt,
              );

              // Upload to GCS
              const pageGCSPath = gcsService.generateAssetPath(
                story.id,
                story.userId,
                'pages',
                `page_${i + 1}.png`,
              );
              const pageGCSUrl = await gcsService.uploadImageFromUrl(
                tempImageUrl,
                pageGCSPath,
                'image/png',
              );

              // Update page with GCS URL
              await db
                .update(storyPages)
                .set({
                  imageUrl: pageGCSUrl,
                  status: 'completed',
                })
                .where(eq(storyPages.id, pageId));

              console.log(
                `✅ Page ${i + 1} image uploaded to GCS: ${pageGCSPath}`,
              );
            } else {
              // No image for this page
              await db
                .update(storyPages)
                .set({ status: 'completed' })
                .where(eq(storyPages.id, pageId));
            }
          } catch (pageError) {
            console.error(`❌ Error processing page ${i + 1}:`, pageError);
            await db
              .update(storyPages)
              .set({ status: 'failed' })
              .where(eq(storyPages.id, pageId));
          }
        }
      }

      // Generate PDF and upload to GCS
      console.log(`📄 Generating and uploading PDF...`);
      await this.generateAndUploadPDF(story);

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
        return res.status(404).json({
          message: 'PDF not available yet. Story may still be generating.',
        });
      }

      // If pdfUrl is a GCS URL, generate a fresh signed URL for secure download
      if (
        story.pdfUrl.includes('googleapis.com') ||
        story.pdfUrl.includes('placeholder.com')
      ) {
        // Extract object path from GCS URL or use stored path
        const pdfPath = gcsService.generateAssetPath(
          story.id,
          story.userId,
          'pdf',
          'story.pdf',
        );
        const signedUrl = await gcsService.getSignedUrl(pdfPath, 10 * 60); // 10 minute expiry

        res.json({ pdfUrl: signedUrl });
      } else {
        // Legacy local file handling (for backward compatibility)
        if (fs.existsSync(story.pdfUrl)) {
          const filename = `${story.title.replace(/[^a-z0-9]/gi, '_').toLowerCase()}.pdf`;
          res.setHeader(
            'Content-Disposition',
            `attachment; filename="${filename}"`,
          );
          res.setHeader('Content-Type', 'application/pdf');

          const fileStream = fs.createReadStream(story.pdfUrl);
          fileStream.pipe(res);
        } else {
          throw new Error('PDF file not found');
        }
      }
    } catch (error) {
      console.error('Error downloading PDF:', error);
      res.status(500).json({ message: 'Failed to download PDF' });
    }
  }

  private async generateAndUploadPDF(story: any): Promise<void> {
    try {
      console.log(`📄 Generating PDF for story ${story.id}: ${story.title}`);

      // Get all story pages with content and images
      const pages = await db
        .select()
        .from(storyPages)
        .where(eq(storyPages.storyId, story.id))
        .orderBy(asc(storyPages.pageNumber));

      // For now, create a simple text-based PDF
      // In production, you'd want to use a proper PDF library like puppeteer, jsPDF, or PDFKit
      const pdfContent = this.generateSimplePDF(story, pages);
      const pdfBuffer = Buffer.from(pdfContent);

      // Upload PDF to GCS
      const pdfPath = gcsService.generateAssetPath(
        story.id,
        story.userId,
        'pdf',
        'story.pdf',
      );
      const pdfUrl = await gcsService.uploadBuffer(
        pdfBuffer,
        pdfPath,
        'application/pdf',
      );

      // Update story with PDF URL
      await db.update(stories).set({ pdfUrl }).where(eq(stories.id, story.id));

      console.log(`✅ PDF uploaded to GCS: ${pdfPath}`);
    } catch (error) {
      console.error('Error generating and uploading PDF:', error);
      throw error;
    }
  }

  private generateSimplePDF(story: any, pages: any[]): string {
    // This is a placeholder - in production you'd use a proper PDF library
    let pdfContent = `PDF: ${story.title}\n\n`;
    pdfContent += `Child: ${story.childName}, Age: ${story.childAge}\n`;
    pdfContent += `Theme: ${story.theme}\n\n`;

    pages.forEach((page, index) => {
      pdfContent += `--- Page ${page.pageNumber} ---\n`;
      pdfContent += `${page.content}\n\n`;
      if (page.imageUrl) {
        pdfContent += `[Image: ${page.imageUrl}]\n\n`;
      }
    });

    return pdfContent;
  }

  // Legacy method maintained for backward compatibility
  private async generatePDF(story: any): Promise<void> {
    console.warn(
      '⚠️ generatePDF is deprecated. Use generateAndUploadPDF instead.',
    );
    return this.generateAndUploadPDF(story);
  }

  // Character management methods
  async createStoryCharacter(
    storyId: number,
    characterData: {
      name: string;
      description?: string;
      imageUrl?: string;
      metadata?: any;
    },
  ): Promise<any> {
    try {
      const newCharacter: NewStoryCharacter = {
        storyId,
        name: characterData.name,
        description: characterData.description,
        imageUrl: characterData.imageUrl,
        metadata: characterData.metadata,
      };

      const insertedCharacters = await db
        .insert(storyCharacters)
        .values(newCharacter)
        .returning();
      return insertedCharacters[0];
    } catch (error) {
      console.error('Error creating story character:', error);
      throw error;
    }
  }

  async getStoryCharacters(storyId: number): Promise<any[]> {
    try {
      const characters = await db
        .select()
        .from(storyCharacters)
        .where(eq(storyCharacters.storyId, storyId));

      return characters;
    } catch (error) {
      console.error('Error fetching story characters:', error);
      throw error;
    }
  }

  async uploadCharacterImage(
    storyId: number,
    userId: string,
    characterId: number,
    imageBuffer: Buffer,
  ): Promise<string> {
    try {
      const imagePath = gcsService.generateAssetPath(
        storyId,
        userId,
        'characters',
        `character_${characterId}.png`,
      );
      const imageUrl = await gcsService.uploadBuffer(
        imageBuffer,
        imagePath,
        'image/png',
      );

      // Update character with image URL
      await db
        .update(storyCharacters)
        .set({ imageUrl })
        .where(eq(storyCharacters.id, characterId));

      return imageUrl;
    } catch (error) {
      console.error('Error uploading character image:', error);
      throw error;
    }
  }
}

export const storyService = new StoryService();
