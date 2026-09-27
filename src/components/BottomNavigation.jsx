import React from 'react';
import { NavLink } from 'react-router-dom';
import { 
  Home, 
  MessageSquare, 
  CalendarDays, 
  ScanLine, 
  Target, 
  Trophy, 
  User 
} from 'lucide-react';

/**
 * Itens de navegação principal da FACOM TechWeek 2026.
 * Inclui: Início, Feed, Agenda, Escanear, Missões, Ranking e Perfil.
 */
const NAV_ITEMS = [
  { path: '/', label: 'Início', icon: Home },
  { path: '/feed', label: 'Feed', icon: MessageSquare },
  { path: '/agenda', label: 'Agenda', icon: CalendarDays },
  { path: '/scanner', label: 'Escanear', icon: ScanLine },
  { path: '/challenges', label: 'Missões', icon: Target },
  { path: '/ranking', label: 'Ranking', icon: Trophy },
  { path: '/profile', label: 'Perfil', icon: User },
];

export default function BottomNavigation({ className = '' }) {
  return (
    <nav
      role="navigation"
      aria-label="Navegação principal"
      className={`bottom-navigation ${className}`}
      style={{
        position: 'fixed',
        bottom: 0,
        left: 0,
        right: 0,
        width: '100%',
        zIndex: 1000,
        display: 'flex',
        justifyContent: 'center',
        pointerEvents: 'none'
      }}
    >
      <div
        style={{
          width: '100%',
          maxWidth: '430px',
          backgroundColor: '#07090E',
          borderTop: '1px solid #1E293B',
          boxShadow: '0 -4px 16px rgba(0, 0, 0, 0.6)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          paddingLeft: '2px',
          paddingRight: '2px',
          paddingTop: '6px',
          paddingBottom: 'max(0.65rem, env(safe-area-inset-bottom))',
          pointerEvents: 'auto'
        }}
      >
        {NAV_ITEMS.map(({ path, label, icon: Icon }) => (
          <NavLink
            key={path}
            to={path}
            className={({ isActive }) => `nav-tab ${isActive ? 'active' : ''}`}
            style={({ isActive }) => ({
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              minWidth: '38px',
              minHeight: '46px',
              padding: '3px 1px',
              textDecoration: 'none',
              borderRadius: '8px',
              transition: 'all 0.15s ease',
              color: isActive ? '#F8FAFC' : '#64748B',
              backgroundColor: isActive ? 'rgba(30, 41, 59, 0.45)' : 'transparent',
              outline: 'none',
              WebkitTapHighlightColor: 'transparent',
              flex: 1,
              position: 'relative',
              overflow: 'hidden'
            })}
          >
            {({ isActive }) => (
              <>
                {/* Linha de indicador na aba ativa */}
                {isActive && (
                  <span
                    style={{
                      position: 'absolute',
                      top: 0,
                      left: '15%',
                      right: '15%',
                      height: '2px',
                      backgroundColor: '#2563EB',
                      borderRadius: '999px'
                    }}
                    aria-hidden="true"
                  />
                )}

                <Icon
                  size={18}
                  strokeWidth={isActive ? 2 : 1.75}
                  color={isActive ? '#38BDF8' : '#64748B'}
                  style={{
                    marginBottom: '2px',
                    transition: 'transform 0.15s ease'
                  }}
                  aria-hidden="true"
                />

                <span
                  style={{
                    fontFamily: "'Inter', system-ui, sans-serif",
                    fontSize: '8.8px',
                    fontWeight: isActive ? 700 : 500,
                    letterSpacing: '-0.01em',
                    lineHeight: 1.1,
                    color: isActive ? '#F8FAFC' : '#64748B',
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    maxWidth: '100%'
                  }}
                >
                  {label}
                </span>
              </>
            )}
          </NavLink>
        ))}
      </div>
    </nav>
  );
}
