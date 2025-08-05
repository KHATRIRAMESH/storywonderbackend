import { Response } from 'express';
import { storyService } from '../services/storyService';
import { userService } from '../services/userService';
import { AuthenticatedRequest } from '../middlewares/passportAuthMiddleware';

export class StoryController {
  async getStories(req: AuthenticatedRequest, res: Response) {
    try {
      const userId = req.user?.id;
      console.log(`📚 Fetching stories for user: ${userId}`);
      const stories = await storyService.getUserStories(userId);
      console.log(`📚 Found ${stories.length} stories for user ${userId}`);
      console.log(
        '📚 Stories data:',
        stories.map((s: any) => ({
          id: s.id,
          title: s.title,
          status: s.status,
        })),
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

  async getStoryById(req: AuthenticatedRequest, res: Response) {
    try {
      const userId = req.user?.id;
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

  async createStory(req: AuthenticatedRequest, res: Response) {
    try {
      const userId = req.user?.id;

      console.log('🔍 Create story request received for user:', userId);
      console.log('🔍 Request body:', JSON.stringify(req.body, null, 2));
      console.log('🔍 Request file:', req.file ? 'Present' : 'Not present');

      // Get GCS URL from upload middleware
      const gcsFileUrl = (req as any).gcsFileUrl;
      const file = (req as any).file;

      console.log('🔍 GCS File URL:', gcsFileUrl);
      console.log(
        '🔍 File info:',
        file ? { filename: file.filename, mimetype: file.mimetype } : 'No file',
      );

      const storyData = {
        childName: req.body.childName,
        childAge: req.body.childAge ? parseInt(req.body.childAge) : 5, // Default to 5 if not provided or invalid
        childGender: req.body.childGender,
        interests: req.body.interests,
        theme: req.body.theme,
        companions: req.body.companions,
        pageCount: parseInt(req.body.pageCount) || 10,
        // Use GCS URL if available, otherwise fall back to local path for backward compatibility
        childImageUrl:
          gcsFileUrl || (file ? `/uploads/${file.filename}` : undefined),
      };

      console.log(
        '🔍 Processed story data:',
        JSON.stringify(storyData, null, 2),
      );

      // Validate required fields
      if (!storyData.childName || !storyData.theme) {
        console.log('❌ Validation failed: Missing required fields');
        return res
          .status(400)
          .json({ message: 'Child name and theme are required' });
      }

      // Ensure childAge is a valid number
      if (
        isNaN(storyData.childAge) ||
        storyData.childAge < 1 ||
        storyData.childAge > 18
      ) {
        console.log('🔧 Fixing invalid child age, setting to 5');
        storyData.childAge = 5; // Default to 5 years old
      }

      console.log(`📝 Creating story for ${storyData.childName}...`);
      if (gcsFileUrl) {
        console.log(`📷 Child image uploaded to GCS: ${gcsFileUrl}`);
      }

      const story = await storyService.createStory(userId, storyData);
      console.log('✅ Story created successfully:', story.id);

      res.status(201).json(story);
    } catch (error) {
      console.error('Error creating story:', error);
      if ((error as Error).message.includes('limit reached')) {
        return res.status(429).json({
          message: 'Story generation limit reached for current subscription',
        });
      }
      res.status(500).json({ message: 'Failed to create story' });
    }
  }

  async downloadStory(req: AuthenticatedRequest, res: Response) {
    try {
      const userId = req.user?.id;
      const storyId = parseInt(req.params.id);

      if (isNaN(storyId)) {
        return res.status(400).json({ message: 'Invalid story ID' });
      }

      const story = await storyService.getStoryById(storyId);

      if (!story) {
        return res.status(404).json({ message: 'Story not found' });
      }

      const hasAccess = await userService.canAccessStory(userId, story);
      if (!hasAccess) {
        return res.status(403).json({ message: 'Access denied' });
      }

      if (!story.pdfUrl) {
        return res.status(404).json({
          message: 'PDF not available. Story may still be generating.',
        });
      }

      await storyService.downloadPDF(story, res);
    } catch (error) {
      console.error('Error downloading story:', error);
      res.status(500).json({ message: 'Failed to download story' });
    }
  }

  async getStoryPDF(req: AuthenticatedRequest, res: Response) {
    try {
      const userId = req.user?.id;
      const storyId = parseInt(req.params.id);

      if (isNaN(storyId)) {
        return res.status(400).json({ message: 'Invalid story ID' });
      }

      const story = await storyService.getStoryById(storyId);

      if (!story) {
        return res.status(404).json({ message: 'Story not found' });
      }

      const hasAccess = await userService.canAccessStory(userId, story);
      if (!hasAccess) {
        return res.status(403).json({ message: 'Access denied' });
      }

      if (!story.pdfUrl) {
        return res.status(404).json({
          message: 'PDF not available yet. Story may still be generating.',
        });
      }

      // Return signed URL for PDF download
      res.json({ pdfUrl: story.pdfDownloadUrl || story.pdfUrl });
    } catch (error) {
      console.error('Error getting story PDF URL:', error);
      res.status(500).json({ message: 'Failed to get PDF URL' });
    }
  }

  async getStoryPages(req: AuthenticatedRequest, res: Response) {
    try {
      const userId = req.user?.id;
      const storyId = parseInt(req.params.id);

      if (isNaN(storyId)) {
        return res.status(400).json({ message: 'Invalid story ID' });
      }

      // First check if story exists and user has access
      const story = await storyService.getStoryById(storyId);
      if (!story) {
        return res.status(404).json({ message: 'Story not found' });
      }

      const hasAccess = await userService.canAccessStory(userId, story);
      if (!hasAccess) {
        return res.status(403).json({ message: 'Access denied' });
      }

      // Get story pages
      const pages = await storyService.getStoryPages(storyId);
      console.log(`📖 Found ${pages.length} pages for story ${storyId}`);

      // Force no cache headers to ensure fresh data
      res.set({
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        Pragma: 'no-cache',
        Expires: '0',
      });

      res.json(pages);
    } catch (error) {
      console.error('Error fetching story pages:', error);
      res.status(500).json({ message: 'Failed to fetch story pages' });
    }
  }
}

export const storyController = new StoryController();
