import { useState } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import {
  CheckCheck,
  Trash2,
  X,
  Calendar,
  Award,
  Sparkles,
  Target,
  Inbox
} from 'lucide-react';
import { useNotifications } from '../hooks/useNotifications';
import { useScrollLock } from '../hooks/useScrollLock';
import './NotificationModal.css';

export function formatTimestamp(isoString) {
  try {
    const date = new Date(isoString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffMins < 1) return 'agora';
    if (diffMins === 1) return 'há 1 min';
    if (diffMins < 60) return `há ${diffMins} min`;
    if (diffHours === 1) return 'há 1h';
    if (diffHours < 24) return `há ${diffHours}h`;
    if (diffDays === 1) return 'ontem';
    if (diffDays < 7) return `há ${diffDays}d`;

    return date.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
  } catch {
    return 'agora';
  }
}

function getNotificationIcon(type) {
  switch (type) {
    case 'trophy':
    case 'points':
      // Amarelo somente para ícones de conquista
      return <Award size={16} color="#FBBF24" />;
    case 'mission':
      // Purple como pequeno acento
      return <Target size={16} color="#A855F7" />;
    case 'lecture':
      // Cyan
      return <Calendar size={16} color="#38BDF8" />;
    case 'system':
    default:
      // Azul elétrico
      return <Sparkles size={16} color="#3B82F6" />;
  }
}

export default function NotificationModal({ isOpen, onClose }) {
  useScrollLock(isOpen);

  const navigate = useNavigate();
  const {
    notifications,
    unreadCount,
    markAsRead,
    markAllAsRead,
    removeNotification,
    clearAllNotifications
  } = useNotifications();

  const [activeTab, setActiveTab] = useState('all'); // 'all' | 'unread'

  if (!isOpen) return null;

  const filteredNotifications = activeTab === 'unread'
    ? notifications.filter((n) => !n.read)
    : notifications;

  const handleActionClick = (notification) => {
    markAsRead(notification.id);
    if (notification.actionUrl) {
      onClose();
      navigate(notification.actionUrl);
    }
  };

  const handleItemClick = (notification) => {
    if (!notification.read) {
      markAsRead(notification.id);
    }
    if (notification.actionUrl) {
      onClose();
      navigate(notification.actionUrl);
    }
  };

  if (typeof document === 'undefined') return null;

  return createPortal(
    <div className="notification-backdrop animate-fade-in" onClick={onClose}>
      <div
        className="notification-panel"
        onClick={(e) => e.stopPropagation()}
      >
        {/* HEADER */}
        <div className="notification-header">
          <div>
            <h3 className="notification-title">Notificações</h3>
            <p className="notification-subtitle">
              {unreadCount > 0 ? `${unreadCount} não lida${unreadCount > 1 ? 's' : ''}` : 'Nenhuma não lida'}
            </p>
          </div>
          <button
            type="button"
            className="notification-close-btn"
            onClick={onClose}
            aria-label="Fechar notificações"
          >
            <X size={18} />
          </button>
        </div>

        {/* CONTROLE SEGMENTADO */}
        <div className="notification-segmented-wrap">
          <div className="notification-segmented-control">
            <button
              type="button"
              className={`notification-segment-btn ${activeTab === 'all' ? 'active' : ''}`}
              onClick={() => setActiveTab('all')}
            >
              Todas ({notifications.length})
            </button>
            <button
              type="button"
              className={`notification-segment-btn ${activeTab === 'unread' ? 'active' : ''}`}
              onClick={() => setActiveTab('unread')}
            >
              Não lidas ({unreadCount})
            </button>
          </div>
        </div>

        {/* AÇÕES SECUNDÁRIAS DISCRETAS */}
        {(unreadCount > 0 || notifications.length > 0) && (
          <div className="notification-secondary-actions">
            {unreadCount > 0 && (
              <button
                type="button"
                className="notification-text-action"
                onClick={markAllAsRead}
              >
                <CheckCheck size={13} />
                <span>Ler todas</span>
              </button>
            )}
            {notifications.length > 0 && (
              <button
                type="button"
                className="notification-text-action danger"
                onClick={() => {
                  if (window.confirm('Deseja limpar todo o histórico de notificações?')) {
                    clearAllNotifications();
                  }
                }}
              >
                <Trash2 size={13} />
                <span>Limpar</span>
              </button>
            )}
          </div>
        )}

        {/* LISTA DE NOTIFICAÇÕES NO ESTILO INBOX */}
        <div className="notification-list">
          {filteredNotifications.length === 0 ? (
            <div className="notification-empty-state">
              <Inbox size={32} color="#64748B" />
              <p className="notification-empty-title">
                Nenhuma notificação {activeTab === 'unread' ? 'não lida' : 'por aqui'}
              </p>
              <p className="notification-empty-subtitle">
                {activeTab === 'unread'
                  ? 'Você já leu todas as notificações recentes.'
                  : 'Fique ligado na programação e novidades da FACOM TechWeek.'}
              </p>
            </div>
          ) : (
            filteredNotifications.map((notification) => {
              const isUnread = !notification.read;
              const actionLabel = notification.actionLabel || (notification.actionUrl?.includes('ranking') ? 'Ver ranking' : 'Ver detalhes');

              return (
                <div
                  key={notification.id}
                  className={`notification-inbox-item ${isUnread ? 'is-unread' : 'is-read'}`}
                  onClick={() => handleItemClick(notification)}
                >
                  {/* Ícone */}
                  <div className="notification-inbox-icon">
                    {getNotificationIcon(notification.type)}
                  </div>

                  {/* Conteúdo */}
                  <div className="notification-inbox-body">
                    <div className="notification-inbox-header">
                      <div className="notification-inbox-title-row">
                        {isUnread && <span className="notification-blue-dot" />}
                        <span className="notification-inbox-title">
                          {notification.title}
                        </span>
                      </div>
                      <span className="notification-inbox-time">
                        {formatTimestamp(notification.timestamp)}
                      </span>
                    </div>

                    <p className="notification-inbox-desc">
                      {notification.message}
                    </p>

                    {/* Link textual discreto se houver ação */}
                    {notification.actionUrl && (
                      <div className="notification-inbox-action-wrap">
                        <span
                          className="notification-inbox-text-link"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleActionClick(notification);
                          }}
                        >
                          {actionLabel} →
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Botão sutil de excluir */}
                  <button
                    type="button"
                    className="notification-inbox-delete"
                    onClick={(e) => {
                      e.stopPropagation();
                      removeNotification(notification.id);
                    }}
                    title="Excluir notificação"
                    aria-label="Excluir notificação"
                  >
                    <Trash2 size={12} />
                  </button>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>,
    document.body
  );
}
