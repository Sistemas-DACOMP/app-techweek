import { useEffect, useState } from 'react';
import { initials } from '../ui';

/* Peças visuais de patrocinador usadas no Admin e no cadastro por convite.
   Cota é o único lugar com gradiente: só no texto (e no traço fino do cartão de convite). */

export const TIERS = {
  DIAMANTE: { label: 'Diamante', gradient: 'linear-gradient(90deg,#22D3EE,#A78BFA,#F0ABFC)' },
  OURO: { label: 'Ouro', gradient: 'linear-gradient(90deg,#FDE68A,#FBBF24,#D97706)' },
  PRATA: { label: 'Prata', gradient: 'linear-gradient(90deg,#E2E8F0,#94A3B8)' },
};
export const TIER_KEYS = Object.keys(TIERS);

export function TierText({ tier, prefix = true, className = '' }) {
  const t = TIERS[tier] || TIERS.PRATA;
  return (
    <span
      className={`font-extrabold ${className}`}
      style={{ background: t.gradient, WebkitBackgroundClip: 'text', backgroundClip: 'text', color: 'transparent' }}
    >
      {prefix ? `Cota ${t.label}` : t.label}
    </span>
  );
}

export const tierRule = (tier) => ({ height: 3, background: (TIERS[tier] || TIERS.PRATA).gradient });

/* Logo claro (ex.: Bayer, branca) vai em placa escura; logo escura, em placa clara.
   Mede a luminância média; se o navegador bloquear a leitura (CORS), usa placa clara. */
function useDarkLogo(src) {
  const [dark, setDark] = useState(false);
  useEffect(() => {
    if (!src) return undefined;
    let alive = true;
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      try {
        const c = document.createElement('canvas');
        c.width = 24; c.height = 24;
        const ctx = c.getContext('2d');
        ctx.drawImage(img, 0, 0, 24, 24);
        const px = ctx.getImageData(0, 0, 24, 24).data;
        let sum = 0; let n = 0;
        for (let i = 0; i < px.length; i += 4) {
          if (px[i + 3] > 40) { sum += (px[i] * 299 + px[i + 1] * 587 + px[i + 2] * 114) / 1000; n += 1; }
        }
        if (alive && n) setDark(sum / n > 190);
      } catch { /* canvas bloqueado: mantém placa clara */ }
    };
    img.src = src;
    return () => { alive = false; };
  }, [src]);
  return dark;
}

export function LogoPlate({ src, name, height = 54, width, className = '' }) {
  const dark = useDarkLogo(src);
  const h = height;
  return (
    <span
      className={`inline-flex shrink-0 items-center justify-center overflow-hidden rounded-[10px] ${className}`}
      style={{ height: h, width: width || undefined, minWidth: width ? undefined : h * 1.9, padding: '0 14px', background: dark ? 'var(--surface-raised)' : '#F4F5FA' }}
    >
      {src ? (
        <img src={src} alt={name} style={{ height: h * 0.55, maxWidth: (width || h * 3) - 28, objectFit: 'contain' }} />
      ) : (
        <span className={`truncate text-[13px] font-extrabold ${dark ? 'text-text' : 'text-[#0A0F24]'}`}>{name}</span>
      )}
    </span>
  );
}

const AVATAR_BG = ['#2D3A8C', '#3B2B8F', '#1E4D5C', '#7A3A22', '#2C5E3F', '#6B2D5C'];
export function MemberAvatar({ member, size = 32, overlap }) {
  const label = member.name || member.email || '?';
  const seed = [...String(member.email || label)].reduce((a, c) => a + c.charCodeAt(0), 0);
  return (
    <span
      title={label}
      className="flex shrink-0 items-center justify-center rounded-full border-2 border-surface text-[11px] font-extrabold text-text-2"
      style={{ width: size, height: size, background: AVATAR_BG[seed % AVATAR_BG.length], marginLeft: overlap ? -8 : 0 }}
    >
      {initials(member.name || String(member.email || '').split('@')[0].replace(/[._-]+/g, ' '))}
    </span>
  );
}

export const formatDay = (iso) => {
  if (!iso) return '';
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? '' : d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
};

export function sentAgo(iso) {
  // Backend só garante expiresAt; "enviado" = expiresAt - 7 dias (convites valem 7 dias).
  if (!iso) return '';
  const sent = new Date(iso).getTime() - 7 * 86400000;
  const days = Math.floor((Date.now() - sent) / 86400000);
  if (Number.isNaN(days)) return '';
  if (days <= 0) return 'enviado hoje';
  return `enviado há ${days} ${days === 1 ? 'dia' : 'dias'}`;
}
