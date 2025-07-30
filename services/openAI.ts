import OpenAI from 'openai';
import * as fs from 'fs';
import * as path from 'path';
import { Story } from './userService';

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

// In-memory storage for development (replace with database in production)
const stories: Story[] = [];
let storyIdCounter = 1;

export class StoryService {
  async createStory(storyData: {
    userId: string;
    childName: string;
    childAge: number;
    childGender: string;
    interests: string;
    theme: string;
    style: string;
    companions: string;
    pageCount: number;
    childImageUrl?: string;
  }): Promise<Story> {
    const story: Story = {
      id: storyIdCounter++,
      title: `${storyData.childName}'s Adventure`,
      status: 'generating',
      userId: storyData.userId,
      childName: storyData.childName,
      childAge: storyData.childAge,
      childGender: storyData.childGender,
      interests: storyData.interests,
      theme: storyData.theme,
      style: storyData.style,
      companions: storyData.companions,
      pageCount: storyData.pageCount,
      childImageUrl: storyData.childImageUrl,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    stories.push(story);

    // Generate story content asynchronously
    this.generateStoryContent(story).catch(error => {
      console.error(`Failed to generate story ${story.id}:`, error);
      story.status = 'failed';
      story.updatedAt = new Date();
    });

    return story;
  }

  async getUserStories(userId: string): Promise<Story[]> {
    return stories.filter(story => story.userId === userId);
  }

  async getStoryById(storyId: number): Promise<Story | null> {
    return stories.find(story => story.id === storyId) || null;
  }

  async deleteStory(storyId: number, userId: string): Promise<boolean> {
    const index = stories.findIndex(story => story.id === storyId && story.userId === userId);
    if (index !== -1) {
      stories.splice(index, 1);
      return true;
    }
    return false;
  }

  private async generateStoryContent(story: Story): Promise<void> {
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
      story.title = storyContent.title || story.title;
      story.pages = storyContent.pages || [];

      // Generate cover image
      const coverPrompt = storyContent.coverImagePrompt || 
        `Children's book cover featuring ${story.childName}, a ${story.childAge}-year-old who loves ${story.interests}`;
      
      story.coverImageUrl = await openaiService.generateImage(coverPrompt);

      // Generate images for each page
      if (story.pages) {
        for (let i = 0; i < story.pages.length; i++) {
          const page = story.pages[i];
          if (page.imagePrompt) {
            console.log(`🎨 Generating image for page ${i + 1}/${story.pages.length}`);
            page.imageUrl = await openaiService.generateImage(page.imagePrompt);
          }
        }
      }

      story.status = 'completed';
      story.updatedAt = new Date();
      
      console.log(`✅ Story generation completed for: ${story.title}`);
    } catch (error) {
      console.error('Error generating story content:', error);
      story.status = 'failed';
      story.updatedAt = new Date();
      throw error;
    }
  }

  async downloadPDF(story: Story, res: any): Promise<void> {
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

  private async generatePDF(story: Story): Promise<void> {
    // This is a placeholder for PDF generation
    // In a real implementation, you'd use a library like puppeteer, jsPDF, or PDFKit
    console.log(`📄 PDF generation for story ${story.id} would be implemented here`);
    
    // For now, just set a mock PDF URL
    const pdfDir = path.join(process.cwd(), 'generated-pdfs');
    if (!fs.existsSync(pdfDir)) {
      fs.mkdirSync(pdfDir, { recursive: true });
    }
    
    story.pdfUrl = path.join(pdfDir, `story_${story.id}.pdf`);
    
    // Create a simple placeholder PDF file
    fs.writeFileSync(story.pdfUrl, 'PDF placeholder content');
  }
}

export const storyService = new StoryService();
