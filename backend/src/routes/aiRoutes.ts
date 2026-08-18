import { Router } from 'express';
import { aiController } from '../controllers/aiController';
import { authMiddleware } from '../middlewares/authMiddleware';

const router = Router();

// Protect AI assistant routes
router.use(authMiddleware);

router.post('/chat', aiController.chat);

export default router;
