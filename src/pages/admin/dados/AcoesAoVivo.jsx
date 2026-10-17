import { useState } from 'react';
import { ChevronDown, FileText, Printer, Radio, Zap, CheckCircle2 } from 'lucide-react';
import ActivityBroadcastModal from '../../../components/ActivityBroadcastModal';
import {
  releaseWalkinSeats, getWalkinReleases, cancelWalkinRelease, triggerSponsorBoost, getActiveSponsorBoosts
} from '../../../lib/liveOpsService';
import { Dialog, btn, capacityOf, startTime } from '../ui';
import { TIERS, fmt } from './derive';

/* "Ações ao vivo": controles de operação que já existiam na tela antiga (mesma lógica, mesmos serviços):
   liberar walk-in, boost de estande, aviso aos inscritos de uma palestra e dossiê do patrocinador (imprimir). */

const findIn = (store, key, field) => store?.[key] || (Array.isArray(store)
  ? store.find((r) => r[field] === key)
  : Object.values(store || {}).find((r) => r[field] === key));

export default function AcoesAoVivo({ activities, sponsors, courses }) {
  const [open, setOpen] = useState(() => typeof window === 'undefined' || window.matchMedia('(min-width: 721px)').matches);
  const [walkins, setWalkins] = useState(() => getWalkinReleases());
  const [boosts, setBoosts] = useState(() => getActiveSponsorBoosts());
  const [boostFor, setBoostFor] = useState(null);
  const [dossier, setDossier] = useState(null);
  const [broadcast, setBroadcast] = useState(null);
  const [duration, setDuration] = useState(30);
  const [points, setPoints] = useState(100);

  const idle = activities
    .map((a) => ({ a, cap: capacityOf(a) }))
    .filter(({ cap }) => cap.total > 0 && cap.total - cap.taken > 0)
    .map(({ a, cap }) => ({ ...a, capacity: cap.total, idleSeats: cap.total - cap.taken, occPct: Math.round((cap.taken / cap.total) * 100) }))
    .sort((x, y) => y.idleSeats - x.idleSeats).slice(0, 5);

  const release = async (a) => {
    await releaseWalkinSeats(a.id, a.idleSeats || Math.max(10, Math.round((a.capacity || 50) * 0.2)), a.title || '', a.location || '');
    setWalkins(getWalkinReleases());
  };
  const cancel = (id) => { cancelWalkinRelease(id); setWalkins(getWalkinReleases()); };
  const fireBoost = (e) => {
    e.preventDefault();
    if (!boostFor) return;
    triggerSponsorBoost({
      sponsorId: boostFor.id, sponsorName: boostFor.name, durationMinutes: duration, extraPoints: points,
      message: `Missão Flash: Visite o estande da ${boostFor.name} e ganhe +${points} XP!`
    });
    setBoosts(getActiveSponsorBoosts());
    setBoostFor(null);
  };

  const Choice = ({ value, current, set, children }) => (
    <button type="button" aria-pressed={current === value} className="dd-chip" style={{ justifyContent: 'center' }} onClick={() => set(value)}>{children}</button>
  );

  return (
    <section className="dd-card tw-up" aria-labelledby="dd-acoes">
      <button type="button" className="dd-fold" aria-expanded={open} aria-controls="dd-acoes-body" onClick={() => setOpen((o) => !o)}>
        <h2 id="dd-acoes">Ações ao vivo</h2>
        <span className="dd-muted" style={{ fontSize: 13 }}>Walk-in, boost de estande, avisos e dossiê</span>
        <ChevronDown size={18} aria-hidden="true" style={{ transform: open ? 'rotate(180deg)' : 'none', transition: 'transform .18s', flexShrink: 0 }} />
      </button>

      {open && (
        <div id="dd-acoes-body" className="dd-stack" style={{ gap: 22, marginTop: 16 }}>
          <div>
            <h3 className="dd-sec">Liberar walk-in</h3>
            {idle.length === 0 ? <p className="dd-empty">Nenhuma atividade com vagas livres.</p> : (
              <div className="dd-acts">
                {idle.map((a) => {
                  const r = findIn(walkins, a.id, 'activityId');
                  return (
                    <div key={a.id} className="dd-act">
                      <div style={{ fontWeight: 700, fontSize: 14, overflowWrap: 'anywhere' }}>{a.title}</div>
                      <div style={{ fontSize: 12, color: 'var(--text-3)', marginTop: 2 }}>{a.location} · {startTime(a)}</div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, fontWeight: 700, margin: '8px 0' }}>
                        <span style={{ color: 'var(--ok)' }}>{a.idleSeats} vagas livres</span>
                        <span style={{ color: 'var(--text-4)' }}>{a.occPct}% ocupada</span>
                      </div>
                      {r ? (
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
                          <span style={{ display: 'inline-flex', gap: 4, alignItems: 'center', fontSize: 12, fontWeight: 800, color: 'var(--ok)' }}>
                            <CheckCircle2 size={14} aria-hidden="true" />+{r.releasedSeats || r.seatsReleased || 10} vagas liberadas
                          </span>
                          <button type="button" className="dd-linkbtn" style={{ color: 'var(--warn)' }} onClick={() => cancel(a.id)}>Cancelar</button>
                        </div>
                      ) : (
                        <button type="button" className={btn('secondary', 'w-full')} onClick={() => release(a)}>Liberar walk-in (+{a.idleSeats} vagas)</button>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          <div>
            <h3 className="dd-sec">Estandes</h3>
            <div className="dd-acts">
              {sponsors.map((s) => {
                const b = findIn(boosts, s.id, 'sponsorId');
                return (
                  <div key={s.id} className="dd-act">
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span style={{ width: 8, height: 8, borderRadius: 2, background: TIERS[s.tier].solid }} aria-hidden="true" />
                      <b style={{ flex: 1, fontSize: 14 }}>{s.name}</b>
                      <span style={{ fontSize: 12, color: 'var(--text-3)' }}>{TIERS[s.tier].label}</span>
                    </div>
                    {b && <div style={{ marginTop: 6, fontSize: 12, fontWeight: 800, color: 'var(--ok)' }}>Boost ativo (+{b.extraPoints} XP)</div>}
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginTop: 10 }}>
                      <button type="button" className={btn('secondary')} onClick={() => setBoostFor(s)}><Zap size={15} aria-hidden="true" />Boost</button>
                      <button type="button" className={btn('quiet', 'border border-line-2')} onClick={() => setDossier(s)}><FileText size={15} aria-hidden="true" />Dossiê</button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div>
            <h3 className="dd-sec">Avisar inscritos de uma atividade</h3>
            {activities.length === 0 ? <p className="dd-empty">Nenhuma atividade no filtro.</p> : (
              <div className="dd-list">
                {activities.map((a) => (
                  <div key={a.id} className="dd-item">
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 14, fontWeight: 700, overflowWrap: 'anywhere' }}>{a.title}</div>
                      <div style={{ fontSize: 12, color: 'var(--text-3)' }}>{a.location} · {startTime(a)}</div>
                    </div>
                    <button type="button" className={btn('quiet', 'border border-line-2')} onClick={() => setBroadcast(a)}><Radio size={15} aria-hidden="true" />Avisar</button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {boostFor && (
        <Dialog
          title={`Boost no estande ${boostFor.name}`}
          onClose={() => setBoostFor(null)}
          footer={(
            <>
              <button type="button" className={btn('secondary')} onClick={() => setBoostFor(null)}>Cancelar</button>
              <button type="submit" form="dd-boost-form" className={btn('action')}><Zap size={16} aria-hidden="true" />Ativar no app</button>
            </>
          )}
        >
          <form id="dd-boost-form" onSubmit={fireBoost} className="dd-stack" style={{ gap: 16 }}>
            <p style={{ margin: 0, fontSize: 13, color: 'var(--text-3)' }}>Bonificação temporária de XP para direcionar fluxo ao estande.</p>
            <fieldset style={{ border: 0, padding: 0, margin: 0 }}>
              <legend style={{ fontSize: 12, fontWeight: 800, color: 'var(--text-2)', marginBottom: 8 }}>Duração</legend>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 8 }}>
                {[15, 30, 45, 60].map((m) => <Choice key={m} value={m} current={duration} set={setDuration}>{m} min</Choice>)}
              </div>
            </fieldset>
            <fieldset style={{ border: 0, padding: 0, margin: 0 }}>
              <legend style={{ fontSize: 12, fontWeight: 800, color: 'var(--text-2)', marginBottom: 8 }}>XP adicional</legend>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 8 }}>
                {[50, 100, 150, 200].map((p) => <Choice key={p} value={p} current={points} set={setPoints}>+{p}</Choice>)}
              </div>
            </fieldset>
            <div className="dd-act">
              <div style={{ fontSize: 11, fontWeight: 800, color: 'var(--text-4)', marginBottom: 4 }}>Prévia no app do participante</div>
              <div style={{ fontSize: 13, fontWeight: 800 }}>Missão relâmpago: estande {boostFor.name}</div>
              <div style={{ fontSize: 12, color: 'var(--text-3)' }}>Valide presença no estande pelos próximos {duration} min e receba +{points} XP.</div>
            </div>
          </form>
        </Dialog>
      )}

      {dossier && (
        <Dialog
          title={`Dossiê · ${dossier.name}`}
          wide
          onClose={() => setDossier(null)}
          footer={(
            <>
              <button type="button" className={btn('secondary')} onClick={() => window.print()}><Printer size={16} aria-hidden="true" />Imprimir PDF</button>
              <button type="button" className={btn('action')} onClick={() => setDossier(null)}>Fechar</button>
            </>
          )}
        >
          <p style={{ margin: '0 0 14px', fontSize: 13, color: 'var(--text-3)' }}>Cota {TIERS[dossier.tier].label} · TechWeek UFU 2026</p>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 10 }}>
            {[['Visitas', fmt(dossier.visits), 'var(--link)'], ['Leads', fmt(dossier.leads), 'var(--ok)'], ['Conversão', `${dossier.conversion}%`, 'var(--warn)']].map(([l, v, c]) => (
              <div key={l} className="dd-act" style={{ textAlign: 'center' }}>
                <div style={{ fontSize: 12, color: 'var(--text-3)' }}>{l}</div>
                <div style={{ fontSize: 20, fontWeight: 900, color: c }}>{v}</div>
              </div>
            ))}
          </div>
          <h3 className="dd-sec" style={{ marginTop: 16 }}>Perfil acadêmico dos inscritos</h3>
          {courses.map((c) => (
            <div key={c.label} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, padding: '4px 0' }}>
              <span style={{ color: 'var(--text-2)' }}>{c.label}</span><b>{c.n}</b>
            </div>
          ))}
          <p style={{ margin: '14px 0 0', fontSize: 11, lineHeight: 1.6, color: 'var(--text-3)' }}>
            Conformidade LGPD: os dados de contato foram coletados com autorização expressa dos participantes.
          </p>
        </Dialog>
      )}

      {broadcast && (
        <ActivityBroadcastModal activity={broadcast} onClose={() => setBroadcast(null)} onSuccess={() => setBroadcast(null)} />
      )}
    </section>
  );
}
