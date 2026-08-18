import { Router } from 'express';
import { projectController } from '../controllers/projectController';
import { authMiddleware } from '../middlewares/authMiddleware';

const router = Router();

// Public routes
router.get('/shared/:id', projectController.getShared);

// Protect all project routes
router.use(authMiddleware);

router.get('/', projectController.getAll);
router.post('/', projectController.create);
router.get('/:id', projectController.getById);
router.put('/:id/save', projectController.saveCanvas);
router.put('/:id/rename', projectController.rename);
router.put('/:id/archive', projectController.archive);
router.put('/:id/public', projectController.togglePublic);
router.delete('/:id', projectController.delete);

export default router;
