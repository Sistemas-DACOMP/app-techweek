import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  LayoutDashboard,
  Users,
  QrCode,
  CalendarDays,
  MessageSquare,
  TrendingUp,
  Download,
  Pencil,
  ArrowLeftRight,
  X,
  ExternalLink,
  Search,
  Sparkles,
  Camera,
  Layers,
  ChevronRight,
  SlidersHorizontal,
} from 'lucide-react';
import iconeTw from '../../assets/icone.png';
import { eventDayInfo, LiveChip } from '../../pages/admin/AdminShell';
import RoleSwitcher from '../RoleSwitcher';
import Mascot from '../Mascot';
import { btn } from '../../pages/admin/ui';

export function SponsorAvatar({ name = '', initials = '?', avatar = null, size = 38, ring = 2 }) {
  return (
    <span
      className="flex shrink-0 rounded-full"
      style={{
        width: size,
        height: size,
        padding: ring,
        background: 'var(--role-patrocinador)', // #FBBF24
      }}
    >
      {avatar ? (
        <img src={avatar} alt="" className="h-full w-full rounded-full object-cover" />
      ) : (
        <span
          className="flex h-full w-full items-center justify-center rounded-full bg-surface-raised text-[12px] font-extrabold text-text"
          aria-hidden={!!name}
        >
          {initials}
        </span>
      )}
    </span>
  );
}

const MENU_GROUPS = [
  {
    group: 'Operação do Estande',
    items: [
      { key: 'home', label: 'Visão Geral', icon: LayoutDashboard },
      { key: 'leads', label: 'Leads do Estande', icon: Users, badgeKey: 'leads' },
      { key: 'settings', label: 'Mensagens & Tags', icon: SlidersHorizontal, tag: 'Novo' },
      { key: 'roi', label: 'Relatório Executivo ROI', icon: TrendingUp, tag: 'ROI' },
      { key: 'scanner', label: 'Scanner de Crachá', icon: QrCode, tag: 'Bipar' },
    ],
  },
  {
    group: 'Evento & Comunidade',
    items: [
      { key: 'agenda', label: 'Programação Oficial', icon: CalendarDays },
      { key: 'feed', label: 'Feed da TechWeek', icon: MessageSquare },
    ],
  },
];

const MOBILE_NAV_TABS = [
  { key: 'home', label: 'Estande', icon: LayoutDashboard },
  { key: 'leads', label: 'Leads', icon: Users },
  { key: 'scanner', label: 'Bipar', icon: QrCode, isFab: true },
  { key: 'agenda', label: 'Agenda', icon: CalendarDays },
  { key: 'feed', label: 'Feed', icon: MessageSquare },
];

const CONTEXT_HEADERS = {
  home: {
    title: 'Visão Geral do Estande',
    subtitle: 'Painel de operações, conexões e atração de talentos',
  },
  leads: {
    title: 'CRM de Talentos do Estande',
    subtitle: 'Banco de contatos e avaliação de participantes',
  },
  settings: {
    title: 'Configurações do Estande',
    subtitle: 'Personalize mensagens automáticas de WhatsApp e tags de recrutamento',
  },
  roi: {
    title: 'Relatório Executivo de ROI',
    subtitle: 'Métricas de atração, engajamento e funil de conversão',
  },
  scanner: {
    title: 'Scanner de Crachá',
    subtitle: 'Leitura instantânea de QR do participante e crachá Sympla',
  },
  agenda: {
    title: 'Programação Oficial da TechWeek',
    subtitle: 'Acompanhe palestras e momentos de pico do evento',
  },
  feed: {
    title: 'Feed da TechWeek',
    subtitle: 'Avisos da organização, bastidores e publicações oficiais',
  },
};

/**
 * Shell Desktop e Responsivo para o Painel de Patrocinador (Booth OS)
 */
