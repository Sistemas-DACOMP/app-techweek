import { useState, useEffect, useCallback } from 'react';
import {
  getNotifications,
  getUnreadCount,
  markAsRead as markAsReadLib,
  markAllAsRead as markAllAsReadLib,
  addNotification as addNotificationLib,
  removeNotification as removeNotificationLib,
  clearAllNotifications as clearAllNotificationsLib,
  syncWelcomeNotificationWithUserCreatedAt,
  EVENT_NAME
} from '../lib/notifications';

export function useNotifications() {
  const [notifications, setNotifications] = useState(() => getNotifications());
  const [unreadCount, setUnreadCount] = useState(() => getUnreadCount());

  const syncState = useCallback(() => {
    const list = getNotifications();
    setNotifications(list);
    setUnreadCount(list.filter(n => !n.read).length);
  }, []);

  useEffect(() => {
    syncState();

    const handleUpdate = () => {
      syncState();
    };

    window.addEventListener(EVENT_NAME, handleUpdate);
    window.addEventListener('storage', handleUpdate);

    // Tenta sincronizar com o created_at real da conta do usuário
    let isMounted = true;
    import('../lib/gameplay')
      .then(({ getMyProfile }) => getMyProfile())
      .then(profile => {
        if (isMounted && profile?.created_at) {
          syncWelcomeNotificationWithUserCreatedAt(profile.created_at);
        }
      })
      .catch(() => {});

    return () => {
      isMounted = false;
      window.removeEventListener(EVENT_NAME, handleUpdate);
      window.removeEventListener('storage', handleUpdate);
    };
  }, [syncState]);

  const markAsRead = useCallback((id) => {
    markAsReadLib(id);
  }, []);

  const markAllAsRead = useCallback(() => {
    markAllAsReadLib();
  }, []);

  const addNotification = useCallback((data) => {
    return addNotificationLib(data);
  }, []);

  const removeNotification = useCallback((id) => {
    removeNotificationLib(id);
  }, []);

  const clearAllNotifications = useCallback(() => {
    clearAllNotificationsLib();
  }, []);

  return {
    notifications,
    unreadCount,
    markAsRead,
    markAllAsRead,
    addNotification,
    removeNotification,
    clearAllNotifications
  };
}
