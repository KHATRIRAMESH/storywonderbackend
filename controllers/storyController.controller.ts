import { Request, Response } from 'express';
import { getClerkUserId } from '../clerkAuth';
import { storyService } from '../services/openAI';
import { userService } from '../services/userService';

export class StoryController {
  async getStories(req: Request, res: Response) {
    try {
      const userId = (req as any).userId;
      console.log(`📚 Fetching stories for user: ${userId}`);
      const stories = await storyService.getUserStories(userId);
      console.log(`📚 Found ${stories.length} stories for user ${userId}`);
      console.log(
        '📚 Stories data:',
        stories.map((s: any) => ({ id: s.id, title: s.title, status: s.status })),
      );

      // Force no cache headers to ensure fresh data
      res.set({
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        Pragma: 'no-cache',
        Expires: '0',
      });

      res.json(stories);
    } catch (error) {
      console.error('Error fetching stories:', error);
      res.status(500).json({ message: 'Failed to fetch stories' });
    }
  }

  async getStoryById(req: Request, res: Response) {
    try {
      const userId = (req as any).userId;
      const storyId = parseInt(req.params.id);
      if (isNaN(storyId)) {
        return res.status(400).json({ message: 'Invalid story ID' });
      }

      const story = await storyService.getStoryById(storyId);
      if (!story) {
        return res.status(404).json({ message: 'Story not found' });
      }

      // Check authorization
      const hasAccess = await userService.canAccessStory(userId, story);
      if (!hasAccess) {
        return res.status(403).json({ message: 'Access denied' });
      }

      res.json(story);
    } catch (error) {
      console.error('Error fetching story:', error);
      res.status(500).json({ message: 'Failed to fetch story' });
    }
  }

  async createStory(req: Request, res: Response) {
    try {
      const userId = (req as any).userId;

      const file = (req as any).file;
      const storyData = {
        childName: req.body.childName,
        childAge: parseInt(req.body.childAge),
        childGender: req.body.childGender,
        interests: req.body.interests,
        theme: req.body.theme,
        style: req.body.style,
        companions: req.body.companions,
        pageCount: parseInt(req.body.pageCount) || 10,
        childImageUrl: file ? `/uploads/${file.filename}` : undefined,
      };

      console.log(`📝 Creating story for ${storyData.childName}...`);
      const story = await storyService.createStory(userId, storyData);

      res.status(201).json(story);
    } catch (error) {
      console.error('Error creating story:', error);
      if ((error as Error).message.includes('limit reached')) {
        return res.status(429).json({ message: 'Story generation limit reached for current subscription' });
      }
      res.status(500).json({ message: 'Failed to create story' });
    }
  }

  async downloadStory(req: Request, res: Response) {
    try {
      const userId = (req as any).userId;
      const storyId = parseInt(req.params.id);
      const story = await storyService.getStoryById(storyId);

      if (!story) {
        return res.status(404).json({ message: 'Story not found' });
      }

      const hasAccess = await userService.canAccessStory(userId, story);
      if (!hasAccess) {
        return res.status(403).json({ message: 'Access denied' });
      }

      if (!story.pdfUrl) {
        return res.status(404).json({ message: 'PDF not available' });
      }

      await storyService.downloadPDF(story, res);
    } catch (error) {
      console.error('Error downloading story:', error);
      res.status(500).json({ message: 'Failed to download story' });
    }
  }
}

export const storyController = new StoryController();
