"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const chatController_1 = require("../controllers/chatController");
const authMiddleware_1 = require("../middlewares/authMiddleware");
const router = (0, express_1.Router)();
// Protect all chat routes
router.use(authMiddleware_1.authMiddleware);
// Channels & Groups
router.get('/projects/:projectId/channels', chatController_1.chatController.getProjectChannels);
router.post('/projects/:projectId/channels', chatController_1.chatController.createChannel);
// Messages
router.get('/channels/:channelId/messages', chatController_1.chatController.getChannelMessages);
router.post('/channels/:channelId/messages', chatController_1.chatController.sendMessage);
// Members
router.post('/channels/:channelId/members', chatController_1.chatController.addChannelMembers);
router.delete('/channels/:channelId/members/:userId', chatController_1.chatController.removeChannelMember);
// Available users list for member selection
router.get('/users/available', chatController_1.chatController.getAvailableUsers);
exports.default = router;
