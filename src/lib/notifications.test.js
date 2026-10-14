import { describe, it, expect, beforeEach, beforeAll, afterAll, vi } from 'vitest';
import {
  getNotifications,
  getUnreadCount,
  markAsRead,
  markAllAsRead,
  addNotification,
  removeNotification,
  clearAllNotifications,
  initWelcomeNotifications,
  syncWelcomeNotificationWithUserCreatedAt
} from './notifications';

describe('Notifications System', () => {
  let storage = {};
  const originalLocalStorage = globalThis.localStorage;
  const originalWindow = globalThis.window;
  const originalCustomEvent = globalThis.CustomEvent;
  let dispatchEventSpy;

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

    dispatchEventSpy = vi.fn();
    globalThis.localStorage = localStorageMock;
    globalThis.window = {
      ...globalThis,
      dispatchEvent: dispatchEventSpy
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

  afterAll(() => {
    if (originalLocalStorage === undefined) {
      delete globalThis.localStorage;
    } else {
      globalThis.localStorage = originalLocalStorage;
    }
    if (originalWindow === undefined) {
      delete globalThis.window;
    } else {
      globalThis.window = originalWindow;
    }
    if (originalCustomEvent === undefined) {
      delete globalThis.CustomEvent;
    } else {
      globalThis.CustomEvent = originalCustomEvent;
    }
  });

  beforeEach(() => {
    globalThis.localStorage.clear();
    dispatchEventSpy.mockClear();
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

  it('marca uma notificação individual como lida', () => {
    const list = getNotifications();
    const unreadItem = list.find(n => !n.read);
    expect(unreadItem).toBeDefined();

    markAsRead(unreadItem.id);

    const updatedList = getNotifications();
    const itemAfter = updatedList.find(n => n.id === unreadItem.id);
    expect(itemAfter.read).toBe(true);
  });

  it('marca todas as notificações como lidas', () => {
    getNotifications(); // inicializa
    markAllAsRead();

    expect(getUnreadCount()).toBe(0);
    const updatedList = getNotifications();
    expect(updatedList.every(n => n.read)).toBe(true);
  });

  it('remove uma notificação pelo id', () => {
    const list = getNotifications();
    const itemToRemove = list[0];

    removeNotification(itemToRemove.id);

    const updatedList = getNotifications();
    expect(updatedList.find(n => n.id === itemToRemove.id)).toBeUndefined();
    expect(updatedList.length).toBe(list.length - 1);
  });

  it('limpa todas as notificações', () => {
    getNotifications();
    clearAllNotifications();

    const list = getNotifications();
    expect(list).toEqual([]);
    expect(getUnreadCount()).toBe(0);
  });

  it('sincroniza o timestamp da notificação de boas-vindas com a data de criação do usuário', () => {
    initWelcomeNotifications();
    const userCreatedAt = new Date(Date.now() - 1000 * 60 * 45).toISOString(); // 45 minutos atrás

    syncWelcomeNotificationWithUserCreatedAt(userCreatedAt);

    const list = getNotifications();
    const welcome = list.find(n => n.id === 'welcome_tw');
    expect(welcome.timestamp).toBe(userCreatedAt);
  });

  it('despacha CustomEvent techweek_notifications_updated ao modificar notificações', () => {
    dispatchEventSpy.mockClear();

    addNotification({
      title: 'Notificação de Teste de Evento',
      message: 'Verificando propagação reativa via window dispatch',
      type: 'system'
    });

    expect(dispatchEventSpy).toHaveBeenCalled();
    const dispatched = dispatchEventSpy.mock.calls[0][0];
    expect(dispatched.type).toBe('techweek_notifications_updated');
  });
});

