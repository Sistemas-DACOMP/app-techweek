import { useState, useEffect, useCallback } from 'react';
import {
  getNotifications,
  markAsRead as markAsReadLib,
  markAllAsRead as markAllAsReadLib,
  addNotification as addNotificationLib,
  removeNotification as removeNotificationLib,
  clearAllNotifications as clearAllNotificationsLib,
  syncWelcomeNotificationWithUserCreatedAt,
  EVENT_NAME
} from '../lib/notifications';
import { collection, onSnapshot } from 'firebase/firestore';
import { db } from '../lib/firebase';

export function useNotifications() {
  const [notifications, setNotifications] = useState(() => getNotifications());
  const [announcements, setAnnouncements] = useState([]);

  const syncState = useCallback(() => {
    const list = getNotifications();
    setNotifications(list);
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
      .catch(() => { });

    return () => {
      isMounted = false;
      window.removeEventListener(EVENT_NAME, handleUpdate);
      window.removeEventListener('storage', handleUpdate);
    };
  }, [syncState]);
  useEffect(() => {
    const announcementsRef = collection(db, 'announcements');

    const unsubscribe = onSnapshot(
      announcementsRef,
      (snapshot) => {
        const list = snapshot.docs.map((document) => {
          const data = document.data();

          let timestamp = new Date().toISOString();

          if (data.createdAt?.toDate) {
            timestamp = data.createdAt.toDate().toISOString();
          } else if (data.createdAt) {
            timestamp = new Date(data.createdAt).toISOString();
          }

          return {
            id: document.id,
            title: data.title || 'Comunicado',
            message: data.message || '',
            type: 'system',
            priority: data.priority || 'NORMAL',
            timestamp,
            read: false,
            source: 'announcement'
          };
        });

        list.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
        setAnnouncements(list);
      },
      (error) => {
        console.error('Erro ao carregar announcements:', error);
      }
    );

    return () => unsubscribe();
  }, []);

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

  const allNotifications = [...announcements, ...notifications];

  const totalUnreadCount = allNotifications.filter(
    notification => !notification.read
  ).length;

  return {
    notifications: allNotifications,
    unreadCount: totalUnreadCount,
    markAsRead,
    markAllAsRead,
    addNotification,
    removeNotification,
    clearAllNotifications
  };
}
