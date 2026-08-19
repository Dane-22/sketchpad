import { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { useAuthStore } from '../../auth/store/useAuthStore';
import { useNotificationStore } from '../store/useNotificationStore';

function urlBase64ToUint8Array(base64String: string) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding)
    .replace(/-/g, '+')
    .replace(/_/g, '/');

  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);

  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

export const usePushNotifications = () => {
  const [isRegistering, setIsRegistering] = useState(false);
  const token = useAuthStore((state) => state.token);
  const { isPushSupported, isPushSubscribed, permissionState, setPushState } = useNotificationStore();

  // Check current browser subscription status on mount
  const checkSubscription = useCallback(async () => {
    if (!isPushSupported) return;

    try {
      if ('serviceWorker' in navigator) {
        await navigator.serviceWorker.register('/sw.js', { scope: '/' });
        const registration = await navigator.serviceWorker.ready;
        const subscription = await registration.pushManager.getSubscription();
        const currentPermission = Notification.permission;

        setPushState(!!subscription, currentPermission);
      }
    } catch (err) {
      console.warn('Could not inspect push subscription:', err);
    }
  }, [isPushSupported, setPushState]);

  useEffect(() => {
    checkSubscription();
  }, [checkSubscription]);

  // Subscribe user to native push notifications
  const subscribeToPush = async () => {
    const activeToken = useAuthStore.getState().token || token;
    if (!isPushSupported || !activeToken) return false;

    setIsRegistering(true);
    try {
      // 1. Request permission
      const permission = await Notification.requestPermission();
      if (permission !== 'granted') {
        setPushState(false, permission);
        setIsRegistering(false);
        return false;
      }

      // 2. Register Service Worker & wait until ready
      await navigator.serviceWorker.register('/sw.js', { scope: '/' });
      const registration = await navigator.serviceWorker.ready;

      // 3. Fetch VAPID public key from backend
      const keyRes = await axios.get<{ publicKey: string }>('/api/v1/notifications/vapid-key', {
        headers: { Authorization: `Bearer ${activeToken}` }
      });
      const applicationServerKey = urlBase64ToUint8Array(keyRes.data.publicKey);

      // 4. Check existing subscription or create new
      let subscription = await registration.pushManager.getSubscription();
      if (!subscription) {
        subscription = await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey
        });
      }

      // 5. Send subscription JSON to backend
      const subscriptionJson = subscription.toJSON();
      await axios.post(
        '/api/v1/notifications/subscribe',
        {
          endpoint: subscription.endpoint,
          keys: subscriptionJson.keys,
          userAgent: navigator.userAgent
        },
        {
          headers: { Authorization: `Bearer ${activeToken}` }
        }
      );

      setPushState(true, 'granted');
      setIsRegistering(false);
      return true;
    } catch (error) {
      console.error('Failed to subscribe to push notifications:', error);
      setIsRegistering(false);
      return false;
    }
  };

  // Unsubscribe user from native push notifications
  const unsubscribeFromPush = async () => {
    if (!isPushSupported || !token) return false;

    setIsRegistering(true);
    try {
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.getSubscription();

      if (subscription) {
        await axios.post(
          '/api/v1/notifications/unsubscribe',
          { endpoint: subscription.endpoint },
          { headers: { Authorization: `Bearer ${token}` } }
        );
        await subscription.unsubscribe();
      }

      setPushState(false, Notification.permission);
      setIsRegistering(false);
      return true;
    } catch (error) {
      console.error('Failed to unsubscribe from push notifications:', error);
      setIsRegistering(false);
      return false;
    }
  };

  return {
    isPushSupported,
    isPushSubscribed,
    permissionState,
    isRegistering,
    subscribeToPush,
    unsubscribeFromPush,
    checkSubscription,
  };
};
