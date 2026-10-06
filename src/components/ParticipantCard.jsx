import { useState } from 'react';
import { Check } from 'lucide-react';

/**
 * Ícone oficial do Instagram em SVG.
 */
export function InstagramIcon({ size = 20, color = 'currentColor' }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke={color}
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      style={{ flexShrink: 0 }}
      aria-hidden="true"
    >
      <rect width="20" height="20" x="2" y="2" rx="5" ry="5" />
      <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" />
      <line x1="17.5" x2="17.51" y1="6.5" y2="6.5" />
    </svg>
  );
}

/**
 * Ícone oficial do LinkedIn em SVG.
 */
export function LinkedInIcon({ size = 20, color = 'currentColor' }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill={color} style={{ flexShrink: 0 }} aria-hidden="true">
      <path d="M19 0h-14c-2.761 0-5 2.239-5 5v14c0 2.761 2.239 5 5 5h14c2.762 0 5-2.239 5-5v-14c0-2.761-2.238-5-5-5zm-11 19h-3v-11h3v11zm-1.5-12.268c-.966 0-1.75-.79-1.75-1.764s.784-1.764 1.75-1.764 1.75.79 1.75 1.764-.783 1.764-1.75 1.764zm13.5 12.268h-3v-5.604c0-3.368-4-3.113-4 0v5.604h-3v-11h3v1.765c1.396-2.586 7-2.777 7 2.476v6.759z" />
    </svg>
  );
}

/**
 * Ícone oficial do GitHub em SVG.
 */
export function GitHubIcon({ size = 20, color = 'currentColor' }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill={color} style={{ flexShrink: 0 }} aria-hidden="true">
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.53 1.032 1.53 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z"
      />
    </svg>
  );
}

/**
 * Formata links sociais para URLs válidas e navegáveis.
 */
export function formatSocialUrl(type, rawValue) {
  if (!rawValue || typeof rawValue !== 'string') return null;
  const trimmed = rawValue.trim();
  if (!trimmed) return null;

  if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
    return trimmed;
  }

  const clean = trimmed.replace(/^@/, '');

  switch (type) {
    case 'instagram':
      return `https://instagram.com/${clean}`;
    case 'linkedin':
      if (clean.includes('linkedin.com')) {
        return `https://${clean.replace(/^https?:\/\//, '')}`;
      }
      return `https://linkedin.com/in/${clean}`;
    case 'github':
      if (clean.includes('github.com')) {
        return `https://${clean.replace(/^https?:\/\//, '')}`;
      }
      return `https://github.com/${clean}`;
    default:
      return `https://${clean}`;
  }
}

/**
 * Extrai o nome de usuário/handle curto para exibição no card.
 */
export function formatSocialHandle(type, rawValue) {
  if (!rawValue || typeof rawValue !== 'string') return '';
  const trimmed = rawValue.trim();
  if (!trimmed) return '';

  if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
    try {
      const url = new URL(trimmed);
      const parts = url.pathname.split('/').filter(Boolean);
      if (parts.length > 0) {
        return parts[parts.length - 1];
      }
    } catch {}
  }
  return trimmed.replace(/^@/, '');
}

// "5" ou "5º" (o dado vem dos dois jeitos) -> "5º período"
export const periodLabel = (period) => (period ? `${String(period).replace(/º$/, '')}º período` : null);

// Cores das marcas (brand), não tokens do produto: cada rede vira um botão na cor dela (DESIGN.md §6 Crachá).
const SOCIALS = [
  {
    key: 'instagram',
    label: 'Instagram',
    Icon: InstagramIcon,
    className: 'bg-[linear-gradient(135deg,#C13584,#E1306C)] border-[#FFB3CF55]',
    labelClass: 'text-[#FFB3CF]',
    format: (h) => `@${h}`
  },
  {
    key: 'linkedin',
    label: 'LinkedIn',
    Icon: LinkedInIcon,
    className: 'bg-[linear-gradient(135deg,#0A66C2,#2563EB)] border-[#B9DAFF55]',
    labelClass: 'text-[#B9DAFF]',
    format: (h) => `in/${h}`
  },
  {
    key: 'github',
    label: 'GitHub',
    Icon: GitHubIcon,
    className: 'bg-[linear-gradient(135deg,#2B3346,#3B4560)] border-[#E2E8F055]',
    labelClass: 'text-[#E2E8F0]',
    format: (h) => h
  }
];

/**
 * Cartão da pessoa escaneada — "Conexão feita" (DESIGN.md §6 Crachá, board EscanearOk).
 * `eyebrow` é o status curto acima do nome; `points` vira o selo violeta; `titleId` liga o nome ao diálogo.
 */
