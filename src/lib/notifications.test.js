import { describe, it, expect, beforeEach, beforeAll, vi } from 'vitest';
import {
  getNotifications,
  getUnreadCount,
  markAsRead,
  markAllAsRead,
  addNotification,
  removeNotification,
  clearAllNotifications,
  initWelcomeNotifications,
  syncWelcomeNotificationWithUserCreatedAt,
  getReadAnnouncementIds,
  getDismissedAnnouncementIds,
  getNotificationPermission,
  isNotificationEnabled,
  setNotificationEnabled,
  triggerNativeNotification,
  requestNotificationPermission,
  syncBackgroundWatcherWithSw,
} from './notifications';

describe('Notifications System', () => {
  let storage = {};

  beforeAll(() => {
    const localStorageMock = {
      getItem: (key) => (key in storage ? storage[key] : null),
      setItem: (key, value) => {
        storage[key] = String(value);
      },
      removeItem: (key) => {
        delete storage[key];
      },
      clear: () => {
        storage = {};
      }
    };

    globalThis.localStorage = localStorageMock;
    globalThis.window = {
      ...globalThis,
      dispatchEvent: () => true
    };
    if (typeof globalThis.CustomEvent === 'undefined') {
      globalThis.CustomEvent = class CustomEvent {
        constructor(type, eventInitDict) {
          this.type = type;
          this.detail = eventInitDict?.detail;
        }
      };
    }
  });

  beforeEach(() => {
    globalThis.localStorage.clear();
  });

  it('retorna apenas a notificação padrão de boas-vindas quando o localStorage está vazio', () => {
    const list = getNotifications();
    expect(list.length).toBe(1);
    expect(list[0].id).toBe('welcome_tw');
    expect(list[0].title).toBe('Bem-vindo à FACOM Tech Week!');
    expect(list[0].read).toBe(false);
  });

  it('limpa automaticamente notificações de exemplo legadas se existirem no storage', () => {
    const legacy = [
      { id: 'welcome_tw', title: 'Bem-vindo!', read: false },
      { id: 'lecture_opening', title: 'Palestra', read: false },
      { id: 'mission_secret', title: 'Missão', read: false },
      { id: 'ranking_alert', title: 'Ranking', read: true }
    ];
    globalThis.localStorage.setItem('facom_notifications', JSON.stringify(legacy));

    const list = getNotifications();
    expect(list.length).toBe(1);
    expect(list[0].id).toBe('welcome_tw');
  });

  it('inicializa as notificações de boas-vindas para novos cadastros', () => {
    const result = initWelcomeNotifications();
    expect(result.length).toBe(1);
    expect(result[0].id).toBe('welcome_tw');
    expect(getUnreadCount()).toBe(1);
  });

  it('calcula o unreadCount corretamente', () => {
    const list = getNotifications();
    const expectedUnread = list.filter(n => !n.read).length;
    expect(getUnreadCount()).toBe(expectedUnread);
  });

  it('adiciona uma nova notificação não lida no topo da lista', () => {
    const initialCount = getNotifications().length;
    const initialUnread = getUnreadCount();

    const created = addNotification({
      title: 'Nova Notificação de Teste',
      message: 'Mensagem detalhada do teste',
      type: 'mission',
      actionUrl: '/challenges',
      actionLabel: 'Ver Missão'
    });

    expect(created).toBeDefined();
    expect(created.title).toBe('Nova Notificação de Teste');
    expect(created.read).toBe(false);

    const updatedList = getNotifications();
    expect(updatedList.length).toBe(initialCount + 1);
    expect(updatedList[0].id).toBe(created.id);
    expect(getUnreadCount()).toBe(initialUnread + 1);
  });

  it('marca uma notificação individual como lida e registra IDs de comunicados lidos', () => {
    const list = getNotifications();
    const unreadItem = list.find(n => !n.read);
    expect(unreadItem).toBeDefined();

    markAsRead(unreadItem.id);

    const updatedList = getNotifications();
    const itemAfter = updatedList.find(n => n.id === unreadItem.id);
    expect(itemAfter.read).toBe(true);
    expect(getReadAnnouncementIds()).toContain(unreadItem.id);
  });

  it('marca todas as notificações como lidas incluindo comunicados externos', () => {
    getNotifications();
    markAllAsRead(['ann_1', 'ann_2']);

    expect(getUnreadCount()).toBe(0);
    const updatedList = getNotifications();
    expect(updatedList.every(n => n.read)).toBe(true);
    expect(getReadAnnouncementIds()).toEqual(expect.arrayContaining(['ann_1', 'ann_2']));
  });

  it('remove uma notificação pelo id e salva comunicado dispensado', () => {
    const list = getNotifications();
    const itemToRemove = list[0];

    removeNotification(itemToRemove.id);

    const updatedList = getNotifications();
    expect(updatedList.find(n => n.id === itemToRemove.id)).toBeUndefined();
    expect(updatedList.length).toBe(list.length - 1);
    expect(getDismissedAnnouncementIds()).toContain(itemToRemove.id);
  });

  it('limpa todas as notificações', () => {
    getNotifications();
    clearAllNotifications(['ann_99']);

    const list = getNotifications();
    expect(list).toEqual([]);
    expect(getUnreadCount()).toBe(0);
    expect(getDismissedAnnouncementIds()).toContain('ann_99');
  });

  it('sincroniza o timestamp da notificação de boas-vindas com a data de criação do usuário', () => {
    initWelcomeNotifications();
    const userCreatedAt = new Date(Date.now() - 1000 * 60 * 45).toISOString();

    syncWelcomeNotificationWithUserCreatedAt(userCreatedAt);

    const list = getNotifications();
    const welcome = list.find(n => n.id === 'welcome_tw');
    expect(welcome.timestamp).toBe(userCreatedAt);
  });

  it('dispara notificação nativa via ServiceWorkerRegistration.showNotification quando autorizado', async () => {
    const showNotificationSpy = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(globalThis, 'navigator', {
      value: {
        serviceWorker: {
          register: vi.fn().mockResolvedValue({
            showNotification: showNotificationSpy,
          }),
          getRegistration: vi.fn().mockResolvedValue({
            showNotification: showNotificationSpy,
          }),
        },
      },
      configurable: true,
      writable: true,
    });

    const MockNotification = vi.fn();
    MockNotification.permission = 'granted';
    MockNotification.requestPermission = vi.fn().mockResolvedValue('granted');
    globalThis.window.Notification = MockNotification;

    expect(getNotificationPermission()).toBe('granted');
    expect(isNotificationEnabled()).toBe(true);

    const delivered = await triggerNativeNotification({
      id: 'push_test_1',
      title: 'Palestra começando',
      message: 'Dirija-se ao Anfiteatro 5R',
      type: 'lecture',
      actionUrl: '/agenda',
      urgent: true,
    });

    expect(delivered).toBe(true);
    expect(showNotificationSpy).toHaveBeenCalledWith(
      'Palestra começando',
      expect.objectContaining({
        body: 'Dirija-se ao Anfiteatro 5R',
        icon: '/icon-192.png',
        badge: '/icon-192.png',
        tag: 'push_test_1',
      })
    );

    // Deduplicação: não deve disparar novamente o mesmo ID sem force
    const duplicate = await triggerNativeNotification({
      id: 'push_test_1',
      title: 'Palestra começando',
      message: 'Dirija-se ao Anfiteatro 5R',
    });
    expect(duplicate).toBe(false);

    // Pausa manual pelo usuário
    setNotificationEnabled(false);
    expect(isNotificationEnabled()).toBe(false);

    // Solicitação de permissão reativa e envia confirmação
    const perm = await requestNotificationPermission({ sendWelcomeTest: true });
    expect(perm).toBe('granted');
    expect(isNotificationEnabled()).toBe(true);
  });

  it('sincroniza o estado do watcher de segundo plano com o Service Worker quando o app vai para background', async () => {
    const postMessageSpy = vi.fn();
    Object.defineProperty(globalThis, 'navigator', {
      value: {
        serviceWorker: {
          register: vi.fn().mockResolvedValue({
            active: { postMessage: postMessageSpy },
          }),
          getRegistration: vi.fn().mockResolvedValue({
            active: { postMessage: postMessageSpy },
          }),
        },
      },
      configurable: true,
      writable: true,
    });

    const MockNotification = vi.fn();
    MockNotification.permission = 'granted';
    globalThis.window.Notification = MockNotification;
    setNotificationEnabled(true);

    const synced = await syncBackgroundWatcherWithSw({ startPolling: true });
    expect(synced).toBe(true);
    expect(postMessageSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'APP_BACKGROUNDED',
        payload: expect.objectContaining({
          enabled: true,
          startPolling: true,
        }),
      })
    );
  });
});

