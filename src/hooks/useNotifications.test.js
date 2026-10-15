import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';

// Mocks defensivos para isolamento completo sem efeitos colaterais de emulador (ERR-004)
vi.mock('../lib/firebase', () => ({
  db: {}
}));

vi.mock('../lib/auth', () => ({
  onAuthChange: vi.fn(() => vi.fn())
}));

vi.mock('firebase/firestore', () => ({
  collection: vi.fn(() => ({})),
  onSnapshot: vi.fn(() => vi.fn())
}));

vi.mock('../lib/notifications', () => ({
  getNotifications: vi.fn(() => []),
  markAsRead: vi.fn(),
  markAllAsRead: vi.fn(),
  addNotification: vi.fn(),
  removeNotification: vi.fn(),
  clearAllNotifications: vi.fn(),
  syncWelcomeNotificationWithUserCreatedAt: vi.fn(),
  getReadAnnouncementIds: vi.fn(() => []),
  getDismissedAnnouncementIds: vi.fn(() => []),
  hasAlreadyNotifiedId: vi.fn(() => false),
  markIdAsNotified: vi.fn(),
  isNativeNotificationSupported: vi.fn(() => false),
  getNotificationPermission: vi.fn(() => 'default'),
  isNotificationEnabled: vi.fn(() => false),
  setNotificationEnabled: vi.fn(),
  registerNotificationServiceWorker: vi.fn(() => Promise.resolve(null)),
  requestNotificationPermission: vi.fn(() => Promise.resolve('default')),
  triggerNativeNotification: vi.fn(() => Promise.resolve(false)),
  sendTestNativeNotification: vi.fn(() => Promise.resolve(false)),
  EVENT_NAME: 'techweek_notifications_updated'
}));

import { useNotifications } from './useNotifications';
import * as notifLib from '../lib/notifications';
import { onAuthChange } from '../lib/auth';

function renderHookHarness(hookFn) {
  let hookResult;
  function Harness() {
    hookResult = hookFn();
    return null;
  }
  renderToStaticMarkup(React.createElement(Harness));
  return hookResult;
}

describe('useNotifications Hook (ERR-003, ERR-004)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubGlobal('window', {
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn()
    });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  describe('Estrutura e Inicialização', () => {
    it('exporta a função useNotifications como hook funcional', () => {
      expect(typeof useNotifications).toBe('function');
    });

    it('retorna a estrutura completa de propriedades e métodos da API de notificações', () => {
      vi.mocked(notifLib.getNotifications).mockReturnValue([]);
      const result = renderHookHarness(useNotifications);

      expect(Array.isArray(result.notifications)).toBe(true);
      expect(typeof result.unreadCount).toBe('number');
      expect(typeof result.markAsRead).toBe('function');
      expect(typeof result.markAllAsRead).toBe('function');
      expect(typeof result.addNotification).toBe('function');
      expect(typeof result.removeNotification).toBe('function');
      expect(typeof result.clearAllNotifications).toBe('function');
    });

    it('inicializa a lista de notificações vazia e unreadCount 0 por padrão', () => {
      vi.mocked(notifLib.getNotifications).mockReturnValue([]);
      const result = renderHookHarness(useNotifications);

      expect(result.notifications).toEqual([]);
      expect(result.unreadCount).toBe(0);
    });
  });

  describe('Cálculo de Notificações Não Lidas (unreadCount)', () => {
    it('calcula corretamente o total de notificações com read === false', () => {
      const mockList = [
        { id: '1', title: 'Boas-vindas', read: false },
        { id: '2', title: 'Check-in confirmado', read: true },
        { id: '3', title: 'Nova missão disponível', read: false },
      ];
      vi.mocked(notifLib.getNotifications).mockReturnValue(mockList);

      const result = renderHookHarness(useNotifications);

      expect(result.notifications).toHaveLength(3);
      expect(result.unreadCount).toBe(2);
    });

    it('retorna unreadCount 0 quando todas as notificações já foram lidas', () => {
      const mockList = [
        { id: '1', title: 'Aviso 1', read: true },
        { id: '2', title: 'Aviso 2', read: true },
      ];
      vi.mocked(notifLib.getNotifications).mockReturnValue(mockList);

      const result = renderHookHarness(useNotifications);

      expect(result.notifications).toHaveLength(2);
      expect(result.unreadCount).toBe(0);
    });
  });

  describe('Delegação de Ações para a Biblioteca de Notificações', () => {
    it('delega markAsRead chamando a lib com o ID da notificação', () => {
      const result = renderHookHarness(useNotifications);
      result.markAsRead('notif-999');

      expect(notifLib.markAsRead).toHaveBeenCalledWith('notif-999');
      expect(notifLib.markAsRead).toHaveBeenCalledTimes(1);
    });

    it('delega markAllAsRead chamando a lib de notificações', () => {
      const result = renderHookHarness(useNotifications);
      result.markAllAsRead();

      expect(notifLib.markAllAsRead).toHaveBeenCalledTimes(1);
    });

    it('delega addNotification repassando o payload e retornando o resultado', () => {
      const createdItem = { id: 'new-1', title: 'Teste', read: false };
      vi.mocked(notifLib.addNotification).mockReturnValue(createdItem);

      const result = renderHookHarness(useNotifications);
      const ret = result.addNotification({ title: 'Teste', message: 'Conteúdo' });

      expect(notifLib.addNotification).toHaveBeenCalledWith({ title: 'Teste', message: 'Conteúdo' });
      expect(ret).toEqual(createdItem);
    });

    it('delega removeNotification chamando a lib com o ID informado', () => {
      const result = renderHookHarness(useNotifications);
      result.removeNotification('notif-remove-42');

      expect(notifLib.removeNotification).toHaveBeenCalledWith('notif-remove-42');
      expect(notifLib.removeNotification).toHaveBeenCalledTimes(1);
    });

    it('delega clearAllNotifications limpando todas as notificações na lib', () => {
      const result = renderHookHarness(useNotifications);
      result.clearAllNotifications();

      expect(notifLib.clearAllNotifications).toHaveBeenCalledTimes(1);
    });
  });
});
