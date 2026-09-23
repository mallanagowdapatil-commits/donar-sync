// DonorSync Service Worker for PWA Offline Shell & Web Push Notifications
const CACHE_NAME = 'donorsync-v2.0';

self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

// Push notification received
self.addEventListener('push', (event) => {
  let payload = { title: 'DonorSync Emergency Alert', body: 'New critical blood match available nearby.' };
  try {
    if (event.data) {
      payload = event.data.json();
    }
  } catch (e) {
    payload.body = event.data.text();
  }

  const options = {
    body: payload.body,
    icon: '/favicon.ico',
    badge: '/favicon.ico',
    vibrate: [200, 100, 200],
    data: payload.data || {},
    actions: [
      { action: 'view', title: 'View Request' }
    ]
  };

  event.waitUntil(
    self.registration.showNotification(payload.title, options)
  );
});

// User clicked notification
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  event.waitUntil(
    clients.matchAll({ type: 'window' }).then((clientList) => {
      for (const client of clientList) {
        if (client.url === '/' && 'focus' in client) {
          return client.focus();
        }
      }
      if (clients.openWindow) {
        return clients.openWindow('/dashboard/donor');
      }
    })
  );
});
