"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.notificationService = exports.getSocketServer = exports.setSocketServer = void 0;
const db_1 = require("../config/db");
const vapid_1 = require("../config/vapid");
let ioInstance = null;
const setSocketServer = (io) => {
    ioInstance = io;
};
exports.setSocketServer = setSocketServer;
const getSocketServer = () => ioInstance;
exports.getSocketServer = getSocketServer;
exports.notificationService = {
    /**
     * Dispatches an in-app and Web Push notification to a specific user.
     */
    dispatch: async (payload) => {
        try {
            const { userId, projectId, type, title, body, data } = payload;
            // 1. Fetch user preferences if set
            const pref = await db_1.prisma.notificationPreference.findUnique({
                where: { userId }
            });
            // Filter based on user preferences
            if (pref) {
                if (type.startsWith('CHAT_') && !pref.chatPushEnabled)
                    return null;
                if (type.startsWith('AI_') && !pref.aiPushEnabled)
                    return null;
                if (type.startsWith('COMMENT_') && !pref.commentPushEnabled)
                    return null;
                if (pref.mentionsOnly && type === 'CHAT_MESSAGE')
                    return null;
            }
            // 2. Persist notification to MySQL
            const newNotification = await db_1.prisma.notification.create({
                data: {
                    userId,
                    projectId: projectId || null,
                    type,
                    title,
                    body,
                    data: data ? JSON.stringify(data) : null,
                    isRead: false,
                }
            });
            // 3. Enforce 500 items retention limit per user
            const count = await db_1.prisma.notification.count({
                where: { userId }
            });
            if (count > 500) {
                const excessCount = count - 500;
                const oldestRecords = await db_1.prisma.notification.findMany({
                    where: { userId },
                    orderBy: { createdAt: 'asc' },
                    take: excessCount,
                    select: { id: true }
                });
                if (oldestRecords.length > 0) {
                    await db_1.prisma.notification.deleteMany({
                        where: {
                            id: { in: oldestRecords.map((r) => r.id) }
                        }
                    });
                }
            }
            // 4. Emit real-time Socket.io event for active foreground tabs
            if (ioInstance) {
                ioInstance.to(`user-${userId}`).emit('notification-received', newNotification);
            }
            // 5. Send Web Push to all registered device endpoints for this user
            const subscriptions = await db_1.prisma.pushSubscription.findMany({
                where: { userId }
            });
            if (subscriptions && subscriptions.length > 0) {
                const pushPayload = JSON.stringify({
                    title,
                    body,
                    icon: '/favicon.ico',
                    badge: '/favicon.ico',
                    data: {
                        ...data,
                        notificationId: newNotification.id,
                        url: data?.url || (projectId ? `/app/${projectId}` : '/dashboard'),
                    },
                    actions: [
                        {
                            action: 'open',
                            title: data?.x !== undefined ? '📍 View on Canvas' : '💬 Open'
                        },
                        {
                            action: 'dismiss',
                            title: 'Dismiss'
                        }
                    ]
                });
                const sendPromises = subscriptions.map(async (sub) => {
                    const pushSubscriptionObject = {
                        endpoint: sub.endpoint,
                        keys: {
                            p256dh: sub.p256dh,
                            auth: sub.auth,
                        }
                    };
                    try {
                        await vapid_1.webpush.sendNotification(pushSubscriptionObject, pushPayload);
                    }
                    catch (err) {
                        // Prune dead subscriptions (410 Gone / 404 Not Found)
                        if (err.statusCode === 410 || err.statusCode === 404) {
                            console.log(`Pruning expired push subscription: ${sub.id}`);
                            await db_1.prisma.pushSubscription.delete({
                                where: { id: sub.id }
                            }).catch(() => { });
                        }
                        else {
                            console.warn(`Web push delivery error for subscription ${sub.id}:`, err.message || err);
                        }
                    }
                });
                await Promise.allSettled(sendPromises);
            }
            return newNotification;
        }
        catch (error) {
            console.error('Failed to dispatch notification:', error);
            return null;
        }
    },
    /**
     * Dispatches notifications to multiple users at once.
     */
    dispatchMany: async (userIds, payload) => {
        const uniqueUserIds = Array.from(new Set(userIds));
        return Promise.allSettled(uniqueUserIds.map((userId) => exports.notificationService.dispatch({
            ...payload,
            userId,
        })));
    }
};
