import { MessageSquare, Lock, ScanQrCode, Zap, Gem, CircleHelp, Camera } from 'lucide-react';

/* Estilos de card de missão (DESIGN.md §6 Missões, §2.9) e a prévia ao vivo usada no admin.
   Valor salvo em `cardStyle`; o app do participante lê com fallback (ver styleOfMission). */

export const CARD_STYLES = [
  { key: 'padrao', label: 'Padrão', desc: 'Card simples', icon: MessageSquare, color: '#8FA0FF' },
  { key: 'secreta', label: 'Secreta', desc: 'Dica borrada, brilhos', icon: Lock, color: '#C4B5FD' },
  { key: 'caca-qr', label: 'Caça ao QR', desc: 'Radar e prazo', icon: ScanQrCode, color: '#F59E0B' },
  { key: 'relampago', label: 'Relâmpago', desc: 'Tempo correndo', icon: Zap, color: '#F59E0B' },
  { key: 'patrocinador', label: 'Patrocinador', desc: 'Logo e cor da cota', icon: Gem, color: '#67E8F9' },
  { key: 'quiz', label: 'Quiz', desc: 'Nº de perguntas', icon: CircleHelp, color: '#8FA0FF' },
  { key: 'stories', label: 'Stories', desc: 'Anel do Instagram', icon: Camera, color: '#F59AC0' },
];
export const STYLE_BY_KEY = Object.fromEntries(CARD_STYLES.map((s) => [s.key, s]));

/* Missões antigas não têm cardStyle: deduz do que já existe. */
export function styleOfMission(m = {}) {
  if (STYLE_BY_KEY[m.cardStyle]) return m.cardStyle;
  if (m.isFlash) return 'relampago';
  if (m.triggerMode === 'secret') return 'secreta';
  if (m.triggerMode === 'quiz') return 'quiz';
  return 'padrao';
}

export const TIERS = {
  diamante: { label: 'Diamante', text: 'var(--tier-diamante-text)', line: 'var(--tier-diamante-line)', tint: 'rgba(34,211,238,0.10)' },
  ouro: { label: 'Ouro', text: 'var(--tier-ouro-text)', line: 'var(--tier-ouro-line)', tint: 'rgba(251,191,36,0.10)' },
  prata: { label: 'Prata', text: 'var(--tier-prata-text)', line: 'var(--tier-prata-line)', tint: 'rgba(203,213,225,0.06)' },
};

export function ctaLabel(form) {
  if (form.cardStyle === 'stories') return 'Criar story';
  if (form.triggerMode === 'secret') return 'Desvendar';
  if (form.triggerMode === 'quiz') return 'Fazer quiz';
  if (form.triggerMode === 'auto') return 'Escanear';
  if ((form.fields || []).some((f) => f.type === 'photo')) return 'Enviar foto';
  return 'Responder';
}

const Sparkle = ({ size, style }) => (
  <svg className="adm-twinkle" aria-hidden="true" width={size} height={size} viewBox="0 0 10 10" style={{ position: 'absolute', ...style }}>
    <path d="M5 0 6 4 10 5 6 6 5 10 4 6 0 5 4 4z" fill="#E9DDFF" />
  </svg>
);

