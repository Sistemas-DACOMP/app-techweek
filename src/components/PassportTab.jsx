import { useState, useEffect } from 'react';
import { Check } from 'lucide-react';
import { auth, db } from '../lib/firebase';
import { doc, onSnapshot } from 'firebase/firestore';
import Mascot from './Mascot';
import '../styles/conquistas.css';

// Regras do passaporte (DESIGN.md §12, OBSERVADA): Kanastra e Bayer obrigatórias, +50 por estande,
// sorteio = Kanastra + Bayer + 1 parceira, Bilhete Dourado com os 5.
export const SPONSORS_CONFIG = {
  kanastra: { id: 'kanastra', name: 'Kanastra', tier: 'DIAMOND', required: true, logo: '/patrocinadores/Kanastra-Logo-Edited.png', badgeDescription: 'Stand principal · Área Tech', points: 50 },
  bayer: { id: 'bayer', name: 'Bayer', tier: 'GOLD', required: true, logo: '/patrocinadores/LogoBayer.png', badgeDescription: 'Stand Inovação e AgroTech', points: 50 },
  aimirim: { id: 'aimirim', name: 'Aimirim', tier: 'SILVER', required: false, logo: '/patrocinadores/aimirim-logo.png', fallbackLogo: '/patrocinadores/W_Aimirim_med .png', badgeDescription: 'Stand Inteligência Industrial', points: 50 },
  bip: { id: 'bip', name: 'Bip Consulting', tier: 'SILVER', required: false, logo: '/patrocinadores/logo-bip-consulting-white.png', badgeDescription: 'Stand Consultoria e Transformação Digital', points: 50 },
  hyperflow: { id: 'hyperflow', name: 'HyperFlow', tier: 'SILVER', required: false, logo: '/patrocinadores/hyperflow-logo-secundario.png', badgeDescription: 'Stand Cloud e Automação', points: 50 },
};

// Cores das cotas (DESIGN.md §2.6) — tokens em index.css.
export const TIER_STYLE = {
  DIAMOND: { label: 'Diamante', bar: 'var(--tier-diamante)', line: 'var(--tier-diamante-line)', text: 'var(--tier-diamante-text)', soft: 'rgba(34,211,238,0.14)', tint: 'rgba(34,211,238,0.10)', cardLine: 'rgba(103,232,249,0.35)', dot: 'radial-gradient(circle at 30% 30%, #ECFEFF, #22D3EE 45%, #8B5CF6 100%)' },
  GOLD: { label: 'Ouro', bar: 'var(--tier-ouro)', line: 'var(--tier-ouro-line)', text: 'var(--tier-ouro-text)', soft: 'rgba(251,191,36,0.14)', tint: 'rgba(251,191,36,0.10)', cardLine: 'rgba(251,191,36,0.35)', dot: 'radial-gradient(circle at 30% 30%, #FFF7D6, #FBBF24 45%, #B45309 100%)' },
  SILVER: { label: 'Prata', bar: 'var(--tier-prata)', line: 'var(--tier-prata-line)', text: 'var(--tier-prata-text)', soft: 'rgba(203,213,225,0.12)', tint: null, cardLine: null, dot: 'radial-gradient(circle at 30% 30%, #FFFFFF, #CBD5E1 45%, #64748B 100%)' },
};

const MONTHS = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];
const formatVisitDate = (visitedAt) => {
  const date = visitedAt?.toDate ? visitedAt.toDate() : new Date(visitedAt);
  if (!visitedAt || isNaN(date.getTime())) return 'Visitado';
  return `Visitado · ${date.getDate()} ${MONTHS[date.getMonth()]}`;
};

