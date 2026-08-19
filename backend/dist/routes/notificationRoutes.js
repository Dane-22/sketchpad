"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const notificationController_1 = require("../controllers/notificationController");
const authMiddleware_1 = require("../middlewares/authMiddleware");
const router = (0, express_1.Router)();
// Public route to retrieve VAPID public key
router.get('/vapid-key', notificationController_1.notificationController.getVapidPublicKey);
// Protected routes (require JWT)
router.use(authMiddleware_1.authMiddleware);
router.post('/subscribe', notificationController_1.notificationController.subscribe);
router.post('/unsubscribe', notificationController_1.notificationController.unsubscribe);
router.get('/', notificationController_1.notificationController.getNotifications);
router.put('/read-all', notificationController_1.notificationController.markAllAsRead);
router.put('/:id/read', notificationController_1.notificationController.markAsRead);
router.delete('/clear-all', notificationController_1.notificationController.clearAll);
router.get('/preferences', notificationController_1.notificationController.getPreferences);
router.put('/preferences', notificationController_1.notificationController.updatePreferences);
exports.default = router;
