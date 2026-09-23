import { inMemoryStore } from '../database/inMemoryStore.js';
import { supabase, isSupabaseConfigured } from '../database/supabase.js';

export async function getMyNotifications(req, res) {
  const userId = req.user ? req.user.id : null;
  if (!userId) return res.status(401).json({ error: 'Unauthorized' });

  // 1. Supabase Database Query
  if (isSupabaseConfigured && supabase) {
    try {
      const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (!error && data) {
        const notifs = data.map(n => ({
          id: n.id,
          userId: n.user_id,
          title: n.title,
          message: n.message,
          type: n.type || 'SYSTEM',
          isRead: n.read,
          createdAt: n.created_at
        }));
        const unreadCount = notifs.filter(n => !n.isRead).length;
        return res.json({ unreadCount, notifications: notifs });
      }
    } catch (e) {}
  }

  // 2. Demo fallback
  const userNotifs = inMemoryStore.notifications
    .filter(n => n.userId === userId)
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

  const unreadCount = userNotifs.filter(n => !n.isRead).length;

  return res.json({
    unreadCount,
    notifications: userNotifs
  });
}

export async function markAsRead(req, res) {
  const userId = req.user ? req.user.id : null;
  const { id } = req.params;

  if (isSupabaseConfigured && supabase && userId) {
    try {
      if (id === 'all') {
        await supabase
          .from('notifications')
          .update({ read: true })
          .eq('user_id', userId);
      } else {
        await supabase
          .from('notifications')
          .update({ read: true })
          .eq('id', id);
      }
      return res.json({ message: 'Notifications updated.' });
    } catch (e) {}
  }

  if (id === 'all') {
    inMemoryStore.notifications
      .filter(n => n.userId === userId)
      .forEach(n => { n.isRead = true; });
    return res.json({ message: 'All notifications marked as read.' });
  }

  const notif = inMemoryStore.notifications.find(n => n.id === id && n.userId === userId);
  if (notif) notif.isRead = true;

  return res.json({ message: 'Notification marked as read.' });
}

export async function clearNotifications(req, res) {
  const userId = req.user ? req.user.id : null;

  if (isSupabaseConfigured && supabase && userId) {
    try {
      await supabase.from('notifications').delete().eq('user_id', userId);
      return res.json({ message: 'Notifications cleared.' });
    } catch (e) {}
  }

  inMemoryStore.notifications = inMemoryStore.notifications.filter(n => n.userId !== userId);
  return res.json({ message: 'Notifications cleared.' });
}

export async function getPreferences(req, res) {
  const userId = req.user ? req.user.id : null;

  if (isSupabaseConfigured && supabase && userId) {
    try {
      const { data } = await supabase
        .from('notification_preferences')
        .select('*')
        .eq('user_id', userId)
        .maybeSingle();

      if (data) {
        return res.json({
          userId: data.user_id,
          emergencyAlerts: data.emergency_alerts !== false,
          nearbyRequests: data.nearby_requests !== false,
          inventoryAlerts: data.inventory_alerts !== false,
          pushEnabled: Boolean(data.sms_notifications)
        });
      }
    } catch (e) {}
  }

  let pref = inMemoryStore.notificationPreferences.find(p => p.userId === userId);
  if (!pref) {
    pref = { userId, emergencyAlerts: true, nearbyRequests: true, inventoryAlerts: true, pushEnabled: false };
    inMemoryStore.notificationPreferences.push(pref);
  }

  return res.json(pref);
}

export async function updatePreferences(req, res) {
  const userId = req.user ? req.user.id : null;
  const { emergencyAlerts, nearbyRequests, inventoryAlerts, pushEnabled } = req.body;

  if (isSupabaseConfigured && supabase && userId) {
    try {
      await supabase
        .from('notification_preferences')
        .upsert([{
          user_id: userId,
          emergency_alerts: Boolean(emergencyAlerts),
          nearby_requests: Boolean(nearbyRequests),
          inventory_alerts: Boolean(inventoryAlerts),
          sms_notifications: Boolean(pushEnabled),
          updated_at: new Date().toISOString()
        }]);
    } catch (e) {}
  }

  let pref = inMemoryStore.notificationPreferences.find(p => p.userId === userId);
  if (!pref) {
    pref = { userId, emergencyAlerts: true, nearbyRequests: true, inventoryAlerts: true, pushEnabled: false };
    inMemoryStore.notificationPreferences.push(pref);
  }

  if (emergencyAlerts !== undefined) pref.emergencyAlerts = Boolean(emergencyAlerts);
  if (nearbyRequests !== undefined) pref.nearbyRequests = Boolean(nearbyRequests);
  if (inventoryAlerts !== undefined) pref.inventoryAlerts = Boolean(inventoryAlerts);
  if (pushEnabled !== undefined) pref.pushEnabled = Boolean(pushEnabled);

  return res.json({ message: 'Notification preferences updated.', preferences: pref });
}

export async function savePushSubscription(req, res) {
  const userId = req.user ? req.user.id : null;
  const { subscription } = req.body;

  if (!subscription || !subscription.endpoint) {
    return res.status(400).json({ error: 'Valid Web Push subscription payload required.' });
  }

  inMemoryStore.pushSubscriptions.push({
    userId,
    subscription,
    createdAt: new Date().toISOString()
  });

  return res.json({ message: 'Push subscription registered successfully.' });
}