export default function ParticipantCard({ participant, points = null, eyebrow = null, eyebrowTone = 'ok', titleId }) {
  const [imageError, setImageError] = useState(false);

  if (!participant) return null;

  const { name = 'Participante', username, avatarUrl, photoURL, course, period, participantType } = participant;

  const effectiveAvatar = !imageError && (avatarUrl || photoURL) ? avatarUrl || photoURL : null;
  const cleanUsername = username ? String(username).replace(/^@/, '') : '';
  const initials =
    (name || 'TW')
      .split(' ')
      .filter(Boolean)
      .slice(0, 2)
      .map((w) => w[0].toUpperCase())
      .join('') || 'TW';

  const socials = SOCIALS.map((s) => ({
    ...s,
    href: formatSocialUrl(s.key, participant[s.key]),
    handle: formatSocialHandle(s.key, participant[s.key])
  })).filter((s) => s.href);

  return (
    <div className="flex w-full flex-col items-center text-center">
      <div className="flex w-full items-center justify-between gap-2">
        <span className="rounded-full border border-[rgba(107,124,255,0.5)] bg-[rgba(61,80,230,0.2)] px-3 py-[5px] text-[11px] font-extrabold text-[#B4C0FF]">
          {participantType || 'Participante'}
        </span>
        {points ? (
          <span className="rounded-full bg-[linear-gradient(135deg,#7C3AED,#A855F7)] px-3 py-[5px] text-xs font-black text-white">
            +{points} pts
          </span>
        ) : null}
      </div>

      <span className="relative mt-[18px] box-border h-[132px] w-[132px] shrink-0 rounded-[32px] bg-[linear-gradient(135deg,#2563EB_0%,#7C3AED_60%,#E1306C_100%)] p-1 shadow-[0_0_40px_rgba(124,58,237,0.55)]">
        <span className="flex h-full w-full items-center justify-center overflow-hidden rounded-[28px] bg-surface-raised text-[44px] font-black text-text">
          {effectiveAvatar ? (
            <img src={effectiveAvatar} alt={name} onError={() => setImageError(true)} className="h-full w-full object-cover" />
          ) : (
            <span aria-hidden="true">{initials}</span>
          )}
        </span>
        <span
          aria-hidden="true"
          className="absolute -right-2 -bottom-2 flex h-[38px] w-[38px] items-center justify-center rounded-full border-4 border-[#0F1530] bg-[#10B981]"
        >
          <Check size={18} strokeWidth={3} color="#fff" />
        </span>
      </span>

      {eyebrow && (
        <div className={`mt-4 text-[13px] font-extrabold ${eyebrowTone === 'ok' ? 'text-ok' : 'text-text-2'}`}>{eyebrow}</div>
      )}
      <h2 id={titleId} className="mt-1 mb-0 max-w-full text-[26px] leading-tight font-black break-words text-text">
        {name}
      </h2>
      {cleanUsername && <div className="mt-0.5 text-[15px] font-bold text-link">@{cleanUsername}</div>}
      {(course || period) && (
        <span className="mt-2.5 rounded-[10px] border border-white/8 bg-white/5 px-3 py-1.5 text-[13px] text-[#C3C9DE]">
          {[course, periodLabel(period)].filter(Boolean).join(' · ')}
        </span>
      )}

      <div className="mt-[18px] w-full border-t border-white/8 pt-3.5 text-left">
        <div className="flex justify-between text-xs font-extrabold text-text-2">
          <span>Redes de contato</span>
          {socials.length > 0 && <span className="font-semibold text-text-4">toque para abrir</span>}
        </div>
        {socials.length > 0 ? (
          <div className="mt-2.5 flex flex-col gap-2">
            {socials.map(({ key, label, Icon, className, labelClass, format, href, handle }) => (
              <a
                key={key}
                href={href}
                target="_blank"
                rel="noopener noreferrer"
                className={`press flex min-h-[56px] items-center gap-2.5 rounded-[14px] border px-3 py-2.5 text-white no-underline ${className}`}
              >
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[10px] bg-white/18">
                  <Icon size={18} color="#FFFFFF" />
                </span>
                <span className="min-w-0">
                  <span className={`block text-[11px] font-extrabold ${labelClass}`}>{label}</span>
                  <span className="block truncate text-sm font-extrabold">{handle ? format(handle) : `Abrir ${label}`}</span>
                </span>
              </a>
            ))}
          </div>
        ) : (
          <p className="mt-2.5 mb-0 rounded-[14px] bg-surface-raised px-3.5 py-3 text-[13px] text-text-2">
            Esta pessoa ainda não adicionou redes ao crachá.
          </p>
        )}
      </div>
    </div>
  );
}
