import { useEffect, useRef, useState } from 'react';
import { CURVE_START, CURVE_END } from './derive';

/* Gráficos em SVG puro (sem lib). Movimento: classes de src/styles/motion.css. */

export function useWidth(fallback = 600) {
  const ref = useRef(null);
  const [w, setW] = useState(fallback);
  useEffect(() => {
    const el = ref.current;
    if (!el) return undefined;
    const set = () => setW(Math.max(240, Math.round(el.getBoundingClientRect().width)));
    set();
    if (typeof ResizeObserver === 'undefined') return undefined;
    const ro = new ResizeObserver(set);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  return [ref, w];
}

const FONT = 'Montserrat, sans-serif';
const smooth = (pts) => pts.reduce((d, [x, y], i) => {
  if (i === 0) return `M${x.toFixed(1)},${y.toFixed(1)}`;
  const [px, py] = pts[i - 1];
  const cx = ((px + x) / 2).toFixed(1);
  return `${d} C${cx},${py.toFixed(1)} ${cx},${y.toFixed(1)} ${x.toFixed(1)},${y.toFixed(1)}`;
}, '');

const niceMax = (m) => {
  if (m <= 4) return 4;
  const step = 10 ** Math.floor(Math.log10(m / 2));
  return Math.ceil(m / 2 / step) * step * 2;
};

export function Sparkline({ values, color }) {
  if (!values || values.length < 2) return null;
  const max = Math.max(...values), min = Math.min(...values);
  const pts = values.map((v, i) => [2 + (i * 92) / (values.length - 1), 27 - ((v - min) / Math.max(1, max - min)) * 22]);
  return (
    <svg width="96" height="32" viewBox="0 0 96 32" aria-hidden="true" style={{ marginTop: 8 }}>
      <path className="tw-draw" pathLength="1" style={{ '--len': 1 }} d={pts.map(([x, y], i) => `${i ? 'L' : 'M'}${x.toFixed(1)},${y.toFixed(1)}`).join(' ')} fill="none" stroke={color} strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

const hhmm = (min) => `${String(Math.floor(min / 60)).padStart(2, '0')}h${min % 60 ? String(min % 60).padStart(2, '0') : ''}`;

/** Curva de afluência: linha do dia, tracejado do dia anterior, linha de "agora" e pico. Sem faixas coloridas. */
export function AffluenceCurve({ curve, prev, nowMin, label }) {
  const [ref, w] = useWidth(900);
  const mobile = w < 480;
  const h = mobile ? 230 : 290;
  const L = mobile ? 10 : 44, R = w - (mobile ? 10 : 16), T = 34, B = h - 32;
  const n = curve.length;
  const max = niceMax(Math.max(...curve, ...(prev || []), 0));
  const X = (i) => L + (i * (R - L)) / (n - 1);
  const Y = (v) => B - (v / max) * (B - T);
  const pts = curve.map((v, i) => [X(i), Y(v)]);
  const prevPts = prev && prev.some(Boolean) ? prev.map((v, i) => [X(i), Y(v)]) : null;
  const peak = Math.max(...curve);
  const peakI = curve.indexOf(peak);
  const empty = peak === 0;
  const span = CURVE_END - CURVE_START;
  const nowX = nowMin != null && nowMin >= CURVE_START && nowMin <= CURVE_END ? L + ((nowMin - CURVE_START) / span) * (R - L) : null;
  const ticks = mobile ? [CURVE_START, 14 * 60, CURVE_END] : [8, 11, 14, 17, 20].map((x) => x * 60).concat(CURVE_END);
  const peakLabel = `Pico ${hhmm(CURVE_START + peakI * 30)} · ${peak}`;
  return (
    <div ref={ref}>
      <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} role="img" aria-label={empty ? 'Curva de afluência sem dados' : `Curva de afluência de ${label}, ${peakLabel}`} style={{ display: 'block' }}>
        {[0, 0.5, 1].map((f) => (
          <g key={f}>
            <line x1={L} x2={R} y1={Y(max * f)} y2={Y(max * f)} stroke="var(--line)" />
            {!mobile && <text x={L - 10} y={Y(max * f) + 4} textAnchor="end" fontSize="12" fill="var(--text-4)" fontFamily={FONT}>{Math.round(max * f)}</text>}
          </g>
        ))}
        {prevPts && <path d={smooth(prevPts)} fill="none" stroke="var(--text-4)" strokeWidth="2" strokeDasharray="5 5" className="tw-fade" />}
        {!empty && (
          <>
            <path className="tw-fade" d={`${smooth(pts)} L${R},${B} L${L},${B} Z`} fill="var(--link)" fillOpacity=".14" />
            <path className="tw-draw" pathLength="1" style={{ '--len': 1 }} d={smooth(pts)} fill="none" stroke="var(--link)" strokeWidth="3" strokeLinecap="round" />
          </>
        )}
        {nowX != null && (
          <g>
            <line x1={nowX} x2={nowX} y1={T - 8} y2={B} stroke="var(--ok)" strokeWidth="1.5" strokeDasharray="4 4" />
            <text x={nowX - 6} y={T + 6} textAnchor="end" fontSize="12" fontWeight="700" fill="var(--ok)" fontFamily={FONT}>Agora {hhmm(Math.round(nowMin))}</text>
          </g>
        )}
        {!empty && (
          <g className="tw-fade">
            <line x1={X(peakI)} x2={X(peakI)} y1={Y(peak)} y2={B} stroke="var(--light-yellow)" strokeWidth="1.5" strokeDasharray="4 4" />
            <circle cx={X(peakI)} cy={Y(peak)} r="6" fill="var(--light-yellow)" stroke="var(--bg)" strokeWidth="2" />
            <text x={X(peakI) + (X(peakI) > R - 110 ? -12 : 12)} y={Y(peak) - 8} textAnchor={X(peakI) > R - 110 ? 'end' : 'start'} fontSize="12" fontWeight="800" fill="var(--light-yellow)" fontFamily={FONT}>{peakLabel.replace(/^Pico \S+ · /, 'Pico · ')}</text>
          </g>
        )}
        {empty && <text x={(L + R) / 2} y={(T + B) / 2} textAnchor="middle" fontSize="13" fill="var(--text-3)" fontFamily={FONT}>Sem presenças registradas neste dia</text>}
        {ticks.map((m, i) => (
          <text key={m} x={L + ((m - CURVE_START) / span) * (R - L)} y={h - 8} textAnchor={i === 0 ? 'start' : m === CURVE_END ? 'end' : 'middle'} fontSize="12" fontWeight="600" fill="var(--text-3)" fontFamily={FONT}>{hhmm(m)}</text>
        ))}
      </svg>
    </div>
  );
}

/** Colunas agrupadas (série A e B por categoria). */
export function ColumnPairs({ items, colors, label }) {
  const [ref, w] = useWidth(480);
  const h = 230, L = 34, R = w - 8, T = 20, B = 200;
  const max = niceMax(Math.max(...items.flatMap((i) => [i.a, i.b]), 0));
  const Y = (v) => B - (v / max) * (B - T);
  const gw = (R - L) / Math.max(items.length, 1);
  const bw = Math.min(30, (gw - 14) / 2);
  return (
    <div ref={ref}>
      <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} role="img" aria-label={label} style={{ display: 'block' }}>
        {[0, 0.5, 1].map((f) => (
          <g key={f}>
            <line x1={L} x2={R} y1={Y(max * f)} y2={Y(max * f)} stroke="var(--line)" />
            <text x={L - 8} y={Y(max * f) + 4} textAnchor="end" fontSize="11" fill="var(--text-4)" fontFamily={FONT}>{Math.round(max * f)}</text>
          </g>
        ))}
        {items.map((it, i) => {
          const cx = L + gw * i + gw / 2;
          return (
            <g key={it.label}>
              {[['a', -bw - 2], ['b', 2]].map(([k, dx], j) => (
                <g key={k}>
                  <rect className="tw-growy" style={{ '--i': i }} x={cx + dx} y={Y(it[k])} width={bw} height={B - Y(it[k])} rx="6" fill={colors[j]} />
                  <text x={cx + dx + bw / 2} y={Y(it[k]) - 6} textAnchor="middle" fontSize="11" fontWeight="800" fill={colors[j]} fontFamily={FONT}>{it[k]}</text>
                </g>
              ))}
              <text x={cx} y={220} textAnchor="middle" fontSize="12" fontWeight="600" fill="var(--text-3)" fontFamily={FONT}>{it.label}</text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}

export function Donut({ slices, size = 180, stroke = 30, center, sub }) {
  const r = (size - stroke) / 2, c = 2 * Math.PI * r, mid = size / 2;
  const total = slices.reduce((s, x) => s + x.value, 0);
  let acc = 0;
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} role="img" aria-label={`${center} ${sub || ''}`} style={{ flexShrink: 0 }}>
      <circle cx={mid} cy={mid} r={r} fill="none" stroke="var(--surface-raised)" strokeWidth={stroke} />
      {total > 0 && slices.map((s) => {
        const len = (s.value / total) * c;
        const el = <circle key={s.label} className="tw-fade" cx={mid} cy={mid} r={r} fill="none" stroke={s.color} strokeWidth={stroke} strokeDasharray={`${Math.max(0, len - 3)} ${c}`} strokeDashoffset={-acc} transform={`rotate(-90 ${mid} ${mid})`} />;
        acc += len;
        return el;
      })}
      <text x={mid} y={mid + (stroke > 20 ? 4 : 2)} textAnchor="middle" fontSize={stroke > 20 ? 30 : 16} fontWeight="800" fill="var(--text)" fontFamily={FONT}>{center}</text>
      {sub && <text x={mid} y={mid + (stroke > 20 ? 25 : 15)} textAnchor="middle" fontSize="12" fill="var(--text-3)" fontFamily={FONT}>{sub}</text>}
    </svg>
  );
}

/** Medidor semicircular de nota (0-5). */
export function Gauge({ value, total }) {
  const cx = 110, cy = 112, r = 92;
  const arc = (a0, a1) => {
    const p = (a) => [cx + r * Math.cos(a), cy - r * Math.sin(a)];
    const [x0, y0] = p(a0), [x1, y1] = p(a1);
    return `M${x0.toFixed(1)} ${y0.toFixed(1)} A${r} ${r} 0 0 1 ${x1.toFixed(1)} ${y1.toFixed(1)}`;
  };
  const colors = ['#8790AE', '#67D4E8', '#8FA0FF', '#B9A6F5', '#FBBF24'];
  const gap = 0.06, seg = (Math.PI - gap * 4) / 5;
  const ang = Math.PI - (Math.max(0, Math.min(5, value)) / 5) * Math.PI;
  const kx = cx + r * Math.cos(ang), ky = cy - r * Math.sin(ang);
  return (
    <svg width="220" height="136" viewBox="0 0 220 136" role="img" aria-label={total ? `Medidor de nota média ${value.toFixed(1).replace('.', ',')} de 5` : 'Sem avaliações'}>
      {colors.map((c, i) => <path key={c} d={arc(Math.PI - i * (seg + gap), Math.PI - i * (seg + gap) - seg)} fill="none" stroke={c} strokeWidth="16" strokeLinecap="round" opacity={total ? 1 : 0.35} />)}
      {total > 0 && <circle className="tw-fade" cx={kx} cy={ky} r="8" fill="var(--text)" stroke="var(--bg)" strokeWidth="3" />}
      <text x="110" y="110" textAnchor="middle" fontSize="55" fontWeight="900" fill="var(--text)" fontFamily={FONT}>{total ? value.toFixed(1).replace('.', ',') : '–'}</text>
      <text x="110" y="130" textAnchor="middle" fontSize="12" fill="var(--text-3)" fontFamily={FONT}>nota média</text>
    </svg>
  );
}

/** Linha de barra horizontal (rótulo + valor + barra). */
export function BarRow({ color, label, value, sub, pct, i = 0 }) {
  return (
    <div className="dd-row">
      <div className="dd-row-h">
        <span><span className="dd-dot" style={{ background: color }} aria-hidden="true" /><span style={{ overflowWrap: 'anywhere' }}>{label}</span></span>
        <b style={{ flexShrink: 0 }}>{value}{sub && <span className="dd-muted"> · {sub}</span>}</b>
      </div>
      <div className="dd-track" role="img" aria-label={`${label}: ${value}`}>
        <div className="dd-fill tw-growx" style={{ width: `${Math.min(100, pct)}%`, background: color, '--i': i }} />
      </div>
    </div>
  );
}

export function Stars({ n, size = 14 }) {
  return (
    <span role="img" aria-label={`${n} de 5 estrelas`} style={{ display: 'inline-flex', gap: 2, alignItems: 'center' }}>
      {[1, 2, 3, 4, 5].map((k) => (
        <svg key={k} width={size} height={size} viewBox="0 0 24 24" fill={k <= n ? '#FBBF24' : 'none'} stroke={k <= n ? '#FBBF24' : 'var(--text-4)'} strokeWidth="1.6" strokeLinejoin="round" aria-hidden="true">
          <path d="M12 3l2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17l-5.4 2.9 1-6.1L3.2 9.5l6.1-.9z" />
        </svg>
      ))}
    </span>
  );
}
