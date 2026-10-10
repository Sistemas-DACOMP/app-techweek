import { useState, useEffect } from 'react';
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
  QrCode,
  Copy,
  ExternalLink,
  Calendar,
  UserCheck
} from 'lucide-react';
import WhatsAppButton from './WhatsAppButton';
import { submitLead, updateLead } from '../lib/sponsorService';

/**
 * Modal completo de Lead para Patrocinadores (Design System TechWeek).
 * Suporta dois fluxos:
 * 1. Leitura Nova (isExistingLead = false): pós-leitura de QR Code, salva lead (+50 pts) e gera atalhos.
 * 2. Visualização e Edição de Lead (isExistingLead = true): CRM do estande, exibe dados completos,
 *    permite editar notas e estrelas (0-5), copiar/enviar e-mail e conversar no WhatsApp.
 */
export default function SponsorLeadModal({
  participant,
  sponsorProfile,
  isExistingLead = false,
  onClose,
  onLeadCaptured,
  onLeadUpdated
}) {
  const [rating, setRating] = useState(participant?.rating || 0);
  const [hoverRating, setHoverRating] = useState(0);
  const [notes, setNotes] = useState(participant?.notes || '');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState(null);
  const [savedLeadData, setSavedLeadData] = useState(null);
  const [emailCopied, setEmailCopied] = useState(false);
  const [updateSuccessToast, setUpdateSuccessToast] = useState(false);

  useEffect(() => {
    if (participant) {
      setRating(participant.rating || 0);
      setNotes(participant.notes || '');
      setSavedLeadData(null);
      setErrorMsg(null);
      setEmailCopied(false);
      setUpdateSuccessToast(false);
    }
  }, [participant]);

  if (!participant) return null;

  const sponsorCompanyName = sponsorProfile?.companyName || sponsorProfile?.empresa || sponsorProfile?.displayName || 'Empresa Patrocinadora';
  const sponsorCompanyId = sponsorProfile?.companyId || sponsorProfile?.empresa || sponsorProfile?.companyName;
  const participantUid = participant.participantUid || participant.uid || participant.id;

  const institutionLabel = participant.instituicao || participant.institution || participant.postgradInst || participant.otherInst || participant.participantType || '';

  const handleCopyEmail = async () => {
    if (!participant.email) return;
    try {
      await navigator.clipboard.writeText(participant.email);
      setEmailCopied(true);
      setTimeout(() => setEmailCopied(false), 2500);
    } catch (err) {
      console.warn('Erro ao copiar e-mail:', err);
    }
  };

  const handleSaveOrSubmit = async (e) => {
    e?.preventDefault();
    if (!participantUid) {
      setErrorMsg('Identificador do participante não encontrado.');
      return;
    }

    setIsSubmitting(true);
    setErrorMsg(null);

    try {
      if (isExistingLead) {
        // Atualização de lead existente no CRM
        const response = await updateLead({
          participantUid,
          rating: rating !== undefined ? Number(rating) : 0,
          notes,
          companyId: sponsorCompanyId
        });

        setUpdateSuccessToast(true);
        setTimeout(() => setUpdateSuccessToast(false), 3000);

        if (onLeadUpdated) {
          onLeadUpdated({
            ...participant,
            rating,
            notes
          });
        }
      } else {
        // Cadastro de novo lead pós-leitura de QR
        const response = await submitLead({
          participantUid,
          notes,
          rating: rating > 0 ? rating : undefined,
          companyId: sponsorCompanyId
        });

        const leadInfo = response?.lead || {
          ...participant,
          participantUid,
          notes,
          rating
        };

        setSavedLeadData(leadInfo);
        if (onLeadCaptured) {
          onLeadCaptured(leadInfo);
        }
      }
    } catch (err) {
      console.error('Erro ao salvar lead:', err);
      setErrorMsg(err.message || 'Erro ao processar dados do contato.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const formatLeadDate = (dateVal) => {
    if (!dateVal) return null;
    try {
      if (typeof dateVal?.toDate === 'function') {
        return dateVal.toDate().toLocaleString('pt-BR');
      }
      return new Date(dateVal).toLocaleString('pt-BR');
    } catch {
      return null;
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
          maxWidth: '500px',
          maxHeight: '90vh',
          overflowY: 'auto',
          borderRadius: '24px',
          padding: '24px',
          background: 'linear-gradient(145deg, #121A36, #0A0F24)',
          border: '1px solid #1C2548',
          boxShadow: '0 20px 50px rgba(0, 0, 0, 0.6), 0 0 30px rgba(37, 99, 235, 0.1)',
          fontFamily: 'Montserrat, sans-serif',
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
            background: '#1A2347',
            border: 'none',
            borderRadius: '50%',
            width: '44px',
            height: '44px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#A9B1CC',
            cursor: 'pointer',
            transition: 'all 0.2s ease'
          }}
          aria-label="Fechar modal"
        >
          <X size={20} />
        </button>

        {/* Lead Badge Header */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px', flexWrap: 'wrap' }}>
          <div
            style={{
              padding: '4px 10px',
              borderRadius: '20px',
              background: 'rgba(37, 99, 235, 0.15)',
              border: '1px solid rgba(56, 189, 248, 0.4)',
              color: '#8FA0FF',
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
            <span>{isExistingLead ? 'Detalhes do Candidato' : 'Novo Lead de Estande'}</span>
          </div>

          <div style={{ fontSize: '11px', color: '#A9B1CC', display: 'flex', alignItems: 'center', gap: '4px' }}>
            <Building2 size={12} />
            <span>{sponsorCompanyName}</span>
          </div>
        </div>

        {/* Candidate Profile Box */}
        <div
          style={{
            background: '#1A2347',
            borderRadius: '18px',
            padding: '16px',
            border: '1px solid #1C2548',
            marginBottom: '18px',
            display: 'flex',
            alignItems: 'flex-start',
            gap: '14px'
          }}
        >
          <div
            style={{
              width: '54px',
              height: '54px',
              borderRadius: '16px',
              background: 'linear-gradient(135deg, #2563EB, #7C3AED)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#FFFFFF',
              fontWeight: '800',
              fontSize: '20px',
              flexShrink: 0,
              boxShadow: '0 4px 15px rgba(37, 99, 235, 0.3)'
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
            <h3 style={{ fontSize: '1.15rem', fontWeight: '800', color: '#EEF1FA', marginBottom: '4px', lineHeight: 1.25 }}>
              {participant.name || 'Participante'}
            </h3>

            {participant.course && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', color: '#A9B1CC', marginBottom: '4px' }}>
                <GraduationCap size={14} color="#8FA0FF" />
                <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {participant.course} {participant.period ? `• ${participant.period}º Período` : ''}
                </span>
              </div>
            )}

            {institutionLabel && (
              <div style={{ fontSize: '11px', color: '#8790AE', marginBottom: '4px' }}>
                {institutionLabel}
              </div>
            )}

            {/* Quick Contact Chips */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', marginTop: '6px' }}>
              {participant.phone && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11px', color: '#A9B1CC' }}>
                  <Phone size={12} color="#25D366" />
                  <span>{participant.phone}</span>
                </div>
              )}

              {participant.email && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11px', color: '#A9B1CC' }}>
                  <Mail size={12} color="#8FA0FF" />
                  <span style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>{participant.email}</span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Action Row for Email & WhatsApp in details mode */}
        <div style={{ display: 'grid', gridTemplateColumns: participant.email ? '1fr 1fr' : '1fr', gap: '8px', marginBottom: '18px' }}>
          {participant.email && (
            <div style={{ display: 'flex', gap: '6px' }}>
              <button
                type="button"
                onClick={handleCopyEmail}
                style={{
                  flex: 1,
                  minHeight: '44px',
                  background: emailCopied ? 'rgba(16, 185, 129, 0.2)' : '#1A2347',
                  border: emailCopied ? '1px solid #10B981' : '1px solid #1C2548',
                  borderRadius: '12px',
                  color: emailCopied ? '#34D399' : '#EEF1FA',
                  fontSize: '12px',
                  fontWeight: '700',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '6px',
                  transition: 'all 0.2s ease'
                }}
              >
                {emailCopied ? <CheckCircle2 size={14} /> : <Copy size={14} />}
                <span>{emailCopied ? 'Copiado!' : 'Copiar E-mail'}</span>
              </button>

              <a
                href={`mailto:${participant.email}`}
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  width: '44px',
                  minHeight: '44px',
                  background: '#1A2347',
                  border: '1px solid #1C2548',
                  borderRadius: '12px',
                  color: '#8FA0FF',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  textDecoration: 'none'
                }}
                title="Abrir aplicativo de e-mail"
              >
                <ExternalLink size={16} />
              </a>
            </div>
          )}

          {participant.phone && (
            <WhatsAppButton
              phone={participant.phone}
              participantName={participant.name}
              companyName={sponsorCompanyName}
              label="WhatsApp"
              size="sm"
              fullWidth
            />
          )}
        </div>

        {/* If newly scanned and just submitted, show success state */}
        {!isExistingLead && savedLeadData ? (
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

            <button
              type="button"
              className="btn-primary"
              onClick={onClose}
              style={{
                width: '100%',
                minHeight: '44px',
                padding: '12px',
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
          <form onSubmit={handleSaveOrSubmit}>
            {/* Star Rating Section */}
            <div style={{ marginBottom: '18px' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                <label style={{ fontSize: '12px', fontWeight: '700', color: '#A9B1CC', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  Avaliação do Candidato
                </label>
                <span style={{ fontSize: '12px', fontWeight: '700', color: rating > 0 ? '#FBBF24' : '#8790AE' }}>
                  {rating > 0 ? `${rating} de 5 estrelas` : 'Sem classificação'}
                </span>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                {[1, 2, 3, 4, 5].map((starValue) => {
                  const isFilled = (hoverRating || rating) >= starValue;
                  return (
                    <button
                      key={starValue}
                      type="button"
                      onClick={() => setRating(starValue === rating ? 0 : starValue)}
                      onMouseEnter={() => setHoverRating(starValue)}
                      onMouseLeave={() => setHoverRating(0)}
                      style={{
                        background: 'transparent',
                        border: 'none',
                        cursor: 'pointer',
                        padding: '6px',
                        transition: 'transform 0.15s ease',
                        transform: (hoverRating || rating) >= starValue ? 'scale(1.15)' : 'scale(1)',
                        minWidth: '44px',
                        minHeight: '44px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center'
                      }}
                      aria-label={`${starValue} estrelas`}
                    >
                      <Star
                        size={30}
                        fill={isFilled ? '#FBBF24' : 'none'}
                        color={isFilled ? '#FBBF24' : 'rgba(255, 255, 255, 0.2)'}
                      />
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Recruitment Notes Section */}
            <div style={{ marginBottom: '18px' }}>
              <label
                htmlFor="lead-recruitment-notes"
                style={{ display: 'block', fontSize: '12px', fontWeight: '700', color: '#A9B1CC', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.05em' }}
              >
                Anotações e Observações (Recrutamento)
              </label>

              <textarea
                id="lead-recruitment-notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Ex: Bom conhecimento em React e Node, busca estágio em backend, boa comunicação..."
                rows={4}
                style={{
                  width: '100%',
                  fontFamily: 'Montserrat, sans-serif',
                  background: '#131B3A',
                  border: '1.5px solid #26305A',
                  borderRadius: '14px',
                  padding: '12px 14px',
                  color: '#EEF1FA',
                  fontSize: '13px',
                  resize: 'vertical',
                  outline: 'none',
                  transition: 'border-color 0.2s ease',
                  boxSizing: 'border-box'
                }}
                onFocus={(e) => { e.target.style.borderColor = '#2563EB'; }}
                onBlur={(e) => { e.target.style.borderColor = '#26305A'; }}
              />
            </div>

            {/* Lead Metadata (When view mode) */}
            {isExistingLead && (participant.createdAt || participant.collectedByEmail) && (
              <div style={{ padding: '10px 12px', background: '#0F1424', borderRadius: '12px', border: '1px solid #1C2548', marginBottom: '16px', fontSize: '11px', color: '#8790AE' }}>
                {participant.collectedByEmail && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '3px' }}>
                    <UserCheck size={12} color="#8FA0FF" />
                    <span>Coletado por: <strong>{participant.collectedByEmail}</strong></span>
                  </div>
                )}
                {participant.createdAt && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <Calendar size={12} color="#8FA0FF" />
                    <span>Data: {formatLeadDate(participant.createdAt)}</span>
                  </div>
                )}
              </div>
            )}

            {/* Error Message */}
            {errorMsg && (
              <div
                role="alert"
                style={{
                  background: 'rgba(245, 154, 154, 0.12)',
                  border: '1px solid #F59A9A',
                  borderRadius: '12px',
                  padding: '10px 14px',
                  color: '#F59A9A',
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

            {/* Success Toast for updates */}
            {updateSuccessToast && (
              <div
                role="status"
                style={{
                  background: 'rgba(111, 216, 166, 0.12)',
                  border: '1px solid #6FD8A6',
                  borderRadius: '12px',
                  padding: '10px 14px',
                  color: '#6FD8A6',
                  fontSize: '12px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  marginBottom: '16px'
                }}
              >
                <CheckCircle2 size={16} />
                <span>Alterações salvas com sucesso!</span>
              </div>
            )}

            {/* Submit Action Button */}
            <button
              type="submit"
              disabled={isSubmitting}
              className="btn-primary"
              style={{
                width: '100%',
                minHeight: '44px',
                padding: '14px',
                fontSize: '14px',
                fontWeight: '700',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                cursor: 'pointer'
              }}
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="animate-spin" size={18} />
                  <span>{isExistingLead ? 'Salvando Alterações...' : 'Salvando Lead...'}</span>
                </>
              ) : (
                <>
                  <CheckCircle2 size={18} />
                  <span>{isExistingLead ? 'Salvar Alterações' : 'Salvar Lead (+50 pts)'}</span>
                </>
              )}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
