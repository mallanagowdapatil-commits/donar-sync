import React, { useState, useEffect, useRef } from 'react';
import { Bell, Check, CheckCheck, Trash2, Settings, AlertCircle, Droplet, Package, Info, X, Sparkles, QrCode } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export default function NotificationCenter() {
  const { token, user } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [showPreferences, setShowPreferences] = useState(false);
  const [preferences, setPreferences] = useState({
    emergencyAlerts: true,
    nearbyRequests: true,
    inventoryAlerts: true,
    pushEnabled: false
  });
  const dropdownRef = useRef();

  const fetchNotifications = async () => {
    if (!token) return;
    try {
      const res = await fetch('/api/notifications/my', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setNotifications(data.notifications || []);
        setUnreadCount(data.unreadCount || 0);
      }
    } catch (err) {
      // Silent error handling for background polling
    }
  };

  const fetchPreferences = async () => {
    if (!token) return;
    try {
      const res = await fetch('/api/notifications/preferences', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setPreferences(data);
      }
    } catch (err) {}
  };

  useEffect(() => {
    if (user && token) {
      fetchNotifications();
      fetchPreferences();
      // Periodic check every 15 seconds
      const interval = setInterval(fetchNotifications, 15000);
      return () => clearInterval(interval);
    }
  }, [user, token]);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleMarkAsRead = async (id) => {
    try {
      await fetch(`/api/notifications/${id}/read`, {
        method: 'PATCH',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      setNotifications(prev => prev.map(n => (id === 'all' || n.id === id ? { ...n, isRead: true } : n)));
      if (id === 'all') setUnreadCount(0);
      else setUnreadCount(prev => Math.max(0, prev - 1));
    } catch (err) {}
  };

  const handleClear = async () => {
    try {
      await fetch('/api/notifications/clear', {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      setNotifications([]);
      setUnreadCount(0);
    } catch (err) {}
  };

  const handleSavePreferences = async (newPrefs) => {
    setPreferences(newPrefs);
    try {
      await fetch('/api/notifications/preferences', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(newPrefs)
      });
    } catch (err) {}
  };

  const getIcon = (type) => {
    switch (type) {
      case 'EMERGENCY_REQUEST':
        return <AlertCircle className="h-4 w-4 text-red-500 shrink-0 mt-0.5" />;
      case 'NEARBY_MATCH':
      case 'REQUEST_ACCEPTED':
        return <Droplet className="h-4 w-4 text-brand-primary shrink-0 mt-0.5" />;
      case 'LOW_STOCK_ALERT':
        return <Package className="h-4 w-4 text-yellow-500 shrink-0 mt-0.5" />;
      case 'SYSTEM':
      case 'LOGIN':
        return <Sparkles className="h-4 w-4 text-green-400 shrink-0 mt-0.5" />;
      default:
        return <Info className="h-4 w-4 text-blue-400 shrink-0 mt-0.5" />;
    }
  };

  if (!user) return null;

  return (
    <div className="relative font-sans" ref={dropdownRef}>
      {/* Bell Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-900 transition-all cursor-pointer"
        title="Notifications"
      >
        <Bell className="h-5 w-5" />
        {unreadCount > 0 && (
          <span className="absolute top-1 right-1 flex items-center justify-center min-w-[18px] h-[18px] px-1 rounded-full bg-brand-primary text-white text-[10px] font-extrabold neon-glow-red animate-pulse">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {/* Notification Dropdown Panel */}
      {isOpen && (
        <div className="absolute right-0 mt-2 w-80 sm:w-96 rounded-2xl glass-panel border border-clinical-border shadow-2xl z-50 overflow-hidden text-left animate-in fade-in slide-in-from-top-2 duration-200">
          {/* Header */}
          <div className="p-4 border-b border-slate-800 flex justify-between items-center">
            <div className="flex items-center space-x-2">
              <Bell className="h-4 w-4 text-brand-primary" />
              <h4 className="text-sm font-bold text-white">Notifications</h4>
              {unreadCount > 0 && (
                <span className="text-[10px] bg-brand-primary/10 text-brand-primary font-bold px-2 py-0.5 rounded-full border border-brand-primary/20">
                  {unreadCount} New
                </span>
              )}
            </div>

            <div className="flex items-center space-x-1 text-xs">
              <button
                onClick={() => handleMarkAsRead('all')}
                title="Mark all as read"
                className="p-1 rounded text-slate-400 hover:text-white transition-colors cursor-pointer"
              >
                <CheckCheck className="h-4 w-4" />
              </button>
              <button
                onClick={() => setShowPreferences(true)}
                title="Notification Settings"
                className="p-1 rounded text-slate-400 hover:text-white transition-colors cursor-pointer"
              >
                <Settings className="h-4 w-4" />
              </button>
              <button
                onClick={handleClear}
                title="Clear all"
                className="p-1 rounded text-slate-400 hover:text-red-400 transition-colors cursor-pointer"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          </div>

          {/* List */}
          <div className="max-h-80 overflow-y-auto divide-y divide-slate-800/60">
            {notifications.length === 0 ? (
              <div className="p-8 text-center space-y-1">
                <Bell className="h-8 w-8 text-slate-600 mx-auto" />
                <p className="text-xs font-semibold text-slate-400">All caught up!</p>
                <p className="text-[10px] text-slate-500">No emergency alerts or pending dispatches.</p>
              </div>
            ) : (
              notifications.map(notif => (
                <div
                  key={notif.id}
                  onClick={() => !notif.isRead && handleMarkAsRead(notif.id)}
                  className={`p-3.5 flex items-start space-x-3 transition-colors cursor-pointer ${
                    notif.isRead ? 'bg-transparent hover:bg-slate-900/40' : 'bg-brand-primary/5 hover:bg-brand-primary/10'
                  }`}
                >
                  {getIcon(notif.type)}
                  <div className="flex-1 space-y-1">
                    <p className={`text-xs font-bold ${notif.isRead ? 'text-slate-300' : 'text-white'}`}>
                      {notif.title}
                    </p>
                    <p className="text-[11px] text-slate-400 leading-snug">
                      {notif.message}
                    </p>
                    <p className="text-[9px] text-slate-500">
                      {new Date(notif.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </p>
                  </div>
                  {!notif.isRead && (
                    <span className="w-2 h-2 rounded-full bg-brand-primary mt-1.5 shrink-0"></span>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* Preferences Modal */}
      {showPreferences && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="w-full max-w-md rounded-2xl glass-panel border border-clinical-border p-6 space-y-6 animate-in zoom-in-95 duration-150">
            <div className="flex justify-between items-center border-b border-slate-800 pb-3">
              <div className="flex items-center space-x-2">
                <Settings className="h-5 w-5 text-brand-primary" />
                <h3 className="text-base font-bold text-white">Notification Preferences</h3>
              </div>
              <button
                onClick={() => setShowPreferences(false)}
                className="text-slate-400 hover:text-white p-1"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-4 text-xs">
              <label className="flex items-center justify-between p-3 rounded-xl bg-slate-900/60 border border-slate-800">
                <div>
                  <p className="font-bold text-slate-200">Emergency Blood Alerts</p>
                  <p className="text-[10px] text-slate-400">Receive alerts when critical blood requests match your type.</p>
                </div>
                <input
                  type="checkbox"
                  checked={preferences.emergencyAlerts}
                  onChange={(e) => handleSavePreferences({ ...preferences, emergencyAlerts: e.target.checked })}
                  className="w-4 h-4 accent-brand-primary rounded cursor-pointer"
                />
              </label>

              <label className="flex items-center justify-between p-3 rounded-xl bg-slate-900/60 border border-slate-800">
                <div>
                  <p className="font-bold text-slate-200">Nearby Radar Matches</p>
                  <p className="text-[10px] text-slate-400">Notify when local hospitals within 25km scan for donors.</p>
                </div>
                <input
                  type="checkbox"
                  checked={preferences.nearbyRequests}
                  onChange={(e) => handleSavePreferences({ ...preferences, nearbyRequests: e.target.checked })}
                  className="w-4 h-4 accent-brand-primary rounded cursor-pointer"
                />
              </label>

              <label className="flex items-center justify-between p-3 rounded-xl bg-slate-900/60 border border-slate-800">
                <div>
                  <p className="font-bold text-slate-200">Inventory Shortage Alerts</p>
                  <p className="text-[10px] text-slate-400">Alert blood banks when stocks hit critical safety target levels.</p>
                </div>
                <input
                  type="checkbox"
                  checked={preferences.inventoryAlerts}
                  onChange={(e) => handleSavePreferences({ ...preferences, inventoryAlerts: e.target.checked })}
                  className="w-4 h-4 accent-brand-primary rounded cursor-pointer"
                />
              </label>
            </div>

            <button
              onClick={() => setShowPreferences(false)}
              className="w-full py-2.5 rounded-lg bg-brand-primary hover:bg-brand-hover text-white font-bold text-xs transition-all cursor-pointer"
            >
              Done
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
