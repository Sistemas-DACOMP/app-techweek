import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  LayoutDashboard, Users, UserCheck, QrCode, CalendarDays, MessageSquare, TrendingUp, Download,
  Pencil, ArrowLeftRight, X, SlidersHorizontal, LifeBuoy, LogOut,
} from 'lucide-react';
import iconeTw from '../../assets/icone.png';
import { eventDayInfo, LiveChip } from '../admin/AdminShell';
import RoleSwitcher from '../../components/RoleSwitcher';
import Mascot from '../../components/Mascot';
import { logoutUser } from '../../lib/auth';
import { TIER_BAR } from './util';
import { TierStripe, CotaText } from './ui';

/* Shell do app do patrocinador (sidebar no desktop, barra inferior no celular).
   Para adicionar uma aba: incluir em MENU_GROUPS (e MOBILE_NAV_TABS se couber) e CONTEXT_HEADERS. */

const MENU_GROUPS = [
  {
    group: 'Operação do estande',
    items: [
      { key: 'home', label: 'Visão geral', icon: LayoutDashboard },
      { key: 'leads', label: 'Leads do estande', icon: Users, badgeKey: 'leads' },
      { key: 'team', label: 'Equipe do estande', icon: UserCheck, tag: 'Equipe' },
      { key: 'settings', label: 'Configurações', icon: SlidersHorizontal, tag: 'Perfil e feed' },
      { key: 'roi', label: 'Relatório executivo', icon: TrendingUp, tag: 'ROI' },
      { key: 'scanner', label: 'Scanner de crachá', icon: QrCode, tag: 'SCAN' },
    ],
  },
  {
    group: 'Evento e comunidade',
    items: [
      { key: 'agenda', label: 'Programação oficial', icon: CalendarDays },
      { key: 'feed', label: 'Feed da TechWeek', icon: MessageSquare },
    ],
  },
  {
    group: 'Apoio e coordenação',
    items: [{ key: 'chamados', label: 'Chamados e suporte', icon: LifeBuoy, tag: 'SOS' }],
  },
];

const MOBILE_NAV_TABS = [
  { key: 'home', label: 'Estande', icon: LayoutDashboard },
  { key: 'leads', label: 'Leads', icon: Users },
  { key: 'scanner', label: 'Scanner', icon: QrCode, isFab: true },
  { key: 'agenda', label: 'Agenda', icon: CalendarDays },
  { key: 'feed', label: 'Feed', icon: MessageSquare },
];

const CONTEXT_HEADERS = {
  home: { title: 'Visão geral do estande', subtitle: 'Painel de operações, conexões e atração de talentos' },
  leads: { title: 'CRM de talentos do estande', subtitle: 'Banco de contatos e avaliação de participantes' },
  team: { title: 'Equipe do estande', subtitle: 'Gestão de membros com acesso ao estande, convites e cota de crachás' },
  settings: { title: 'Configurações do estande', subtitle: 'Perfil no feed, mensagens de WhatsApp e tags de recrutamento' },
  roi: { title: 'Relatório executivo de ROI', subtitle: 'Métricas de atração, engajamento e funil de conversão' },
  scanner: { title: 'Scanner de crachá', subtitle: 'Leitura instantânea de QR do participante e crachá Sympla' },
  agenda: { title: 'Programação oficial da TechWeek', subtitle: 'Acompanhe palestras e momentos de pico do evento' },
  feed: { title: 'Feed da TechWeek', subtitle: 'Avisos da organização, bastidores e publicações oficiais' },
  chamados: { title: 'Central de apoio e chamados', subtitle: 'Comunicação direta com a coordenação e suporte técnico' },
};

// Avatar com anel da cota (conic). Sem cota, anel neutro.
function RingAvatar({ initials, avatar, tier, size = 36 }) {
  const ring = tier && TIER_BAR[tier]
    ? `conic-gradient(${TIER_BAR[tier].match(/#[0-9A-Fa-f]{6}/g).concat(TIER_BAR[tier].match(/#[0-9A-Fa-f]{6}/)[0]).join(',')})`
    : 'var(--line-2)';
  return (
    <span className="flex shrink-0 rounded-full p-0.5" style={{ width: size, height: size, background: ring }}>
      {avatar
        ? <img src={avatar} alt="" className="h-full w-full rounded-full object-cover" />
        : <span aria-hidden="true" className="flex h-full w-full items-center justify-center rounded-full bg-surface-raised text-[12px] font-extrabold text-text">{initials}</span>}
    </span>
  );
}

