import React from 'react';
import { 
  Mic, 
  Terminal, 
  Wrench, 
  Store, 
  Calendar, 
  CheckCircle2, 
  Clock, 
  Bookmark, 
  AlertCircle 
} from 'lucide-react';

/**
 * Mapeamento canônico das categorias de atividades.
 * Cores sóbrias e de alto contraste (WCAG AA) - sem glow amador.
 */
const CATEGORY_STYLES = {
  palestra: {
    label: 'Palestra',
    icon: Mic,
    accent: '#38BDF8',
    bg: '#0C2B40',
    text: '#7DD3FC',
    border: '#0369A1',
  },
  minicurso: {
    label: 'Minicurso',
    icon: Terminal,
    accent: '#A855F7',
    bg: '#2E1065',
    text: '#D8B4FE',
    border: '#7E22CE',
  },
  workshop: {
    label: 'Workshop',
    icon: Wrench,
    accent: '#F59E0B',
    bg: '#451A03',
    text: '#FCD34D',
    border: '#B45309',
  },
  ativacao: {
    label: 'Ativação',
    icon: Store,
    accent: '#10B981',
    bg: '#064E3B',
    text: '#6EE7B7',
    border: '#047857',
  },
  feira: {
    label: 'Feira / Estande',
    icon: Store,
    accent: '#10B981',
    bg: '#064E3B',
    text: '#6EE7B7',
    border: '#047857',
  },
};

/**
 * Mapeamento dos estados de presença do participante.
 */
const STATUS_STYLES = {
  BOOKED: {
    label: 'Inscrito',
    icon: Bookmark,
    bg: '#1E293B',
    text: '#60A5FA',
    border: 'rgba(59, 130, 246, 0.35)',
  },
  CHECKED_IN: {
    label: 'Entrada Validada',
    icon: Clock,
    bg: 'rgba(69, 26, 3, 0.55)',
    text: '#FCD34D',
    border: 'rgba(245, 158, 11, 0.45)',
  },
  COMPLETED: {
    label: 'Presença Concluída',
    icon: CheckCircle2,
    bg: 'rgba(6, 78, 59, 0.55)',
    text: '#6EE7B7',
    border: 'rgba(16, 185, 129, 0.45)',
  },
  WAITING_LIST: {
    label: 'Fila de Espera',
    icon: AlertCircle,
    bg: '#1E1B4B',
    text: '#C084FC',
    border: 'rgba(168, 85, 247, 0.4)',
  },
};

/**
 * Componente Badge / Tag Semântica Padronizado.
 *
 * @param {'category' | 'status' | 'neutral' | 'points'} variant
 * @param {string} type Tipo da categoria (ex: 'palestra', 'minicurso', etc.)
 * @param {string} status Estado da presença (ex: 'BOOKED', 'CHECKED_IN', 'COMPLETED')
 * @param {'sm' | 'md'} size Tamanho da tag (sm: 20px de altura, md: 24px)
 * @param {boolean} showIcon Exibe ícone vetorial correspondente
 * @param {React.ReactNode} children Conteúdo textual opcional
 * @param {string} className Classes CSS adicionais
 * @param {React.CSSProperties} style Estilos inline opcionais
 */
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
  const normType = String(type).toLowerCase().trim();
  let resolvedConfig = null;
  let IconComponent = null;

  if (variant === 'category') {
    resolvedConfig = CATEGORY_STYLES[normType] || CATEGORY_STYLES.palestra;
    IconComponent = resolvedConfig.icon;
  } else if (variant === 'status') {
    resolvedConfig = STATUS_STYLES[status] || null;
    if (resolvedConfig) {
      IconComponent = resolvedConfig.icon;
    }
  }

  // Fallback neutro
  if (!resolvedConfig) {
    resolvedConfig = {
      label: children || 'Evento',
      bg: '#1E293B',
      text: '#94A3B8',
      border: '#334155',
    };
  }

  const isSmall = size === 'sm';
  const labelText = children || resolvedConfig.label;

  return (
    <span
      className={`inline-flex items-center gap-1.5 font-medium tracking-wide uppercase select-none ${className}`}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: isSmall ? '4px' : '6px',
        padding: isSmall ? '2px 8px' : '3px 10px',
        fontSize: isSmall ? '10.5px' : '11.5px',
        lineHeight: 1.2,
        fontWeight: 600,
        fontFamily: "'Inter', system-ui, sans-serif",
        borderRadius: '6px',
        backgroundColor: resolvedConfig.bg,
        color: resolvedConfig.text,
        border: `1px solid ${resolvedConfig.border}`,
        letterSpacing: '0.03em',
        whiteSpace: 'nowrap',
        ...style,
      }}
      {...props}
    >
      {showIcon && IconComponent && (
        <IconComponent
          size={isSmall ? 12 : 13}
          strokeWidth={1.75}
          style={{ flexShrink: 0 }}
          aria-hidden="true"
        />
      )}
      <span>{labelText}</span>
    </span>
  );
}

export { CATEGORY_STYLES, STATUS_STYLES };
