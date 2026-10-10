import { useState, useEffect, useCallback } from 'react';
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
import { GitHubIcon } from './ParticipantCard';
import WhatsAppButton from './WhatsAppButton';
import { submitLead, updateLead } from '../lib/sponsorService';

/**
 * Tags práticas de recrutamento para estande de tech (Chips Rápidos de 1 toque).
 */
export const QUICK_RECRUITMENT_TAGS = [
  'Estágio',
  'Júnior',
  'Frontend',
  'Backend',
  'Mobile',
  'Dados / IA',
  'Design / UI',
  'Destaque'
];

/**
 * Classificação semântica dinâmica conforme a quantidade de estrelas (0 a 5).
 */
export const RATING_CLASSIFICATIONS = {
  0: { label: 'Sem classificação', color: '#8790AE', bg: 'rgba(135, 144, 174, 0.12)', border: 'rgba(135, 144, 174, 0.25)' },
  1: { label: 'Contato Geral', color: '#A9B1CC', bg: 'rgba(169, 177, 204, 0.12)', border: 'rgba(169, 177, 204, 0.25)' },
  2: { label: 'Interesse Básico', color: '#67D4E8', bg: 'rgba(103, 212, 232, 0.12)', border: 'rgba(103, 212, 232, 0.3)' },
  3: { label: 'Bom Perfil', color: '#8FA0FF', bg: 'rgba(143, 160, 255, 0.12)', border: 'rgba(143, 160, 255, 0.3)' },
  4: { label: 'Muito Bom / Fit Técnico', color: '#C084FC', bg: 'rgba(192, 132, 252, 0.14)', border: 'rgba(192, 132, 252, 0.35)' },
  5: { label: 'Destaque Máximo', color: '#FBBF24', bg: 'rgba(251, 191, 36, 0.15)', border: 'rgba(251, 191, 36, 0.4)' }
};

/**
 * Dispara vibração sensorial suave se a API for suportada pelo dispositivo móvel.
 */
export const triggerHaptic = (pattern = 30) => {
  if (typeof navigator !== 'undefined' && typeof navigator.vibrate === 'function') {
    try {
      navigator.vibrate(pattern);
    } catch (_) {}
  }
};

/**
 * Classificação rápida de afiliação acadêmica (Graduação / Pós-Graduação / Externo).
 */
export const getAffiliationBadge = (lead) => {
  const type = (lead?.participantType || '').toLowerCase();
  const inst = (lead?.instituicao || lead?.institution || '').toLowerCase();
  const course = (lead?.course || '').toLowerCase();

  if (type.includes('pós') || type.includes('pos') || type.includes('mestrado') || type.includes('doutorado') || lead?.postgradInst) {
    return {
      label: 'Pós-Graduação',
      color: '#C084FC',
      bg: 'rgba(192, 132, 252, 0.12)',
      border: 'rgba(192, 132, 252, 0.3)'
    };
  }

  if (type.includes('graduação') || type.includes('graduacao') || type.includes('aluno ufu') || inst.includes('ufu') || course.length > 0) {
    return {
      label: 'Graduação',
      color: '#8FA0FF',
      bg: 'rgba(56, 189, 248, 0.12)',
      border: 'rgba(56, 189, 248, 0.3)'
    };
  }

  return {
    label: 'Externo',
    color: '#34D399',
    bg: 'rgba(52, 211, 153, 0.12)',
    border: 'rgba(52, 211, 153, 0.3)'
  };
};

