import { prisma } from '../config/db';
import { webpush } from '../config/vapid';
import { Server } from 'socket.io';

let ioInstance: Server | null = null;

export const setSocketServer = (io: Server) => {
  ioInstance = io;
};

export const getSocketServer = () => ioInstance;

export type NotificationType =
  | 'AI_ANALYSIS_COMPLETE'
  | 'AI_COPILOT_REPLY'
  | 'AI_PROACTIVE_CAD_ALERT'
  | 'CHAT_MESSAGE'
  | 'CHAT_MENTION'
  | 'CHAT_CANVAS_LOCATION'
  | 'CHAT_GROUP_INVITE'
  | 'COMMENT_PIN_ADDED'
  | 'COMMENT_REPLY_ADDED';

export interface NotificationPayload {
  userId: string;
  projectId?: string;
  type: NotificationType;
  title: string;
  body: string;
  data?: {
    channelId?: string;
    channelName?: string;
    messageId?: string;
    senderName?: string;
    x?: number;
    y?: number;
    commentId?: string;
    url?: string;
    [key: string]: any;
  };
}

export const notificationService = {
  /**
   * Dispatches an in-app and Web Push notification to a specific user.
   */
  dispatch: async (payload: NotificationPayload) => {
    try {
      const { userId, projectId, type, title, body, data } = payload;

      // 1. Fetch user preferences if set
      const pref = await (prisma as any).notificationPreference.findUnique({
        where: { userId }
      });

      // Filter based on user preferences
      if (pref) {
        if (type.startsWith('CHAT_') && !pref.chatPushEnabled) return null;
        if (type.startsWith('AI_') && !pref.aiPushEnabled) return null;
        if (type.startsWith('COMMENT_') && !pref.commentPushEnabled) return null;
        if (pref.mentionsOnly && type === 'CHAT_MESSAGE') return null;
      }

      // 2. Persist notification to MySQL
      const newNotification = await (prisma as any).notification.create({
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
      const count = await (prisma as any).notification.count({
        where: { userId }
      });

      if (count > 500) {
        const excessCount = count - 500;
        const oldestRecords = await (prisma as any).notification.findMany({
          where: { userId },
          orderBy: { createdAt: 'asc' },
          take: excessCount,
          select: { id: true }
        });

        if (oldestRecords.length > 0) {
          await (prisma as any).notification.deleteMany({
            where: {
              id: { in: oldestRecords.map((r: { id: string }) => r.id) }
            }
          });
        }
      }

      // 4. Emit real-time Socket.io event for active foreground tabs
      if (ioInstance) {
        ioInstance.to(`user-${userId}`).emit('notification-received', newNotification);
      }

      // 5. Send Web Push to all registered device endpoints for this user
      const subscriptions = await (prisma as any).pushSubscription.findMany({
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

        const sendPromises = subscriptions.map(async (sub: any) => {
          const pushSubscriptionObject = {
            endpoint: sub.endpoint,
            keys: {
              p256dh: sub.p256dh,
              auth: sub.auth,
            }
          };

          try {
            await webpush.sendNotification(pushSubscriptionObject, pushPayload);
          } catch (err: any) {
            // Prune dead subscriptions (410 Gone / 404 Not Found)
            if (err.statusCode === 410 || err.statusCode === 404) {
              console.log(`Pruning expired push subscription: ${sub.id}`);
              await (prisma as any).pushSubscription.delete({
                where: { id: sub.id }
              }).catch(() => {});
            } else {
              console.warn(`Web push delivery error for subscription ${sub.id}:`, err.message || err);
            }
          }
        });

        await Promise.allSettled(sendPromises);
      }

      return newNotification;
    } catch (error) {
      console.error('Failed to dispatch notification:', error);
      return null;
    }
  },

  /**
   * Dispatches notifications to multiple users at once.
   */
  dispatchMany: async (userIds: string[], payload: Omit<NotificationPayload, 'userId'>) => {
    const uniqueUserIds = Array.from(new Set(userIds));
    return Promise.allSettled(
      uniqueUserIds.map((userId) =>
        notificationService.dispatch({
          ...payload,
          userId,
        })
      )
    );
  }
};
