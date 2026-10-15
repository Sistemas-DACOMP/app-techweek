const STORAGE_KEY = 'facom_notifications';
const READ_ANNOUNCEMENTS_KEY = 'facom_read_announcement_ids';
const DISMISSED_ANNOUNCEMENTS_KEY = 'facom_dismissed_announcement_ids';
const NOTIFIED_IDS_KEY = 'facom_notified_ids';
const NATIVE_ENABLED_KEY = 'facom_native_notifications_enabled';
const EVENT_NAME = 'techweek_notifications_updated';

const DEFAULT_NOTIFICATIONS = [
  {
    id: 'welcome_tw',
    title: 'Bem-vindo à FACOM Tech Week!',
    message: 'Participe das palestras, visite os stands e complete missões para acumular pontos no ranking.',
    type: 'system',
    actionUrl: '/challenges',
    actionLabel: 'Ver Missões',
    timestamp: new Date().toISOString(),
    read: false
  }
];

// IDs de notificações de exemplo antigas para limpeza automática de sessões anteriores
const LEGACY_SAMPLE_IDS = ['lecture_opening', 'mission_secret', 'ranking_alert'];

function triggerUpdate() {
  if (typeof window !== 'undefined' && typeof window.dispatchEvent === 'function') {
    try {
      window.dispatchEvent(new CustomEvent(EVENT_NAME));
    } catch {
      // Ignora erro em ambientes sem suporte a CustomEvent
    }
  }
}

