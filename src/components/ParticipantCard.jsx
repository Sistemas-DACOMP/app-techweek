import { useState } from 'react';
import { 
  GraduationCap, 
  ExternalLink, 
  User, 
  Sparkles,
  Share2
} from 'lucide-react';
import WhatsAppButton from './WhatsAppButton';

/**
 * Ícone oficial do Instagram em SVG.
 */
export function InstagramIcon({ size = 18, color = 'currentColor' }) {
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
export function LinkedInIcon({ size = 18, color = 'currentColor' }) {
  return (
    <svg 
      width={size} 
      height={size} 
      viewBox="0 0 24 24" 
      fill={color} 
      style={{ flexShrink: 0 }}
    >
      <path d="M19 0h-14c-2.761 0-5 2.239-5 5v14c0 2.761 2.239 5 5 5h14c2.762 0 5-2.239 5-5v-14c0-2.761-2.238-5-5-5zm-11 19h-3v-11h3v11zm-1.5-12.268c-.966 0-1.75-.79-1.75-1.764s.784-1.764 1.75-1.764 1.75.79 1.75 1.764-.783 1.764-1.75 1.764zm13.5 12.268h-3v-5.604c0-3.368-4-3.113-4 0v5.604h-3v-11h3v1.765c1.396-2.586 7-2.777 7 2.476v6.759z" />
    </svg>
  );
}

/**
 * Ícone oficial do GitHub em SVG.
 */
export function GitHubIcon({ size = 18, color = 'currentColor' }) {
  return (
    <svg 
      width={size} 
      height={size} 
      viewBox="0 0 24 24" 
      fill={color} 
      style={{ flexShrink: 0 }}
    >
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

/**
 * Card de Apresentação de Participante (KAN-95).
 * Exibe foto de perfil, identificação acadêmica/profissional e atalhos diretos para redes sociais
 * (WhatsApp, LinkedIn, Instagram e GitHub) ao escanear o QR Code de outro participante.
 */
export default function ParticipantCard({
  participant,
  className = '',
  style = {}
}) {
  const [imageError, setImageError] = useState(false);

  if (!participant) return null;

  const {
    name = 'Participante',
    username,
    avatarUrl,
    photoURL,
    course,
    period,
    participantType,
    phone,
    linkedin,
    instagram,
    github
  } = participant;

  const effectiveAvatar = (!imageError && (avatarUrl || photoURL)) ? (avatarUrl || photoURL) : null;
  const cleanUsername = username ? String(username).replace(/^@/, '') : '';
  const initials = (name || 'TW')
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map(w => w[0].toUpperCase())
    .join('') || 'TW';

  const linkedinLink = formatSocialUrl('linkedin', linkedin);
  const linkedinHandle = formatSocialHandle('linkedin', linkedin);

  const instagramLink = formatSocialUrl('instagram', instagram);
  const instagramHandle = formatSocialHandle('instagram', instagram);

  const githubLink = formatSocialUrl('github', github);
  const githubHandle = formatSocialHandle('github', github);

  const hasSocials = Boolean(linkedinLink || instagramLink || githubLink);

  return (
    <div
      className={`participant-card ${className}`}
      style={{
        backgroundColor: '#0F141F',
        border: '1px solid #1E293B',
        borderRadius: '16px',
        padding: '12px 14px',
        marginBottom: '10px',
        boxShadow: '0 6px 20px rgba(0, 0, 0, 0.4)',
        ...style
      }}
    >
      {/* 1. CABEÇALHO DO PERFIL: FOTO + INFORMAÇÕES */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '10px' }}>
        {/* Foto de Perfil (Avatar) com fallback para iniciais estilizadas */}
        <div
          style={{
            position: 'relative',
            width: '50px',
            height: '50px',
            borderRadius: '14px',
            overflow: 'hidden',
            flexShrink: 0,
            background: 'linear-gradient(135deg, #1E3A8A, #0284C7)',
            border: '2px solid rgba(56, 189, 248, 0.35)',
            boxShadow: '0 3px 12px rgba(56, 189, 248, 0.2)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}
        >
          {effectiveAvatar ? (
            <img
              src={effectiveAvatar}
              alt={name}
              onError={() => setImageError(true)}
              style={{
                width: '100%',
                height: '100%',
                objectFit: 'cover',
                borderRadius: '12px'
              }}
            />
          ) : (
            <span
              style={{
                fontFamily: "'Space Grotesk', -apple-system, BlinkMacSystemFont, sans-serif",
                fontWeight: 800,
                fontSize: '1.15rem',
                color: '#F8FAFC',
                letterSpacing: '-0.02em'
              }}
            >
              {initials}
            </span>
          )}
        </div>

        {/* Nome, Username, Curso e Período */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <h4
            style={{
              fontFamily: "'Space Grotesk', -apple-system, BlinkMacSystemFont, sans-serif",
              fontSize: '0.98rem',
              fontWeight: 800,
              color: '#F8FAFC',
              margin: '0 0 1px',
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              letterSpacing: '-0.02em',
              lineHeight: 1.2
            }}
          >
            {name}
          </h4>

          {cleanUsername && (
            <div
              style={{
                fontSize: '0.72rem',
                color: '#38BDF8',
                fontWeight: 600,
                marginBottom: '2px',
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis'
              }}
            >
              @{cleanUsername}
            </div>
          )}

          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '5px',
              fontSize: '0.7rem',
              color: '#94A3B8',
              lineHeight: 1.2
            }}
          >
            <GraduationCap size={12} color="#60A5FA" style={{ flexShrink: 0 }} />
            <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {course || 'UFU'}
              {period ? ` • ${period}º período` : ''}
            </span>
          </div>

          {participantType && (
            <div style={{ marginTop: '3px' }}>
              <span
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  padding: '1px 6px',
                  borderRadius: '999px',
                  backgroundColor: 'rgba(56, 189, 248, 0.1)',
                  border: '1px solid rgba(56, 189, 248, 0.25)',
                  color: '#38BDF8',
                  fontSize: '0.64rem',
                  fontWeight: 700,
                  letterSpacing: '0.02em'
                }}
              >
                {participantType}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* 2. SEÇÃO DE REDES SOCIAIS E CONTATO */}
      <div
        style={{
          borderTop: '1px solid rgba(255, 255, 255, 0.08)',
          paddingTop: '8px',
          marginTop: '4px'
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: '6px'
          }}
        >
          <span
            style={{
              fontSize: '0.66rem',
              fontWeight: 700,
              color: '#64748B',
              textTransform: 'uppercase',
              letterSpacing: '0.06em',
              display: 'flex',
              alignItems: 'center',
              gap: '4px'
            }}
          >
            <Share2 size={11} color="#64748B" />
            Redes de Contato
          </span>

          <span style={{ fontSize: '0.64rem', color: '#475569' }}>
            Toque para conectar
          </span>
        </div>

        {/* Grade de Redes Sociais */}
        {hasSocials && (
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: linkedinLink && instagramLink ? 'repeat(2, 1fr)' : '1fr',
              gap: '6px',
              marginBottom: phone ? '8px' : '0'
            }}
          >
            {/* Botão Instagram */}
            {instagramLink && (
              <a
                href={instagramLink}
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '6px 9px',
                  borderRadius: '9px',
                  backgroundColor: 'rgba(225, 48, 108, 0.08)',
                  border: '1px solid rgba(225, 48, 108, 0.25)',
                  color: '#F43F5E',
                  textDecoration: 'none',
                  fontSize: '0.72rem',
                  fontWeight: 600,
                  transition: 'all 0.15s ease',
                  overflow: 'hidden'
                }}
              >
                <div
                  style={{
                    width: '24px',
                    height: '24px',
                    borderRadius: '6px',
                    backgroundColor: 'rgba(225, 48, 108, 0.15)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#FB7185',
                    flexShrink: 0
                  }}
                >
                  <InstagramIcon size={13} color="#FB7185" />
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: '0.58rem', color: '#FDA4AF', fontWeight: 500, lineHeight: 1 }}>
                    Instagram
                  </div>
                  <div
                    style={{
                      fontSize: '0.72rem',
                      fontWeight: 700,
                      color: '#FFF1F2',
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      marginTop: '1px'
                    }}
                  >
                    {instagramHandle ? `@${instagramHandle}` : 'Visitar'}
                  </div>
                </div>
                <ExternalLink size={10} color="#FDA4AF" style={{ flexShrink: 0 }} />
              </a>
            )}

            {/* Botão LinkedIn */}
            {linkedinLink && (
              <a
                href={linkedinLink}
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '6px 9px',
                  borderRadius: '9px',
                  backgroundColor: 'rgba(10, 102, 194, 0.08)',
                  border: '1px solid rgba(10, 102, 194, 0.25)',
                  color: '#38BDF8',
                  textDecoration: 'none',
                  fontSize: '0.72rem',
                  fontWeight: 600,
                  transition: 'all 0.15s ease',
                  overflow: 'hidden'
                }}
              >
                <div
                  style={{
                    width: '24px',
                    height: '24px',
                    borderRadius: '6px',
                    backgroundColor: 'rgba(10, 102, 194, 0.18)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#0A66C2',
                    flexShrink: 0
                  }}
                >
                  <LinkedInIcon size={13} color="#38BDF8" />
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: '0.58rem', color: '#7DD3FC', fontWeight: 500, lineHeight: 1 }}>
                    LinkedIn
                  </div>
                  <div
                    style={{
                      fontSize: '0.72rem',
                      fontWeight: 700,
                      color: '#F0F9FF',
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      marginTop: '1px'
                    }}
                  >
                    {linkedinHandle || 'Conectar'}
                  </div>
                </div>
                <ExternalLink size={10} color="#7DD3FC" style={{ flexShrink: 0 }} />
              </a>
            )}

            {/* Botão GitHub (se presente) */}
            {githubLink && (
              <a
                href={githubLink}
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  gridColumn: linkedinLink && instagramLink ? '1 / -1' : 'auto',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '6px 9px',
                  borderRadius: '9px',
                  backgroundColor: 'rgba(255, 255, 255, 0.05)',
                  border: '1px solid rgba(255, 255, 255, 0.15)',
                  color: '#F8FAFC',
                  textDecoration: 'none',
                  fontSize: '0.72rem',
                  fontWeight: 600,
                  transition: 'all 0.15s ease',
                  overflow: 'hidden'
                }}
              >
                <div
                  style={{
                    width: '24px',
                    height: '24px',
                    borderRadius: '6px',
                    backgroundColor: 'rgba(255, 255, 255, 0.1)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#F8FAFC',
                    flexShrink: 0
                  }}
                >
                  <GitHubIcon size={13} color="#F8FAFC" />
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: '0.58rem', color: '#94A3B8', fontWeight: 500, lineHeight: 1 }}>
                    GitHub
                  </div>
                  <div
                    style={{
                      fontSize: '0.72rem',
                      fontWeight: 700,
                      color: '#F8FAFC',
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      marginTop: '1px'
                    }}
                  >
                    {githubHandle || 'Ver repositórios'}
                  </div>
                </div>
                <ExternalLink size={10} color="#94A3B8" style={{ flexShrink: 0 }} />
              </a>
            )}
          </div>
        )}

        {/* Botão WhatsApp Principal */}
        {phone ? (
          <WhatsAppButton
            phone={phone}
            participantName={name}
            companyName="FACOM TechWeek"
            customMessage={`Olá ${name}! Nos conectamos pelo scanner da FACOM TechWeek 🚀`}
            fullWidth
            size="sm"
            label="Conversar no WhatsApp"
            style={{
              height: '38px',
              borderRadius: '10px',
              fontSize: '0.78rem'
            }}
          />
        ) : (
          !hasSocials && (
            <div
              style={{
                padding: '8px 10px',
                borderRadius: '8px',
                backgroundColor: 'rgba(255, 255, 255, 0.03)',
                border: '1px dashed #334155',
                textAlign: 'center',
                color: '#64748B',
                fontSize: '0.7rem'
              }}
            >
              Participante não cadastrou redes sociais públicas.
            </div>
          )
        )}
      </div>
    </div>
  );
}
