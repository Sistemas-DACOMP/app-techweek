import {
  LayoutGrid, CalendarDays, Megaphone, Flag, Users, LogIn, Store, ExternalLink, Settings, Pencil,
  ArrowLeftRight, Search, MoreHorizontal, ChevronLeft,
} from 'lucide-react';
import iconeTw from '../../assets/icone.png';
import { EVENT_DAYS, isoToday } from './ui';

/* Casca do painel: lateral no desktop (≥1024), título centralizado + barra inferior no celular (DESIGN.md §6 Conta Admin). */

const MENU = [
  { group: 'Evento', items: [
    { key: 'inicio', label: 'Visão geral', icon: LayoutGrid },
    { key: 'programacao', label: 'Programação', icon: CalendarDays },
    { key: 'feed', label: 'Feed e avisos', icon: Megaphone },
    { key: 'missoes', label: 'Missões', icon: Flag },
  ] },
  { group: 'Pessoas', items: [
    { key: 'pessoas', label: 'Participantes e papéis', icon: Users },
    { key: 'staff', label: 'Portaria (Staff)', icon: LogIn, path: '/staff' },
    { key: 'sponsor', label: 'Estandes (Patrocinadores)', icon: Store, path: '/sponsor' },
  ] },
];

const TABS = [
  { key: 'inicio', label: 'Início', icon: LayoutGrid },
  { key: 'programacao', label: 'Programação', icon: CalendarDays },
  { key: 'missoes', label: 'Missões', icon: Flag },
  { key: 'pessoas', label: 'Pessoas', icon: Users },
  { key: 'conta', label: 'Mais', icon: MoreHorizontal },
];

export function eventDayInfo(now = new Date()) {
  const today = isoToday(now);
  const idx = EVENT_DAYS.findIndex((d) => d.date === today);
  if (idx >= 0) return { live: true, label: `Ao vivo · dia ${idx + 1} de ${EVENT_DAYS.length}`, short: `Dia ${idx + 1}` };
  if (today < EVENT_DAYS[0].date) {
    const days = Math.ceil((new Date(`${EVENT_DAYS[0].date}T00:00`) - new Date(`${today}T00:00`)) / 86400000);
    return { live: false, label: `Começa em ${days} ${days === 1 ? 'dia' : 'dias'}`, short: `Em ${days}d` };
  }
  return { live: false, label: 'Evento encerrado', short: 'Encerrado' };
}

function LiveChip({ info, compact }) {
  return (
    <span
      className={`flex shrink-0 items-center gap-2 rounded-full font-bold ${compact ? 'h-[30px] px-2.5 text-[12px]' : 'h-[34px] px-3 text-[13px]'}`}
      style={info.live ? { background: 'rgba(111,216,166,0.12)', color: 'var(--ok)' } : { background: 'var(--surface)', color: 'var(--text-2)' }}
    >
      <span aria-hidden="true" className="h-2 w-2 rounded-full" style={{ background: info.live ? 'var(--ok)' : 'var(--text-3)', boxShadow: info.live ? '0 0 0 3px rgba(111,216,166,0.25)' : 'none' }} />
      {compact ? info.short : info.label}
    </span>
  );
}

export function AdminAvatar({ name, initials, avatar, size = 36, ring = 2 }) {
  return (
    <span className="flex shrink-0 rounded-full" style={{ width: size, height: size, padding: ring, background: 'var(--role-admin)' }}>
      {avatar ? (
        <img src={avatar} alt="" className="h-full w-full rounded-full object-cover" />
      ) : (
        <span className="flex h-full w-full items-center justify-center rounded-full bg-surface-raised text-[12px] font-extrabold text-text" aria-hidden={!!name}>
          {initials}
        </span>
      )}
    </span>
  );
}

