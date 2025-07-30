import { Router } from 'express';
import { storyController } from '../controllers/storyController.controller';
import { requireAuth } from '../clerkAuth';

const router = Router();

// Apply authentication middleware to all routes
router.use(requireAuth);

// Story routes
router.get('/', storyController.getStories.bind(storyController));
router.get('/:id', storyController.getStoryById.bind(storyController));
router.post('/', storyController.createStory.bind(storyController));
router.get('/:id/download', storyController.downloadStory.bind(storyController));

export default router;
