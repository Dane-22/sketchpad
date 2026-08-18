"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const commentController_1 = require("../controllers/commentController");
const authMiddleware_1 = require("../middlewares/authMiddleware");
const router = (0, express_1.Router)();
// Protect all comment routes
router.use(authMiddleware_1.authMiddleware);
// Project comment list & creation
router.get('/projects/:projectId/comments', commentController_1.commentController.getComments);
router.post('/projects/:projectId/comments', commentController_1.commentController.createComment);
// Thread replies, resolving, and deleting
router.post('/comments/:commentId/replies', commentController_1.commentController.addReply);
router.patch('/comments/:commentId/resolve', commentController_1.commentController.toggleResolve);
router.delete('/comments/:commentId', commentController_1.commentController.deleteComment);
exports.default = router;
