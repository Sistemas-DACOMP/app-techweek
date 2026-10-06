import { Mic, Terminal, Wrench, Store, Trophy, CheckCircle2, Clock, Bookmark, AlertCircle } from 'lucide-react';

/**
 * Cores das categorias de atividade (DESIGN.md §2.3) e dos status (§2.4).
 * accent = cor do tipo (ponto 7–9 px ou faixa lateral 4 px, nunca fundo inteiro);
 * bg/border/text = selo pequeno sobre --surface (tinta de 16% / 45% / clareada).
 * Mudou uma cor aqui? Mude também em formatActivityType (activityService) e no token --cat-* do index.css.
 */
const CATEGORY_STYLES = {
  palestra: { label: 'Palestra', icon: Mic, accent: '#8FA0FF', bg: '#262F56', text: '#A5B3FF', border: '#4A5690' },
  workshop: { label: 'Workshop', icon: Wrench, accent: '#B9A6F5', bg: '#2D3055', text: '#C7B8F7', border: '#5D598C' },
  minicurso: { label: 'Minicurso', icon: Terminal, accent: '#67D4E8', bg: '#203852', text: '#85DDED', border: '#386E86' },
  ativacao: { label: 'Ativação', icon: Store, accent: '#F2C46A', bg: '#36353E', text: '#F5D088', border: '#77674D' },
  hackathon: { label: 'Hackathon', icon: Trophy, accent: '#F59AC0', bg: '#362E4C', text: '#F7AECD', border: '#785474' },
  feira: { label: 'Feira / Estande', icon: Store, accent: '#F2C46A', bg: '#36353E', text: '#F5D088', border: '#77674D' },
};

/** Status de presença do participante (DESIGN.md §2.4). */
const STATUS_STYLES = {
  BOOKED: { label: 'Reservado', icon: Bookmark, bg: '#262F56', text: '#8FA0FF', border: '#4A5690' },
  CHECKED_IN: { label: 'Entrada registrada', icon: Clock, bg: '#213848', text: '#6FD8A6', border: '#3C7068' },
  COMPLETED: { label: 'Presença confirmada', icon: CheckCircle2, bg: '#213848', text: '#6FD8A6', border: '#3C7068' },
  WAITING_LIST: { label: 'Lista de espera', icon: AlertCircle, bg: '#36353E', text: '#F2C46A', border: '#77674D' },
};

/** Selo pequeno de categoria ou status. */
export default function Badge({
  variant = 'category',
  type = 'palestra',
  status = 'NONE',
  size = 'md',
  showIcon = true,
  children,
  className = '',
  style = {},
  ...props
}) {
  const config = variant === 'status'
    ? STATUS_STYLES[status]
    : CATEGORY_STYLES[String(type).toLowerCase().trim()] || CATEGORY_STYLES.palestra;
  const resolved = config || { label: children || 'Evento', bg: '#1A2347', text: '#A9B1CC', border: '#232D52' };
  const Icon = config?.icon;
  const small = size === 'sm';

  return (
    <span
      className={`inline-flex items-center gap-1 whitespace-nowrap rounded-[10px] border font-bold ${small ? 'px-2 py-0.5 text-[12px]' : 'px-2.5 py-1 text-[12px]'} ${className}`}
      style={{ backgroundColor: resolved.bg, color: resolved.text, borderColor: resolved.border, ...style }}
      {...props}
    >
      {showIcon && Icon && <Icon size={small ? 12 : 13} strokeWidth={2} aria-hidden="true" />}
      <span>{children || resolved.label}</span>
    </span>
  );
}

export { CATEGORY_STYLES, STATUS_STYLES };
