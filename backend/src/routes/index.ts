import { Router } from 'express';
import authRoutes from './authRoutes';
import projectRoutes from './projectRoutes';

const router = Router();

router.use('/auth', authRoutes);
router.use('/projects', projectRoutes);

export default router;
