/* eslint-env serviceworker */
/**
 * Service Worker Oficial — FACOM TechWeek 2026 PWA
 * Responsável por:
 * 1. Exibição nativa de notificações no celular (Android Chrome / iOS Safari PWA / Desktop)
 * 2. Recebimento de eventos Web Push / Firebase Cloud Messaging (push)
 * 3. Recebimento de mensagens da thread principal (SHOW_NOTIFICATION)
 * 4. Deep-linking ao tocar na notificação no celular (notificationclick)
 */

const DEFAULT_ICON = '/icon-192.png';
const DEFAULT_BADGE = '/icon-192.png';

self.addEventListener('install', () => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

function buildNotificationOptions(payload = {}) {
  const title = payload.title || payload.notification?.title || 'FACOM TechWeek 2026';
  const body =
    payload.body ||
    payload.message ||
    payload.notification?.body ||
    'Você tem um novo aviso no evento.';
  const url =
    payload.actionUrl ||
    payload.url ||
    payload.data?.actionUrl ||
    payload.data?.url ||
    payload.fcmOptions?.link ||
    '/';
  const tag = payload.tag || payload.id || `tw-notif-${Date.now()}`;
  const urgent = Boolean(payload.urgent || payload.priority === 'high');

  return {
    title,
    options: {
      body,
      icon: payload.icon || DEFAULT_ICON,
      badge: payload.badge || DEFAULT_BADGE,
      tag: String(tag),
      renotify: true,
      requireInteraction: urgent,
      vibrate: urgent ? [250, 100, 250, 100, 300] : [180, 80, 180],
      data: {
        url,
        id: payload.id || tag,
        type: payload.type || 'system',
        timestamp: Date.now(),
      },
    },
  };
}

// 1. Web Push / FCM Background Push
self.addEventListener('push', (event) => {
  let payload = {};
  if (event.data) {
    try {
      payload = event.data.json();
    } catch {
      try {
        payload = { title: 'FACOM TechWeek 2026', body: event.data.text() };
      } catch {
        payload = { title: 'FACOM TechWeek 2026', body: 'Novo aviso disponível no app.' };
      }
    }
  }

  const { title, options } = buildNotificationOptions(payload);
  event.waitUntil(self.registration.showNotification(title, options));
});

// 2. Mensagem direta do cliente (ex: novo announcement do Firestore ou addNotification)
self.addEventListener('message', (event) => {
  const data = event.data;
  if (!data || typeof data !== 'object') return;

  if (data.type === 'SKIP_WAITING') {
    self.skipWaiting();
    return;
  }

  if (data.type === 'SHOW_NOTIFICATION' && data.payload) {
    const { title, options } = buildNotificationOptions(data.payload);
    if (event.waitUntil) {
      event.waitUntil(self.registration.showNotification(title, options));
    } else {
      self.registration.showNotification(title, options);
    }
  }
});

// 3. Clique na notificação no celular -> foca o PWA ou abre na rota destino
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const targetUrl = event.notification.data?.url || '/';

  event.waitUntil(
    self.clients
      .matchAll({ type: 'window', includeUncontrolled: true })
      .then((clientList) => {
        for (const client of clientList) {
          if ('focus' in client) {
            client.postMessage({
              type: 'NOTIFICATION_CLICK',
              url: targetUrl,
              notificationData: event.notification.data,
            });
            return client.focus();
          }
        }
        if (self.clients.openWindow) {
          return self.clients.openWindow(targetUrl);
        }
        return null;
      })
  );
});

