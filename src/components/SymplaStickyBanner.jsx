import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ShieldAlert, ArrowRight } from 'lucide-react';
import { useUser } from '../hooks/useUser';
import SymplaRequirementModal from './SymplaRequirementModal';

export default function SymplaStickyBanner() {
  const { hasSymplaTicket, profile } = useUser();
  const navigate = useNavigate();
  const [showModal, setShowModal] = useState(false);

  // Não exibe se o usuário não estiver logado ou já tiver ingresso
  if (!profile || hasSymplaTicket) return null;

  return (
    <>
      <div
        style={{
          background: 'linear-gradient(90deg, #1E1B4B 0%, #172554 100%)',
          borderBottom: '1px solid rgba(234, 179, 8, 0.3)',
          padding: '10px 16px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '12px',
          fontSize: '0.78rem',
          color: '#E0E7FF',
          boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
          position: 'sticky',
          top: 0,
          zIndex: 900
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flex: 1 }}>
          <ShieldAlert size={18} color="#FACC15" style={{ flexShrink: 0 }} />
          <span style={{ lineHeight: '1.3' }}>
            <strong style={{ color: '#FACC15' }}>Modo de Leitura:</strong> Vincule seu ingresso Sympla para liberar reservas, QR Code e missões!
          </span>
        </div>

        <button
          onClick={() => setShowModal(true)}
          style={{
            background: '#FACC15',
            color: '#0F172A',
            border: 'none',
            borderRadius: '8px',
            padding: '6px 12px',
            fontSize: '0.75rem',
            fontWeight: 800,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '4px',
            whiteSpace: 'nowrap',
            flexShrink: 0
          }}
        >
          <span>Ativar</span>
          <ArrowRight size={12} />
        </button>
      </div>

      <SymplaRequirementModal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        featureName="o aplicativo completo"
      />
    </>
  );
}
