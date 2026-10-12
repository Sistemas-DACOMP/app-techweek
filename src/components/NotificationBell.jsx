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
        className={`relative flex size-11 shrink-0 cursor-pointer items-center justify-center rounded-full border-0 bg-transparent text-text press ${className}`}
        onClick={() => setIsModalOpen(true)}
        aria-label={unreadCount > 0 ? `Avisos, ${unreadCount} ${unreadCount > 1 ? 'novos' : 'novo'}` : 'Avisos'}
      >
        <Bell size={22} strokeWidth={1.9} aria-hidden="true" />
        {unreadCount > 0 && (
          <span
            className="absolute right-[9px] top-[9px] flex h-4 min-w-4 items-center justify-center rounded-lg bg-you px-1 text-[10px] font-bold text-white"
            aria-hidden="true"
          >
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
