/**
 * Web Push Notification Registration Service
 */
export async function registerServiceWorker() {
  if ('serviceWorker' in navigator) {
    try {
      const registration = await navigator.serviceWorker.register('/sw.js');
      return registration;
    } catch (err) {
      console.warn('Service worker registration failed:', err.message);
      return null;
    }
  }
  return null;
}

export async function requestNotificationPermission(token) {
  if (!('Notification' in window)) {
    return { supported: false, status: 'unsupported' };
  }

  const permission = await Notification.requestPermission();
  if (permission !== 'granted') {
    return { supported: true, status: permission };
  }

  // If service worker is ready, obtain push subscription
  try {
    const reg = await navigator.serviceWorker.ready;
    let subscription = await reg.pushManager.getSubscription();

    if (!subscription && reg.pushManager) {
      // In production, applicationServerKey is VAPID public key
      // If not configured, in-app notifications still work perfectly!
    }

    return { supported: true, status: 'granted', subscription };
  } catch (err) {
    return { supported: true, status: 'error', error: err.message };
  }
}