export default function MissionPreview({ form }) {
  const style = form.cardStyle || 'padrao';
  const meta = STYLE_BY_KEY[style];
  const Icon = meta.icon;
  const opts = form.cardStyleOptions || {};
  const pts = `+${Number(form.points) || 0} pts`;
  const title = form.title || 'Título da missão';
  const desc = form.description || 'O que a pessoa precisa fazer.';
  const secret = style === 'secreta';
  const tier = TIERS[opts.tier] || TIERS.diamante;

  if (style === 'relampago') {
    return (
      <div className="relative overflow-hidden rounded-[18px] border border-[rgba(245,158,11,0.28)] bg-surface px-4 py-3.5">
        <div className="flex items-center gap-3">
          <span className="relative flex h-[42px] w-[42px] shrink-0 items-center justify-center rounded-full bg-[rgba(245,158,11,0.16)]">
            <span aria-hidden="true" className="adm-ring absolute inset-0 rounded-full border-2 border-[rgba(245,158,11,0.5)]" />
            <span className="adm-bolt flex"><Zap size={20} color="#F59E0B" strokeWidth={2.2} aria-hidden="true" /></span>
          </span>
          <span className="min-w-0 flex-1">
            <span className="block text-[12px] font-extrabold text-gold">Relâmpago · {Number(form.flashDuration) || 5}:00 restantes</span>
            <span className="mt-0.5 block text-[15px] font-extrabold">{title} <span className="text-you-text">+{Number(form.points) || 0}</span></span>
          </span>
          <span className="inline-flex h-[38px] items-center rounded-[10px] bg-action px-3.5 text-[13px] font-extrabold text-white">Participar</span>
        </div>
        <div aria-hidden="true" className="mt-3 h-1 overflow-hidden rounded-sm bg-surface-raised">
          <span className="block h-1 w-[62%] rounded-sm bg-gold" />
        </div>
      </div>
    );
  }

  const cardStyle = secret
    ? { background: 'linear-gradient(135deg, #1D1347, #0E0B26)', border: '1px solid rgba(167,139,250,0.45)', boxShadow: '0 10px 26px -14px rgba(124,58,237,0.8)' }
    : style === 'patrocinador'
      ? { background: `linear-gradient(160deg, ${tier.tint}, var(--surface) 45%)`, border: `1px solid ${tier.line}` }
      : { background: 'var(--surface)', border: '1px solid var(--line)' };

  return (
    <div className={`relative overflow-hidden rounded-[18px] p-3.5 ${secret && opts.sparkles === false ? 'adm-still' : ''}`} style={cardStyle}>
      {secret && (
        <>
          <span aria-hidden="true" className="absolute inset-0" style={{ backgroundImage: 'radial-gradient(rgba(196,181,253,0.18) 1px, transparent 1px)', backgroundSize: '12px 12px' }} />
          {opts.sparkles !== false && (
            <>
              <span aria-hidden="true" className="adm-float-q absolute right-[92px] top-[-14px] text-[92px] font-black leading-none text-[rgba(167,139,250,0.10)]">?</span>
              <Sparkle size={9} style={{ left: 30, top: 8, animationDelay: '0s' }} />
              <Sparkle size={7} style={{ right: 60, top: 14, animationDelay: '0.8s' }} />
              <Sparkle size={8} style={{ right: 110, top: 78, animationDelay: '1.6s' }} />
            </>
          )}
        </>
      )}
      <div className="relative grid grid-cols-[44px_1fr] items-start gap-3">
        {style === 'stories' ? (
          <span className="box-border h-11 w-11 rounded-xl p-[2px]" style={{ background: 'linear-gradient(45deg, #F58529, #DD2A7B, #8134AF)' }}>
            <span className="flex h-full w-full items-center justify-center rounded-[10px] bg-surface"><Camera size={20} color="#F59AC0" aria-hidden="true" /></span>
          </span>
        ) : style === 'patrocinador' && opts.sponsorLogo ? (
          <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#F4F5FA]">
            <img src={`${import.meta.env.BASE_URL}${opts.sponsorLogo}`} alt="" className="h-[18px] w-9 object-contain" />
          </span>
        ) : (
          <span
            className="relative flex h-11 w-11 items-center justify-center overflow-hidden rounded-xl"
            style={secret ? { background: 'linear-gradient(135deg, #7C3AED, #4C1D95)', boxShadow: '0 0 18px rgba(124,58,237,0.55)', color: '#fff' } : { background: `${meta.color}22`, color: style === 'patrocinador' ? tier.text : meta.color }}
          >
            {style === 'caca-qr' && <span aria-hidden="true" className="adm-radar absolute -inset-2.5" style={{ background: 'conic-gradient(from 0deg, transparent 0deg, #F59E0B30 50deg, transparent 70deg)' }} />}
            <Icon size={20} aria-hidden="true" className="relative" />
          </span>
        )}
        <span className="min-w-0">
          <span className="block text-[15px] font-extrabold" style={{ color: secret ? '#E9DDFF' : 'var(--text)' }}>{title}</span>
          <span className="mt-[3px] block text-[13px] leading-[1.4] text-text-2">{desc}</span>
        </span>
      </div>
      <div className="relative mt-3 flex items-center gap-2 border-t border-[rgba(255,255,255,0.06)] pt-3">
        <span className="flex min-w-0 flex-1 flex-wrap items-center gap-1.5">
          <span className="rounded-lg px-2 py-0.5 text-[12px] font-extrabold" style={secret ? { background: 'rgba(124,58,237,0.5)', color: '#fff' } : { background: 'var(--you-soft)', color: 'var(--you-text)' }}>{pts}</span>
          {secret && opts.hint && (
            <span className="inline-flex items-center gap-1.5 rounded-lg bg-[rgba(255,255,255,0.06)] px-2 py-0.5 text-[12px] font-bold text-[#C4B5FD]">
              Dica:<span className="tracking-[2px] text-white" style={{ filter: 'blur(3.5px)' }}>{opts.hint}</span>
            </span>
          )}
          {style === 'caca-qr' && opts.deadline && <span className="text-[12px] font-bold text-gold">termina às {opts.deadline.replace(':00', 'h').replace(':', 'h')}</span>}
          {style === 'patrocinador' && <span className="rounded-lg px-2 py-0.5 text-[12px] font-extrabold" style={{ color: tier.text, background: tier.tint }}>{tier.label}</span>}
          {style === 'quiz' && <span className="text-[12px] font-bold text-text-3">1 pergunta · {(form.quizOptions || []).filter((o) => o.trim()).length || 2} opções</span>}
        </span>
        <span
          className="inline-flex h-[38px] items-center whitespace-nowrap rounded-[10px] px-3.5 text-[13px] font-extrabold text-white"
          style={{ background: secret ? 'linear-gradient(135deg, #7C3AED, #A855F7)' : 'var(--action)' }}
        >
          {ctaLabel(form)}
        </span>
      </div>
    </div>
  );
}
