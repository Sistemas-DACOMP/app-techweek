/* eslint-env serviceworker */
/**
 * Service Worker Oficial — FACOM TechWeek 2026 PWA
 * Responsável por:
 * 1. Exibição nativa de notificações na barra do sistema do celular (Android Chrome / iOS Safari PWA / Desktop)
 * 2. Recebimento de eventos Web Push / Firebase Cloud Messaging (push)
 * 3. Vigilância em segundo plano (Background Watcher) de /announcements via Firestore REST API quando o app está minimizado ou na tela de bloqueio
 * 4. Recebimento de mensagens da thread principal (SHOW_NOTIFICATION, SYNC_BACKGROUND_WATCHER, APP_BACKGROUNDED)
 * 5. Deep-linking ao tocar na notificação no celular (notificationclick)
 */

const DEFAULT_ICON = '/icon-192.png';
const DEFAULT_BADGE = '/icon-192.png';
const STATE_CACHE_NAME = 'tw-notif-state-v1';
const STATE_CACHE_KEY = '/__tw_sw_notif_state__.json';

let watcherState = {
  projectId: 'facom-techweek-layerx',
  idToken: null,
  enabled: true,
  notifiedIds: [],
  initialized: false,
};

let activePollLoopId = 0;

async function loadStateFromCache() {
  if (watcherState.initialized) return watcherState;
  try {
    const cache = await self.caches.open(STATE_CACHE_NAME);
    const res = await cache.match(STATE_CACHE_KEY);
    if (res) {
      const saved = await res.json();
      if (saved && typeof saved === 'object') {
        watcherState = {
          ...watcherState,
          ...saved,
          notifiedIds: Array.isArray(saved.notifiedIds)
            ? Array.from(new Set([...watcherState.notifiedIds, ...saved.notifiedIds]))
            : watcherState.notifiedIds,
          initialized: true,
        };
      }
    }
  } catch {
    // ignore cache errors
  }
  watcherState.initialized = true;
  return watcherState;
}

async function saveStateToCache() {
  try {
    const cache = await self.caches.open(STATE_CACHE_NAME);
    const body = JSON.stringify({
      projectId: watcherState.projectId,
      idToken: watcherState.idToken,
      enabled: watcherState.enabled,
      notifiedIds: watcherState.notifiedIds.slice(-200),
    });
    await cache.put(
      STATE_CACHE_KEY,
      new Response(body, { headers: { 'Content-Type': 'application/json' } })
    );
  } catch {
    // ignore cache errors
  }
}

self.addEventListener('install', () => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    Promise.all([
      self.clients.claim(),
      loadStateFromCache(),
    ])
  );
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
  const urgent = Boolean(
    payload.urgent ||
      payload.priority === 'high' ||
      payload.priority === 'HIGH' ||
      payload.priority === 'URGENT'
  );

  return {
    title,
    options: {
      body,
      icon: new URL(payload.icon || DEFAULT_ICON, self.location.origin).href,
      badge: new URL(payload.badge || DEFAULT_BADGE, self.location.origin).href,
      tag: String(tag),
      renotify: true,
      silent: false,
      requireInteraction: urgent,
      vibrate: urgent ? [250, 100, 250, 100, 300] : [200, 100, 200],
      timestamp: Date.now(),
      data: {
        url,
        id: payload.id || tag,
        type: payload.type || 'system',
        timestamp: Date.now(),
      },
    },
  };
}

function parseFirestoreAnnouncementDoc(doc) {
  if (!doc || !doc.name || !doc.fields) return null;
  const parts = doc.name.split('/');
  const id = parts[parts.length - 1];
  const f = doc.fields;

  const title = f.title?.stringValue || 'Comunicado TechWeek';
  const message = f.message?.stringValue || f.body?.stringValue || '';
  const priority = f.priority?.stringValue || 'HIGH';
  const actionUrl = f.actionUrl?.stringValue || '/';
  const type = f.type?.stringValue || 'system';

  let createdMs = Date.now();
  if (f.createdAt?.timestampValue) {
    createdMs = new Date(f.createdAt.timestampValue).getTime();
  } else if (f.createdAt?.stringValue) {
    createdMs = new Date(f.createdAt.stringValue).getTime();
  } else if (doc.createTime) {
    createdMs = new Date(doc.createTime).getTime();
  }

  return {
    id,
    title,
    message,
    body: message,
    priority,
    urgent: priority === 'HIGH' || priority === 'URGENT',
    actionUrl,
    type,
    createdMs,
  };
}

