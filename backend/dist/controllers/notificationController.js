"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.notificationController = void 0;
const db_1 = require("../config/db");
const env_1 = require("../config/env");
exports.notificationController = {
    // 1. Get public VAPID key
    getVapidPublicKey: async (_req, res) => {
        return res.json({
            publicKey: env_1.config.vapidPublicKey
        });
    },
    // 2. Subscribe user device for Web Push
    subscribe: async (req, res) => {
        try {
            const user = req.user;
            const { endpoint, keys, userAgent } = req.body;
            if (!endpoint || !keys || !keys.p256dh || !keys.auth) {
                return res.status(400).json({ error: 'Valid push subscription endpoint and keys are required' });
            }
            // Check if this endpoint already exists for user
            const existing = await db_1.prisma.pushSubscription.findFirst({
                where: {
                    userId: user.id,
                    endpoint
                }
            });
            if (existing) {
                const updated = await db_1.prisma.pushSubscription.update({
                    where: { id: existing.id },
                    data: {
                        p256dh: keys.p256dh,
                        auth: keys.auth,
                        userAgent: userAgent || null,
                    }
                });
                return res.json(updated);
            }
            const newSub = await db_1.prisma.pushSubscription.create({
                data: {
                    userId: user.id,
                    endpoint,
                    p256dh: keys.p256dh,
                    auth: keys.auth,
                    userAgent: userAgent || null,
                }
            });
            return res.status(201).json(newSub);
        }
        catch (error) {
            console.error('Failed to register push subscription:', error);
            return res.status(500).json({ error: 'Failed to subscribe to push notifications' });
        }
    },
    // 3. Unsubscribe user device
    unsubscribe: async (req, res) => {
        try {
            const user = req.user;
            const { endpoint } = req.body;
            if (!endpoint) {
                return res.status(400).json({ error: 'Endpoint is required' });
            }
            await db_1.prisma.pushSubscription.deleteMany({
                where: {
                    userId: user.id,
                    endpoint
                }
            });
            return res.json({ message: 'Unsubscribed successfully' });
        }
        catch (error) {
            console.error('Failed to unsubscribe:', error);
            return res.status(500).json({ error: 'Failed to unsubscribe' });
        }
    },
    // 4. Get paginated notifications for current user
    getNotifications: async (req, res) => {
        try {
            const user = req.user;
            const limit = parseInt(req.query.limit) || 30;
            const unreadOnly = req.query.unread === 'true';
            const whereClause = { userId: user.id };
            if (unreadOnly) {
                whereClause.isRead = false;
            }
            const [notifications, unreadCount] = await Promise.all([
                db_1.prisma.notification.findMany({
                    where: whereClause,
                    orderBy: { createdAt: 'desc' },
                    take: limit
                }),
                db_1.prisma.notification.count({
                    where: {
                        userId: user.id,
                        isRead: false
                    }
                })
            ]);
            const parsedNotifications = notifications.map((n) => ({
                ...n,
                data: n.data ? (typeof n.data === 'string' ? JSON.parse(n.data) : n.data) : null
            }));
            return res.json({
                notifications: parsedNotifications,
                unreadCount
            });
        }
        catch (error) {
            console.error('Failed to fetch notifications:', error);
            return res.status(500).json({ error: 'Failed to fetch notifications' });
        }
    },
    // 5. Mark single notification as read
    markAsRead: async (req, res) => {
        try {
            const user = req.user;
            const { id } = req.params;
            const notification = await db_1.prisma.notification.findFirst({
                where: {
                    id,
                    userId: user.id
                }
            });
            if (!notification) {
                return res.status(404).json({ error: 'Notification not found' });
            }
            const updated = await db_1.prisma.notification.update({
                where: { id },
                data: { isRead: true }
            });
            return res.json(updated);
        }
        catch (error) {
            console.error('Failed to mark notification as read:', error);
            return res.status(500).json({ error: 'Failed to update notification' });
        }
    },
    // 6. Mark all as read
    markAllAsRead: async (req, res) => {
        try {
            const user = req.user;
            await db_1.prisma.notification.updateMany({
                where: {
                    userId: user.id,
                    isRead: false
                },
                data: { isRead: true }
            });
            return res.json({ message: 'All notifications marked as read' });
        }
        catch (error) {
            console.error('Failed to mark all as read:', error);
            return res.status(500).json({ error: 'Failed to update notifications' });
        }
    },
    // 7. Clear all notifications
    clearAll: async (req, res) => {
        try {
            const user = req.user;
            await db_1.prisma.notification.deleteMany({
                where: {
                    userId: user.id
                }
            });
            return res.json({ message: 'All notifications cleared' });
        }
        catch (error) {
            console.error('Failed to clear notifications:', error);
            return res.status(500).json({ error: 'Failed to clear notifications' });
        }
    },
    // 8. Get notification preferences
    getPreferences: async (req, res) => {
        try {
            const user = req.user;
            let pref = await db_1.prisma.notificationPreference.findUnique({
                where: { userId: user.id }
            });
            if (!pref) {
                pref = await db_1.prisma.notificationPreference.create({
                    data: {
                        userId: user.id,
                        chatPushEnabled: true,
                        aiPushEnabled: true,
                        commentPushEnabled: true,
                        soundEnabled: true,
                        mentionsOnly: false,
                    }
                });
            }
            return res.json(pref);
        }
        catch (error) {
            console.error('Failed to get notification preferences:', error);
            return res.status(500).json({ error: 'Failed to get preferences' });
        }
    },
    // 9. Update notification preferences
    updatePreferences: async (req, res) => {
        try {
            const user = req.user;
            const { chatPushEnabled, aiPushEnabled, commentPushEnabled, soundEnabled, mentionsOnly } = req.body;
            const updated = await db_1.prisma.notificationPreference.upsert({
                where: { userId: user.id },
                update: {
                    chatPushEnabled: chatPushEnabled !== undefined ? Boolean(chatPushEnabled) : undefined,
                    aiPushEnabled: aiPushEnabled !== undefined ? Boolean(aiPushEnabled) : undefined,
                    commentPushEnabled: commentPushEnabled !== undefined ? Boolean(commentPushEnabled) : undefined,
                    soundEnabled: soundEnabled !== undefined ? Boolean(soundEnabled) : undefined,
                    mentionsOnly: mentionsOnly !== undefined ? Boolean(mentionsOnly) : undefined,
                },
                create: {
                    userId: user.id,
                    chatPushEnabled: chatPushEnabled ?? true,
                    aiPushEnabled: aiPushEnabled ?? true,
                    commentPushEnabled: commentPushEnabled ?? true,
                    soundEnabled: soundEnabled ?? true,
                    mentionsOnly: mentionsOnly ?? false,
                }
            });
            return res.json(updated);
        }
        catch (error) {
            console.error('Failed to update notification preferences:', error);
            return res.status(500).json({ error: 'Failed to update preferences' });
        }
    }
};
