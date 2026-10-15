import { useState, useEffect, useCallback } from 'react';
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
  syncBackgroundWatcherWithSw,
  registerFcmPushSubscription,
  EVENT_NAME
} from '../lib/notifications';
import { collection, onSnapshot } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { onAuthChange } from '../lib/auth';

// Singleton global de announcements para funcionar em qualquer tela do app
// sem depender de estar na Home (/) e sem duplicar listeners do Firestore
let sharedRawAnnouncements = [];
let sharedSubscribers = new Set();
let sharedAuthUnsub = null;
let sharedFirestoreUnsub = null;
let sharedInitialSnapshotHandled = false;

function notifySharedSubscribers() {
  for (const listener of sharedSubscribers) {
    try {
      listener(sharedRawAnnouncements);
    } catch {
      // ignore
    }
  }
}

function stopFirestoreAnnouncementsListener() {
  if (typeof sharedFirestoreUnsub === 'function') {
    sharedFirestoreUnsub();
    sharedFirestoreUnsub = null;
  }
}

function ensureGlobalAnnouncementsListener() {
  if (sharedAuthUnsub) return;

  sharedAuthUnsub = onAuthChange((currentUser) => {
    stopFirestoreAnnouncementsListener();

    if (!currentUser) {
      sharedRawAnnouncements = [];
      sharedInitialSnapshotHandled = false;
      notifySharedSubscribers();
      return;
    }

    if (getNotificationPermission() === 'granted') {
      registerFcmPushSubscription().catch(() => {});
      syncBackgroundWatcherWithSw({ startPolling: false }).catch(() => {});
    }

    try {
      const announcementsRef = collection(db, 'announcements');

      sharedFirestoreUnsub = onSnapshot(
        announcementsRef,
        (snapshot) => {
          const isFirstSnapshot = !sharedInitialSnapshotHandled;
          sharedInitialSnapshotHandled = true;
          const nowMs = Date.now();

          const addedDocIds = new Set();
          if (typeof snapshot.docChanges === 'function') {
            for (const change of snapshot.docChanges()) {
              if (change.type === 'added') {
                addedDocIds.add(change.doc.id);
              }
            }
          }

          const list = snapshot.docs.map((document) => {
            const data = document.data() || {};

            let timestamp = new Date().toISOString();
            if (data.createdAt?.toDate) {
              timestamp = data.createdAt.toDate().toISOString();
            } else if (data.createdAt) {
              const parsed = new Date(data.createdAt);
              if (!Number.isNaN(parsed.getTime())) {
                timestamp = parsed.toISOString();
              }
            }

            const messageText = data.message || data.body || '';
            const item = {
              id: document.id,
              title: data.title || 'Comunicado',
              message: messageText,
              body: messageText,
              type: data.type || 'system',
              actionUrl: data.actionUrl || null,
              actionLabel: data.actionLabel || null,
              priority: data.priority || 'NORMAL',
              urgent: data.priority === 'HIGH' || data.priority === 'URGENT' || Boolean(data.urgent),
              timestamp,
              source: 'announcement'
            };

            const createdMs = new Date(timestamp).getTime();
            const isRecent = Number.isFinite(createdMs) && nowMs - createdMs < 5 * 60 * 1000;

            if (isFirstSnapshot && !isRecent) {
              markIdAsNotified(item.id);
            } else if (!hasAlreadyNotifiedId(item.id) && (!isFirstSnapshot || isRecent || addedDocIds.has(item.id))) {
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
          sharedRawAnnouncements = list;
          notifySharedSubscribers();
          syncBackgroundWatcherWithSw({ startPolling: false }).catch(() => {});
        },
        (error) => {
          if (error?.code !== 'permission-denied') {
            console.warn('Aviso ao sincronizar announcements:', error?.message || error);
          }
          sharedRawAnnouncements = [];
          notifySharedSubscribers();
        }
      );
    } catch (err) {
      console.warn('Aviso ao inicializar listener de announcements:', err);
    }
  });
}

export function useNotifications() {
  const [notifications, setNotifications] = useState(() => getNotifications());
  const [rawAnnouncements, setRawAnnouncements] = useState(() => sharedRawAnnouncements);
  const [readAnnouncementIds, setReadAnnouncementIds] = useState(() => getReadAnnouncementIds());
  const [dismissedAnnouncementIds, setDismissedAnnouncementIds] = useState(() => getDismissedAnnouncementIds());
  const [permission, setPermission] = useState(() => getNotificationPermission());
  const [nativeEnabled, setNativeEnabled] = useState(() => isNotificationEnabled());

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
    const subscriber = (nextList) => {
      setRawAnnouncements(nextList);
    };
    sharedSubscribers.add(subscriber);
    setRawAnnouncements(sharedRawAnnouncements);
    ensureGlobalAnnouncementsListener();

    return () => {
      sharedSubscribers.delete(subscriber);
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