export default function SponsorShell({
  activeNavKey: propActiveNavKey,
  activeKey,
  onNavigate,
  companyName: propCompanyName,
  sponsorName,
  companyLogo: propCompanyLogo,
  sponsorLogo,
  tierInfo: propTierInfo,
  sponsorTier,
  userProfile = {},
  authUser = {},
  leadsCount = 0,
  myLeadsCount = 0,
  onExportCsv,
  actualRole = 'SPONSOR',
  children,
}) {
  const navigate = useNavigate();
  const [isRoleModalOpen, setIsRoleModalOpen] = useState(false);

  const activeNavKey = propActiveNavKey || activeKey || 'home';
  const companyName = propCompanyName || sponsorName || 'Patrocinador';
  const companyLogo = propCompanyLogo || sponsorLogo || null;
  const tierInfo = propTierInfo || sponsorTier || {};

  const info = useMemo(() => eventDayInfo(), []);

  // Dados do Staff Logado
  const rawName =
    userProfile?.name ||
    userProfile?.displayName ||
    authUser?.displayName ||
    authUser?.email?.split('@')[0] ||
    'Recrutador';
  const staffInitials = rawName
    .trim()
    .split(/\s+/)
    .map((n) => n[0])
    .slice(0, 2)
    .join('')
    .toUpperCase() || 'P';

  const contextMeta = CONTEXT_HEADERS[activeNavKey] || CONTEXT_HEADERS.home;

  return (
    <div className="sponsor-shell flex min-h-dvh bg-bg font-sans text-text print:bg-bg print:block print:min-h-0">
      {/* ========================================================================= */}
      {/* SIDEBAR LATERAL FIXA (DESKTOP: ≥1024px)                                  */}
      {/* ========================================================================= */}
      <aside
        aria-label="Menu do Patrocinador"
        className="fixed inset-y-0 left-0 z-30 hidden h-dvh w-[260px] shrink-0 flex-col gap-2 overflow-y-auto border-r border-line bg-nav px-3.5 py-5 lg:flex print:!hidden"
      >
        {/* Topo da Sidebar: Tech Week 2026 */}
        <button
          type="button"
          onClick={() => onNavigate('home')}
          className="flex items-center gap-2.5 rounded-xl px-2 pb-2 pt-1 text-left hover:opacity-90 transition-opacity"
        >
          <img src={iconeTw} alt="" className="h-8 w-[30px] object-contain shrink-0" />
          <span className="min-w-0">
            <span className="block text-[15px] font-extrabold tracking-tight">Tech Week 2026</span>
            <span className="block text-[11px] text-text-3 font-medium">Painel do Estande</span>
          </span>
        </button>

        {/* Caixa de Identidade da Empresa Patrocinadora */}
        <div className="rounded-2xl border border-line bg-surface p-3 flex flex-col gap-2">
          <div className="flex items-center justify-between gap-2">
            {companyLogo ? (
              <div className="h-7 max-w-[120px] flex items-center">
                <img
                  src={companyLogo}
                  alt={companyName}
                  className="max-h-7 max-w-full object-contain"
                  style={{
                    filter: 'brightness(0) invert(1)',
                    opacity: 0.95,
                  }}
                />
              </div>
            ) : (
              <span className="text-[13px] font-black uppercase tracking-wider text-text truncate">
                {companyName}
              </span>
            )}

            {/* Badge de Cota (Diamante, Ouro, Prata) com tokens do DESIGN.md §2.6 */}
            <span
              className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-extrabold uppercase tracking-wider shrink-0"
              style={{
                background: tierInfo.soft || 'rgba(251,191,36,0.14)',
                color: tierInfo.text || '#FBBF24',
                border: `1px solid ${tierInfo.line || 'rgba(251,191,36,0.5)'}`,
              }}
            >
              <span
                className="h-1.5 w-1.5 rounded-full"
                style={{ background: tierInfo.dot || tierInfo.text || '#FBBF24' }}
              />
              <span>{tierInfo.label || 'Patrocinador'}</span>
            </span>
          </div>

          <div className="text-[11px] font-medium text-text-3 truncate">
            {tierInfo.badgeDescription || `Estande Oficial · ${companyName}`}
          </div>
        </div>

        {/* Grupos de Menu */}
        <div className="flex flex-col gap-4 mt-2">
          {MENU_GROUPS.map(({ group, items }) => (
            <div key={group} className="flex flex-col gap-1">
              <div className="px-2.5 pb-1 pt-1 text-[11px] font-bold uppercase tracking-wider text-text-4">
                {group}
              </div>
              {items.map(({ key, label, icon: Icon, badgeKey, tag }) => {
                const isCurrent = activeNavKey === key;
                return (
                  <button
                    key={key}
                    type="button"
                    aria-current={isCurrent ? 'page' : undefined}
                    onClick={() => onNavigate(key)}
                    className={`flex min-h-[42px] items-center gap-3 rounded-xl px-3 py-1.5 text-left text-[14px] leading-tight transition-colors ${
                      isCurrent
                        ? 'bg-surface-selected font-bold text-text shadow-[inset_3px_0_0_var(--link)]'
                        : 'font-semibold text-text-2 hover:bg-surface hover:text-text'
                    }`}
                  >
                    <Icon
                      size={18}
                      aria-hidden="true"
                      color={isCurrent ? 'var(--link)' : 'currentColor'}
                      strokeWidth={1.9}
                    />
                    <span className="flex-1 truncate">{label}</span>

                    {/* Badge ou Tag de Apoio */}
                    {badgeKey === 'leads' && (
                      <span
                        className={`rounded-full px-2 py-0.5 text-[11px] font-extrabold transition-colors ${
                          isCurrent
                            ? 'bg-link/20 text-link'
                            : 'bg-surface-raised text-text-3'
                        }`}
                      >
                        {leadsCount}
                      </span>
                    )}

                    {tag && !badgeKey && (
                      <span
                        className={`rounded-md px-1.5 py-0.5 text-[10px] font-extrabold tracking-wider uppercase ${
                          isCurrent
                            ? 'bg-link text-white'
                            : 'bg-surface-raised text-text-4'
                        }`}
                      >
                        {tag}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          ))}
        </div>

        {/* Rodapé da Sidebar: Card do Recrutador / Staff + Ações */}
        <div className="mt-auto flex flex-col gap-2 pt-4">
          <div className="flex items-center gap-2.5 rounded-[14px] bg-surface p-2.5 border border-line/60">
            <SponsorAvatar
              name={rawName}
              initials={staffInitials}
              avatar={userProfile?.avatar || authUser?.photoURL}
              size={36}
            />
            <div className="min-w-0 flex-1">
              <span className="block truncate text-[13px] font-bold text-text">{rawName}</span>
              <span className="flex items-center gap-1.5 text-[11px] font-bold" style={{ color: 'var(--role-patrocinador)' }}>
                <span>Patrocinador</span>
                <span className="text-text-4 font-normal">·</span>
                <span className="text-text-3 font-semibold truncate">{companyName}</span>
              </span>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-1.5">
            <button
              type="button"
              onClick={() => navigate('/profile?edit=true')}
              className="press flex h-9 items-center justify-center gap-1.5 rounded-[10px] bg-surface text-[12px] font-bold text-text-2 hover:text-text hover:bg-surface-raised border border-line/50 transition-colors"
            >
              <Pencil size={13} aria-hidden="true" />
              <span>Perfil</span>
            </button>
            <button
              type="button"
              onClick={() => setIsRoleModalOpen(true)}
              className="press flex h-9 items-center justify-center gap-1.5 rounded-[10px] bg-surface text-[12px] font-bold text-text-2 hover:text-text hover:bg-surface-raised border border-line/50 transition-colors"
            >
              <ArrowLeftRight size={13} aria-hidden="true" />
              <span>Trocar</span>
            </button>
          </div>
        </div>
      </aside>

      {/* ========================================================================= */}
      {/* ÁREA PRINCIPAL DE CONTEÚDO                                               */}
      {/* ========================================================================= */}
      <div className="flex min-w-0 flex-1 flex-col lg:pl-[260px] print:!pl-0">
        {/* Topo Desktop (≥1024px): Contexto + Atalhos Rápidos + Live Status */}
        <header className="hidden items-center justify-between gap-4 border-b border-line/60 bg-bg/80 backdrop-blur-md px-8 py-3.5 lg:flex print:!hidden">
          <div className="flex items-center gap-3.5 min-w-0">
            <Mascot size={44} name="alan" mood="happy" className="shrink-0" />
            <div className="min-w-0">
              <h1 className="m-0 text-[18px] font-extrabold text-text tracking-tight truncate">
                {contextMeta.title}
              </h1>
              <p className="m-0 mt-0.5 text-[12px] text-text-3 truncate">
                {contextMeta.subtitle}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            {/* Atalho Rápido para Bipar */}
            {activeNavKey !== 'scanner' && (
              <button
                type="button"
                onClick={() => onNavigate('scanner')}
                className="press inline-flex h-9 items-center gap-2 rounded-xl bg-action px-3.5 text-[12px] font-extrabold text-white shadow-sm hover:brightness-110 transition-all"
              >
                <QrCode size={15} aria-hidden="true" />
                <span>Bipar Crachá</span>
              </button>
            )}

            {/* Exportar CSV */}
            <button
              type="button"
              onClick={onExportCsv}
              disabled={leadsCount === 0}
              className="press inline-flex h-9 items-center gap-2 rounded-xl border border-line bg-surface px-3 text-[12px] font-bold text-text-2 hover:bg-surface-raised hover:text-text disabled:cursor-not-allowed disabled:opacity-40 transition-colors"
              title="Exportar todos os leads em formato CSV"
            >
              <Download size={14} aria-hidden="true" />
              <span>CSV ({leadsCount})</span>
            </button>

            {/* Live Chip da TechWeek */}
            <LiveChip info={info} />
          </div>
        </header>

        {/* Conteúdo da Tela */}
        <main className="min-w-0 flex-1 px-4 pt-4 pb-28 lg:px-8 lg:py-6 lg:pb-12 print:p-0 print:m-0 print:w-full print:max-w-none print:pb-0">
          <div className="mx-auto w-full max-w-[1440px] print:max-w-none print:w-full print:p-0 print:m-0">
            {children}
          </div>
        </main>

        {/* ========================================================================= */}
        {/* BARRA DE NAVEGAÇÃO INFERIOR ESTILO MOBILE (TECHWEEK DESIGN SYSTEM)        */}
        {/* Oculta no desktop (lg:hidden)                                             */}
        {/* ========================================================================= */}
        <nav
          aria-label="Navegação do Patrocinador"
          className="fixed inset-x-0 bottom-0 z-40 flex justify-center pointer-events-none lg:hidden print:!hidden"
        >
          <div
            className="w-full max-w-[430px] grid grid-cols-5 border-t border-line bg-nav pt-1.5 pb-[max(10px,env(safe-area-inset-bottom))] pointer-events-auto"
          >
            {MOBILE_NAV_TABS.map(({ key, label, icon: Icon, isFab }) => {
              const current = activeNavKey === key || (key === 'leads' && activeNavKey === 'roi');
              if (isFab) {
                return (
                  <button
                    key={key}
                    type="button"
                    aria-current={current ? 'page' : undefined}
                    onClick={() => onNavigate(key)}
                    className="flex flex-col items-center justify-end gap-1 text-[11px] font-extrabold text-text cursor-pointer min-h-[48px]"
                  >
                    <span
                      className="mt-[-22px] flex h-[52px] w-[52px] items-center justify-center rounded-full text-white shadow-[0_6px_18px_rgba(91,59,224,0.45)] ring-4 ring-bg"
                      style={{
                        background: 'linear-gradient(135deg, #2563EB, #7C3AED)',
                      }}
                    >
                      <QrCode size={24} />
                    </span>
                    <span>{label}</span>
                  </button>
                );
              }

              return (
                <button
                  key={key}
                  type="button"
                  aria-current={current ? 'page' : undefined}
                  onClick={() => onNavigate(key)}
                  className={`flex flex-col items-center justify-center gap-1 text-[11px] transition-colors cursor-pointer min-h-[48px] ${
                    current ? 'font-extrabold text-text' : 'font-medium text-text-3'
                  }`}
                >
                  <Icon
                    size={20}
                    color={current ? 'var(--link)' : 'currentColor'}
                    strokeWidth={current ? 2.3 : 1.9}
                  />
                  <span>{label}</span>
                </button>
              );
            })}
          </div>
        </nav>
      </div>

      {/* ========================================================================= */}
      {/* MODAL: TROCAR DE CONTA (RoleSwitcher)                                     */}
      {/* ========================================================================= */}
      {isRoleModalOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="role-switcher-title"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fade-in"
          onClick={() => setIsRoleModalOpen(false)}
        >
          <div
            className="relative w-full max-w-[420px] rounded-2xl border border-line bg-surface p-5 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-3 border-b border-line">
              <div>
                <h2 id="role-switcher-title" className="m-0 text-[16px] font-extrabold text-text">
                  Trocar de Conta
                </h2>
                <p className="m-0 mt-0.5 text-[12px] text-text-3">
                  Alterne para outro papel disponível na sua conta
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsRoleModalOpen(false)}
                className="flex h-8 w-8 items-center justify-center rounded-lg text-text-3 hover:text-text hover:bg-surface-raised"
                aria-label="Fechar"
              >
                <X size={18} />
              </button>
            </div>

            <div className="pt-3">
              <RoleSwitcher role={actualRole} current="SPONSOR" />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
