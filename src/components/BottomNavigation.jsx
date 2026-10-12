import { NavLink, useLocation } from 'react-router-dom';
import { Home, CalendarDays, QrCode, MessageSquare, Trophy } from 'lucide-react';

/**
 * Barra inferior do participante (DESIGN.md §5): Início · Agenda · Crachá (central) · Feed · Conquistas.
 * Perfil abre pelo avatar do Início. Conquistas cobre Missões, Ranking e Passaporte.
 */
const NAV_ITEMS = [
  { path: '/', label: 'Início', icon: Home },
  { path: '/agenda', label: 'Agenda', icon: CalendarDays },
  { path: '/scanner', label: 'Crachá', icon: QrCode, central: true },
  { path: '/feed', label: 'Feed', icon: MessageSquare },
  { path: '/challenges', label: 'Conquistas', icon: Trophy, also: ['/ranking', '/instagram-mission'] },
];

export default function BottomNavigation({ className = '' }) {
  const { pathname } = useLocation();

  return (
    <nav
      aria-label="Navegação principal"
      className={`bottom-navigation fixed inset-x-0 bottom-0 z-[1000] flex justify-center pointer-events-none ${className}`}
    >
      <div
        className="pointer-events-auto grid w-full max-w-[430px] grid-cols-5 border-t border-line-2 bg-nav px-2 pt-1.5"
        style={{ paddingBottom: 'max(10px, env(safe-area-inset-bottom))' }}
      >
        {NAV_ITEMS.map(({ path, label, icon: Icon, central, also = [] }) => {
          const active = path === '/' ? pathname === '/' : pathname === path || also.includes(pathname);
          return (
            <NavLink
              key={path}
              to={path}
              end
              aria-current={active ? 'page' : undefined}
              className={`flex min-h-14 flex-col items-center gap-1 text-[12px] no-underline transition-colors duration-150 ${
                central ? 'justify-end' : 'justify-center'
              } ${active ? 'font-bold text-text' : 'font-medium text-text-3'}`}
            >
              {central ? (
                <span
                  className="-mt-[22px] flex h-[52px] w-[52px] items-center justify-center rounded-full transition-transform duration-100 active:scale-95"
                  style={{
                    background: 'linear-gradient(135deg, #2563EB, #7C3AED)',
                    boxShadow: '0 0 0 4px var(--bg), 0 6px 18px rgba(91,59,224,0.45)',
                  }}
                >
                  <Icon size={24} color="#fff" strokeWidth={2} aria-hidden="true" />
                </span>
              ) : (
                <Icon size={22} strokeWidth={1.9} color={active ? 'var(--link)' : 'currentColor'} aria-hidden="true" />
              )}
              {label}
            </NavLink>
          );
        })}
      </div>
    </nav>
  );
}
