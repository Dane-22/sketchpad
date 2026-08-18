import { Router } from 'express';
import { chatController } from '../controllers/chatController';
import { authMiddleware } from '../middlewares/authMiddleware';

const router = Router();

// Protect all chat routes
router.use(authMiddleware);

// Channels & Groups
router.get('/projects/:projectId/channels', chatController.getProjectChannels);
router.post('/projects/:projectId/channels', chatController.createChannel);

// Messages
router.get('/channels/:channelId/messages', chatController.getChannelMessages);
router.post('/channels/:channelId/messages', chatController.sendMessage);

// Members
router.post('/channels/:channelId/members', chatController.addChannelMembers);
router.delete('/channels/:channelId/members/:userId', chatController.removeChannelMember);

// Available users list for member selection
router.get('/users/available', chatController.getAvailableUsers);

export default router;
