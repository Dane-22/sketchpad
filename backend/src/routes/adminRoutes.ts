import { Router } from 'express';
import { adminController } from '../controllers/adminController';
import { authMiddleware } from '../middlewares/authMiddleware';
import { superAdminMiddleware } from '../middlewares/superAdminMiddleware';

const router = Router();

// Protect all admin routes with authentication & super admin / admin privilege
router.use(authMiddleware);
router.use(superAdminMiddleware);

// User management endpoints
router.get('/users', adminController.getUsers);
router.get('/users/stats', adminController.getUserStats);
router.put('/users/:id/approve', adminController.approveUser);
router.put('/users/:id/reject', adminController.rejectUser);
router.put('/users/:id/role', adminController.updateUserRole);
router.delete('/users/:id', adminController.deleteUser);

export default router;
