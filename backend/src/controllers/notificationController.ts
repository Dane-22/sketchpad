import { Request, Response } from 'express';
import { prisma } from '../config/db';
import { config } from '../config/env';

export const notificationController = {
  // 1. Get public VAPID key
  getVapidPublicKey: async (_req: Request, res: Response) => {
    return res.json({
      publicKey: config.vapidPublicKey
    });
  },

  // 2. Subscribe user device for Web Push
  subscribe: async (req: Request, res: Response) => {
    try {
      const user = (req as any).user;
      const { endpoint, keys, userAgent } = req.body;

      if (!endpoint || !keys || !keys.p256dh || !keys.auth) {
        return res.status(400).json({ error: 'Valid push subscription endpoint and keys are required' });
      }

      // Check if this endpoint already exists for user
      const existing = await (prisma as any).pushSubscription.findFirst({
        where: {
          userId: user.id,
          endpoint
        }
      });

      if (existing) {
        const updated = await (prisma as any).pushSubscription.update({
          where: { id: existing.id },
          data: {
            p256dh: keys.p256dh,
            auth: keys.auth,
            userAgent: userAgent || null,
          }
        });
        return res.json(updated);
      }

      const newSub = await (prisma as any).pushSubscription.create({
        data: {
          userId: user.id,
          endpoint,
          p256dh: keys.p256dh,
          auth: keys.auth,
          userAgent: userAgent || null,
        }
      });

      return res.status(201).json(newSub);
    } catch (error: any) {
      console.error('Failed to register push subscription:', error);
      return res.status(500).json({ error: 'Failed to subscribe to push notifications' });
    }
  },

  // 3. Unsubscribe user device
  unsubscribe: async (req: Request, res: Response) => {
    try {
      const user = (req as any).user;
      const { endpoint } = req.body;

      if (!endpoint) {
        return res.status(400).json({ error: 'Endpoint is required' });
      }

      await (prisma as any).pushSubscription.deleteMany({
        where: {
          userId: user.id,
          endpoint
        }
      });

      return res.json({ message: 'Unsubscribed successfully' });
    } catch (error: any) {
      console.error('Failed to unsubscribe:', error);
      return res.status(500).json({ error: 'Failed to unsubscribe' });
    }
  },

  // 4. Get paginated notifications for current user
  getNotifications: async (req: Request, res: Response) => {
    try {
      const user = (req as any).user;
      const limit = parseInt(req.query.limit as string) || 30;
      const unreadOnly = req.query.unread === 'true';

      const whereClause: any = { userId: user.id };
      if (unreadOnly) {
        whereClause.isRead = false;
      }

      const [notifications, unreadCount] = await Promise.all([
        (prisma as any).notification.findMany({
          where: whereClause,
          orderBy: { createdAt: 'desc' },
          take: limit
        }),
        (prisma as any).notification.count({
          where: {
            userId: user.id,
            isRead: false
          }
        })
      ]);

      const parsedNotifications = notifications.map((n: any) => ({
        ...n,
        data: n.data ? (typeof n.data === 'string' ? JSON.parse(n.data) : n.data) : null
      }));

      return res.json({
        notifications: parsedNotifications,
        unreadCount
      });
    } catch (error: any) {
      console.error('Failed to fetch notifications:', error);
      return res.status(500).json({ error: 'Failed to fetch notifications' });
    }
  },

  // 5. Mark single notification as read
  markAsRead: async (req: Request, res: Response) => {
    try {
      const user = (req as any).user;
      const { id } = req.params;

      const notification = await (prisma as any).notification.findFirst({
        where: {
          id,
          userId: user.id
        }
      });

      if (!notification) {
        return res.status(404).json({ error: 'Notification not found' });
      }

      const updated = await (prisma as any).notification.update({
        where: { id },
        data: { isRead: true }
      });

      return res.json(updated);
    } catch (error: any) {
      console.error('Failed to mark notification as read:', error);
      return res.status(500).json({ error: 'Failed to update notification' });
    }
  },

  // 6. Mark all as read
  markAllAsRead: async (req: Request, res: Response) => {
    try {
      const user = (req as any).user;

      await (prisma as any).notification.updateMany({
        where: {
          userId: user.id,
          isRead: false
        },
        data: { isRead: true }
      });

      return res.json({ message: 'All notifications marked as read' });
    } catch (error: any) {
      console.error('Failed to mark all as read:', error);
      return res.status(500).json({ error: 'Failed to update notifications' });
    }
  },

  // 7. Clear all notifications
  clearAll: async (req: Request, res: Response) => {
    try {
      const user = (req as any).user;

      await (prisma as any).notification.deleteMany({
        where: {
          userId: user.id
        }
      });

      return res.json({ message: 'All notifications cleared' });
    } catch (error: any) {
      console.error('Failed to clear notifications:', error);
      return res.status(500).json({ error: 'Failed to clear notifications' });
    }
  },

  // 8. Get notification preferences
  getPreferences: async (req: Request, res: Response) => {
    try {
      const user = (req as any).user;

      let pref = await (prisma as any).notificationPreference.findUnique({
        where: { userId: user.id }
      });

      if (!pref) {
        pref = await (prisma as any).notificationPreference.create({
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
    } catch (error: any) {
      console.error('Failed to get notification preferences:', error);
      return res.status(500).json({ error: 'Failed to get preferences' });
    }
  },

  // 9. Update notification preferences
  updatePreferences: async (req: Request, res: Response) => {
    try {
      const user = (req as any).user;
      const { chatPushEnabled, aiPushEnabled, commentPushEnabled, soundEnabled, mentionsOnly } = req.body;

      const updated = await (prisma as any).notificationPreference.upsert({
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
    } catch (error: any) {
      console.error('Failed to update notification preferences:', error);
      return res.status(500).json({ error: 'Failed to update preferences' });
    }
  }
};
