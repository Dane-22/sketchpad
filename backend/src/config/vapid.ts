import webpush from 'web-push';
import { config } from './env';

export const initVapid = () => {
  if (config.vapidPublicKey && config.vapidPrivateKey) {
    try {
      webpush.setVapidDetails(
        config.vapidSubject,
        config.vapidPublicKey,
        config.vapidPrivateKey
      );
      console.log('✅ WebPush VAPID details initialized successfully');
    } catch (err) {
      console.error('❌ Failed to initialize WebPush VAPID details:', err);
    }
  } else {
    console.warn('⚠️ VAPID public/private keys are missing. Web push notifications will be disabled.');
  }
};

export { webpush };
