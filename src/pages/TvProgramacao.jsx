import { useEffect, useMemo, useState } from 'react';
import { subscribeToActivities, DEFAULT_ACTIVITIES } from '../lib/activityService';
import { SPONSORS_CONFIG } from '../components/PassportTab';
import { classify, typeInfo, formatRemaining } from '../lib/tvProgramacao';
import logoTw from '../assets/logo-tw.png';

// Tela de TV vertical 1080x1920 (KAN-126). Palco fixo escalado por JS para caber
// em qualquer viewport; sem scroll, sem interação. Tokens do handoff de design.
const C = { bg: '#0A0F24', sf: '#121A36', rs: '#1A2347', side: '#0D1330', line: '#1C2548', t: '#EEF1FA', t2: '#A9B1CC', t3: '#8790AE', link: '#8FA0FF', ok: '#6FD8A6' };
const TIER_BAR = {
  DIAMOND: { w: 280, bg: 'linear-gradient(90deg,#22D3EE,#A78BFA,#F0ABFC)', box: [360, 100] },
  GOLD: { w: 220, bg: 'linear-gradient(90deg,#FDE68A,#FBBF24,#D97706)', box: [300, 100] },
  SILVER: { w: 180, bg: 'linear-gradient(90deg,#E2E8F0,#94A3B8)', box: [260, 86] },
};
const TIER_ORDER = ['DIAMOND', 'GOLD', 'SILVER'];
// ponytail: fonte de logos = SPONSORS_CONFIG (hardcoded, mesma do Passaporte); sem coleção de patrocinadores no Firestore.
const SPONSORS = Object.values(SPONSORS_CONFIG)
  .filter((s) => TIER_BAR[s.tier])
  .sort((a, b) => TIER_ORDER.indexOf(a.tier) - TIER_ORDER.indexOf(b.tier));

const CSS = `
.tv-marquee{display:flex;width:max-content;animation:tvScroll 40s linear infinite;will-change:transform}
@keyframes tvScroll{to{transform:translateX(-50%)}}
@keyframes tvPulse{0%,100%{transform:scale(1);opacity:1}50%{transform:scale(1.5);opacity:.5}}
.tv-dot{animation:tvPulse 1.8s ease-in-out infinite}
@media (prefers-reduced-motion: reduce){.tv-marquee,.tv-dot{animation:none}}
`;

function Sponsor({ s }) {
  const bar = TIER_BAR[s.tier];
  const [w, h] = bar.box;
  return (
    <span style={{ flexShrink: 0, display: 'flex', flexDirection: 'column', gap: 12, alignItems: 'center' }}>
      <span style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: w, height: h, borderRadius: 18, background: s.id === 'kanastra' ? '#F4F5FA' : C.rs }}>
        <img src={s.logo} alt={s.name} style={{ maxHeight: h - 40, maxWidth: w - 60, objectFit: 'contain', display: 'block' }} />
      </span>
      <span style={{ width: bar.w, height: 4, borderRadius: 2, background: bar.bg }} />
    </span>
  );
}

