import { useMemo } from 'react';
import { QrCode, Users, LifeBuoy, Clock, MapPin, Megaphone } from 'lucide-react';
import Mascot from '../../components/Mascot';
import { TypeTag } from '../admin/ui';
import { Avatar, CotaText, KpiTile, SectionCard, TierStripe } from './ui';
import LeadRow from './LeadRow';
import { TIER_BAR, leadKey, logoFilter, relTime, sponsorFromText, toMs } from './util';

const greeting = (now) => (now.getHours() < 12 ? 'Bom dia' : now.getHours() < 18 ? 'Boa tarde' : 'Boa noite');
function longDate(now) {
  const s = new Intl.DateTimeFormat('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' }).format(now).replace('-feira', '');
  return s.charAt(0).toUpperCase() + s.slice(1);
}

/* Aba "Visão geral". Dados e handlers vêm de Sponsor.jsx (fonte: fetchLeads, subscribeToActivities, subscribeToFeedPosts). */
export default function Inicio({
  sponsorName, firstName, tier, companyLogo, companyLogoFilter,
  myLeads, companyLeads, validatedCount = 0,
  activities, feedPosts,
  onNavigate, onOpenLead, onOpenActivity, onOpenSupport,
}) {
  const now = useMemo(() => new Date(), []);
  const total = companyLeads.length;
  const qualified = companyLeads.filter((l) => (Number(l.rating) || 0) >= 4).length;
  const pct = total ? Math.round((qualified / total) * 100) : 0;
  const recent = useMemo(() => [...companyLeads].sort((a, b) => toMs(b.createdAt) - toMs(a.createdAt)).slice(0, 4), [companyLeads]);

  const notice = useMemo(() => {
    const org = feedPosts.filter((p) => p.authorRole === 'ORGANIZATION');
    return org.find((p) => p.pinned) || org[0] || null;
  }, [feedPosts]);
  const fromBooths = useMemo(() => feedPosts.filter((p) => p.authorRole === 'SPONSOR').slice(0, 2), [feedPosts]);

  return (
    <div className="flex flex-col gap-5">
      {/* Boas-vindas: faixa de 3px com a cota, sem pill */}
      <div className="tw-rise overflow-hidden rounded-[22px] border border-line bg-surface">
        <TierStripe tier={tier} />
        <div className="flex flex-col gap-3.5 p-4 lg:flex-row lg:items-center lg:gap-[18px] lg:px-[22px] lg:py-5">
          <div className="flex min-w-0 flex-1 items-center gap-3 lg:gap-[18px]">
            <Mascot size={52} name="alan" mood="happy" className="mascot-still shrink-0" />
            <div className="min-w-0 flex-1">
              <div className="text-[11px] font-extrabold uppercase text-link">Estande {sponsorName}</div>
              <h1 className="m-0 mt-0.5 truncate text-[20px] font-extrabold lg:text-[22px]">{greeting(now)}, {firstName}!</h1>
              <p className="m-0 mt-0.5 text-[13px] text-text-2">
                <span className="lg:hidden">{longDate(now)} · {total} {total === 1 ? 'lead coletado' : 'leads coletados'}</span>
                <span className="hidden lg:inline">{longDate(now)} · Painel de controle e captação de talentos da {sponsorName}</span>
              </p>
            </div>
            {companyLogo && <img src={companyLogo} alt={sponsorName} className="h-8 max-w-[110px] shrink-0 object-contain lg:hidden" style={{ filter: companyLogoFilter, opacity: 0.95 }} />}
          </div>
          <div className="flex gap-2.5 border-t border-line pt-3 lg:border-0 lg:pt-0">
            <button type="button" onClick={() => onNavigate('scanner')} className="tw-press flex h-11 flex-1 items-center justify-center gap-2 rounded-xl bg-action px-[18px] text-[15px] font-bold text-white lg:flex-none">
              <QrCode size={18} aria-hidden="true" /><span>Escanear<span className="hidden lg:inline"> crachá</span></span>
            </button>
            <button type="button" onClick={() => onNavigate('leads')} className="tw-press flex h-11 flex-1 items-center justify-center gap-2 rounded-xl bg-surface-selected px-[18px] text-[15px] font-bold lg:flex-none">
              <Users size={18} aria-hidden="true" /><span>Leads<span className="hidden lg:inline"> ({total})</span></span>
            </button>
            <button type="button" onClick={onOpenSupport} aria-label="Abrir chamado SOS" className="tw-press flex h-11 items-center justify-center gap-2 rounded-xl bg-surface-selected px-3.5 text-[15px] font-bold text-warn lg:px-[18px]">
              <LifeBuoy size={18} aria-hidden="true" /><span className="hidden lg:inline">Chamado SOS</span>
            </button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2.5 lg:grid-cols-4 lg:gap-3.5">
        <KpiTile i={1} label="Leads no estande" value={total} hint={`Total da equipe ${sponsorName}`} color="#8FA0FF" />
        <KpiTile i={2} label="Meus leads" value={myLeads.length} hint="Coletados por você" color="#B9A6F5" />
        <KpiTile i={3} label="Visitas validadas" value={total + validatedCount} hint="Passaportes carimbados" color="#6FD8A6" />
        <KpiTile i={4} label="Leads qualificados" value={qualified} hint={`${pct}% de ${total} · 4 e 5 estrelas`} tier={tier} color="#F2C46A" bar={pct} />
      </div>

      <div className="grid grid-cols-1 items-start gap-5 lg:grid-cols-12">
        <div className="flex flex-col gap-5 lg:col-span-7">
          <button type="button" onClick={() => onNavigate('scanner')} className="tw-rise tw-lift flex items-center gap-4 rounded-[20px] border border-line bg-surface px-5 py-4 text-left" style={{ '--i': 5 }}>
            <span className="flex size-12 shrink-0 items-center justify-center rounded-[14px] bg-action text-white"><QrCode size={24} aria-hidden="true" /></span>
            <span className="min-w-0 flex-1">
              <span className="block text-[12px] font-extrabold text-link">Escanear visitante</span>
              <span className="mt-0.5 block text-[16px] font-extrabold">Escanear crachá de aluno</span>
              <span className="mt-0.5 block text-[12px] text-text-3">Aponte a câmera para o QR digital ou crachá físico Sympla.</span>
            </span>
          </button>

          <SectionCard i={6} title="Leads recentes no estande" action={total > 0 ? `Ver todos (${total})` : null} onAction={() => onNavigate('leads')} flush>
            {recent.length === 0 ? (
              <div className="px-5 pb-8 pt-4 text-center">
                <p className="m-0 text-[13px] text-text-3">Nenhum lead coletado ainda. Aponte a câmera para os crachás no estande.</p>
                <button type="button" onClick={() => onNavigate('scanner')} className="tw-press mt-3 inline-flex h-11 items-center gap-2 rounded-xl bg-action px-4 text-[14px] font-bold text-white">
                  <QrCode size={16} aria-hidden="true" />Escanear primeiro visitante
                </button>
              </div>
            ) : recent.map((l, i) => (
              <LeadRow key={leadKey(l)} lead={l} tier={tier} i={i} onClick={() => onOpenLead(l)} />
            ))}
          </SectionCard>
        </div>

        <div className="flex flex-col gap-5 lg:col-span-5">
          <SectionCard i={6} title="Acontecendo na TechWeek" action="Ver tudo" onAction={() => onNavigate('agenda')}>
            {activities.length === 0 ? (
              <p className="m-0 py-3 text-center text-[13px] text-text-3">Nenhuma atividade programada para agora.</p>
            ) : (
              <ul className="m-0 -mb-2 list-none p-0">
                {activities.map((a) => (
                  <li key={a.id} className="border-b border-line last:border-0">
                    <button type="button" onClick={() => onOpenActivity(a)} className="tw-press flex min-h-[60px] w-full items-center gap-3 py-2 text-left">
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-[14px] font-bold">{a.title}</span>
                        <span className="mt-[3px] flex gap-3 text-[12px] text-text-3">
                          <span className="flex items-center gap-1"><Clock size={12} aria-hidden="true" className="text-cat-minicurso" />{a.time}</span>
                          {(a.room || a.location) && <span className="flex min-w-0 items-center gap-1"><MapPin size={12} aria-hidden="true" className="shrink-0 text-cat-hackathon" /><span className="truncate">{a.room || a.location}</span></span>}
                        </span>
                      </span>
                      <TypeTag type={a.type || 'palestra'} />
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </SectionCard>

          <SectionCard i={7} title="Avisos e comunidade" action="Abrir feed" onAction={() => onNavigate('feed')}>
            {notice && (
              <div className="rounded-[14px] bg-surface-raised p-3.5">
                <div className="flex items-center gap-2.5">
                  <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-action/30 text-link"><Megaphone size={16} aria-hidden="true" /></span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[13px] font-extrabold">{notice.author || 'Organização Tech Week'}</span>
                    <span className="block text-[12px] text-text-4">{notice.pinned ? 'Aviso fixado' : 'Aviso'} · {relTime(notice.createdAt)}</span>
                  </span>
                </div>
                <p className="m-0 mt-2.5 line-clamp-3 text-[14px] leading-normal">{notice.content}</p>
              </div>
            )}
            {fromBooths.length > 0 && <h3 className="m-0 mt-4 text-[12px] font-bold text-text-4">Dos estandes</h3>}
            {fromBooths.map((p) => <BoothPost key={p.id} post={p} />)}
            {!notice && fromBooths.length === 0 && <p className="m-0 py-3 text-center text-[13px] text-text-3">Nada publicado ainda.</p>}
          </SectionCard>
        </div>
      </div>
    </div>
  );
}

// Post de estande: logo + texto + "Cota X · hora · curtidas". Sem badge no feed.
function BoothPost({ post }) {
  const cfg = sponsorFromText(post.companyId) || sponsorFromText(post.author);
  const tier = TIER_BAR[post.sponsorTier] ? post.sponsorTier : cfg?.tier;
  const likes = Array.isArray(post.likes) ? post.likes.length : 0;
  return (
    <div className="grid grid-cols-[76px_minmax(0,1fr)] items-start gap-3.5 border-b border-line py-3.5 last:border-0 last:pb-0">
      <span className="flex h-10 items-center justify-center overflow-hidden rounded-[10px] bg-surface-raised">
        {cfg
          ? <img src={cfg.logo} alt={cfg.name} className="h-[22px] w-14 object-contain" style={{ filter: logoFilter(cfg) }} />
          : <Avatar name={post.author} size={28} photo={post.authorAvatar} />}
      </span>
      <div className="min-w-0">
        <p className="m-0 line-clamp-3 text-[13px] leading-normal">{post.content}</p>
        <div className="mt-1.5 flex flex-wrap items-center gap-1.5 text-[12px] text-text-4">
          <CotaText tier={tier} className="text-[12px]" />
          {tier && <span aria-hidden="true">·</span>}
          <span>{relTime(post.createdAt)}</span>
          <span aria-hidden="true">·</span>
          <span>{likes} {likes === 1 ? 'curtida' : 'curtidas'}</span>
        </div>
      </div>
    </div>
  );
}
