import { BarRow, Gauge } from './charts';
import { PALETTE } from './derive';

const STAR_COLORS = ['#8790AE', '#67D4E8', '#8FA0FF', '#B9A6F5', '#FBBF24'];
const f1 = (n) => n.toFixed(1).replace('.', ',');

export default function ConteudoTab({ ratings, topRated, dropoff }) {
  const { dist, total, avg, approval, nps } = ratings;
  const maxD = Math.max(...dist, 1);
  const stats = [
    { v: total, l: 'respostas', c: 'var(--link)' },
    { v: `${approval}%`, l: 'aprovação', c: 'var(--ok)' },
    { v: `${nps > 0 ? '+' : ''}${nps}`, l: 'NPS líquido', c: 'var(--light-yellow)' },
  ];
  return (
    <>
      <div className="dd-g3">
        <section className="dd-card tw-up" aria-labelledby="dd-nota">
          <div className="dd-card-h"><h2 id="dd-nota">Nota média do evento</h2></div>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10 }}>
            <Gauge value={avg} total={total} />
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 10, width: '100%' }}>
              {stats.map((s) => (
                <div key={s.l} style={{ textAlign: 'center', padding: 10, borderRadius: 14, background: 'var(--surface-raised)' }}>
                  <div style={{ fontSize: 20, fontWeight: 900, color: s.c }}>{total ? s.v : '–'}</div>
                  <div style={{ fontSize: 12, color: 'var(--text-2)' }}>{s.l}</div>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="dd-card tw-up" style={{ '--i': 1 }} aria-labelledby="dd-dist">
          <div className="dd-card-h"><h2 id="dd-dist">Distribuição das notas</h2></div>
          <div style={{ display: 'flex', gap: 8, borderBottom: '1px solid var(--line)', height: 258, alignItems: 'flex-end' }}>
            {dist.map((n, i) => (
              <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'flex-end', height: '100%' }}>
                <span style={{ fontSize: 13, fontWeight: 800, marginBottom: 6 }}>{n}</span>
                <div className="tw-growy" style={{ '--i': i, width: 'min(56px, 80%)', height: Math.max(4, (n / maxD) * 220), borderRadius: '10px 10px 4px 4px', background: STAR_COLORS[i] }} />
              </div>
            ))}
          </div>
          <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
            {[1, 2, 3, 4, 5].map((k) => (
              <span key={k} style={{ flex: 1, display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 3, fontSize: 13, fontWeight: 700, color: 'var(--text-2)' }}>
                {k}<svg width="12" height="12" viewBox="0 0 24 24" fill={STAR_COLORS[k - 1]} stroke={STAR_COLORS[k - 1]} strokeWidth="1.6" strokeLinejoin="round" aria-hidden="true"><path d="M12 3l2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17l-5.4 2.9 1-6.1L3.2 9.5l6.1-.9z" /></svg>
              </span>
            ))}
          </div>
        </section>

        <section className="dd-card tw-up" style={{ '--i': 2 }} aria-labelledby="dd-tags">
          <div className="dd-card-h"><h2 id="dd-tags">Tags mais citadas</h2></div>
          {/* TODO(backend): avaliações gravam só a nota (pointEvents.metadata.rating); tags e comentário não são persistidos. */}
          <p className="dd-empty">Sem tags ainda. Hoje a avaliação grava só a nota.</p>
        </section>
      </div>

      <div className="dd-g3">
        <section className="dd-card tw-up" aria-labelledby="dd-pal">
          <div className="dd-card-h"><h2 id="dd-pal">Palestras por nota</h2></div>
          {topRated.length === 0 && <p className="dd-empty">Nenhuma palestra avaliada ainda.</p>}
          {topRated.map((a, i) => (
            <BarRow key={a.id} i={i} color={PALETTE[i % PALETTE.length]} label={a.title} value={f1(a.avg)} sub={`${a.n} ${a.n === 1 ? 'resposta' : 'respostas'}`} pct={(a.avg / 5) * 100} />
          ))}
        </section>

        <section className="dd-card tw-up" style={{ '--i': 1 }} aria-labelledby="dd-fb">
          <div className="dd-card-h"><h2 id="dd-fb">Feedback recente</h2></div>
          <p className="dd-empty">Comentários ainda não são gravados na avaliação.</p>
        </section>

        <section className="dd-card tw-up" style={{ '--i': 2 }} aria-labelledby="dd-ab">
          <div className="dd-card-h"><h2 id="dd-ab">Missões com mais abandono</h2></div>
          {dropoff.length === 0 && <p className="dd-empty">Sem missões ou participantes para comparar.</p>}
          {dropoff.map((m, i) => (
            <BarRow key={m.id} i={i} color={PALETTE[(i + 3) % PALETTE.length]} label={m.title} value={`${m.drop}%`} pct={m.drop} />
          ))}
        </section>
      </div>
    </>
  );
}
