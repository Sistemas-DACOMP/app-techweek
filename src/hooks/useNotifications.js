import { useState, useEffect, useCallback, useRef } from 'react';
import {
  getNotifications,
  markAsRead as markAsReadLib,
  markAllAsRead as markAllAsReadLib,
  addNotification as addNotificationLib,
  removeNotification as removeNotificationLib,
  clearAllNotifications as clearAllNotificationsLib,
  syncWelcomeNotificationWithUserCreatedAt,
  getReadAnnouncementIds,
  getDismissedAnnouncementIds,
  hasAlreadyNotifiedId,
  markIdAsNotified,
  isNativeNotificationSupported,
  getNotificationPermission,
  isNotificationEnabled,
  setNotificationEnabled,
  registerNotificationServiceWorker,
  requestNotificationPermission,
  triggerNativeNotification,
  sendTestNativeNotification,
  EVENT_NAME
} from '../lib/notifications';
import { collection, onSnapshot } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { onAuthChange } from '../lib/auth';

export function useNotifications() {
  const [notifications, setNotifications] = useState(() => getNotifications());
  const [rawAnnouncements, setRawAnnouncements] = useState([]);
  const [readAnnouncementIds, setReadAnnouncementIds] = useState(() => getReadAnnouncementIds());
  const [dismissedAnnouncementIds, setDismissedAnnouncementIds] = useState(() => getDismissedAnnouncementIds());
  const [permission, setPermission] = useState(() => getNotificationPermission());
  const [nativeEnabled, setNativeEnabled] = useState(() => isNotificationEnabled());
  const initialSnapshotHandledRef = useRef(false);

  const syncState = useCallback(() => {
    setNotifications(getNotifications());
    setReadAnnouncementIds(getReadAnnouncementIds());
    setDismissedAnnouncementIds(getDismissedAnnouncementIds());
    setPermission(getNotificationPermission());
    setNativeEnabled(isNotificationEnabled());
  }, []);

  useEffect(() => {
    syncState();
    registerNotificationServiceWorker().catch(() => {});

    const handleUpdate = () => {
      syncState();
    };

    const handleVisibilityOrFocus = () => {
      setPermission(getNotificationPermission());
      setNativeEnabled(isNotificationEnabled());
    };

    window.addEventListener(EVENT_NAME, handleUpdate);
    window.addEventListener('storage', handleUpdate);
    window.addEventListener('focus', handleVisibilityOrFocus);

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
      window.removeEventListener('focus', handleVisibilityOrFocus);
    };
  }, [syncState]);

  useEffect(() => {
    let unsubscribeAnnouncements = () => {};

    const unsubAuth = onAuthChange((currentUser) => {
      if (typeof unsubscribeAnnouncements === 'function') {
        unsubscribeAnnouncements();
        unsubscribeAnnouncements = () => {};
      }

      if (!currentUser) {
        setRawAnnouncements([]);
        initialSnapshotHandledRef.current = false;
        return;
      }

      try {
        const announcementsRef = collection(db, 'announcements');

        unsubscribeAnnouncements = onSnapshot(
          announcementsRef,
          (snapshot) => {
            const isFirstSnapshot = !initialSnapshotHandledRef.current;
            initialSnapshotHandledRef.current = true;
            const nowMs = Date.now();

            const list = snapshot.docs.map((document) => {
              const data = document.data();

              let timestamp = new Date().toISOString();

              if (data.createdAt?.toDate) {
                timestamp = data.createdAt.toDate().toISOString();
              } else if (data.createdAt) {
                timestamp = new Date(data.createdAt).toISOString();
              }

              const item = {
                id: document.id,
                title: data.title || 'Comunicado',
                message: data.message || '',
                type: data.type || 'system',
                actionUrl: data.actionUrl || null,
                actionLabel: data.actionLabel || null,
                priority: data.priority || 'NORMAL',
                urgent: data.priority === 'HIGH' || data.priority === 'URGENT' || Boolean(data.urgent),
                timestamp,
                source: 'announcement'
              };

              // Disparo de notificação nativa no celular para novos comunicados em tempo real
              const createdMs = new Date(timestamp).getTime();
              const isRecent = Number.isFinite(createdMs) && nowMs - createdMs < 2 * 60 * 1000;

              if (isFirstSnapshot && !isRecent) {
                markIdAsNotified(item.id);
              } else if (!hasAlreadyNotifiedId(item.id)) {
                triggerNativeNotification({
                  id: item.id,
                  title: item.title,
                  message: item.message,
                  type: item.type,
                  actionUrl: item.actionUrl || '/',
                  urgent: item.urgent,
                }).catch(() => {});
              }

              return item;
            });

            list.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
            setRawAnnouncements(list);
          },
          (error) => {
            if (error?.code !== 'permission-denied') {
              console.warn('Aviso ao sincronizar announcements:', error?.message || error);
            }
            setRawAnnouncements([]);
          }
        );
      } catch (err) {
        console.warn('Aviso ao inicializar listener de announcements:', err);
      }
    });

    return () => {
      unsubAuth();
      if (typeof unsubscribeAnnouncements === 'function') {
        unsubscribeAnnouncements();
      }
    };
  }, []);

  const announcements = rawAnnouncements
    .filter((item) => !dismissedAnnouncementIds.includes(String(item.id)))
    .map((item) => ({
      ...item,
      read: readAnnouncementIds.includes(String(item.id)),
    }));

  const markAsRead = useCallback((id) => {
    markAsReadLib(id);
  }, []);

  const markAllAsRead = useCallback(() => {
    const annIds = rawAnnouncements.map((a) => a.id);
    markAllAsReadLib(annIds);
  }, [rawAnnouncements]);

  const addNotification = useCallback((data) => {
    return addNotificationLib(data);
  }, []);

  const removeNotification = useCallback((id) => {
    removeNotificationLib(id);
  }, []);

  const clearAllNotifications = useCallback(() => {
    const annIds = rawAnnouncements.map((a) => a.id);
    clearAllNotificationsLib(annIds);
  }, [rawAnnouncements]);

  const requestPermission = useCallback(async (opts) => {
    const res = await requestNotificationPermission(opts);
    setPermission(getNotificationPermission());
    setNativeEnabled(isNotificationEnabled());
    return res;
  }, []);

  const toggleNativeNotifications = useCallback(async (nextState) => {
    const currentPerm = getNotificationPermission();
    const target = typeof nextState === 'boolean' ? nextState : !isNotificationEnabled();
    if (target && currentPerm !== 'granted') {
      const res = await requestNotificationPermission({ sendWelcomeTest: true });
      setPermission(getNotificationPermission());
      setNativeEnabled(isNotificationEnabled());
      return res === 'granted';
    }
    setNotificationEnabled(target);
    setNativeEnabled(isNotificationEnabled());
    return target;
  }, []);

  const sendTestNotification = useCallback(async () => {
    return sendTestNativeNotification();
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
    clearAllNotifications,
    isNativeSupported: isNativeNotificationSupported(),
    permission,
    nativeEnabled,
    requestPermission,
    toggleNativeNotifications,
    sendTestNotification,
  };
}
