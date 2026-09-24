import { buildWhatsAppLink } from '../lib/whatsapp';

/**
 * Ícone oficial vetorial do WhatsApp em SVG.
 */
function WhatsAppIcon({ size = 20, color = 'currentColor' }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill={color}
      xmlns="http://www.w3.org/2000/svg"
      style={{ flexShrink: 0 }}
    >
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.885-9.884 9.885m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
    </svg>
  );
}

/**
 * Botão Inteligente de Conversão Direta para WhatsApp (KAN-54).
 * Abre o WhatsApp Web ou Mobile com mensagem contextualizada para o participante e a empresa.
 */
export default function WhatsAppButton({
  phone,
  participantName = '',
  companyName = '',
  customMessage = '',
  label = 'Conversar no WhatsApp',
  size = 'md',
  fullWidth = false,
  disabled = false,
  onClick,
  style = {},
  className = ''
}) {
  const url = buildWhatsAppLink(phone, participantName, companyName, customMessage);
  const isAvailable = Boolean(url) && !disabled;

  const handleClick = (e) => {
    if (!isAvailable) {
      e.preventDefault();
      return;
    }

    if (onClick) {
      onClick(e, url);
    }

    window.open(url, '_blank', 'noopener,noreferrer');
  };

  const sizeStyles = {
    sm: { padding: '8px 14px', fontSize: '12px', iconSize: 16, borderRadius: '12px', gap: '6px' },
    md: { padding: '12px 20px', fontSize: '13px', iconSize: 19, borderRadius: '16px', gap: '8px' },
    lg: { padding: '16px 26px', fontSize: '15px', iconSize: 22, borderRadius: '18px', gap: '10px' }
  }[size] || { padding: '12px 20px', fontSize: '13px', iconSize: 19, borderRadius: '16px', gap: '8px' };

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={!isAvailable}
      className={`whatsapp-button ${className}`}
      title={isAvailable ? 'Abrir conversa no WhatsApp' : 'Telefone não disponível ou inválido'}
      style={{
        fontFamily: "'Montserrat', sans-serif",
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        width: fullWidth ? '100%' : 'auto',
        fontWeight: '700',
        cursor: isAvailable ? 'pointer' : 'not-allowed',
        background: isAvailable
          ? 'linear-gradient(135deg, #25D366, #128C7E)'
          : 'rgba(255, 255, 255, 0.08)',
        color: isAvailable ? '#ffffff' : 'rgba(255, 255, 255, 0.4)',
        border: isAvailable ? 'none' : '1px solid rgba(255, 255, 255, 0.1)',
        boxShadow: isAvailable ? '0 6px 20px rgba(37, 211, 102, 0.28)' : 'none',
        transition: 'all 0.2s cubic-bezier(0.4, 0, 0.2, 1)',
        textDecoration: 'none',
        outline: 'none',
        ...sizeStyles,
        ...style
      }}
    >
      <WhatsAppIcon size={sizeStyles.iconSize} color={isAvailable ? '#ffffff' : 'rgba(255, 255, 255, 0.4)'} />
      <span>{label}</span>
    </button>
  );
}

export { WhatsAppIcon };
