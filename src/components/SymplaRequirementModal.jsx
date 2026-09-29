import { useNavigate } from 'react-router-dom';
import { ShieldAlert, Ticket, QrCode, Trophy, ArrowRight, X, ExternalLink } from 'lucide-react';
import { SYMPLA_EVENT_URL } from '../lib/sympla';

export default function SymplaRequirementModal({
  isOpen,
  onClose,
  featureName = 'esta funcionalidade'
}) {
  const navigate = useNavigate();

  if (!isOpen) return null;

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 9999,
        background: 'rgba(7, 10, 18, 0.88)',
        backdropFilter: 'blur(10px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '16px'
      }}
      className="animate-fade-in"
    >
      <div
        style={{
          width: '100%',
          maxWidth: '440px',
          background: 'linear-gradient(180deg, #131A29 0%, #0F141F 100%)',
          border: '1px solid rgba(234, 179, 8, 0.35)',
          borderRadius: '20px',
          padding: '24px',
          boxShadow: '0 20px 40px rgba(0,0,0,0.6), 0 0 30px rgba(234, 179, 8, 0.15)',
          position: 'relative',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          textAlign: 'center'
        }}
      >
        {/* Botão Fechar */}
        <button
          onClick={onClose}
          style={{
            position: 'absolute',
            top: '16px',
            right: '16px',
            background: 'rgba(255, 255, 255, 0.06)',
            border: '1px solid rgba(255, 255, 255, 0.12)',
            color: '#94A3B8',
            borderRadius: '50%',
            width: '32px',
            height: '32px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer'
          }}
        >
          <X size={18} />
        </button>

        {/* Ícone de Destaque */}
        <div
          style={{
            width: '64px',
            height: '64px',
            borderRadius: '20px',
            background: 'linear-gradient(135deg, rgba(234, 179, 8, 0.25), rgba(161, 98, 7, 0.15))',
            border: '1px solid rgba(234, 179, 8, 0.4)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            marginBottom: '16px',
            color: '#FACC15'
          }}
        >
          <ShieldAlert size={32} />
        </div>

        {/* Título e Subtítulo */}
        <h2 style={{ fontSize: '1.2rem', fontWeight: 800, color: 'white', margin: '0 0 8px 0' }}>
          Ative seu Ingresso Sympla
        </h2>
        <p style={{ fontSize: '0.85rem', color: '#94A3B8', margin: '0 0 20px 0', lineHeight: '1.45' }}>
          Para acessar {featureName}, você precisa conectar seu ingresso oficial da FACOM Tech Week.
        </p>

        {/* Lista de Recursos Bloqueados */}
        <div
          style={{
            width: '100%',
            background: 'rgba(255, 255, 255, 0.025)',
            border: '1px solid rgba(255, 255, 255, 0.06)',
            borderRadius: '14px',
            padding: '14px 16px',
            marginBottom: '20px',
            textAlign: 'left',
            display: 'flex',
            flexDirection: 'column',
            gap: '10px'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '0.8rem', color: '#CBD5E1' }}>
            <Ticket size={16} color="#38BDF8" style={{ flexShrink: 0 }} />
            <span>Reserva de vagas na grade presencial</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '0.8rem', color: '#CBD5E1' }}>
            <QrCode size={16} color="#38BDF8" style={{ flexShrink: 0 }} />
            <span>Scanner QR Code de presença em palestras</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '0.8rem', color: '#CBD5E1' }}>
            <Trophy size={16} color="#38BDF8" style={{ flexShrink: 0 }} />
            <span>Missões e acúmulo de pontos no ranking</span>
          </div>
        </div>

        {/* Ações */}
        <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: '10px' }}>
          <button
            onClick={() => {
              onClose();
              navigate('/profile');
            }}
            style={{
              width: '100%',
              height: '46px',
              borderRadius: '12px',
              background: '#2563EB',
              border: '1px solid #3B82F6',
              color: 'white',
              fontSize: '0.88rem',
              fontWeight: 700,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              boxShadow: '0 4px 14px rgba(37, 99, 235, 0.35)'
            }}
          >
            <span>Vincular Ingresso no Perfil</span>
            <ArrowRight size={16} />
          </button>

          <a
            href={SYMPLA_EVENT_URL}
            target="_blank"
            rel="noopener noreferrer"
            style={{
              width: '100%',
              height: '42px',
              borderRadius: '12px',
              background: 'rgba(234, 179, 8, 0.1)',
              border: '1px solid rgba(234, 179, 8, 0.3)',
              color: '#FACC15',
              fontSize: '0.82rem',
              fontWeight: 600,
              textDecoration: 'none',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px'
            }}
          >
            <span>Garantir Ingresso no Sympla</span>
            <ExternalLink size={14} />
          </a>
        </div>
      </div>
    </div>
  );
}