function VisitStatus({ visit }) {
  if (!visit) {
    return (
      <span className="text-[13px] font-semibold text-text-2">
        Ainda não visitado · <b className="text-you-text">+50 pts</b>
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1.5 text-[13px] font-bold text-ok">
      <span className="flex h-[18px] w-[18px] items-center justify-center rounded-full bg-[#10B981]">
        <Check size={11} color="#fff" strokeWidth={3.2} aria-hidden="true" />
      </span>
      {formatVisitDate(visit.visitedAt)}
    </span>
  );
}

function TierHeading({ tier, note }) {
  const t = TIER_STYLE[tier];
  return (
    <div className="mb-3 mt-[26px] flex items-center gap-2.5">
      <span
        aria-hidden="true"
        className="h-3.5 w-3.5 shrink-0 rounded-full"
        style={{ background: t.dot, boxShadow: `0 0 0 2px var(--bg), 0 0 0 3px ${t.line}` }}
      />
      <h2 className="m-0 text-base font-extrabold" style={{ color: t.text }}>{t.label}</h2>
      <span className="ml-auto text-xs font-semibold text-text-3">{note}</span>
    </div>
  );
}

const tierBar = (tier) => (
  <span aria-hidden="true" className="absolute inset-x-0 top-0 h-[3px]" style={{ background: TIER_STYLE[tier].bar }} />
);

export default function PassportTab({ userProfile }) {
  const [liveProfile, setLiveProfile] = useState(userProfile || {});

  // Escuta atualizações do Firestore em tempo real para carimbo instantâneo quando o patrocinador escanear
  useEffect(() => {
    const uid = auth?.currentUser?.uid || userProfile?.uid;
    if (!uid) return;

    try {
      const unsub = onSnapshot(doc(db, 'users', uid), (snap) => {
        if (snap.exists()) {
          setLiveProfile((prev) => ({
            ...prev,
            ...snap.data(),
            uid: snap.id
          }));
        }
      });
      return () => unsub();
    } catch (_err) {
      // Fallback gracioso
    }
  }, [userProfile?.uid]);

  const visitedSponsors = liveProfile?.visitedSponsors || userProfile?.visitedSponsors || {};
  const isGoldenTicket = liveProfile?.goldenTicketAwarded || userProfile?.goldenTicketAwarded || false;

  const kanastraVisited = !!visitedSponsors?.kanastra;
  const bayerVisited = !!visitedSponsors?.bayer;
  const partnerCount = ['aimirim', 'bip', 'hyperflow'].filter((id) => !!visitedSponsors?.[id]).length;
  const totalVisited = Object.keys(SPONSORS_CONFIG).filter((id) => !!visitedSponsors?.[id]).length;

  // Elegível aos prêmios: Kanastra + Bayer (obrigatórias) + pelo menos 1 parceira
  const isEligibleForPrizes = kanastraVisited && bayerVisited && partnerCount >= 1;
  const isFullPassport = totalVisited === 5 || isGoldenTicket;
  const missingForDraw = [!kanastraVisited && 'Kanastra', !bayerVisited && 'Bayer', partnerCount < 1 && '1 prata'].filter(Boolean);

  const { kanastra, bayer } = SPONSORS_CONFIG;
  const silvers = [SPONSORS_CONFIG.aimirim, SPONSORS_CONFIG.bip, SPONSORS_CONFIG.hyperflow];

  return (
    <div className="flex flex-col">
      {/* Cartão de topo */}
      <section
        aria-label="Seu passaporte"
        className="mt-5 grid grid-cols-[1fr_76px] items-center gap-2 rounded-[20px] border border-[#2A3460] py-[18px] pl-[18px] pr-4"
        style={{ background: 'linear-gradient(135deg, #1B2160, var(--surface) 70%)' }}
      >
        <div>
          <div className="flex items-baseline gap-2">
            <span className="text-[34px] font-black leading-none">
              {totalVisited}<span className="text-xl text-text-3">/5</span>
            </span>
            <span className="text-sm font-bold text-[#C3C9DE]">estandes visitados</span>
          </div>
          <div className="mt-3 flex gap-1" aria-hidden="true">
            {Object.values(SPONSORS_CONFIG).map((s) => (
              <span
                key={s.id}
                className="h-2 rounded"
                style={{
                  flex: s.tier === 'DIAMOND' ? 1.4 : s.tier === 'GOLD' ? 1.2 : 1,
                  background: visitedSponsors?.[s.id] ? TIER_STYLE[s.tier].bar : 'var(--surface-raised)',
                }}
              />
            ))}
          </div>
          {isEligibleForPrizes ? (
            <div className="mt-3 flex items-center gap-1.5 text-[13px] font-bold text-ok">
              <Check size={14} strokeWidth={2.8} aria-hidden="true" />
              Concorrendo aos sorteios
            </div>
          ) : (
            <div className="mt-3 text-[13px] font-semibold text-text-2">
              Para os sorteios, falta: <b className="text-text">{missingForDraw.join(' · ')}</b>
            </div>
          )}
          <div className="mt-1 text-[13px] text-text-2">
            <b className="text-warn">Bilhete Dourado</b>
            {isFullPassport ? ': garantido · +100' : `: faltam ${5 - totalVisited} · +100`}
          </div>
        </div>
        <div className="flex justify-center">
          <Mascot color="purple" className="animate-none! h-[76px]! w-[76px]!" />
        </div>
      </section>

      {/* Diamante: cartão grande com o logo em destaque */}
      <TierHeading tier="DIAMOND" note="obrigatória · +50 pts" />
      <article
        className="relative overflow-hidden rounded-[18px] border"
        style={{
          background: 'linear-gradient(160deg, #0E3550, var(--surface) 50%, #26195A)',
          borderColor: TIER_STYLE.DIAMOND.line,
          boxShadow: '0 14px 38px -10px rgba(34,211,238,0.5), 0 0 0 1px rgba(167,139,250,0.2)',
        }}
      >
        {tierBar('DIAMOND')}
        <div className="p-4">
          <div className="flex h-[104px] items-center justify-center rounded-[14px] bg-[#F4F5FA]">
            <img src={kanastra.logo} alt="Kanastra" className="h-[46px] w-[176px] object-contain" />
          </div>
          <div className="mt-3.5 text-[17px] font-extrabold">{kanastra.name}</div>
          <div className="mt-0.5 text-[13px] text-text-2">{kanastra.badgeDescription}</div>
          <div className="mt-3 border-t border-[#1F2747] pt-3">
            <VisitStatus visit={visitedSponsors.kanastra} />
          </div>
        </div>
        <span className="conq-sheen" aria-hidden="true" />
      </article>

      {/* Ouro: cartão médio em linha */}
      <TierHeading tier="GOLD" note="obrigatória · +50 pts" />
      <article
        className="relative overflow-hidden rounded-[18px] border"
        style={{
          background: 'linear-gradient(160deg, #3A2A0A, var(--surface) 58%)',
          borderColor: TIER_STYLE.GOLD.line,
          boxShadow: '0 12px 30px -12px rgba(251,191,36,0.5)',
        }}
      >
        {tierBar('GOLD')}
        <div className="grid grid-cols-[76px_1fr] items-center gap-3.5 p-4">
          <div className="flex h-[76px] w-[76px] items-center justify-center rounded-[14px] bg-[#F4F5FA]">
            <img src={bayer.logo} alt="Bayer" className="h-14 w-14 object-contain" />
          </div>
          <div>
            <div className="text-base font-extrabold">{bayer.name}</div>
            <div className="mt-0.5 text-[13px] text-text-2">{bayer.badgeDescription}</div>
            <div className="mt-2.5"><VisitStatus visit={visitedSponsors.bayer} /></div>
          </div>
        </div>
        <span className="conq-sheen" aria-hidden="true" />
      </article>

      {/* Prata: lista compacta num cartão só */}
      <TierHeading tier="SILVER" note="escolha 1 ou mais · +50 cada" />
      <article className="relative overflow-hidden rounded-[18px] border bg-surface pt-[3px]" style={{ borderColor: TIER_STYLE.SILVER.line }}>
        {tierBar('SILVER')}
        <ul className="m-0 list-none p-0">
          {silvers.map((s, i) => {
            const visit = visitedSponsors[s.id];
            return (
              <li
                key={s.id}
                className={`grid grid-cols-[72px_1fr] items-center gap-3.5 px-4 py-3 ${i < silvers.length - 1 ? 'border-b border-[#1F2747]' : ''}`}
              >
                <div className="flex h-11 w-[72px] items-center justify-center rounded-[10px] bg-surface-raised">
                  <img
                    src={s.logo}
                    alt=""
                    onError={(e) => { if (s.fallbackLogo) e.currentTarget.src = s.fallbackLogo; }}
                    className={`max-h-[22px] max-w-[60px] object-contain ${visit ? '' : 'opacity-60'}`}
                  />
                </div>
                <div>
                  <div className="text-[15px] font-bold">{s.name}</div>
                  <div className="mt-[3px]"><VisitStatus visit={visit} /></div>
                </div>
              </li>
            );
          })}
        </ul>
      </article>

      <p className="mx-6 mb-1 mt-4 text-center text-xs leading-normal text-text-4">
        O carimbo entra quando o estande lê o seu crachá.
      </p>
    </div>
  );
}
