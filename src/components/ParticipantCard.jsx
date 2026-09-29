import { useState } from 'react';
import { 
  GraduationCap, 
  ExternalLink, 
  User, 
  Sparkles,
  Share2,
  CheckCircle2
} from 'lucide-react';

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
export function GitHubIcon({ size = 20, color = 'currentColor' }) {
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
 * Card de Apresentação de Participante estilo Crachá Virtual & AirDrop (KAN-95).
 * Ocupa espaço nobre com foto grande de alta qualidade, tipografia marcante, @username em destaque
 * e botões de toque confortáveis para redes sociais (Instagram, LinkedIn e GitHub).
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
      className={`participant-airdrop-badge ${className}`}
      style={{
        position: 'relative',
        backgroundColor: '#0F141F',
        border: '1px solid #1E293B',
        borderRadius: '26px',
        padding: '24px 20px 20px',
        boxShadow: '0 20px 48px rgba(0, 0, 0, 0.7), 0 0 0 1px rgba(56, 189, 248, 0.12)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        textAlign: 'center',
        overflow: 'hidden',
        width: '100%',
        boxSizing: 'border-box',
        ...style
      }}
    >
      {/* 1. FENDA ESTILIZADA PARA CORDÃO DO CRACHÁ (LANYARD SLOT) */}
      <div
        aria-hidden="true"
        style={{
          width: '64px',
          height: '6px',
          borderRadius: '999px',
          backgroundColor: '#07090E',
          border: '1px solid #1E293B',
          marginBottom: '16px',
          boxShadow: 'inset 0 1px 3px rgba(0, 0, 0, 0.8)'
        }}
      />

      {/* 2. TOPO DO CRACHÁ: LOGO OFICIAL + CATEGORIA */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          width: '100%',
          marginBottom: '18px',
          padding: '0 4px'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <div
            style={{
              width: '24px',
              height: '24px',
              borderRadius: '7px',
              background: 'linear-gradient(135deg, #2563EB, #7E22CE)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontWeight: 900,
              fontSize: '0.66rem',
              color: '#FFFFFF',
              boxShadow: '0 2px 8px rgba(37, 99, 235, 0.35)'
            }}
          >
            TW
          </div>
          <span
            style={{
              fontFamily: "'Space Grotesk', -apple-system, BlinkMacSystemFont, sans-serif",
              fontSize: '0.80rem',
              fontWeight: 800,
              color: '#F8FAFC',
              letterSpacing: '-0.02em',
              background: 'linear-gradient(135deg, #F8FAFC 0%, #94A3B8 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent'
            }}
          >
            TECHWEEK 2026
          </span>
        </div>

        <span
          style={{
            fontFamily: "'Space Grotesk', -apple-system, BlinkMacSystemFont, sans-serif",
            fontSize: '0.66rem',
            fontWeight: 800,
            textTransform: 'uppercase',
            letterSpacing: '0.04em',
            padding: '3px 10px',
            borderRadius: '6px',
            backgroundColor: 'rgba(37, 99, 235, 0.15)',
            color: '#93C5FD',
            border: '1px solid rgba(59, 130, 246, 0.4)'
          }}
        >
          {participantType || 'Participante'}
        </span>
      </div>

      {/* 3. FOTO HERÓI GRANDE (SQUIRCLE COM ANEL GRADIENTE AIRDROP) */}
      <div
        style={{
          position: 'relative',
          width: '116px',
          height: '116px',
          borderRadius: '28px',
          background: 'linear-gradient(135deg, #2563EB 0%, #7E22CE 100%)',
          padding: '3.5px',
          boxShadow: '0 12px 32px rgba(37, 99, 235, 0.4)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          marginBottom: '16px',
          flexShrink: 0
        }}
      >
        <div
          style={{
            width: '100%',
            height: '100%',
            borderRadius: '24px',
            overflow: 'hidden',
            backgroundColor: '#07090E',
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
                objectFit: 'cover'
              }}
            />
          ) : (
            <span
              style={{
                fontFamily: "'Space Grotesk', -apple-system, BlinkMacSystemFont, sans-serif",
                fontWeight: 800,
                fontSize: '2.6rem',
                color: '#F8FAFC',
                letterSpacing: '-0.03em'
              }}
            >
              {initials}
            </span>
          )}
        </div>

        {/* Selo Conectado / Check */}
        <div
          style={{
            position: 'absolute',
            bottom: '-4px',
            right: '-4px',
            width: '28px',
            height: '28px',
            borderRadius: '50%',
            backgroundColor: '#10B981',
            border: '3px solid #0F141F',
            color: '#FFFFFF',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 2px 10px rgba(16, 185, 129, 0.5)'
          }}
        >
          <CheckCircle2 size={16} />
        </div>
      </div>

      {/* 4. NOME COM LETRA MAIOR & EM DESTAQUE */}
      <h3
        style={{
          fontFamily: "'Space Grotesk', -apple-system, BlinkMacSystemFont, sans-serif",
          fontSize: '1.65rem',
          fontWeight: 800,
          color: '#F8FAFC',
          margin: '0 0 4px',
          lineHeight: 1.2,
          letterSpacing: '-0.02em',
          wordBreak: 'break-word',
          maxWidth: '100%'
        }}
      >
        {name}
      </h3>

      {/* 5. @ USERNAME EMBAIXO DO NOME */}
      {cleanUsername && (
        <div
          style={{
            fontFamily: "'Space Grotesk', -apple-system, BlinkMacSystemFont, sans-serif",
            fontSize: '0.96rem',
            color: '#38BDF8',
            fontWeight: 700,
            marginBottom: '8px',
            letterSpacing: '-0.01em'
          }}
        >
          @{cleanUsername}
        </div>
      )}

      {/* Curso & Período Acadêmico */}
      <div
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '6px',
          fontSize: '0.80rem',
          color: '#94A3B8',
          marginBottom: '18px',
          padding: '5px 12px',
          borderRadius: '9px',
          backgroundColor: 'rgba(255, 255, 255, 0.04)',
          border: '1px solid rgba(255, 255, 255, 0.06)'
        }}
      >
        <GraduationCap size={15} color="#60A5FA" style={{ flexShrink: 0 }} />
        <span>
          {course || 'Universidade Federal de Uberlândia'}
          {period ? ` • ${period}º período` : ''}
        </span>
      </div>

      {/* 6. SEÇÃO DE REDES SOCIAIS ESTILO AIRDROP SHARE SHEET */}
      <div
        style={{
          width: '100%',
          borderTop: '1px solid rgba(255, 255, 255, 0.08)',
          paddingTop: '16px',
          textAlign: 'left'
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: '12px'
          }}
        >
          <span
            style={{
              fontSize: '0.72rem',
              fontWeight: 700,
              color: '#64748B',
              textTransform: 'uppercase',
              letterSpacing: '0.06em',
              display: 'flex',
              alignItems: 'center',
              gap: '6px'
            }}
          >
            <Share2 size={13} color="#38BDF8" />
            Redes de Contato
          </span>

          <span style={{ fontSize: '0.68rem', color: '#475569' }}>
            Toque para abrir
          </span>
        </div>

        {/* Grade de Redes Sociais Táteis: Instagram, LinkedIn, GitHub */}
        {hasSocials ? (
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: '10px',
              width: '100%'
            }}
          >
            {/* Instagram */}
            {instagramLink && (
              <a
                href={instagramLink}
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  padding: '12px 14px',
                  borderRadius: '14px',
                  backgroundColor: 'rgba(225, 48, 108, 0.1)',
                  border: '1px solid rgba(225, 48, 108, 0.28)',
                  color: '#F43F5E',
                  textDecoration: 'none',
                  transition: 'all 0.15s ease'
                }}
              >
                <div
                  style={{
                    width: '36px',
                    height: '36px',
                    borderRadius: '10px',
                    backgroundColor: 'rgba(225, 48, 108, 0.2)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#FB7185',
                    flexShrink: 0
                  }}
                >
                  <InstagramIcon size={20} color="#FB7185" />
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: '0.65rem', color: '#FDA4AF', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                    Instagram
                  </div>
                  <div
                    style={{
                      fontSize: '0.88rem',
                      fontWeight: 700,
                      color: '#FFF1F2',
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      marginTop: '1px'
                    }}
                  >
                    {instagramHandle ? `@${instagramHandle}` : 'Ver Perfil no Instagram'}
                  </div>
                </div>
                <ExternalLink size={15} color="#FDA4AF" style={{ flexShrink: 0 }} />
              </a>
            )}

            {/* LinkedIn */}
            {linkedinLink && (
              <a
                href={linkedinLink}
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  padding: '12px 14px',
                  borderRadius: '14px',
                  backgroundColor: 'rgba(10, 102, 194, 0.1)',
                  border: '1px solid rgba(10, 102, 194, 0.28)',
                  color: '#38BDF8',
                  textDecoration: 'none',
                  transition: 'all 0.15s ease'
                }}
              >
                <div
                  style={{
                    width: '36px',
                    height: '36px',
                    borderRadius: '10px',
                    backgroundColor: 'rgba(10, 102, 194, 0.2)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#0A66C2',
                    flexShrink: 0
                  }}
                >
                  <LinkedInIcon size={20} color="#38BDF8" />
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: '0.65rem', color: '#7DD3FC', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                    LinkedIn
                  </div>
                  <div
                    style={{
                      fontSize: '0.88rem',
                      fontWeight: 700,
                      color: '#F0F9FF',
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      marginTop: '1px'
                    }}
                  >
                    {linkedinHandle ? `in/${linkedinHandle}` : 'Conectar no LinkedIn'}
                  </div>
                </div>
                <ExternalLink size={15} color="#7DD3FC" style={{ flexShrink: 0 }} />
              </a>
            )}

            {/* GitHub */}
            {githubLink && (
              <a
                href={githubLink}
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  padding: '12px 14px',
                  borderRadius: '14px',
                  backgroundColor: 'rgba(255, 255, 255, 0.05)',
                  border: '1px solid rgba(255, 255, 255, 0.15)',
                  color: '#F8FAFC',
                  textDecoration: 'none',
                  transition: 'all 0.15s ease'
                }}
              >
                <div
                  style={{
                    width: '36px',
                    height: '36px',
                    borderRadius: '10px',
                    backgroundColor: 'rgba(255, 255, 255, 0.1)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#F8FAFC',
                    flexShrink: 0
                  }}
                >
                  <GitHubIcon size={20} color="#F8FAFC" />
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: '0.65rem', color: '#94A3B8', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                    GitHub
                  </div>
                  <div
                    style={{
                      fontSize: '0.88rem',
                      fontWeight: 700,
                      color: '#F8FAFC',
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      marginTop: '1px'
                    }}
                  >
                    {githubHandle ? `@${githubHandle}` : 'Ver Repositórios no GitHub'}
                  </div>
                </div>
                <ExternalLink size={15} color="#94A3B8" style={{ flexShrink: 0 }} />
              </a>
            )}
          </div>
        ) : (
          <div
            style={{
              padding: '12px 14px',
              borderRadius: '10px',
              backgroundColor: 'rgba(255, 255, 255, 0.03)',
              border: '1px dashed #334155',
              textAlign: 'center',
              color: '#64748B',
              fontSize: '0.74rem'
            }}
          >
            Participante não cadastrou redes sociais públicas.
          </div>
        )}
      </div>
    </div>
  );
}