async function checkFirestoreAnnouncementsOnce() {
  await loadStateFromCache();
  if (!watcherState.enabled || !watcherState.projectId) return;

  const endpoint = `https://firestore.googleapis.com/v1/projects/${ encodeURIComponent(
    watcherState.projectId
  ) }/databases/(default)/documents/announcements?pageSize=15`;

  const headers = {};
  if (watcherState.idToken) {
    headers.Authorization = `Bearer ${watcherState.idToken}`;
  }

  try {
    let response = await fetch(endpoint, { headers, cache: 'no-store' });
    // Se o token expirou em segundo plano, tenta leitura pública da coleção /announcements
    if ((response.status === 401 || response.status === 403) && watcherState.idToken) {
      response = await fetch(endpoint, { cache: 'no-store' });
    }
    if (!response.ok) return;

    const data = await response.json();
    const docs = Array.isArray(data?.documents) ? data.documents : [];
    const nowMs = Date.now();
    let stateChanged = false;

    for (const rawDoc of docs) {
      const item = parseFirestoreAnnouncementDoc(rawDoc);
      if (!item || !item.id) continue;

      if (watcherState.notifiedIds.includes(String(item.id))) {
        continue;
      }

      const isRecent = Number.isFinite(item.createdMs) && nowMs - item.createdMs < 10 * 60 * 1000;
      watcherState.notifiedIds.push(String(item.id));
      stateChanged = true;

      if (isRecent) {
        const { title, options } = buildNotificationOptions({
          id: item.id,
          title: item.title,
          body: item.message,
          actionUrl: item.actionUrl,
          priority: item.priority,
          urgent: item.urgent,
          type: item.type,
        });

        await self.registration.showNotification(title, options);

        // Avisa clientes abertos/minimizados para sincronizar ID notificado
        const clientList = await self.clients.matchAll({
          type: 'window',
          includeUncontrolled: true,
        });
        for (const client of clientList) {
          client.postMessage({
            type: 'SW_ANNOUNCEMENT_NOTIFIED',
            id: item.id,
            announcement: item,
          });
        }
      }
    }

    if (stateChanged) {
      await saveStateToCache();
    }
  } catch {
    // ignore network errors while offline
  }
}

async function hasVisibleWindowClient() {
  try {
    const clientList = await self.clients.matchAll({
      type: 'window',
      includeUncontrolled: true,
    });
    return clientList.some((c) => c.visibilityState === 'visible' || c.focused);
  } catch {
    return false;
  }
}

async function runBackgroundWatcherLoop(loopId, maxIterations = 30, intervalMs = 6000) {
  await checkFirestoreAnnouncementsOnce();
  for (let i = 0; i < maxIterations; i += 1) {
    if (loopId !== activePollLoopId || !watcherState.enabled) break;
    await new Promise((resolve) => setTimeout(resolve, intervalMs));
    if (loopId !== activePollLoopId || !watcherState.enabled) break;

    const isVisible = await hasVisibleWindowClient();
    await checkFirestoreAnnouncementsOnce();
    if (isVisible && i >= 2) {
      // Quando o app volta ao primeiro plano, o onSnapshot assume e podemos desacelerar
      break;
    }
  }
}

