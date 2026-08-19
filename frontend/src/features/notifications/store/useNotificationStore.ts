import { create } from 'zustand';
import axios from 'axios';
import { NotificationItem, NotificationPreference } from '../../../types/notification';

interface NotificationState {
  notifications: NotificationItem[];
  unreadCount: number;
  isLoading: boolean;
  preferences: NotificationPreference | null;
  isPushSupported: boolean;
  isPushSubscribed: boolean;
  permissionState: NotificationPermission;
  
  setPushState: (isSubscribed: boolean, perm: NotificationPermission) => void;
  fetchNotifications: (token: string) => Promise<void>;
  markAsRead: (id: string, token: string) => Promise<void>;
  markAllAsRead: (token: string) => Promise<void>;
  clearAll: (token: string) => Promise<void>;
  fetchPreferences: (token: string) => Promise<void>;
  updatePreferences: (prefs: Partial<NotificationPreference>, token: string) => Promise<void>;
  addNotification: (item: NotificationItem) => void;
}

export const useNotificationStore = create<NotificationState>((set) => ({
  notifications: [],
  unreadCount: 0,
  isLoading: false,
  preferences: null,
  isPushSupported: typeof window !== 'undefined' && 'serviceWorker' in navigator && 'PushManager' in window,
  isPushSubscribed: false,
  permissionState: typeof window !== 'undefined' && 'Notification' in window ? Notification.permission : 'default',

  setPushState: (isSubscribed, perm) => {
    set({ isPushSubscribed: isSubscribed, permissionState: perm });
  },

  fetchNotifications: async (token: string) => {
    if (!token) return;
    set({ isLoading: true });
    try {
      const res = await axios.get<{ notifications: NotificationItem[]; unreadCount: number }>(
        '/api/v1/notifications',
        { headers: { Authorization: `Bearer ${token}` } }
      );
      set({
        notifications: res.data.notifications,
        unreadCount: res.data.unreadCount,
        isLoading: false,
      });
    } catch (err) {
      console.error('Failed to fetch notifications:', err);
      set({ isLoading: false });
    }
  },

  markAsRead: async (id: string, token: string) => {
    if (!token) return;
    try {
      await axios.put(`/api/v1/notifications/${id}/read`, {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      set((state) => ({
        notifications: state.notifications.map((n) =>
          n.id === id ? { ...n, isRead: true } : n
        ),
        unreadCount: Math.max(0, state.unreadCount - 1),
      }));
    } catch (err) {
      console.error('Failed to mark notification as read:', err);
    }
  },

  markAllAsRead: async (token: string) => {
    if (!token) return;
    try {
      await axios.put('/api/v1/notifications/read-all', {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      set((state) => ({
        notifications: state.notifications.map((n) => ({ ...n, isRead: true })),
        unreadCount: 0,
      }));
    } catch (err) {
      console.error('Failed to mark all notifications as read:', err);
    }
  },

  clearAll: async (token: string) => {
    if (!token) return;
    try {
      await axios.delete('/api/v1/notifications/clear-all', {
        headers: { Authorization: `Bearer ${token}` }
      });
      set({ notifications: [], unreadCount: 0 });
    } catch (err) {
      console.error('Failed to clear notifications:', err);
    }
  },

  fetchPreferences: async (token: string) => {
    if (!token) return;
    try {
      const res = await axios.get<NotificationPreference>('/api/v1/notifications/preferences', {
        headers: { Authorization: `Bearer ${token}` }
      });
      set({ preferences: res.data });
    } catch (err) {
      console.error('Failed to fetch notification preferences:', err);
    }
  },

  updatePreferences: async (prefs: Partial<NotificationPreference>, token: string) => {
    if (!token) return;
    try {
      const res = await axios.put<NotificationPreference>(
        '/api/v1/notifications/preferences',
        prefs,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      set({ preferences: res.data });
    } catch (err) {
      console.error('Failed to update preferences:', err);
    }
  },

  addNotification: (item: NotificationItem) => {
    set((state) => {
      // Avoid duplicate by ID
      if (state.notifications.some((n) => n.id === item.id)) return state;
      return {
        notifications: [item, ...state.notifications],
        unreadCount: item.isRead ? state.unreadCount : state.unreadCount + 1,
      };
    });
  },
}));