/**
 * Modal completo de Lead para Patrocinadores (Design System TechWeek).
 * 
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

  const isTagSelected = useCallback((tag) => {
    if (!notes) return false;
    if (notes.includes(`[${tag}]`)) return true;
    const escaped = tag.replace(/[/.*+?^${}()|[\]\\]/g, '\\$&');
    const re = new RegExp(`(^|[^a-zA-Z0-9À-ÿ])${escaped}([^a-zA-Z0-9À-ÿ]|$)`, 'i');
    return re.test(notes);
  }, [notes]);

  const handleToggleTag = useCallback((tag) => {
    const bracketTag = `[${tag}]`;
    const selected = isTagSelected(tag);

    if (selected) {
      let updated = notes.replace(bracketTag, '');
      if (updated === notes) {
        const escaped = tag.replace(/[/.*+?^${}()|[\]\\]/g, '\\$&');
        const re = new RegExp(`(^|\\s|•|,)${escaped}($|\\s|•|,)`, 'gi');
        updated = notes.replace(re, ' ');
      }
      setNotes(updated.replace(/\s{2,}/g, ' ').trim());
    } else {
      if (!notes.trim()) {
        setNotes(bracketTag);
      } else {
        const leadingTagsMatch = notes.match(/^(\[[^\]]+\]\s*)+/);
        if (leadingTagsMatch) {
          const leadingTags = leadingTagsMatch[0].trim();
          const rest = notes.slice(leadingTags.length).trim();
          setNotes(`${leadingTags} ${bracketTag}${rest ? ` ${rest}` : ''}`);
        } else {
          setNotes(`${bracketTag} ${notes.trim()}`);
        }
      }
    }
  }, [notes, isTagSelected]);

  if (!participant) return null;

  const sponsorCompanyName = sponsorProfile?.companyName || sponsorProfile?.empresa || sponsorProfile?.displayName || 'Empresa Patrocinadora';
  const sponsorCompanyId = sponsorProfile?.companyId || sponsorProfile?.empresa || sponsorProfile?.companyName;
  const participantUid = participant.participantUid || participant.uid || participant.id;

  const institutionLabel = participant.instituicao || participant.institution || participant.postgradInst || participant.otherInst || participant.participantType || '';
  const affiliation = getAffiliationBadge(participant);

  const displayRating = hoverRating || rating || 0;
  const currentClassification = RATING_CLASSIFICATIONS[displayRating] || RATING_CLASSIFICATIONS[0];

  const handleCopyEmail = async () => {
    const targetEmail = savedLeadData?.email || participant.email;
    if (!targetEmail) return;
    try {
      await navigator.clipboard.writeText(targetEmail);
      setEmailCopied(true);
      triggerHaptic(20);
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
        await updateLead({
          participantUid,
          rating: rating !== undefined ? Number(rating) : 0,
          notes,
          companyId: sponsorCompanyId
        });

        triggerHaptic(50);
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

        triggerHaptic([60, 40, 60]);

        const leadInfo = {
          ...participant,
          ...(response?.lead || {}),
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
          maxHeight: '92vh',
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
        {/* ========================================================================= */}
        {/* 1. HEADER LIMPO E SEM CORTES (Flexbox integrado com Close Button)        */}
        {/* ========================================================================= */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '12px',
            marginBottom: '16px',
            paddingBottom: '2px'
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              flexWrap: 'wrap',
              flex: 1,
              minWidth: 0
            }}
          >
            {/* Badge de contexto */}
            <div
              style={{
                padding: '5px 12px',
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
                gap: '6px',
                flexShrink: 0
              }}
            >
              <Sparkles size={13} />
              <span>{isExistingLead ? 'Detalhes do Candidato' : 'Novo Lead de Estande'}</span>
            </div>

            {/* Nome da Empresa em pill dedicada para evitar corte */}
            <div
              style={{
                fontSize: '11px',
                fontWeight: '700',
                color: '#A9B1CC',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '5px',
                background: '#1A2347',
                padding: '4px 10px',
                borderRadius: '12px',
                border: '1px solid #1C2548',
                maxWidth: '100%',
                overflow: 'hidden'
              }}
              title={sponsorCompanyName}
            >
              <Building2 size={13} color="#8FA0FF" style={{ flexShrink: 0 }} />
              <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {sponsorCompanyName}
              </span>
            </div>
          </div>

          {/* Botão de Fechar alinhado no fluxo sem sobreposição */}
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            style={{
              background: '#1A2347',
              border: '1px solid #1C2548',
              borderRadius: '50%',
              width: '44px',
              height: '44px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#A9B1CC',
              cursor: 'pointer',
              transition: 'all 0.2s ease',
              flexShrink: 0
            }}
            aria-label="Fechar modal"
          >
            <X size={20} />
          </button>
        </div>

        {/* ========================================================================= */}
        {/* CANDIDATE PROFILE BOX                                                     */}
        {/* ========================================================================= */}
        <div
          style={{
            background: '#1A2347',
            borderRadius: '18px',
            padding: '16px',
            border: '1px solid #1C2548',
            marginBottom: isExistingLead ? '16px' : '12px',
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
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap', marginBottom: '4px' }}>
              <h3 style={{ fontSize: '1.15rem', fontWeight: '800', color: '#EEF1FA', margin: 0, lineHeight: 1.25 }}>
                {participant.name || 'Participante'}
              </h3>

              {affiliation && (
                <span
                  style={{
                    padding: '2px 8px',
                    borderRadius: '8px',
                    fontSize: '10px',
                    fontWeight: '800',
                    textTransform: 'uppercase',
                    letterSpacing: '0.05em',
                    color: affiliation.color,
                    background: affiliation.bg,
                    border: `1px solid ${affiliation.border}`
                  }}
                >
                  {affiliation.label}
                </span>
              )}
            </div>

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

              {participant.github && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11px', color: '#A9B1CC' }}>
                  <GitHubIcon size={12} color="#8FA0FF" />
                  <a
                    href={`https://github.com/${participant.github.replace(/^@/, '').trim()}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{ color: '#8FA0FF', textDecoration: 'none', overflow: 'hidden', textOverflow: 'ellipsis' }}
                  >
                    @{participant.github.replace(/^@/, '').trim()}
                  </a>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* ========================================================================= */}
        {/* 3. REORGANIZAÇÃO DOS BOTÕES DE CONTATO (E-mail / WhatsApp)                */}
        {/* ========================================================================= */}
        {/* Modo CRM Detalhes (isExistingLead = true): Botões completos em destaque  */}
        {isExistingLead && (
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
        )}

        {/* Modo Bipagem Imediata (isExistingLead = false): Barra discreta e compacta  */}
        {/* Poupa espaço vertical para manter o botão salvar visível sem scroll        */}
        {!isExistingLead && !savedLeadData && (participant.email || participant.phone) && (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              marginBottom: '14px',
              flexWrap: 'wrap'
            }}
          >
            {participant.phone && (
              <WhatsAppButton
                phone={participant.phone}
                participantName={participant.name}
                companyName={sponsorCompanyName}
                label="WhatsApp"
                size="sm"
                style={{
                  minHeight: '34px',
                  padding: '6px 12px',
                  fontSize: '11px',
                  borderRadius: '10px'
                }}
              />
            )}

            {participant.email && (
              <div style={{ display: 'inline-flex', gap: '4px' }}>
                <button
                  type="button"
                  onClick={handleCopyEmail}
                  style={{
                    minHeight: '34px',
                    padding: '6px 12px',
                    background: emailCopied ? 'rgba(16, 185, 129, 0.2)' : '#1A2347',
                    border: emailCopied ? '1px solid #10B981' : '1px solid #1C2548',
                    borderRadius: '10px',
                    color: emailCopied ? '#34D399' : '#A9B1CC',
                    fontSize: '11px',
                    fontWeight: '600',
                    cursor: 'pointer',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '5px',
                    transition: 'all 0.2s ease'
                  }}
                >
                  {emailCopied ? <CheckCircle2 size={13} /> : <Copy size={13} />}
                  <span>{emailCopied ? 'Copiado!' : 'Copiar E-mail'}</span>
                </button>

                <a
                  href={`mailto:${participant.email}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{
                    width: '34px',
                    height: '34px',
                    minHeight: '34px',
                    background: '#1A2347',
                    border: '1px solid #1C2548',
                    borderRadius: '10px',
                    color: '#8FA0FF',
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    textDecoration: 'none'
                  }}
                  title="Abrir aplicativo de e-mail"
                >
                  <ExternalLink size={14} />
                </a>
              </div>
            )}
          </div>
        )}

        {/* ========================================================================= */}
        {/* TELA DE SUCESSO PÓS-SALVAR COM ATALHOS PROEMINENTES DE CONTATO            */}
        {/* ========================================================================= */}
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
                margin: '0 auto 14px'
              }}
            >
              <CheckCircle2 size={36} />
            </div>

            <h4 style={{ fontSize: '1.2rem', fontWeight: '800', color: '#ffffff', marginBottom: '6px' }}>
              Lead Registrado com Sucesso!
            </h4>
            <p style={{ fontSize: '13px', color: '#a7f3d0', marginBottom: '16px' }}>
              🎉 +50 pontos foram creditados no crachá do participante no estande {sponsorCompanyName}.
            </p>

            {/* Ações de contato pós-salvamento imediato */}
            {(savedLeadData.phone || savedLeadData.email) && (
              <div
                style={{
                  background: '#1A2347',
                  borderRadius: '16px',
                  padding: '14px',
                  border: '1px solid #1C2548',
                  marginBottom: '18px',
                  textAlign: 'left'
                }}
              >
                <div style={{ fontSize: '11px', fontWeight: '700', color: '#A9B1CC', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '10px' }}>
                  Iniciar Contato com o Candidato
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: (savedLeadData.phone && savedLeadData.email) ? '1fr 1fr' : '1fr', gap: '8px' }}>
                  {savedLeadData.phone && (
                    <WhatsAppButton
                      phone={savedLeadData.phone}
                      participantName={savedLeadData.name}
                      companyName={sponsorCompanyName}
                      label="WhatsApp"
                      size="sm"
                      fullWidth
                    />
                  )}
                  {savedLeadData.email && (
                    <button
                      type="button"
                      onClick={handleCopyEmail}
                      style={{
                        minHeight: '44px',
                        background: emailCopied ? 'rgba(16, 185, 129, 0.2)' : '#121A36',
                        border: emailCopied ? '1px solid #10B981' : '1px solid #1C2548',
                        borderRadius: '12px',
                        color: emailCopied ? '#34D399' : '#EEF1FA',
                        fontSize: '12px',
                        fontWeight: '700',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '6px'
                      }}
                    >
                      {emailCopied ? <CheckCircle2 size={14} /> : <Copy size={14} />}
                      <span>{emailCopied ? 'E-mail Copiado!' : 'Copiar E-mail'}</span>
                    </button>
                  )}
                </div>
              </div>
            )}

            <button
              type="button"
              className="btn-primary"
              onClick={onClose}
              style={{
                width: '100%',
                minHeight: '48px',
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
          /* ========================================================================= */
          /* FORMULÁRIO DE QUALIFICAÇÃO (ESTRELAS, CHIPS E NOTAS)                      */
          /* ========================================================================= */
          <form onSubmit={handleSaveOrSubmit}>
            {/* ===================================================================== */}
            {/* 4. VISIBILIDADE E CLASSIFICAÇÃO DINÂMICA DAS ESTRELAS (0 a 5 ★)       */}
            {/* ===================================================================== */}
            <div style={{ marginBottom: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px', flexWrap: 'wrap', gap: '6px' }}>
                <label style={{ fontSize: '11px', fontWeight: '700', color: '#A9B1CC', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  Avaliação do Candidato
                </label>

                {/* Rótulo dinâmico de classificação semântica com badge estilizada */}
                <span
                  style={{
                    fontSize: '11px',
                    fontWeight: '700',
                    color: currentClassification.color,
                    background: currentClassification.bg,
                    border: `1px solid ${currentClassification.border}`,
                    padding: '3px 10px',
                    borderRadius: '12px',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '5px',
                    transition: 'all 0.15s ease'
                  }}
                >
                  {displayRating > 0 && <Star size={11} fill={currentClassification.color} color={currentClassification.color} />}
                  <span>
                    {displayRating > 0 ? `${displayRating} ★ — ` : ''}{currentClassification.label}
                  </span>
                </span>
              </div>

              {/* Botões das Estrelas com alto contraste para vazias e touch target >= 44px */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                {[1, 2, 3, 4, 5].map((starValue) => {
                  const isFilled = displayRating >= starValue;
                  return (
                    <button
                      key={starValue}
                      type="button"
                      onClick={() => {
                        const nextVal = starValue === rating ? 0 : starValue;
                        setRating(nextVal);
                        triggerHaptic(30);
                      }}
                      onMouseEnter={() => setHoverRating(starValue)}
                      onMouseLeave={() => setHoverRating(0)}
                      style={{
                        background: isFilled
                          ? 'rgba(251, 191, 36, 0.12)'
                          : 'rgba(255, 255, 255, 0.04)',
                        border: isFilled
                          ? '1px solid rgba(251, 191, 36, 0.4)'
                          : '1px solid rgba(255, 255, 255, 0.12)',
                        borderRadius: '12px',
                        cursor: 'pointer',
                        padding: '6px',
                        transition: 'all 0.15s ease',
                        transform: isFilled ? 'scale(1.08)' : 'scale(1)',
                        minWidth: '44px',
                        minHeight: '44px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        boxShadow: isFilled
                          ? '0 0 12px rgba(251, 191, 36, 0.25)'
                          : 'none'
                      }}
                      aria-label={`${starValue} estrelas - ${RATING_CLASSIFICATIONS[starValue].label}`}
                    >
                      <Star
                        size={28}
                        fill={isFilled ? '#FBBF24' : 'none'}
                        color={isFilled ? '#FBBF24' : 'rgba(255, 255, 255, 0.38)'}
                        strokeWidth={isFilled ? 1.5 : 1.8}
                        style={{
                          filter: isFilled ? 'drop-shadow(0 0 6px rgba(251, 191, 36, 0.5))' : 'none',
                          transition: 'all 0.15s ease'
                        }}
                      />
                    </button>
                  );
                })}
              </div>
            </div>

            {/* ===================================================================== */}
            {/* 2. CHIPS RÁPIDOS DE 1 TOQUE (Quick Recruitment Tags)                  */}
            {/* ===================================================================== */}
            <div style={{ marginBottom: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                <label style={{ fontSize: '11px', fontWeight: '700', color: '#A9B1CC', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  Chips Rápidos (1 Toque)
                </label>
                <span style={{ fontSize: '11px', color: '#8790AE' }}>
                  Toque para qualificar
                </span>
              </div>

              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                {QUICK_RECRUITMENT_TAGS.map((tag) => {
                  const isSelected = isTagSelected(tag);
                  return (
                    <button
                      key={tag}
                      type="button"
                      onClick={() => {
                        handleToggleTag(tag);
                        triggerHaptic(25);
                      }}
                      style={{
                        minHeight: '36px',
                        padding: '6px 12px',
                        borderRadius: '10px',
                        fontFamily: 'Montserrat, sans-serif',
                        fontSize: '12px',
                        fontWeight: '600',
                        cursor: 'pointer',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '6px',
                        transition: 'all 0.15s ease',
                        background: isSelected
                          ? 'rgba(37, 99, 235, 0.25)'
                          : '#1A2347',
                        border: isSelected
                          ? '1px solid #2563EB'
                          : '1px solid #1C2548',
                        color: isSelected ? '#EEF1FA' : '#A9B1CC',
                        boxShadow: isSelected
                          ? '0 0 10px rgba(37, 99, 235, 0.35)'
                          : 'none'
                      }}
                    >
                      <span style={{ fontSize: '11px', fontWeight: '800', color: isSelected ? '#8FA0FF' : '#6E779A' }}>
                        {isSelected ? '✓' : '+'}
                      </span>
                      <span>{tag}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* ===================================================================== */}
            {/* ANOTAÇÕES E OBSERVAÇÕES                                               */}
            {/* ===================================================================== */}
            <div style={{ marginBottom: '16px' }}>
              <label
                htmlFor="lead-recruitment-notes"
                style={{ display: 'block', fontSize: '11px', fontWeight: '700', color: '#A9B1CC', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.05em' }}
              >
                Anotações e Observações (Recrutamento)
              </label>

              <textarea
                id="lead-recruitment-notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Ex: Bom conhecimento em React e Node, busca estágio em backend, boa comunicação..."
                rows={3}
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

            {/* Metadados do Lead (quando visualizando no CRM) */}
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

            {/* Mensagem de Erro */}
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

            {/* Toast de Sucesso para Atualizações no CRM */}
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

            {/* ===================================================================== */}
            {/* 5. CLAREZA DE GAMIFICAÇÃO NO BOTÃO SALVAR                              */}
            {/* ===================================================================== */}
            <button
              type="submit"
              disabled={isSubmitting}
              className="btn-primary"
              style={{
                width: '100%',
                minHeight: '46px',
                padding: '12px 16px',
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

            {/* Micro-legenda de benefício de gamificação */}
            {!isExistingLead && (
              <p
                style={{
                  marginTop: '8px',
                  marginBottom: '2px',
                  fontSize: '11px',
                  color: '#A9B1CC',
                  textAlign: 'center',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '4px',
                  lineHeight: 1.4
                }}
              >
                <span>🎉 Concede +50 pontos no passaporte do aluno no estande {sponsorCompanyName}</span>
              </p>
            )}
          </form>
        )}
      </div>
    </div>
  );
}