export default function AdminShell({
  active, onNavigate, navigate, me, search, onSearch, onSearchSubmit, mobileTitle, mobileBack, mobileAction, hideMobileNav, children,
}) {
  const info = eventDayInfo();
  const navKey = active === 'feed' || active === 'config' ? 'inicio' : active;

  return (
    <div className="flex min-h-dvh bg-bg font-sans text-text">
      {/* Lateral (desktop) */}
      <aside aria-label="Menu do painel" className="sticky top-0 hidden h-dvh w-[236px] shrink-0 flex-col gap-1 overflow-y-auto border-r border-line bg-nav px-3.5 py-5 lg:flex">
        <button type="button" onClick={() => onNavigate('inicio')} className="flex items-center gap-2.5 rounded-xl px-2 pb-[18px] pt-1 text-left">
          <img src={iconeTw} alt="" className="h-8 w-[30px] object-contain" />
          <span>
            <span className="block text-[15px] font-extrabold">Tech Week 2026</span>
            <span className="block text-[12px] text-text-3">Painel da organização</span>
          </span>
        </button>
        {MENU.map(({ group, items }) => (
          <div key={group} className="flex flex-col gap-1">
            <div className="px-2.5 pb-1.5 pt-3.5 text-[12px] font-bold text-text-4">{group}</div>
            {items.map(({ key, label, icon: Icon, path }) => {
              const current = active === key || (key === 'programacao' && active === 'nova-atividade') || (key === 'missoes' && active === 'nova-missao');
              return (
                <button
                  key={key}
                  type="button"
                  aria-current={current ? 'page' : undefined}
                  onClick={() => (path ? navigate(path) : onNavigate(key))}
                  className={`flex min-h-[42px] items-center gap-3 rounded-xl px-3 py-1.5 text-left text-[14px] leading-tight transition-colors ${current ? 'bg-surface-selected font-bold text-text shadow-[inset_3px_0_0_var(--link)]' : 'font-semibold text-text-2 hover:bg-surface'}`}
                >
                  <Icon size={18} aria-hidden="true" color={current ? 'var(--link)' : 'currentColor'} strokeWidth={1.9} />
                  <span className="flex-1">{label}</span>
                  {path && <ExternalLink size={14} aria-hidden="true" className="text-text-4" />}
                </button>
              );
            })}
          </div>
        ))}
        <div className="mt-auto flex flex-col gap-1 pt-[18px]">
          <button
            type="button"
            aria-current={active === 'config' ? 'page' : undefined}
            onClick={() => onNavigate('config')}
            className={`flex min-h-[42px] items-center gap-3 rounded-xl px-3 text-[14px] ${active === 'config' ? 'bg-surface-selected font-bold text-text' : 'font-semibold text-text-2 hover:bg-surface'}`}
          >
            <Settings size={18} aria-hidden="true" strokeWidth={1.9} /> Configurações
          </button>
          <div className="flex items-center gap-2.5 rounded-[14px] bg-surface p-3">
            <AdminAvatar {...me} />
            <span className="min-w-0 flex-1">
              <span className="block truncate text-[13px] font-bold">{me.name}</span>
              <span className="block text-[12px] font-bold" style={{ color: 'var(--role-admin)' }}>Admin</span>
            </span>
          </div>
          <div className="mt-1 grid grid-cols-2 gap-1.5">
            <button type="button" onClick={() => navigate('/profile?edit=true')} className="press flex h-9 items-center justify-center gap-1.5 rounded-[10px] bg-surface text-[12px] font-bold">
              <Pencil size={13} aria-hidden="true" /> Perfil
            </button>
            <button type="button" onClick={() => onNavigate('conta')} className="press flex h-9 items-center justify-center gap-1.5 rounded-[10px] bg-surface text-[12px] font-bold">
              <ArrowLeftRight size={13} aria-hidden="true" /> Trocar conta
            </button>
          </div>
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        {/* Topo (desktop): busca + estado do evento */}
        <div className="hidden items-center gap-3 px-8 py-[18px] lg:flex">
          <form role="search" className="flex-[1_1_280px] max-w-[460px]" onSubmit={(e) => { e.preventDefault(); onSearchSubmit(); }}>
            <label className="flex h-11 items-center gap-2.5 rounded-[14px] border-[1.5px] border-field-line bg-surface px-3.5 text-text-3 focus-within:border-link">
              <Search size={18} aria-hidden="true" />
              <span className="sr-only">Buscar</span>
              <input
                type="search"
                value={search}
                onChange={(e) => onSearch(e.target.value)}
                placeholder="Buscar atividade, pessoa ou missão"
                className="min-w-0 flex-1 border-0 bg-transparent text-[14px] text-text outline-none placeholder:text-text-3"
              />
            </label>
          </form>
          <span className="ml-auto"><LiveChip info={info} /></span>
        </div>

        {/* Topo (celular): título centralizado com traço (§3) */}
        <header className="grid grid-cols-[44px_1fr_44px] items-center px-3 pt-[18px] lg:hidden">
          {mobileBack ? (
            <button type="button" aria-label="Voltar" onClick={mobileBack} className="flex h-11 w-11 items-center justify-center text-text">
              <ChevronLeft size={24} aria-hidden="true" />
            </button>
          ) : (
            <span className="flex justify-center"><img src={iconeTw} alt="Tech Week" className="h-7 w-[26px] object-contain" /></span>
          )}
          <div className="text-center">
            <h1 className="m-0 text-[20px] font-extrabold">{mobileTitle}</h1>
            <span aria-hidden="true" className="mx-auto mt-[7px] block h-1 w-7 rounded-full" style={{ background: 'var(--title-bar)' }} />
          </div>
          <span className="flex justify-center">
            {mobileAction !== undefined ? mobileAction : (
              <button type="button" aria-label="Sua conta" onClick={() => onNavigate('conta')} className="flex h-11 w-11 items-center justify-center">
                <AdminAvatar {...me} />
              </button>
            )}
          </span>
        </header>

        <main className={`min-w-0 flex-1 px-5 pt-6 lg:px-8 lg:pb-12 lg:pt-2.5 ${hideMobileNav ? 'pb-32' : 'pb-28'}`}>{children}</main>

        {!hideMobileNav && (
          <nav aria-label="Painel" className="fixed inset-x-0 bottom-0 z-40 grid grid-cols-5 border-t border-line bg-nav px-1.5 pb-[max(14px,env(safe-area-inset-bottom))] pt-1.5 lg:hidden">
            {TABS.map(({ key, label, icon: Icon }) => {
              const current = navKey === key || (key === 'programacao' && active === 'nova-atividade') || (key === 'missoes' && active === 'nova-missao');
              return (
                <button
                  key={key}
                  type="button"
                  aria-current={current ? 'page' : undefined}
                  onClick={() => onNavigate(key)}
                  className={`flex min-h-14 flex-col items-center justify-center gap-1 text-[11px] transition-colors ${current ? 'font-bold text-text' : 'font-medium text-text-3'}`}
                >
                  <Icon size={22} aria-hidden="true" color={current ? 'var(--link)' : 'currentColor'} strokeWidth={1.9} />
                  {label}
                </button>
              );
            })}
          </nav>
        )}
      </div>
    </div>
  );
}

export { LiveChip };
