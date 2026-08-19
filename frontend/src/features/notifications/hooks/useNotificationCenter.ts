import { useEffect, useCallback } from 'react';
import { socket } from '../../planner/utils/socket';
import { useAuthStore } from '../../auth/store/useAuthStore';
import { useNotificationStore } from '../store/useNotificationStore';
import { playNotificationChime } from '../utils/sound';
import { NotificationItem } from '../../../types/notification';

export const useNotificationCenter = () => {
  const token = useAuthStore((state) => state.token);
  const currentUser = useAuthStore((state) => state.user);

  const {
    notifications,
    unreadCount,
    isLoading,
    preferences,
    fetchNotifications,
    markAsRead,
    markAllAsRead,
    clearAll,
    fetchPreferences,
    updatePreferences,
    addNotification,
  } = useNotificationStore();

  // Load notifications and preferences on mount / login
  useEffect(() => {
    if (token) {
      fetchNotifications(token);
      fetchPreferences(token);
    }
  }, [token, fetchNotifications, fetchPreferences]);

  // Handle incoming real-time socket notifications
  useEffect(() => {
    if (!currentUser?.id) return;

    if (!socket.connected) {
      socket.connect();
    }

    // Join user-specific socket room
    socket.emit('identify-user', currentUser.id);

    const handleNotificationReceived = (item: NotificationItem) => {
      // Add notification to state store
      addNotification(item);

      // Play synthesized chime if sound is enabled
      const isSoundEnabled = preferences?.soundEnabled !== false;
      if (isSoundEnabled) {
        if (item.type.startsWith('AI_')) {
          playNotificationChime('ai');
        } else if (item.type === 'CHAT_MENTION') {
          playNotificationChime('mention');
        } else {
          playNotificationChime('default');
        }
      }
    };

    socket.on('notification-received', handleNotificationReceived);

    return () => {
      socket.off('notification-received', handleNotificationReceived);
    };
  }, [currentUser?.id, preferences?.soundEnabled, addNotification]);

  const handleMarkAsRead = useCallback(
    (id: string) => {
      if (token) markAsRead(id, token);
    },
    [token, markAsRead]
  );

  const handleMarkAllAsRead = useCallback(() => {
    if (token) markAllAsRead(token);
  }, [token, markAllAsRead]);

  const handleClearAll = useCallback(() => {
    if (token) clearAll(token);
  }, [token, clearAll]);

  const handleUpdatePreferences = useCallback(
    (prefs: any) => {
      if (token) updatePreferences(prefs, token);
    },
    [token, updatePreferences]
  );

  return {
    notifications,
    unreadCount,
    isLoading,
    preferences,
    markAsRead: handleMarkAsRead,
    markAllAsRead: handleMarkAllAsRead,
    clearAll: handleClearAll,
    updatePreferences: handleUpdatePreferences,
  };
};