// 1. Web Push / APNs iOS / FCM Background Push (funciona com o PWA e o Safari 100% fechados)
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
  } else {
    payload = { title: 'FACOM TechWeek 2026', body: 'Você recebeu um novo comunicado do evento.' };
  }

  const { title, options } = buildNotificationOptions(payload);

  // Importante para iOS Safari PWA (APNs WebKit): showNotification deve ser disparado
  // imediatamente dentro de event.waitUntil sem bloquear em leituras prévias de cache.
  const showPromise = self.registration.showNotification(title, options);

  const statePromise = (async () => {
    try {
      await loadStateFromCache();
      const notifId = payload.id || payload.data?.id || payload.tag;
      if (notifId && !watcherState.notifiedIds.includes(String(notifId))) {
        watcherState.notifiedIds.push(String(notifId));
        await saveStateToCache();
      }
    } catch {
      // ignore
    }
  })();

  event.waitUntil(Promise.all([showPromise, statePromise]));
});

// 2. Mensagens da thread principal (SHOW_NOTIFICATION, SYNC_BACKGROUND_WATCHER, APP_BACKGROUNDED)
self.addEventListener('message', (event) => {
  const data = event.data;
  if (!data || typeof data !== 'object') return;

  if (data.type === 'SKIP_WAITING') {
    self.skipWaiting();
    return;
  }

  if (data.type === 'SHOW_NOTIFICATION' && data.payload) {
    const { title, options } = buildNotificationOptions(data.payload);
    const work = (async () => {
      await loadStateFromCache();
      if (data.payload.id && !watcherState.notifiedIds.includes(String(data.payload.id))) {
        watcherState.notifiedIds.push(String(data.payload.id));
        await saveStateToCache();
      }
      await self.registration.showNotification(title, options);
    })();
    if (event.waitUntil) {
      event.waitUntil(work);
    }
    return;
  }

  if (data.type === 'SYNC_BACKGROUND_WATCHER' || data.type === 'APP_BACKGROUNDED') {
    const p = data.payload || {};
    const work = (async () => {
      await loadStateFromCache();
      if (p.projectId) watcherState.projectId = String(p.projectId);
      if (typeof p.idToken === 'string' && p.idToken) watcherState.idToken = p.idToken;
      if (typeof p.enabled === 'boolean') watcherState.enabled = p.enabled;
      if (Array.isArray(p.notifiedIds)) {
        watcherState.notifiedIds = Array.from(
          new Set([...watcherState.notifiedIds, ...p.notifiedIds.map(String)])
        ).slice(-200);
      }
      await saveStateToCache();

      if (data.type === 'APP_BACKGROUNDED' || p.startPolling) {
        activePollLoopId += 1;
        const myLoopId = activePollLoopId;
        await runBackgroundWatcherLoop(myLoopId, 30, 5000);
      } else {
        await checkFirestoreAnnouncementsOnce();
      }
    })();

    if (event.waitUntil) {
      event.waitUntil(work);
    }
  }
});

// 3. Suporte a Background Sync / Periodic Sync (Android Chrome PWA)
self.addEventListener('sync', (event) => {
  if (event.tag === 'tw-check-announcements') {
    event.waitUntil(checkFirestoreAnnouncementsOnce());
  }
});

self.addEventListener('periodicsync', (event) => {
  if (event.tag === 'tw-check-announcements') {
    event.waitUntil(checkFirestoreAnnouncementsOnce());
  }
});

// 4. Clique na notificação no celular -> foca o PWA ou abre na rota destino
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const rawUrl = event.notification.data?.url || '/';
  const openUrl = rawUrl.startsWith('/')
    ? new URL('#' + rawUrl, self.location.origin).href
    : (rawUrl.startsWith('http://') || rawUrl.startsWith('https://'))
      ? rawUrl
      : new URL('#/' + rawUrl.replace(/^#\/?/, ''), self.location.origin).href;

  event.waitUntil(
    self.clients
      .matchAll({ type: 'window', includeUncontrolled: true })
      .then((clientList) => {
        for (const client of clientList) {
          if ('focus' in client) {
            client.postMessage({
              type: 'NOTIFICATION_CLICK',
              url: rawUrl,
              notificationData: event.notification.data,
            });
            return client.focus();
          }
        }
        if (self.clients.openWindow) {
          return self.clients.openWindow(openUrl);
        }
        return null;
      })
  );
});


