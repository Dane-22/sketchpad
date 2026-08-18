"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const projectController_1 = require("../controllers/projectController");
const authMiddleware_1 = require("../middlewares/authMiddleware");
const router = (0, express_1.Router)();
// Public routes
router.get('/shared/:id', projectController_1.projectController.getShared);
// Protect all project routes
router.use(authMiddleware_1.authMiddleware);
router.get('/', projectController_1.projectController.getAll);
router.post('/', projectController_1.projectController.create);
router.get('/:id', projectController_1.projectController.getById);
router.put('/:id/save', projectController_1.projectController.saveCanvas);
router.put('/:id/rename', projectController_1.projectController.rename);
router.put('/:id/archive', projectController_1.projectController.archive);
router.put('/:id/public', projectController_1.projectController.togglePublic);
router.delete('/:id', projectController_1.projectController.delete);
exports.default = router;
