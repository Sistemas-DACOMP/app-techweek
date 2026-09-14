import { useState } from 'react';
import { Bell } from 'lucide-react';
import { useNotifications } from '../hooks/useNotifications';
import NotificationModal from './NotificationModal';

export default function NotificationBell({ className = '' }) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const { unreadCount } = useNotifications();

  return (
    <>
      <button
        type="button"
        className={`notification-bell-btn ${className} ${unreadCount > 0 ? 'has-unread' : ''}`}
        onClick={() => setIsModalOpen(true)}
        aria-label={`Notificações: ${unreadCount} não lidas`}
        title="Notificações"
      >
        <Bell size={20} className="notification-bell-icon" />
        {unreadCount > 0 && (
          <span className="notification-badge" aria-hidden="true">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      <NotificationModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
      />
    </>
  );
}