export default function TvProgramacao() {
  const [activities, setActivities] = useState(DEFAULT_ACTIVITIES);
  const [now, setNow] = useState(() => Date.now());
  const [scale, setScale] = useState(1);

  useEffect(() => {
    const unsub = subscribeToActivities((list) => list?.length && setActivities(list));
    return () => typeof unsub === 'function' && unsub();
  }, []);

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    const fit = () => setScale(Math.min(window.innerWidth / 1080, window.innerHeight / 1920));
    fit();
    window.addEventListener('resize', fit);
    return () => window.removeEventListener('resize', fit);
  }, []);

  const { live, upcoming, nextStart } = useMemo(() => classify(activities, now), [activities, now]);
  const d = new Date(now);
  const clock = d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
  const dateLabel = d.toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' });
  const sponsors = [...SPONSORS, ...SPONSORS];

  return (
    <div role="main" style={{ position: 'fixed', inset: 0, zIndex: 10000, background: C.bg, overflow: 'hidden' }}>
      <style>{CSS}</style>
      <div style={{ position: 'absolute', left: '50%', top: '50%', width: 1080, height: 1920, marginLeft: -540, marginTop: -960, transform: `scale(${scale})`, transformOrigin: 'center', background: C.bg, color: C.t, fontFamily: 'Montserrat, sans-serif', fontVariantNumeric: 'tabular-nums', overflow: 'hidden' }}>
        <div style={{ padding: '64px 64px 0', display: 'flex', flexDirection: 'column', gap: 44 }}>
          <header style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
            <img src={logoTw} alt="" style={{ width: 64, height: 68, objectFit: 'contain' }} />
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 34, fontWeight: 900 }}>Tech Week 2026</div>
              <div style={{ fontSize: 22, color: C.t3, marginTop: 4 }}>FACOM · UFU · programação</div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: 76, fontWeight: 900, lineHeight: 1 }}>{clock}</div>
              <div style={{ fontSize: 22, color: C.t3, marginTop: 6, textTransform: 'capitalize' }}>{dateLabel}</div>
            </div>
          </header>

          <section style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
            {live.length > 0 ? (
              <>
                <div style={{ display: 'flex', alignItems: 'center', gap: 14, fontSize: 26, fontWeight: 800, color: C.ok, letterSpacing: '.02em' }}>
                  <span className="tv-dot" style={{ width: 16, height: 16, borderRadius: '50%', background: C.ok }} />
                  Acontecendo agora
                </div>
                {live.map(({ act, start, end }) => {
                  const ti = typeInfo(act.type);
                  const pct = Math.min(100, Math.max(0, ((now - start) / (end - start)) * 100));
                  const full = act.vagas_disponiveis <= 0 && act.vagas_totais > 0;
                  return (
                    <article key={act.id} style={{ padding: '36px 40px', borderRadius: 32, background: C.sf, borderLeft: `8px solid ${ti.color}` }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 16, fontSize: 24, fontWeight: 800 }}>
                        <span style={{ color: ti.color }}>{ti.label}</span>
                        {act.location && (<><span style={{ color: '#6E779A' }}>·</span><span style={{ color: C.t2 }}>{act.location}</span></>)}
                        {act.vagas_totais > 0 && (
                          <span style={{ marginLeft: 'auto', color: C.t3, fontWeight: 700 }}>
                            {act.total_inscritos ?? 0} / {act.vagas_totais}{full ? ' lotado' : ''}
                          </span>
                        )}
                      </div>
                      <div style={{ marginTop: 16, fontSize: 54, fontWeight: 900, lineHeight: 1.12 }}>{act.title}</div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 20, marginTop: 28 }}>
                        <span style={{ fontSize: 26, fontWeight: 700, color: C.t2, whiteSpace: 'nowrap' }}>{act.time} – {act.endTime || ''}</span>
                        <span style={{ flex: 1, height: 10, borderRadius: 5, background: C.rs, overflow: 'hidden' }}>
                          <span style={{ display: 'block', width: `${pct}%`, height: 10, borderRadius: 5, background: ti.color }} />
                        </span>
                        <span style={{ fontSize: 24, fontWeight: 700, color: C.t3, whiteSpace: 'nowrap' }}>termina em {formatRemaining(end - now)}</span>
                      </div>
                    </article>
                  );
                })}
              </>
            ) : (
              <>
                <div style={{ fontSize: 26, fontWeight: 800, color: C.t3, letterSpacing: '.02em' }}>Agora</div>
                <article style={{ padding: '36px 40px', borderRadius: 32, background: C.sf }}>
                  <div style={{ fontSize: 54, fontWeight: 900 }}>Intervalo</div>
                  <div style={{ fontSize: 24, color: C.t3, marginTop: 8 }}>Nenhuma atividade em andamento</div>
                </article>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: 24, padding: '0 8px' }}>
                  {nextStart ? (
                    <>
                      <span style={{ fontSize: 28, fontWeight: 700, color: C.t2 }}>Próxima atividade em</span>
                      <span style={{ fontSize: 76, fontWeight: 900, color: C.link, lineHeight: 1 }}>{formatRemaining(nextStart - now)}</span>
                    </>
                  ) : (
                    <span style={{ fontSize: 28, fontWeight: 700, color: C.t2 }}>Programação encerrada por hoje</span>
                  )}
                </div>
              </>
            )}
          </section>

          {upcoming.length > 0 && (
            <section>
              <div style={{ fontSize: 26, fontWeight: 800, color: C.t3, letterSpacing: '.02em' }}>A seguir</div>
              <div style={{ marginTop: 8 }}>
                {upcoming.map(({ act }, i) => {
                  const ti = typeInfo(act.type);
                  return (
                    <div key={act.id} style={{ display: 'grid', gridTemplateColumns: '150px minmax(0,1fr)', gap: 28, alignItems: 'center', padding: '26px 0', borderBottom: i < upcoming.length - 1 ? `2px solid ${C.line}` : 'none' }}>
                      <span style={{ fontSize: 44, fontWeight: 900 }}>{act.time}</span>
                      <span style={{ minWidth: 0 }}>
                        <span style={{ display: 'flex', alignItems: 'center', gap: 12, fontSize: 22, fontWeight: 800, color: ti.color }}>
                          <span style={{ width: 12, height: 12, borderRadius: '50%', background: ti.color }} />
                          {ti.label}
                          {act.location && <span style={{ color: C.t3, fontWeight: 700 }}>· {act.location}</span>}
                        </span>
                        <span style={{ display: 'block', marginTop: 8, fontSize: 34, fontWeight: 800, lineHeight: 1.2 }}>{act.title}</span>
                      </span>
                    </div>
                  );
                })}
              </div>
            </section>
          )}
        </div>

        <footer style={{ position: 'absolute', left: 0, right: 0, bottom: 0, height: 300, background: C.side, borderTop: `1px solid ${C.line}`, overflow: 'hidden' }}>
          <div style={{ padding: '34px 64px 0', fontSize: 22, fontWeight: 800, color: C.t3, letterSpacing: '.04em' }}>Patrocinadores</div>
          <div style={{ marginTop: 28 }}>
            <div className="tv-marquee" aria-hidden="true">
              {sponsors.map((s, i) => (
                <span key={`${s.id}-${i}`} style={{ paddingLeft: 56 }}><Sponsor s={s} /></span>
              ))}
            </div>
          </div>
        </footer>
      </div>
    </div>
  );
}
