"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const aiController_1 = require("../controllers/aiController");
const authMiddleware_1 = require("../middlewares/authMiddleware");
const router = (0, express_1.Router)();
// Protect AI assistant routes
router.use(authMiddleware_1.authMiddleware);
router.post('/chat', aiController_1.aiController.chat);
exports.default = router;