function readJsonArray(key) {
  if (typeof window === 'undefined' || !globalThis.localStorage) return [];
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeJsonArray(key, arr) {
  if (typeof window === 'undefined' || !globalThis.localStorage) return;
  try {
    localStorage.setItem(key, JSON.stringify(Array.from(new Set(arr))));
  } catch {
    // ignore quota errors
  }
}

export function getReadAnnouncementIds() {
  return readJsonArray(READ_ANNOUNCEMENTS_KEY);
}

export function getDismissedAnnouncementIds() {
  return readJsonArray(DISMISSED_ANNOUNCEMENTS_KEY);
}

export function hasAlreadyNotifiedId(id) {
  if (!id) return false;
  return readJsonArray(NOTIFIED_IDS_KEY).includes(String(id));
}

export function markIdAsNotified(id) {
  if (!id) return;
  const current = readJsonArray(NOTIFIED_IDS_KEY);
  if (!current.includes(String(id))) {
    const next = [...current.slice(-199), String(id)];
    writeJsonArray(NOTIFIED_IDS_KEY, next);
  }
}

export function getNotifiedIds() {
  return readJsonArray(NOTIFIED_IDS_KEY);
}

// ---------------------------------------------------------------------------
// SUPORTE A NOTIFICAÇÕES NATIVAS NO CELULAR / PWA (Service Worker + Web Push)
// ---------------------------------------------------------------------------

let swRegistrationPromise = null;
let swClickListenerAttached = false;
let fcmRegisterAttempted = false;

export function isNativeNotificationSupported() {
  if (typeof window === 'undefined') return false;
  return 'Notification' in window || (typeof navigator !== 'undefined' && 'serviceWorker' in navigator);
}

export function getNotificationPermission() {
  if (typeof window === 'undefined' || !('Notification' in window)) {
    return 'unsupported';
  }
  return window.Notification.permission || 'default';
}

export function isNotificationEnabled() {
  if (typeof window === 'undefined' || !globalThis.localStorage) return false;
  const permission = getNotificationPermission();
  if (permission !== 'granted') return false;
  try {
    const stored = localStorage.getItem(NATIVE_ENABLED_KEY);
    // Se a permissão do SO é granted e o usuário não desativou manualmente, está ativo
    return stored !== 'false';
  } catch {
    return true;
  }
}

export function setNotificationEnabled(enabled) {
  if (typeof window === 'undefined' || !globalThis.localStorage) return;
  try {
    localStorage.setItem(NATIVE_ENABLED_KEY, enabled ? 'true' : 'false');
    triggerUpdate();
    syncBackgroundWatcherWithSw().catch(() => {});
  } catch {
    // ignore
  }
}

export async function registerNotificationServiceWorker() {
  if (typeof window === 'undefined' || typeof navigator === 'undefined' || !('serviceWorker' in navigator)) {
    return null;
  }

  try {
    if (!swClickListenerAttached && typeof navigator.serviceWorker.addEventListener === 'function') {
      swClickListenerAttached = true;
      navigator.serviceWorker.addEventListener('message', (event) => {
        const data = event?.data;
        if (data?.type === 'SW_ANNOUNCEMENT_NOTIFIED' && data.id) {
          markIdAsNotified(data.id);
          triggerUpdate();
          return;
        }
        if (data?.type === 'NOTIFICATION_CLICK' && data.url) {
          try {
            const targetUrl = String(data.url);
            if (targetUrl.startsWith('/')) {
              const currentHashPath = window.location.hash ? window.location.hash.replace(/^#/, '') : '';
              if (window.location.hash || window.location.pathname === '/') {
                window.location.hash = `#${targetUrl}`;
              } else if (currentHashPath !== targetUrl) {
                window.history.pushState({}, '', targetUrl);
                window.dispatchEvent(new PopStateEvent('popstate'));
              }
            }
          } catch {
            // fallback
          }
        }
      });
    }

    if (!swRegistrationPromise) {
      swRegistrationPromise = navigator.serviceWorker
        .register('/sw.js', { scope: '/' })
        .catch(() => null);
    }

    let reg = await swRegistrationPromise;
    if ((!reg || !reg.active) && typeof navigator.serviceWorker.getRegistration === 'function') {
      const latestReg = await navigator.serviceWorker.getRegistration().catch(() => null);
      if (latestReg) reg = latestReg;
    }

    // Garante que o Service Worker já esteja ativo (essential no Android Chrome / iOS PWA)
    if (reg && !reg.active && navigator.serviceWorker.ready && typeof navigator.serviceWorker.ready.then === 'function') {
      const readyReg = await Promise.race([
        navigator.serviceWorker.ready,
        new Promise((resolve) => setTimeout(() => resolve(reg), 1500)),
      ]).catch(() => reg);
      reg = readyReg || reg;
    }

    return reg || null;
  } catch {
    return null;
  }
}

/**
 * Sincroniza o estado de notificações e token de autenticação com o Service Worker
 * para que ele possa vigiar novos comunicados (/announcements) em segundo plano
 * mesmo quando o usuário bloqueia a tela ou sai do aplicativo no celular.
 */
export async function syncBackgroundWatcherWithSw({ startPolling = false, idToken = null, projectId = null } = {}) {
  if (typeof window === 'undefined' || typeof navigator === 'undefined' || !('serviceWorker' in navigator)) {
    return false;
  }

  try {
    const reg = await registerNotificationServiceWorker();
    const targetSw = reg?.active || reg?.waiting || navigator.serviceWorker.controller;
    if (!targetSw || typeof targetSw.postMessage !== 'function') return false;

    const resolvedProjectId =
      projectId ||
      (typeof import.meta !== 'undefined' && import.meta.env?.VITE_FIREBASE_PROJECT_ID) ||
      'facom-techweek';

    let resolvedToken = idToken;
    if (!resolvedToken) {
      try {
        const { auth } = await import('./firebase');
        if (auth?.currentUser && typeof auth.currentUser.getIdToken === 'function') {
          resolvedToken = await auth.currentUser.getIdToken(false);
        }
      } catch {
        // ignore
      }
    }

    targetSw.postMessage({
      type: startPolling ? 'APP_BACKGROUNDED' : 'SYNC_BACKGROUND_WATCHER',
      payload: {
        projectId: resolvedProjectId,
        idToken: resolvedToken || null,
        enabled: isNotificationEnabled(),
        notifiedIds: readJsonArray(NOTIFIED_IDS_KEY),
        startPolling: Boolean(startPolling),
      },
    });

    if (startPolling && reg?.sync && typeof reg.sync.register === 'function') {
      reg.sync.register('tw-check-announcements').catch(() => {});
    }

    return true;
  } catch {
    return false;
  }
}

/**
 * Registra o token FCM Web Push do aparelho e inscreve no tópico 'todos_participantes'
 * para recebimento nativo em segundo plano quando suportado pelo navegador/SO.
 */
export async function registerFcmPushSubscription() {
  if (typeof window === 'undefined' || getNotificationPermission() !== 'granted') return null;
  if (fcmRegisterAttempted) return null;
  fcmRegisterAttempted = true;

  try {
    const reg = await registerNotificationServiceWorker();
    if (!reg) return null;

    const [{ isSupported, getMessaging, getToken }, { default: app }, { apiFetch }] = await Promise.all([
      import('firebase/messaging'),
      import('./firebase'),
      import('./api'),
    ]);

    const supported = await isSupported().catch(() => false);
    if (!supported) return null;

    const messaging = getMessaging(app);
    const vapidKey =
      (typeof import.meta !== 'undefined' && import.meta.env?.VITE_FIREBASE_VAPID_KEY) || undefined;

    const token = await getToken(messaging, {
      serviceWorkerRegistration: reg,
      ...(vapidKey ? { vapidKey } : {}),
    }).catch(() => null);

    if (token) {
      await apiFetch('/api/admin/notifications/subscribe', {
        method: 'POST',
        body: JSON.stringify({ token }),
      }).catch(() => {});
    }
    return token;
  } catch {
    return null;
  }
}

export async function triggerNativeNotification(
  {
    id,
    title = 'FACOM TechWeek 2026',
    message = '',
    type = 'system',
    actionUrl = '/',
    urgent = false,
  } = {},
  { force = false } = {}
) {
  if (typeof window === 'undefined') return false;
  if (getNotificationPermission() !== 'granted') return false;
  if (!force && !isNotificationEnabled()) return false;
  if (!force && id && hasAlreadyNotifiedId(id)) return false;

  if (id) {
    markIdAsNotified(id);
  }

  const tag = String(id || `tw-notif-${Date.now()}`);
  const options = {
    body: message || '',
    icon: '/icon-192.png',
    badge: '/icon-192.png',
    tag,
    renotify: true,
    silent: false,
    requireInteraction: Boolean(urgent),
    vibrate: urgent ? [250, 100, 250, 100, 300] : [200, 100, 200],
    timestamp: Date.now(),
    data: {
      url: actionUrl || '/',
      id: tag,
      type,
      timestamp: Date.now(),
    },
  };

  // 1. Preferência: ServiceWorkerRegistration.showNotification (obrigatório em Android Chrome e iOS PWA)
  try {
    const reg = await registerNotificationServiceWorker();
    if (reg && typeof reg.showNotification === 'function') {
      await reg.showNotification(title, options);
      syncBackgroundWatcherWithSw().catch(() => {});
      return true;
    }
    const targetSw = reg?.active || navigator.serviceWorker?.controller;
    if (targetSw && typeof targetSw.postMessage === 'function') {
      targetSw.postMessage({
        type: 'SHOW_NOTIFICATION',
        payload: { id: tag, title, message, body: message, type, actionUrl: actionUrl || '/', urgent },
      });
      return true;
    }
  } catch {
    // Se showNotification falhou mas existe SW controller ativo, delega via postMessage
    try {
      const targetSw = navigator.serviceWorker?.controller;
      if (targetSw && typeof targetSw.postMessage === 'function') {
        targetSw.postMessage({
          type: 'SHOW_NOTIFICATION',
          payload: { id: tag, title, message, body: message, type, actionUrl: actionUrl || '/', urgent },
        });
        return true;
      }
    } catch {
      // Continua para fallback da API Notification
    }
  }

  // 2. Fallback: API Notification na thread principal (Desktop / navegadores sem SW ativo)
  try {
    if ('Notification' in window && typeof window.Notification === 'function') {
      const n = new window.Notification(title, {
        body: options.body,
        icon: options.icon,
        badge: options.badge,
        tag: options.tag,
        data: options.data,
      });
      n.onclick = () => {
        try {
          window.focus();
          if (actionUrl && actionUrl.startsWith('/')) {
            window.history.pushState({}, '', actionUrl);
            window.dispatchEvent(new PopStateEvent('popstate'));
          }
          n.close?.();
        } catch {
          // ignore
        }
      };
      return true;
    }
  } catch {
    // ignore
  }

  return false;
}

export async function requestNotificationPermission({ sendWelcomeTest = true } = {}) {
  if (typeof window === 'undefined' || !('Notification' in window)) {
    return 'unsupported';
  }

  try {
    await registerNotificationServiceWorker();
    const result = await window.Notification.requestPermission();
    if (result === 'granted') {
      setNotificationEnabled(true);
      registerFcmPushSubscription().catch(() => {});
      syncBackgroundWatcherWithSw({ startPolling: false }).catch(() => {});
      if (sendWelcomeTest) {
        await triggerNativeNotification(
          {
            id: `welcome_push_${Date.now()}`,
            title: 'Notificações ativadas na TechWeek!',
            message: 'Você receberá avisos de palestras, missões e novidades direto na barra de notificações do celular.',
            type: 'system',
            actionUrl: '/agenda',
          },
          { force: true }
        );
      }
    } else {
      triggerUpdate();
    }
    return result;
  } catch {
    return getNotificationPermission();
  }
}

export async function sendTestNativeNotification() {
  return triggerNativeNotification(
    {
      id: `test_push_${Date.now()}`,
      title: 'FACOM TechWeek 2026',
      message: 'Notificações ativas no seu aparelho! Acompanhe a programação e o ranking em tempo real.',
      type: 'system',
      actionUrl: '/agenda',
    },
    { force: true }
  );
}

// ---------------------------------------------------------------------------
// GERENCIAMENTO LOCAL + SINCRONIZAÇÃO DE NOTIFICAÇÕES IN-APP
// ---------------------------------------------------------------------------

export function initWelcomeNotifications(createdAt = null) {
  if (typeof window === 'undefined') return DEFAULT_NOTIFICATIONS;
  const timestamp = createdAt || new Date().toISOString();
  const initial = [
    {
      id: 'welcome_tw',
      title: 'Bem-vindo à FACOM Tech Week!',
      message: 'Participe das palestras, visite os stands e complete missões para acumular pontos no ranking.',
      type: 'system',
      actionUrl: '/challenges',
      actionLabel: 'Ver Missões',
      timestamp,
      read: false
    }
  ];
  localStorage.setItem(STORAGE_KEY, JSON.stringify(initial));
  markIdAsNotified('welcome_tw');
  triggerUpdate();
  return initial;
}

export function syncWelcomeNotificationWithUserCreatedAt(createdAt) {
  if (typeof window === 'undefined' || !createdAt) return;
  const notifications = getNotifications();
  let modified = false;
  const updated = notifications.map(n => {
    if (n.id === 'welcome_tw' && n.timestamp !== createdAt) {
      modified = true;
      return { ...n, timestamp: createdAt };
    }
    return n;
  });
  if (modified) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    triggerUpdate();
  }
}

export function getNotifications() {
  if (typeof window === 'undefined') return DEFAULT_NOTIFICATIONS;
  try {
    const data = localStorage.getItem(STORAGE_KEY);
    if (!data) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(DEFAULT_NOTIFICATIONS));
      return DEFAULT_NOTIFICATIONS;
    }
    const parsed = JSON.parse(data);
    if (!Array.isArray(parsed)) return DEFAULT_NOTIFICATIONS;

    // Filtra notificações de exemplo legadas se existirem no storage
    const cleaned = parsed.filter(n => !LEGACY_SAMPLE_IDS.includes(n.id));
    if (cleaned.length !== parsed.length) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(cleaned));
      return cleaned;
    }

    return parsed;
  } catch {
    return DEFAULT_NOTIFICATIONS;
  }
}

