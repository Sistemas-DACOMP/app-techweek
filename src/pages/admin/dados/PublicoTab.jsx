import { BarRow, ColumnPairs, Donut } from './charts';
import { PALETTE, OK, pct } from './derive';

export default function PublicoTab({ total, courses, byDay, periods, kinds }) {
  const maxC = Math.max(...courses.map((c) => c.n), 1);
  const periodTotal = periods.reduce((s, p) => s + p.n, 0);
  const periodColors = ['#67D4E8', PALETTE[0], OK, PALETTE[1]];
  return (
    <>
      <div className="dd-g12">
        <section className="dd-card tw-up" aria-labelledby="dd-perfil">
          <div className="dd-card-h"><h2 id="dd-perfil">Perfil acadêmico</h2></div>
          {total === 0 ? <p className="dd-empty">Nenhum inscrito ainda.</p> : (
            <div className="dd-donut-row">
              <Donut center={total} sub="inscritos" slices={courses.map((c, i) => ({ label: c.label, value: c.n, color: PALETTE[i % PALETTE.length] }))} />
              <div style={{ flex: 1, minWidth: 0, width: '100%' }}>
                {courses.map((c, i) => (
                  <BarRow key={c.label} i={i} color={PALETTE[i % PALETTE.length]} label={c.label} value={c.n} sub={`${pct(c.n, total)}%`} pct={(c.n / maxC) * 100} />
                ))}
              </div>
            </div>
          )}
        </section>

        <section className="dd-card tw-up" style={{ '--i': 1 }} aria-labelledby="dd-dia">
          <div className="dd-card-h"><h2 id="dd-dia">Inscritos e presentes por dia</h2></div>
          {byDay.length === 0 ? <p className="dd-empty">Sem dias de evento cadastrados.</p> : (
            <>
              <div className="dd-legend" style={{ marginBottom: 6 }}>
                <span><span style={{ width: 10, height: 10, borderRadius: 3, background: PALETTE[1] }} />Inscritos</span>
                <span><span style={{ width: 10, height: 10, borderRadius: 3, background: OK }} />Presentes</span>
              </div>
              <ColumnPairs label="Inscritos e presentes por dia" colors={[PALETTE[1], OK]} items={byDay} />
            </>
          )}
        </section>
      </div>

      <div className="dd-g12">
        <section className="dd-card tw-up" aria-labelledby="dd-per">
          <div className="dd-card-h"><h2 id="dd-per">Período do curso</h2></div>
          {periodTotal === 0 ? <p className="dd-empty">Sem períodos informados.</p> : (
            <>
              <div style={{ display: 'flex', height: 22, borderRadius: 11, overflow: 'hidden', gap: 2 }} role="img" aria-label="Distribuição por período do curso">
                {periods.map((p, i) => p.n > 0 && <div key={p.label} className="tw-growx" style={{ flex: p.n, background: periodColors[i] }} />)}
              </div>
              <div className="dd-legend" style={{ marginTop: 12 }}>
                {periods.map((p, i) => (
                  <span key={p.label}><span style={{ width: 10, height: 10, borderRadius: 3, background: periodColors[i] }} />{p.label} · <b style={{ color: 'var(--text)' }}>{pct(p.n, periodTotal)}%</b></span>
                ))}
              </div>
            </>
          )}
        </section>

        <section className="dd-card tw-up" style={{ '--i': 1 }} aria-labelledby="dd-tipo">
          <div className="dd-card-h"><h2 id="dd-tipo">Tipo de participante</h2></div>
          {total === 0 ? <p className="dd-empty">Nenhum inscrito ainda.</p> : (
            <div style={{ display: 'flex', justifyContent: 'space-around', flexWrap: 'wrap', gap: 12 }}>
              {kinds.map((k, i) => (
                <div key={k.label} style={{ textAlign: 'center' }}>
                  <Donut size={96} stroke={16} center={`${pct(k.n, total)}%`} slices={[{ label: k.label, value: k.n, color: PALETTE[i % PALETTE.length] }, { label: 'resto', value: total - k.n, color: 'var(--surface-raised)' }]} />
                  <div style={{ fontSize: 13, fontWeight: 700, marginTop: 4 }}>{k.label}</div>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </>
  );
}
