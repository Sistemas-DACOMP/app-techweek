import { ChevronRight } from 'lucide-react';
import { BarRow, ColumnPairs } from './charts';
import { PALETTE, WARN, OK } from './derive';

const short = (t = '') => (t.length > 14 ? `${t.slice(0, 13)}…` : t);

export default function SalasTab({ rooms, ret, mostSought, alerts, onNavigate }) {
  const retTop = ret.slice(0, 5);
  return (
    <>
      <div className="dd-g2">
        <section className="dd-card tw-up" aria-labelledby="dd-occ">
          <div className="dd-card-h"><h2 id="dd-occ">Ocupação por sala</h2></div>
          {rooms.length === 0 && <p className="dd-empty">Nenhuma atividade com vagas cadastradas.</p>}
          {rooms.map((r, i) => (
            <BarRow key={r.name} i={i} color={r.pct >= 100 ? WARN : PALETTE[i % PALETTE.length]} label={r.name} value={`${r.pct}%`} sub={`${r.taken} / ${r.cap}`} pct={r.pct} />
          ))}
        </section>

        <section className="dd-card tw-up" style={{ '--i': 1 }} aria-labelledby="dd-ret">
          <div className="dd-card-h"><h2 id="dd-ret">Retenção por atividade</h2></div>
          {retTop.length === 0 ? (
            <p className="dd-empty">Sem check-ins nas atividades ainda. A retenção compara o 1º scan (entrada) com o 2º (permanência).</p>
          ) : (
            <>
              <div className="dd-legend" style={{ marginBottom: 6 }}>
                <span><span style={{ width: 10, height: 10, borderRadius: 3, background: PALETTE[0] }} />1º scan (entrada)</span>
                <span><span style={{ width: 10, height: 10, borderRadius: 3, background: OK }} />2º scan (permanência)</span>
              </div>
              <div className="dd-desk">
                <ColumnPairs label="Entrada e permanência por atividade" colors={[PALETTE[0], OK]} items={retTop.map((r) => ({ label: short(r.title), a: r.entered, b: r.stayed }))} />
              </div>
              <div className="dd-mob">
                {retTop.map((r, i) => (
                  <div key={r.id} style={{ padding: '10px 0', borderTop: i ? '1px solid var(--line)' : 0 }}>
                    <div className="dd-row-h">
                      <b style={{ fontWeight: 600 }}>{r.title}</b>
                      <span style={r.stayPct <= 70 ? { color: WARN, fontWeight: 800 } : { color: 'var(--text-3)' }}>{r.stayPct <= 70 ? `evasão ${100 - r.stayPct}%` : `${r.stayPct}% ficaram`}</span>
                    </div>
                    <div className="dd-track" style={{ position: 'relative', height: 12 }}>
                      <div className="tw-growx" style={{ position: 'absolute', inset: '0 auto 0 0', width: '100%', background: `${PALETTE[0]}40` }} />
                      <div className="tw-growx" style={{ position: 'absolute', inset: '0 auto 0 0', width: `${r.stayPct}%`, background: OK, '--i': 1 }} />
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </section>
      </div>

      <div className="dd-g21">
        <section className="dd-card tw-up" aria-labelledby="dd-top">
          <div className="dd-card-h">
            <h2 id="dd-top">Mais procuradas</h2>
            {onNavigate && (
              <button type="button" onClick={() => onNavigate('programacao')} style={{ background: 'none', border: 0, cursor: 'pointer', color: 'var(--link)', fontSize: 14, fontWeight: 700, minHeight: 44, display: 'flex', alignItems: 'center', gap: 4 }}>
                Ver programação <ChevronRight size={14} aria-hidden="true" />
              </button>
            )}
          </div>
          {mostSought.length === 0 && <p className="dd-empty">Nenhuma atividade com vagas cadastradas.</p>}
          {mostSought.map((a, i) => {
            const c = a.pct >= 100 ? WARN : PALETTE[i % PALETTE.length];
            return (
              <div key={a.id} className="dd-item" style={i === mostSought.length - 1 ? { borderBottom: 0 } : undefined}>
                <span className="dd-rank" style={{ background: `${c}26`, color: c }}>{i + 1}</span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 14, fontWeight: 700, overflowWrap: 'anywhere' }}>{a.title}</div>
                  <div style={{ fontSize: 12, color: 'var(--text-3)' }}>{a.location}</div>
                </div>
                <span style={{ fontSize: 15, fontWeight: 900, color: c }}>{a.pct}%</span>
              </div>
            );
          })}
        </section>

        <section className="dd-card tw-up" style={{ '--i': 1 }} aria-labelledby="dd-al">
          <div className="dd-card-h"><h2 id="dd-al">Alertas</h2></div>
          {alerts.length === 0 ? <p className="dd-empty">Nada fora do normal agora.</p> : (
            <div className="dd-stack" style={{ gap: 10 }}>
              {alerts.map((a) => (
                <div key={a.title} className="dd-alert" style={{ background: a.tone === 'warn' ? 'rgba(242,196,106,.11)' : 'rgba(103,212,232,.11)' }}>
                  <b style={{ color: a.tone === 'warn' ? 'var(--warn)' : '#67D4E8' }}>{a.title}</b><br />{a.text}
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </>
  );
}
