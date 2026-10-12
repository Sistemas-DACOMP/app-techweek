import { useState } from 'react';
import { ChevronDown } from 'lucide-react';
import { TIERS, fmt } from './derive';

/* Lista de cards por empresa (só logo) + card "Visitas por cota". Sem gráfico de leads repetido. */
function SponsorCard({ s, i }) {
  const [open, setOpen] = useState(false);
  const tier = TIERS[s.tier];
  return (
    <article className="dd-sp tw-up" data-open={open} style={{ '--i': i }}>
      <div className="dd-sp-bar" style={{ background: tier.gradient }} aria-hidden="true" />
      <div className="dd-sp-main">
        <div className="dd-sp-head" onClick={() => setOpen((o) => !o)}>
          <span className={`dd-plate ${s.plate}`}><img src={s.logo} alt={s.name} /></span>
          <div className="dd-sp-conv">
            <div style={{ fontSize: 16, fontWeight: 700 }}>{s.conversion}%</div>
            <div style={{ fontSize: 11, color: 'var(--text-3)' }}>conversão</div>
          </div>
          <button type="button" className="dd-sp-toggle" aria-expanded={open} aria-label={`${open ? 'Recolher' : 'Expandir'} ${s.name}`} onClick={(e) => { e.stopPropagation(); setOpen((o) => !o); }}>
            <ChevronDown size={18} aria-hidden="true" style={{ transform: open ? 'rotate(180deg)' : 'none', transition: 'transform .18s' }} />
          </button>
        </div>
        <div className="dd-sp-cell"><div className="dd-sp-k">Visitas</div><div className="dd-sp-v" style={{ color: 'var(--link)' }}>{fmt(s.visits)}</div></div>
        <div className="dd-sp-cell"><div className="dd-sp-k">Leads</div><div className="dd-sp-v" style={{ color: 'var(--ok)' }}>{fmt(s.leads)}</div></div>
        <div className="dd-sp-conv-desktop"><div className="dd-sp-k">Conversão</div><div className="dd-sp-v" style={{ color: 'var(--warn)' }}>{s.conversion}%</div></div>
        <div className="dd-sp-reachwrap">
          <div className="dd-sp-reach"><span>Alcance do público</span><b style={{ color: 'var(--text)' }}>{s.reach}%</b></div>
          <div className="dd-sp-track"><div className="tw-growx" style={{ width: `${s.reach}%`, background: tier.gradient, '--i': i }} /></div>
        </div>
      </div>
    </article>
  );
}

export default function EstandesTab({ sponsors, tiers }) {
  const totalVisits = sponsors.reduce((s, x) => s + x.visits, 0);
  const totalLeads = sponsors.reduce((s, x) => s + x.leads, 0);
  return (
    <div className="dd-g21">
      <div>
        <p className="dd-mob" style={{ fontSize: 13, color: 'var(--text-2)', margin: '0 2px 10px' }}>
          <b style={{ color: 'var(--text)' }}>{fmt(totalVisits)}</b> visitas · <b style={{ color: 'var(--text)' }}>{fmt(totalLeads)}</b> leads
        </p>
        <div className="dd-stack">
          {sponsors.map((s, i) => <SponsorCard key={s.id} s={s} i={i} />)}
          {sponsors.length === 0 && <p className="dd-empty">Nenhum patrocinador cadastrado.</p>}
        </div>
      </div>
      <section className="dd-card dd-sticky tw-up" aria-labelledby="dd-cota">
        <div className="dd-card-h"><h2 id="dd-cota">Visitas por cota</h2></div>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginBottom: 12 }}>
          <span style={{ fontSize: 26, fontWeight: 800 }}>{fmt(totalVisits)}</span>
          <span style={{ fontSize: 13, color: 'var(--text-3)' }}>visitas no total</span>
        </div>
        <div style={{ display: 'flex', height: 16, borderRadius: 8, overflow: 'hidden', gap: 2, background: 'var(--surface-raised)' }} role="img" aria-label="Divisão das visitas por cota">
          {tiers.map((t) => t.n > 0 && <div key={t.id} className="tw-growx" style={{ flex: t.n, background: t.solid }} />)}
        </div>
        <div style={{ marginTop: 12 }}>
          {tiers.map((t) => (
            <div key={t.id} style={{ display: 'flex', alignItems: 'center', gap: 10, minHeight: 40, borderTop: '1px solid var(--line)' }}>
              <span style={{ width: 10, height: 10, borderRadius: 3, background: t.solid }} aria-hidden="true" />
              <span style={{ flex: 1, fontSize: 14 }}>{t.label}</span>
              <span style={{ fontSize: 14, fontWeight: 700 }}>{fmt(t.n)}</span>
              <span style={{ width: 44, textAlign: 'right', fontSize: 13, color: 'var(--text-3)' }}>{t.pct}%</span>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
