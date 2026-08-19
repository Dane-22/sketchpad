// ENG PLANNER Service Worker for Web Push Notifications

self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

// Handle incoming Web Push message
self.addEventListener('push', (event) => {
  let data = {};
  if (event.data) {
    try {
      data = event.data.json();
    } catch (e) {
      data = {
        title: 'ENG PLANNER',
        body: event.data.text()
      };
    }
  }

  const title = data.title || 'ENG PLANNER Notification';
  const options = {
    body: data.body || 'You have a new update in ENG PLANNER.',
    icon: data.icon || '/favicon.ico',
    badge: data.badge || '/favicon.ico',
    tag: data.data?.channelId || data.data?.notificationId || 'eng-planner-notification',
    data: data.data || {},
    actions: data.actions || [
      { action: 'open', title: 'Open Workspace' },
      { action: 'dismiss', title: 'Dismiss' }
    ],
    vibrate: [100, 50, 100],
    requireInteraction: false
  };

  event.waitUntil(
    self.registration.showNotification(title, options)
  );
});

// Handle notification click
self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  if (event.action === 'dismiss') {
    return;
  }

  const data = event.notification.data || {};
  let targetUrl = data.url || '/dashboard';

  // If specific coordinates are provided
  if (data.x !== undefined && data.y !== undefined) {
    const separator = targetUrl.includes('?') ? '&' : '?';
    if (!targetUrl.includes('x=')) {
      targetUrl += `${separator}x=${data.x}&y=${data.y}`;
    }
  }

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      // If a window is already open, focus it and navigate
      for (const client of clientList) {
        if ('focus' in client) {
          client.focus();
          if ('navigate' in client) {
            client.navigate(targetUrl);
          }
          // Post message to client for immediate canvas or chat jump
          client.postMessage({
            type: 'NOTIFICATION_CLICKED',
            data
          });
          return;
        }
      }
      // If no window is open, open a new browser window
      if (self.clients.openWindow) {
        return self.clients.openWindow(targetUrl);
      }
    })
  );
});
