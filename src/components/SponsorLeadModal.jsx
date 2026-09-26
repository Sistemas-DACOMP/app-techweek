import { useState } from 'react';
import { 
  X, 
  Star, 
  CheckCircle2, 
  AlertCircle, 
  Loader2, 
  Building2, 
  GraduationCap, 
  Mail, 
  Phone, 
  Sparkles,
  QrCode
} from 'lucide-react';
import WhatsAppButton from './WhatsAppButton';
import { submitLead } from '../lib/sponsorService';

/**
 * Modal pós-leitura de Lead para Patrocinadores (KAN-52).
 * Permite avaliação de 1 a 5 estrelas, notas de recrutamento, envio para POST /api/leads
 * e exibição imediata do Botão Inteligente do WhatsApp (KAN-54).
 */
export default function SponsorLeadModal({
  participant,
  sponsorProfile,
  onClose,
  onLeadCaptured
}) {
  const [rating, setRating] = useState(0);
  const [hoverRating, setHoverRating] = useState(0);
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState(null);
  const [savedLeadData, setSavedLeadData] = useState(null);

  if (!participant) return null;

  const sponsorCompanyName = sponsorProfile?.companyName || sponsorProfile?.empresa || sponsorProfile?.displayName || 'Empresa Patrocinadora';

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!participant.participantUid) {
      setErrorMsg('Identificador do participante não encontrado.');
      return;
    }

    setIsSubmitting(true);
    setErrorMsg(null);

    try {
      const response = await submitLead({
        participantUid: participant.participantUid,
        notes,
        rating: rating > 0 ? rating : undefined
      });

      const leadInfo = response?.lead || {
        participantUid: participant.participantUid,
        name: participant.name,
        phone: participant.phone,
        notes,
        rating
      };

      setSavedLeadData(leadInfo);
      if (onLeadCaptured) {
        onLeadCaptured(leadInfo);
      }
    } catch (err) {
      console.error('Erro ao enviar lead:', err);
      setErrorMsg(err.message || 'Erro ao registrar contato.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 10000,
        backgroundColor: 'rgba(5, 8, 20, 0.85)',
        backdropFilter: 'blur(10px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '16px',
        animation: 'fadeIn 0.2s ease-out'
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget && !isSubmitting) onClose();
      }}
    >
      <div
        className="glass-panel"
        style={{
          width: '100%',
          maxWidth: '460px',
          maxHeight: '90vh',
          overflowY: 'auto',
          borderRadius: '24px',
          padding: '24px',
          background: 'linear-gradient(145deg, rgba(20, 27, 45, 0.95), rgba(10, 15, 30, 0.98))',
          border: '1px solid rgba(255, 255, 255, 0.12)',
          boxShadow: '0 20px 50px rgba(0, 0, 0, 0.6), 0 0 30px rgba(0, 242, 254, 0.1)',
          fontFamily: "'Montserrat', sans-serif",
          position: 'relative'
        }}
      >
        {/* Header Close */}
        <button
          onClick={onClose}
          disabled={isSubmitting}
          style={{
            position: 'absolute',
            top: '18px',
            right: '18px',
            background: 'rgba(255, 255, 255, 0.08)',
            border: 'none',
            borderRadius: '50%',
            width: '36px',
            height: '36px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'var(--text-secondary)',
            cursor: 'pointer',
            transition: 'all 0.2s ease'
          }}
        >
          <X size={18} />
        </button>

        {/* Lead Badge Header */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
          <div
            style={{
              padding: '4px 10px',
              borderRadius: '20px',
              background: 'linear-gradient(135deg, rgba(0, 242, 254, 0.15), rgba(79, 172, 254, 0.2))',
              border: '1px solid rgba(0, 242, 254, 0.4)',
              color: '#00f2fe',
              fontSize: '11px',
              fontWeight: '800',
              textTransform: 'uppercase',
              letterSpacing: '0.08em',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px'
            }}
          >
            <Sparkles size={13} />
            <span>Lead de Estande</span>
          </div>

          <div style={{ fontSize: '11px', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '4px' }}>
            <Building2 size={12} />
            <span>{sponsorCompanyName}</span>
          </div>
        </div>

        {/* Candidate Profile Box */}
        <div
          style={{
            background: 'rgba(255, 255, 255, 0.03)',
            borderRadius: '18px',
            padding: '16px',
            border: '1px solid rgba(255, 255, 255, 0.06)',
            marginBottom: '20px',
            display: 'flex',
            alignItems: 'center',
            gap: '14px'
          }}
        >
          <div
            style={{
              width: '54px',
              height: '54px',
              borderRadius: '16px',
              background: 'linear-gradient(135deg, #00f2fe, #4facfe)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#000',
              fontWeight: '800',
              fontSize: '20px',
              flexShrink: 0,
              boxShadow: '0 4px 15px rgba(0, 242, 254, 0.3)'
            }}
          >
            {participant.avatarUrl ? (
              <img
                src={participant.avatarUrl}
                alt=""
                style={{ width: '100%', height: '100%', borderRadius: '16px', objectFit: 'cover' }}
              />
            ) : (
              (participant.name || 'P').charAt(0).toUpperCase()
            )}
          </div>

          <div style={{ flex: 1, minWidth: 0 }}>
            <h3 style={{ fontSize: '1.1rem', fontWeight: '800', color: '#ffffff', marginBottom: '4px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {participant.name}
            </h3>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '4px' }}>
              <GraduationCap size={14} color="#00f2fe" />
              <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {participant.course} {participant.period ? `• ${participant.period}º Período` : ''}
              </span>
            </div>
            {participant.phone && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11px', color: 'var(--text-secondary)' }}>
                <Phone size={12} />
                <span>{participant.phone}</span>
              </div>
            )}
          </div>
        </div>

        {/* If already submitted, show success state & WhatsApp Button */}
        {savedLeadData ? (
          <div style={{ textAlign: 'center', animation: 'fadeIn 0.3s ease-in' }}>
            <div
              style={{
                width: '60px',
                height: '60px',
                borderRadius: '50%',
                background: 'rgba(37, 211, 102, 0.15)',
                border: '1px solid #25D366',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#25D366',
                margin: '0 auto 16px'
              }}
            >
              <CheckCircle2 size={36} />
            </div>

            <h4 style={{ fontSize: '1.2rem', fontWeight: '800', color: '#ffffff', marginBottom: '6px' }}>
              Lead Registrado com Sucesso!
            </h4>
            <p style={{ fontSize: '13px', color: '#a7f3d0', marginBottom: '20px' }}>
              🎉 +50 pontos foram creditados no crachá do participante.
            </p>

            {/* Direct WhatsApp Conversion Button */}
            <div style={{ marginBottom: '20px' }}>
              <WhatsAppButton
                phone={savedLeadData.phone || participant.phone}
                participantName={savedLeadData.name || participant.name}
                companyName={sponsorCompanyName}
                label="Conversar no WhatsApp Agora"
                size="lg"
                fullWidth
              />
            </div>

            <button
              type="button"
              className="btn-primary"
              onClick={onClose}
              style={{
                width: '100%',
                padding: '14px',
                fontSize: '14px',
                fontWeight: '700',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px'
              }}
            >
              <QrCode size={18} />
              <span>Bipar Próximo Aluno</span>
            </button>
          </div>
        ) : (
          /* Form for Rating and Notes */
          <form onSubmit={handleSubmit}>
            {/* Star Rating Section */}
            <div style={{ marginBottom: '20px' }}>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: '700', color: 'var(--text-secondary)', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Classificação do Candidato (1 a 5 estrelas)
              </label>

              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                {[1, 2, 3, 4, 5].map((starValue) => {
                  const isFilled = (hoverRating || rating) >= starValue;
                  return (
                    <button
                      key={starValue}
                      type="button"
                      onClick={() => setRating(starValue)}
                      onMouseEnter={() => setHoverRating(starValue)}
                      onMouseLeave={() => setHoverRating(0)}
                      style={{
                        background: 'transparent',
                        border: 'none',
                        cursor: 'pointer',
                        padding: '4px',
                        transition: 'transform 0.15s ease',
                        transform: (hoverRating || rating) >= starValue ? 'scale(1.15)' : 'scale(1)'
                      }}
                      aria-label={`${starValue} estrelas`}
                    >
                      <Star
                        size={32}
                        fill={isFilled ? '#eab308' : 'none'}
                        color={isFilled ? '#eab308' : 'rgba(255, 255, 255, 0.25)'}
                      />
                    </button>
                  );
                })}
                <span style={{ fontSize: '13px', fontWeight: '700', color: rating > 0 ? '#eab308' : 'var(--text-secondary)', marginLeft: '6px' }}>
                  {rating > 0 ? `${rating} / 5` : 'Sem nota'}
                </span>
              </div>
            </div>

            {/* Recruitment Notes Section */}
            <div style={{ marginBottom: '20px' }}>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: '700', color: 'var(--text-secondary)', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Notas de Recrutamento (notes)
              </label>

              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Ex: Ótimo perfil para estágio backend em Node/Python, interesse na vaga de dados, soft skills excelentes..."
                rows={4}
                style={{
                  width: '100%',
                  fontFamily: "'Montserrat', sans-serif",
                  background: 'rgba(255, 255, 255, 0.04)',
                  border: '1px solid rgba(255, 255, 255, 0.1)',
                  borderRadius: '14px',
                  padding: '12px 14px',
                  color: '#ffffff',
                  fontSize: '13px',
                  resize: 'vertical',
                  outline: 'none',
                  transition: 'border-color 0.2s ease'
                }}
                onFocus={(e) => { e.target.style.borderColor = '#00f2fe'; }}
                onBlur={(e) => { e.target.style.borderColor = 'rgba(255, 255, 255, 0.1)'; }}
              />
            </div>

            {/* Error Message */}
            {errorMsg && (
              <div
                style={{
                  background: 'rgba(239, 68, 68, 0.15)',
                  border: '1px solid #ef4444',
                  borderRadius: '12px',
                  padding: '10px 14px',
                  color: '#fca5a5',
                  fontSize: '12px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  marginBottom: '16px'
                }}
              >
                <AlertCircle size={16} />
                <span>{errorMsg}</span>
              </div>
            )}

            {/* Submit Action Button */}
            <button
              type="submit"
              disabled={isSubmitting}
              className="btn-primary"
              style={{
                width: '100%',
                padding: '14px',
                fontSize: '14px',
                fontWeight: '700',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px'
              }}
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="animate-spin" size={18} />
                  <span>Enviando Lead...</span>
                </>
              ) : (
                <>
                  <CheckCircle2 size={18} />
                  <span>Salvar Lead (+50 pts)</span>
                </>
              )}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