export default function Shell({
  activeNavKey = 'home',
  onNavigate,
  companyName = 'Patrocinador',
  companyLogo = null,
  logoFilter = 'none',
  tierInfo = {},
  standName = '',
  userProfile = {},
  authUser = {},
  leadsCount = 0,
  onExportCsv,
  onOpenSupport,
  actualRole = 'SPONSOR',
  children,
}) {
  const navigate = useNavigate();
  const [isRoleModalOpen, setIsRoleModalOpen] = useState(false);
  const info = useMemo(() => eventDayInfo(), []);
  const tier = tierInfo.tier || null;

  const rawName = userProfile?.name || userProfile?.displayName || authUser?.displayName || authUser?.email?.split('@')[0] || 'Recrutador';
  const staffInitials = rawName.trim().split(/\s+/).map((n) => n[0]).slice(0, 2).join('').toUpperCase() || 'P';
  const meta = CONTEXT_HEADERS[activeNavKey] || CONTEXT_HEADERS.home;

  const handleLogout = async () => {
    await logoutUser();
    navigate('/login', { replace: true });
  };

  return (
    <div className="sponsor-shell flex min-h-dvh bg-bg font-sans text-text print:block print:min-h-0 print:bg-bg">
      <aside aria-label="Menu do patrocinador"
        className="fixed inset-y-0 left-0 z-30 hidden h-dvh w-[280px] shrink-0 flex-col gap-2 overflow-y-auto border-r border-line bg-nav px-3.5 py-[18px] lg:flex print:!hidden">
        <button type="button" onClick={() => onNavigate('home')} className="tw-press flex items-center gap-2.5 rounded-xl px-2 pb-3.5 pt-0.5 text-left">
          <img src={iconeTw} alt="" className="h-8 w-[30px] shrink-0 object-contain" />
          <span className="min-w-0">
            <span className="block text-[15px] font-extrabold">Tech Week 2026</span>
            <span className="block text-[11px] text-text-3">Painel do Estande</span>
          </span>
        </button>

        {/* Marca da empresa. A cota aparece so como faixa e texto, sem pill. */}
        <div className="overflow-hidden rounded-2xl bg-surface" style={{ border: `1px solid ${tier ? tierInfo.line || 'var(--line)' : 'var(--line)'}` }}>
          <TierStripe tier={tier} />
          <div className="p-3">
            <div className="flex min-h-8 items-center">
              {companyLogo
                ? <img src={companyLogo} alt={companyName} className="block h-[26px] max-w-[120px] object-contain" style={{ filter: logoFilter, opacity: 0.95 }} />
                : <span className="truncate text-[13px] font-black uppercase tracking-wider">{companyName}</span>}
            </div>
            <div className="mt-2 text-[11px] leading-snug text-text-3">
              {standName || `Estande ${companyName}`}
              {tier && <div className="mt-0.5"><CotaText tier={tier} className="text-[11px]" /></div>}
            </div>
          </div>
        </div>

        <nav aria-label="Seções do estande" className="mt-1 flex flex-col">
          {MENU_GROUPS.map(({ group, items }) => (
            <div key={group} className="flex flex-col gap-0.5">
              <div className="px-2.5 pb-1.5 pt-3.5 text-[11px] font-bold text-text-4">{group}</div>
              {items.map(({ key, label, icon: Icon, badgeKey, tag }) => {
                const current = activeNavKey === key;
                return (
                  <button key={key} type="button" aria-current={current ? 'page' : undefined} onClick={() => onNavigate(key)}
                    className={`relative flex min-h-[42px] items-center gap-3 rounded-xl px-3 py-1.5 text-left text-[14px] leading-tight transition-colors ${current ? 'bg-surface-selected font-bold text-text' : 'font-semibold text-text-2 hover:bg-surface hover:text-text'}`}>
                    {current && <span aria-hidden="true" className="absolute inset-y-[9px] left-0 w-[3px] rounded-sm" style={{ background: tier ? TIER_BAR[tier] : 'var(--link)' }} />}
                    <Icon size={18} aria-hidden="true" color={current ? 'var(--link)' : 'currentColor'} strokeWidth={1.9} />
                    <span className="flex-1">{label}</span>
                    {badgeKey === 'leads' && <span className="shrink-0 rounded-lg bg-surface-raised px-2 py-0.5 text-[11px] font-extrabold text-text-2">{leadsCount}</span>}
                    {tag && !badgeKey && <span className="max-w-[88px] shrink-0 rounded-lg bg-surface-raised px-2 py-0.5 text-[11px] font-extrabold leading-tight text-text-2">{tag}</span>}
                  </button>
                );
              })}
            </div>
          ))}
        </nav>

        <div className="mt-auto flex flex-col gap-1.5 pt-3.5">
          <div className="flex items-center gap-2.5 rounded-[14px] border border-line bg-surface p-2.5">
            <RingAvatar initials={staffInitials} avatar={userProfile?.avatarUrl || authUser?.photoURL} tier={tier} />
            <div className="min-w-0 flex-1">
              <span className="block truncate text-[13px] font-bold" title={rawName}>{rawName}</span>
              <span className="block truncate text-[11px] text-text-3">Recrutador · {companyName}</span>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-1.5">
            <button type="button" onClick={() => navigate('/profile?edit=true')} className="tw-press flex h-9 items-center justify-center gap-1.5 rounded-[10px] bg-surface-selected text-[12px] font-bold">
              <Pencil size={13} aria-hidden="true" /><span>Perfil</span>
            </button>
            <button type="button" onClick={() => setIsRoleModalOpen(true)} className="tw-press flex h-9 items-center justify-center gap-1.5 rounded-[10px] bg-surface-selected text-[12px] font-bold">
              <ArrowLeftRight size={13} aria-hidden="true" /><span>Trocar</span>
            </button>
          </div>
          <button type="button" onClick={handleLogout} className="tw-press flex h-9 items-center justify-center gap-1.5 rounded-[10px] bg-[rgba(245,154,154,0.08)] text-[12px] font-bold text-err">
            <LogOut size={13} aria-hidden="true" /><span>Sair da conta</span>
          </button>
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col lg:pl-[280px] print:!pl-0">
        <header className="hidden items-center gap-3 border-b border-line bg-bg px-8 py-3 lg:flex print:!hidden">
          <Mascot size={44} name="alan" mood="happy" className="mascot-still shrink-0" />
          <div className="min-w-0 flex-1">
            <h1 className="m-0 truncate text-[18px] font-extrabold">{meta.title}</h1>
            <p className="m-0 mt-0.5 truncate text-[12px] text-text-3">{meta.subtitle}</p>
          </div>
          {activeNavKey !== 'scanner' && (
            <button type="button" onClick={() => onNavigate('scanner')} className="tw-press inline-flex h-10 items-center gap-2 rounded-xl bg-action px-[18px] text-[15px] font-bold text-white">
              <QrCode size={18} aria-hidden="true" /><span>Escanear crachá</span>
            </button>
          )}
          <button type="button" onClick={onExportCsv} disabled={leadsCount === 0} title="Exportar leads em CSV"
            className="tw-press inline-flex h-10 items-center gap-2 rounded-xl bg-surface-selected px-[18px] text-[15px] font-bold disabled:cursor-not-allowed disabled:opacity-40">
            <Download size={18} aria-hidden="true" /><span>CSV ({leadsCount})</span>
          </button>
          <button type="button" onClick={() => (onOpenSupport ? onOpenSupport() : onNavigate('chamados'))}
            className="tw-press inline-flex h-10 items-center gap-2 rounded-xl bg-surface-selected px-3.5 text-[14px] font-bold text-warn">
            <LifeBuoy size={16} aria-hidden="true" /><span>Chamados</span>
          </button>
          <LiveChip info={info} />
        </header>

        <main className="min-w-0 flex-1 px-4 pb-28 pt-4 lg:px-8 lg:pb-12 lg:pt-6 print:m-0 print:w-full print:max-w-none print:p-0">
          <div className="mx-auto w-full max-w-[1440px] print:m-0 print:w-full print:max-w-none print:p-0">{children}</div>
        </main>

        <nav aria-label="Navegação do patrocinador" className="pointer-events-none fixed inset-x-0 bottom-0 z-40 flex justify-center lg:hidden print:!hidden">
          <div className="pointer-events-auto grid w-full max-w-[430px] grid-cols-5 border-t border-line bg-nav pb-[max(10px,env(safe-area-inset-bottom))] pt-1.5">
            {MOBILE_NAV_TABS.map(({ key, label, icon: Icon, isFab }) => {
              const current = activeNavKey === key || (key === 'leads' && activeNavKey === 'roi');
              if (isFab) {
                return (
                  <button key={key} type="button" aria-current={current ? 'page' : undefined} onClick={() => onNavigate(key)}
                    className="flex min-h-12 flex-col items-center justify-end gap-1 text-[11px] font-extrabold text-text">
                    <span className="tw-press -mt-[22px] flex size-[52px] items-center justify-center rounded-full bg-action text-white ring-4 ring-bg">
                      <QrCode size={24} aria-hidden="true" />
                    </span>
                    <span>{label}</span>
                  </button>
                );
              }
              return (
                <button key={key} type="button" aria-current={current ? 'page' : undefined} onClick={() => onNavigate(key)}
                  className={`flex min-h-12 flex-col items-center justify-center gap-1 text-[11px] ${current ? 'font-extrabold text-text' : 'font-medium text-text-3'}`}>
                  <Icon size={20} aria-hidden="true" color={current ? 'var(--link)' : 'currentColor'} strokeWidth={current ? 2.3 : 1.9} />
                  <span>{label}</span>
                </button>
              );
            })}
          </div>
        </nav>
      </div>

      {isRoleModalOpen && (
        <div role="dialog" aria-modal="true" aria-labelledby="role-switcher-title" onClick={() => setIsRoleModalOpen(false)}
          className="tw-fade fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div onClick={(e) => e.stopPropagation()} className="tw-modal relative w-full max-w-[420px] rounded-2xl border border-line bg-surface p-5">
            <div className="flex items-center justify-between border-b border-line pb-3">
              <div>
                <h2 id="role-switcher-title" className="m-0 text-[16px] font-extrabold">Trocar de conta</h2>
                <p className="m-0 mt-0.5 text-[12px] text-text-3">Alterne para outro papel disponível na sua conta</p>
              </div>
              <button type="button" onClick={() => setIsRoleModalOpen(false)} aria-label="Fechar" className="flex size-11 items-center justify-center rounded-lg text-text-3 hover:bg-surface-raised hover:text-text">
                <X size={18} />
              </button>
            </div>
            <div className="pt-3"><RoleSwitcher role={actualRole} current="SPONSOR" /></div>
          </div>
        </div>
      )}
    </div>
  );
}

