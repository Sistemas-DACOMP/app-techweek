import { useState } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import {
  Bell,
  CheckCheck,
  Trash2,
  X,
  Calendar,
  Award,
  Sparkles,
  Target,
  ArrowRight,
  Inbox
} from 'lucide-react';
import { useNotifications } from '../hooks/useNotifications';
import { useScrollLock } from '../hooks/useScrollLock';

export function formatTimestamp(isoString) {
  try {
    const date = new Date(isoString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffMins < 1) return 'Agora mesmo';
    if (diffMins === 1) return 'Há 1 minuto';
    if (diffMins < 60) return `Há ${diffMins} minutos`;
    if (diffHours === 1) return 'Há 1 hora';
    if (diffHours < 24) return `Há ${diffHours} horas`;
    if (diffDays === 1) return 'Há 1 dia';
    if (diffDays < 7) return `Há ${diffDays} dias`;

    return date.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
  } catch {
    return 'Recentemente';
  }
}

function getNotificationIcon(type) {
  switch (type) {
    case 'lecture':
      return <Calendar size={18} color="#38bdf8" />;
    case 'mission':
      return <Target size={18} color="#a855f7" />;
    case 'trophy':
    case 'points':
      return <Award size={18} color="#fbbf24" />;
    case 'system':
    default:
      return <Sparkles size={18} color="#3b82f6" />;
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
    ? notifications.filter(n => !n.read)
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
  };

  if (typeof document === 'undefined') return null;

  return createPortal(
    <div className="notification-backdrop animate-fade-in" onClick={onClose}>
      <div
        className="notification-panel"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="notification-header">
          <div className="notification-title-group">
            <div className="notification-title-icon-wrap">
              <Bell size={18} color="#3b82f6" />
            </div>
            <div>
              <h3 className="notification-title">Notificações</h3>
              <span className="notification-subtitle">
                {unreadCount > 0 ? `${unreadCount} não lida${unreadCount > 1 ? 's' : ''}` : 'Tudo em dia'}
              </span>
            </div>
          </div>
          <button
            type="button"
            className="notification-close-btn"
            onClick={onClose}
            aria-label="Fechar notificações"
          >
            <X size={20} />
          </button>
        </div>

        {/* Action Controls & Tabs */}
        <div className="notification-controls">
          <div className="notification-tabs">
            <button
              type="button"
              className={`notification-tab-btn ${activeTab === 'all' ? 'active' : ''}`}
              onClick={() => setActiveTab('all')}
            >
              Todas ({notifications.length})
            </button>
            <button
              type="button"
              className={`notification-tab-btn ${activeTab === 'unread' ? 'active' : ''}`}
              onClick={() => setActiveTab('unread')}
            >
              Não lidas {unreadCount > 0 && <span className="tab-badge">{unreadCount}</span>}
            </button>
          </div>

          <div className="notification-bulk-actions">
            {unreadCount > 0 && (
              <button
                type="button"
                className="notification-action-link"
                onClick={markAllAsRead}
                title="Marcar todas como lidas"
              >
                <CheckCheck size={14} />
                <span>Ler todas</span>
              </button>
            )}
            {notifications.length > 0 && (
              <button
                type="button"
                className="notification-action-link danger"
                onClick={() => {
                  if (window.confirm('Deseja limpar todo o histórico de notificações?')) {
                    clearAllNotifications();
                  }
                }}
                title="Limpar todas"
              >
                <Trash2 size={14} />
                <span>Limpar</span>
              </button>
            )}
          </div>
        </div>

        {/* Notifications List */}
        <div className="notification-list">
          {filteredNotifications.length === 0 ? (
            <div className="notification-empty-state">
              <div className="notification-empty-icon">
                <Inbox size={36} color="var(--text-secondary)" />
              </div>
              <h4>Nenhuma notificação {activeTab === 'unread' ? 'não lida' : 'por aqui'}</h4>
              <p>
                {activeTab === 'unread'
                  ? 'Você já leu todas as notificações recentes.'
                  : 'Fique ligado nas palestras e novidades da Tech Week!'}
              </p>
            </div>
          ) : (
            filteredNotifications.map((notification) => (
              <div
                key={notification.id}
                className={`notification-item ${notification.read ? 'read' : 'unread'} ${notification.priority === 'URGENT' ? 'urgent' : ''}`}
                onClick={() => handleItemClick(notification)}
              >
                <div className="notification-item-icon">
                  {getNotificationIcon(notification.type)}
                </div>

                <div className="notification-item-content">
                  <div className="notification-item-top">
                    <h4 className="notification-item-title">{notification.title}</h4>
                    <span className="notification-item-time">
                      {formatTimestamp(notification.timestamp)}
                    </span>
                  </div>

                  <p className="notification-item-desc">{notification.message}</p>

                  <div className="notification-item-footer">
                    {notification.actionUrl && (
                      <button
                        type="button"
                        className="notification-item-btn"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleActionClick(notification);
                        }}
                      >
                        <span>{notification.actionLabel || 'Ver detalhes'}</span>
                        <ArrowRight size={13} />
                      </button>
                    )}

                    <button
                      type="button"
                      className="notification-item-dismiss"
                      onClick={(e) => {
                        e.stopPropagation();
                        removeNotification(notification.id);
                      }}
                      title="Excluir notificação"
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                </div>

                {!notification.read && <div className="notification-unread-dot" />}
              </div>
            ))
          )}
        </div>
      </div>
    </div>,
    document.body
  );
}
