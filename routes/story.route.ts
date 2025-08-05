import { Router } from 'express';
import { storyController } from '../controllers/story.controller';
import { authenticateJWT } from '../middlewares/passportAuthMiddleware';
import { uploadSingleImage } from '../middlewares/uploadMiddleware';

const router = Router();

// Apply authentication middleware to all routes
router.use(authenticateJWT);

// Story routes
router.get('/', storyController.getStories.bind(storyController));
router.get('/:id', storyController.getStoryById.bind(storyController));
router.get('/:id/pages', storyController.getStoryPages.bind(storyController));
router.post('/', uploadSingleImage('childImage'), storyController.createStory.bind(storyController));
router.get('/:id/download', storyController.downloadStory.bind(storyController));
router.get('/:id/pdf', storyController.getStoryPDF.bind(storyController));

export default router;
