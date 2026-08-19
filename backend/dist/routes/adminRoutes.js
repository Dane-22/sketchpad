"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const adminController_1 = require("../controllers/adminController");
const authMiddleware_1 = require("../middlewares/authMiddleware");
const superAdminMiddleware_1 = require("../middlewares/superAdminMiddleware");
const router = (0, express_1.Router)();
// Protect all admin routes with authentication & super admin / admin privilege
router.use(authMiddleware_1.authMiddleware);
router.use(superAdminMiddleware_1.superAdminMiddleware);
// User management endpoints
router.get('/users', adminController_1.adminController.getUsers);
router.get('/users/stats', adminController_1.adminController.getUserStats);
router.put('/users/:id/approve', adminController_1.adminController.approveUser);
router.put('/users/:id/reject', adminController_1.adminController.rejectUser);
router.put('/users/:id/role', adminController_1.adminController.updateUserRole);
router.delete('/users/:id', adminController_1.adminController.deleteUser);
exports.default = router;
