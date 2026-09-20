const STORAGE_KEY = 'facom_notifications';
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
  triggerUpdate();
}

export function markAllAsRead() {
  if (typeof window === 'undefined') return;
  const notifications = getNotifications();
  const updated = notifications.map(n => ({ ...n, read: true }));
  localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  triggerUpdate();
}

export function addNotification({ title, message, type = 'system', actionUrl = null, actionLabel = null }) {
  if (typeof window === 'undefined') return null;
  const notifications = getNotifications();
  const newNotification = {
    id: `notif_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
    title,
    message,
    type,
    actionUrl,
    actionLabel,
    timestamp: new Date().toISOString(),
    read: false
  };
  const updated = [newNotification, ...notifications];
  localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  triggerUpdate();
  return newNotification;
}

export function removeNotification(id) {
  if (typeof window === 'undefined') return;
  const notifications = getNotifications();
  const updated = notifications.filter(n => n.id !== id);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  triggerUpdate();
}

export function clearAllNotifications() {
  if (typeof window === 'undefined') return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify([]));
  triggerUpdate();
}

export { EVENT_NAME };
