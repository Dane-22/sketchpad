import { Router } from 'express';
import { commentController } from '../controllers/commentController';
import { authMiddleware } from '../middlewares/authMiddleware';

const router = Router();

// Protect all comment routes
router.use(authMiddleware);

// Project comment list & creation
router.get('/projects/:projectId/comments', commentController.getComments);
router.post('/projects/:projectId/comments', commentController.createComment);

// Thread replies, resolving, and deleting
router.post('/comments/:commentId/replies', commentController.addReply);
router.patch('/comments/:commentId/resolve', commentController.toggleResolve);
router.delete('/comments/:commentId', commentController.deleteComment);

export default router;