export function getUnreadCount() {
  const notifications = getNotifications();
  return notifications.filter(n => !n.read).length;
}

export function markAsRead(id) {
  if (typeof window === 'undefined') return;
  const notifications = getNotifications();
  const updated = notifications.map(n => (n.id === id ? { ...n, read: true } : n));
  localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));

  if (id) {
    const readAnnouncements = getReadAnnouncementIds();
    if (!readAnnouncements.includes(String(id))) {
      writeJsonArray(READ_ANNOUNCEMENTS_KEY, [...readAnnouncements, String(id)]);
    }
  }

  triggerUpdate();
}

export function markAllAsRead(extraIds = []) {
  if (typeof window === 'undefined') return;
  const notifications = getNotifications();
  const updated = notifications.map(n => ({ ...n, read: true }));
  localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));

  if (Array.isArray(extraIds) && extraIds.length > 0) {
    const readAnnouncements = getReadAnnouncementIds();
    writeJsonArray(READ_ANNOUNCEMENTS_KEY, [...readAnnouncements, ...extraIds.map(String)]);
  }

  triggerUpdate();
}

export function addNotification({
  title,
  message,
  type = 'system',
  actionUrl = null,
  actionLabel = null,
  urgent = false,
  activityId = null,
  targetAudience = null,
  silent = false,
}) {
  if (typeof window === 'undefined') return null;
  const notifications = getNotifications();
  const newNotification = {
    id: `notif_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
    title,
    message,
    type,
    actionUrl,
    actionLabel,
    urgent: !!urgent,
    activityId,
    targetAudience,
    timestamp: new Date().toISOString(),
    read: false
  };
  const updated = [newNotification, ...notifications];
  localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  triggerUpdate();

  if (!silent) {
    triggerNativeNotification(newNotification).catch(() => {});
  }

  return newNotification;
}

export function removeNotification(id) {
  if (typeof window === 'undefined') return;
  const notifications = getNotifications();
  const updated = notifications.filter(n => n.id !== id);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));

  if (id) {
    const dismissed = getDismissedAnnouncementIds();
    if (!dismissed.includes(String(id))) {
      writeJsonArray(DISMISSED_ANNOUNCEMENTS_KEY, [...dismissed, String(id)]);
    }
  }

  triggerUpdate();
}

export function clearAllNotifications(extraIds = []) {
  if (typeof window === 'undefined') return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify([]));

  if (Array.isArray(extraIds) && extraIds.length > 0) {
    const dismissed = getDismissedAnnouncementIds();
    writeJsonArray(DISMISSED_ANNOUNCEMENTS_KEY, [...dismissed, ...extraIds.map(String)]);
  }

  triggerUpdate();
}

export { EVENT_NAME };
