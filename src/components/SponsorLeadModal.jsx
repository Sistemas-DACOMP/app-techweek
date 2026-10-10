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
 * Higieniza o rótulo de instituição para evitar duplicar informações da afiliação (ex: "Aluno UFU Graduação").
 */
export const getCleanInstitution = (lead, affiliationLabel) => {
  const raw = lead?.instituicao || lead?.institution || lead?.postgradInst || lead?.otherInst || '';
  if (!raw) return null;
  const lowerRaw = raw.toLowerCase().trim();
  const lowerAff = (affiliationLabel || '').toLowerCase();

  if (lowerRaw === lowerAff || lowerRaw === 'graduação' || lowerRaw === 'graduacao' || lowerRaw.includes('aluno ufu graduação')) {
    return null;
  }
  if (lowerRaw.includes('aluno ufu') || lowerRaw.includes('ufu') || lowerRaw.includes('uberlândia') || lowerRaw.includes('uberlandia')) {
    return 'UFU';
  }
  return raw;
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
  onLeadUpdated,
  onValidateOnly
}) {
  const [rating, setRating] = useState(participant?.rating || 0);
  const [hoverRating, setHoverRating] = useState(0);
  const [notes, setNotes] = useState(participant?.notes || '');
  const [notesFocused, setNotesFocused] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isValidatingOnly, setIsValidatingOnly] = useState(false);
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
      setNotesFocused(false);
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

  const affiliation = getAffiliationBadge(participant);
  const cleanInstitution = getCleanInstitution(participant, affiliation?.label);

  const displayRating = hoverRating || rating || 0;
  const currentClassification = RATING_CLASSIFICATIONS[displayRating] || RATING_CLASSIFICATIONS[0];
  const isNotesExpanded = notesFocused || (notes && notes.length > 0);

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
      const extractedTags = Array.from(new Set([
        ...(Array.isArray(participant?.tags) ? participant.tags : []),
        ...((notes || '').match(/\[([^\]]+)\]/g)?.map(m => m.slice(1, -1).trim()).filter(Boolean) || [])
      ]));

      if (isExistingLead) {
        await updateLead({
          participantUid,
          rating: rating !== undefined ? Number(rating) : 0,
          notes,
          tags: extractedTags,
          companyId: sponsorCompanyId
        });

        triggerHaptic(50);
        setUpdateSuccessToast(true);
        setTimeout(() => setUpdateSuccessToast(false), 3000);

        if (onLeadUpdated) {
          onLeadUpdated({
            ...participant,
            rating,
            notes,
            tags: extractedTags
          });
        }
      } else {
        const response = await submitLead({
          participantUid,
          notes,
          rating: rating > 0 ? rating : undefined,
          tags: extractedTags,
          companyId: sponsorCompanyId,
          participantData: participant
        });

        triggerHaptic([60, 40, 60]);

        const leadInfo = {
          ...participant,
          ...(response?.lead || {}),
          participantUid,
          notes,
          rating,
          tags: extractedTags
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

  const handleValidateOnly = async () => {
    if (!participantUid) {
      setErrorMsg('Identificador do participante não encontrado.');
      return;
    }

    setIsValidatingOnly(true);
    setErrorMsg(null);

    try {
      await submitLead({
        participantUid,
        notes: '',
        rating: undefined,
        companyId: sponsorCompanyId,
        validateOnly: true
      });

      triggerHaptic(40);
      if (onValidateOnly) {
        onValidateOnly(participant);
      }
      onClose();
    } catch (err) {
      console.error('Erro ao validar presença do participante:', err);
      setErrorMsg(err.message || 'Erro ao validar presença.');
    } finally {
      setIsValidatingOnly(false);
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
        if (e.target === e.currentTarget && !isSubmitting && !isValidatingOnly) onClose();
      }}
    >
      <div
        className="glass-panel"
        style={{
          width: '100%',
          maxWidth: '480px',
          maxHeight: '90vh',
          borderRadius: '24px',
          background: 'linear-gradient(145deg, #121A36, #0A0F24)',
          border: '1px solid #1C2548',
          boxShadow: '0 20px 50px rgba(0, 0, 0, 0.6), 0 0 30px rgba(37, 99, 235, 0.1)',
          fontFamily: 'Montserrat, sans-serif',
          position: 'relative',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden'
        }}
      >
        {/* ========================================================================= */}
        {/* 1. HEADER COMPACTO (Fixo no topo com Close Button)                        */}
        {/* ========================================================================= */}
        <div
          style={{
            flexShrink: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '10px',
            padding: '16px 20px 12px',
            borderBottom: '1px solid rgba(28, 37, 72, 0.6)'
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              flex: 1,
              minWidth: 0
            }}
          >
            {/* Badge de contexto */}
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
                letterSpacing: '0.06em',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '5px',
                flexShrink: 0
              }}
            >
              <Sparkles size={12} />
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
                gap: '4px',
                background: '#1A2347',
                padding: '3px 8px',
                borderRadius: '10px',
                border: '1px solid #1C2548',
                maxWidth: '180px',
                overflow: 'hidden'
              }}
              title={sponsorCompanyName}
            >
              <Building2 size={12} color="#8FA0FF" style={{ flexShrink: 0 }} />
              <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {sponsorCompanyName}
              </span>
            </div>
          </div>

          {/* Botão de Fechar com touch target de 44px */}
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting || isValidatingOnly}
            style={{
              background: '#1A2347',
              border: '1px solid #1C2548',
              borderRadius: '50%',
              width: '44px',
              height: '44px',
              minWidth: '44px',
              minHeight: '44px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#A9B1CC',
              cursor: 'pointer',
              transition: 'all 0.15s ease',
              flexShrink: 0
            }}
            aria-label="Fechar modal"
          >
            <X size={18} />
          </button>
        </div>

        {/* ========================================================================= */}
        {/* TELA DE SUCESSO PÓS-SALVAR COM ATALHOS PROEMINENTES DE CONTATO            */}
        {/* ========================================================================= */}
        {!isExistingLead && savedLeadData ? (
          <div style={{ flex: 1, overflowY: 'auto', padding: '24px 20px', textAlign: 'center', animation: 'fadeIn 0.25s ease-in' }}>
            <div
              style={{
                width: '56px',
                height: '56px',
                borderRadius: '50%',
                background: 'rgba(37, 211, 102, 0.15)',
                border: '1px solid #25D366',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#25D366',
                margin: '0 auto 12px'
              }}
            >
              <CheckCircle2 size={32} />
            </div>

            <h4 style={{ fontSize: '1.15rem', fontWeight: '800', color: '#ffffff', marginBottom: '4px' }}>
              Lead Registrado com Sucesso!
            </h4>
            <p style={{ fontSize: '13px', color: '#a7f3d0', marginBottom: '16px' }}>
              Lead salvo com sucesso no estande {sponsorCompanyName}.
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
                minHeight: '46px',
                padding: '12px',
                borderRadius: '16px',
                fontSize: '14px',
                fontWeight: '700',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                cursor: 'pointer'
              }}
            >
              <QrCode size={18} />
              <span>Bipar Próximo Aluno</span>
            </button>
          </div>
        ) : (
          /* ========================================================================= */
          /* FORMULÁRIO DE QUALIFICAÇÃO (CORPO ROLÁVEL + STICKY FOOTER)                */
          /* ========================================================================= */
          <form
            onSubmit={handleSaveOrSubmit}
            style={{
              display: 'flex',
              flexDirection: 'column',
              flex: 1,
              minHeight: 0
            }}
          >
            {/* CORPO ROLÁVEL SUAVE */}
            <div
              style={{
                flex: 1,
                overflowY: 'auto',
                padding: '16px 20px',
                overscrollBehavior: 'contain'
              }}
            >
              {/* ===================================================================== */}
              {/* 2. CARD COMPACTO DO CANDIDATO                                         */}
              {/* ===================================================================== */}
              <div
                style={{
                  background: '#1A2347',
                  borderRadius: '16px',
                  padding: '12px 14px',
                  border: '1px solid #1C2548',
                  marginBottom: '14px',
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: '12px'
                }}
              >
                {/* Avatar com iniciais ou imagem */}
                <div
                  style={{
                    width: '44px',
                    height: '44px',
                    borderRadius: '14px',
                    background: 'linear-gradient(135deg, #2563EB, #7C3AED)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#FFFFFF',
                    fontWeight: '800',
                    fontSize: '18px',
                    flexShrink: 0,
                    boxShadow: '0 4px 12px rgba(37, 99, 235, 0.25)'
                  }}
                >
                  {participant.avatarUrl ? (
                    <img
                      src={participant.avatarUrl}
                      alt=""
                      style={{ width: '100%', height: '100%', borderRadius: '14px', objectFit: 'cover' }}
                    />
                  ) : (
                    (participant.name || 'P').charAt(0).toUpperCase()
                  )}
                </div>

                <div style={{ flex: 1, minWidth: 0 }}>
                  {/* Linha 1: Nome e Afiliação */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap', marginBottom: '2px' }}>
                    <h3 style={{ fontSize: '1.05rem', fontWeight: '800', color: '#EEF1FA', margin: 0, lineHeight: 1.25 }}>
                      {participant.name || 'Participante'}
                    </h3>

                    {affiliation && (
                      <span
                        style={{
                          padding: '2px 7px',
                          borderRadius: '7px',
                          fontSize: '10px',
                          fontWeight: '800',
                          textTransform: 'uppercase',
                          letterSpacing: '0.04em',
                          color: affiliation.color,
                          background: affiliation.bg,
                          border: `1px solid ${affiliation.border}`
                        }}
                      >
                        {affiliation.label}
                      </span>
                    )}
                  </div>

                  {/* Linha 2: Curso e Período (sem truncamento com ellipsis rígido) */}
                  {participant.course && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '12px', color: '#A9B1CC', lineHeight: 1.35, marginTop: '2px', flexWrap: 'wrap' }}>
                      <GraduationCap size={13} color="#8FA0FF" style={{ flexShrink: 0 }} />
                      <span>
                        {participant.course}
                        {participant.period ? ` · ${participant.period}º Período` : ''}
                        {cleanInstitution ? ` · ${cleanInstitution}` : ''}
                      </span>
                    </div>
                  )}

                  {/* Linha 3: Dados de Contato em Linha Compacta */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap', marginTop: '6px', fontSize: '11px', color: '#A9B1CC' }}>
                    {participant.email && (
                      <div style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                        <Mail size={12} color="#8FA0FF" style={{ flexShrink: 0 }} />
                        <span style={{ maxWidth: '170px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {participant.email}
                        </span>
                      </div>
                    )}

                    {participant.phone && (
                      <div style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                        <Phone size={12} color="#25D366" style={{ flexShrink: 0 }} />
                        <span>{participant.phone}</span>
                      </div>
                    )}

                    {participant.github && (
                      <div style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                        <GitHubIcon size={12} color="#8FA0FF" style={{ flexShrink: 0 }} />
                        <a
                          href={`https://github.com/${participant.github.replace(/^@/, '').trim()}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          style={{ color: '#8FA0FF', textDecoration: 'none' }}
                        >
                          @{participant.github.replace(/^@/, '').trim()}
                        </a>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* MODO CRM DETALHES (isExistingLead = true): Botões de contato proeminentes */}
              {isExistingLead && (
                <div style={{ display: 'grid', gridTemplateColumns: participant.email ? '1fr 1fr' : '1fr', gap: '8px', marginBottom: '14px' }}>
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

              {/* ===================================================================== */}
              {/* 3. AVALIAÇÃO DO CANDIDATO (ESTRELAS 0 A 5)                            */}
              {/* ===================================================================== */}
              <div style={{ marginBottom: '14px' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px', gap: '8px' }}>
                  <label style={{ fontSize: '11px', fontWeight: '700', color: '#A9B1CC', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    Avaliação
                  </label>

                  {/* Rótulo dinâmico de classificação semântica com badge legível, de alto contraste e sem quebras */}
                  <span
                    style={{
                      fontSize: '11.5px',
                      fontWeight: '700',
                      color: currentClassification.color,
                      background: currentClassification.bg,
                      border: `1px solid ${currentClassification.border}`,
                      padding: '3px 10px',
                      borderRadius: '8px',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '5px',
                      whiteSpace: 'nowrap',
                      transition: 'all 0.15s ease',
                      boxShadow: displayRating > 0 ? `0 0 10px ${currentClassification.bg}` : 'none'
                    }}
                  >
                    {displayRating > 0 && <Star size={11} fill={currentClassification.color} color={currentClassification.color} />}
                    <span>
                      {displayRating > 0 ? `${displayRating} ★ — ` : ''}{currentClassification.label}
                    </span>
                  </span>
                </div>

                {/* Estrelas com touch target ergonômico (minWidth: 44px, minHeight: 44px), visual limpo e sem caixas escuras pesadas */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '4px' }}>
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
                            ? 'rgba(251, 191, 36, 0.10)'
                            : 'rgba(255, 255, 255, 0.02)',
                          border: isFilled
                            ? '1px solid rgba(251, 191, 36, 0.35)'
                            : '1px solid rgba(255, 255, 255, 0.05)',
                          borderRadius: '10px',
                          cursor: 'pointer',
                          padding: '4px',
                          flex: 1,
                          minWidth: '44px',
                          minHeight: '44px',
                          height: '44px',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          transition: 'all 0.15s ease',
                          transform: isFilled ? 'scale(1.06)' : 'scale(1)',
                          boxShadow: isFilled
                            ? '0 0 10px rgba(251, 191, 36, 0.22)'
                            : 'none',
                          WebkitTapHighlightColor: 'transparent'
                        }}
                        aria-label={`${starValue} estrelas - ${RATING_CLASSIFICATIONS[starValue].label}`}
                      >
                        <Star
                          size={24}
                          fill={isFilled ? '#FBBF24' : 'none'}
                          color={isFilled ? '#FBBF24' : 'rgba(255, 255, 255, 0.28)'}
                          strokeWidth={1.5}
                          style={{
                            filter: isFilled ? 'drop-shadow(0 0 6px rgba(251, 191, 36, 0.45))' : 'none',
                            transition: 'all 0.15s ease'
                          }}
                        />
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* ===================================================================== */}
              {/* 4. CHIPS RÁPIDOS DE 1 TOQUE (Compactos e sem símbolo +)               */}
              {/* ===================================================================== */}
              <div style={{ marginBottom: '14px' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
                  <label style={{ fontSize: '11px', fontWeight: '700', color: '#A9B1CC', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    Chips Rápidos (1 Toque)
                  </label>
                </div>

                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
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
                          minHeight: '32px',
                          height: '32px',
                          padding: '4px 10px',
                          borderRadius: '10px',
                          fontFamily: 'Montserrat, sans-serif',
                          fontSize: '11px',
                          fontWeight: '600',
                          cursor: 'pointer',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '5px',
                          transition: 'all 0.15s ease',
                          background: isSelected
                            ? 'rgba(37, 99, 235, 0.25)'
                            : '#1A2347',
                          border: isSelected
                            ? '1px solid #2563EB'
                            : '1px solid #1C2548',
                          color: isSelected ? '#EEF1FA' : '#A9B1CC',
                          boxShadow: isSelected
                            ? '0 0 8px rgba(37, 99, 235, 0.35)'
                            : 'none'
                        }}
                      >
                        {isSelected && (
                          <span style={{ fontSize: '11px', fontWeight: '800', color: '#8FA0FF' }}>
                            ✓
                          </span>
                        )}
                        <span>{tag}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* ===================================================================== */}
              {/* 5. ANOTAÇÃO AUTO-EXPANSÍVEL                                           */}
              {/* ===================================================================== */}
              <div style={{ marginBottom: '8px' }}>
                <label
                  htmlFor="lead-recruitment-notes"
                  style={{ display: 'block', fontSize: '11px', fontWeight: '700', color: '#A9B1CC', marginBottom: '4px', textTransform: 'uppercase', letterSpacing: '0.05em' }}
                >
                  Anotações e Observações (Recrutamento)
                </label>

                <textarea
                  id="lead-recruitment-notes"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Adicionar anotação... (opcional)"
                  rows={isNotesExpanded ? 3 : 1}
                  style={{
                    width: '100%',
                    fontFamily: 'Montserrat, sans-serif',
                    background: '#131B3A',
                    border: '1.5px solid #26305A',
                    borderRadius: '12px',
                    padding: '8px 12px',
                    color: '#EEF1FA',
                    fontSize: '12px',
                    minHeight: isNotesExpanded ? '72px' : '38px',
                    height: isNotesExpanded ? '72px' : '38px',
                    resize: 'none',
                    outline: 'none',
                    transition: 'all 0.2s ease',
                    boxSizing: 'border-box'
                  }}
                  onFocus={(e) => {
                    setNotesFocused(true);
                    e.target.style.borderColor = '#2563EB';
                  }}
                  onBlur={(e) => {
                    setNotesFocused(false);
                    e.target.style.borderColor = '#26305A';
                  }}
                />
              </div>

              {/* Metadados do Lead (quando visualizando no CRM) */}
              {isExistingLead && (participant.createdAt || participant.collectedByEmail) && (
                <div style={{ padding: '8px 10px', background: '#0F1424', borderRadius: '10px', border: '1px solid #1C2548', marginBottom: '10px', fontSize: '11px', color: '#8790AE' }}>
                  {participant.collectedByEmail && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '2px' }}>
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
                    borderRadius: '10px',
                    padding: '8px 12px',
                    color: '#F59A9A',
                    fontSize: '12px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    marginBottom: '10px'
                  }}
                >
                  <AlertCircle size={15} />
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
                    borderRadius: '10px',
                    padding: '8px 12px',
                    color: '#6FD8A6',
                    fontSize: '12px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    marginBottom: '10px'
                  }}
                >
                  <CheckCircle2 size={15} />
                  <span>Alterações salvas com sucesso!</span>
                </div>
              )}
            </div>

            {/* ========================================================================= */}
            {/* 6. RODAPÉ DE AÇÕES FIXO (Sticky Footer Lado a Lado)                       */}
            {/* ========================================================================= */}
            <div
              style={{
                flexShrink: 0,
                padding: '12px 20px 16px',
                borderTop: '1px solid rgba(28, 37, 72, 0.6)',
                background: 'rgba(10, 15, 36, 0.95)',
                backdropFilter: 'blur(8px)'
              }}
            >
              {!isExistingLead ? (
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.35fr', gap: '8px', alignItems: 'center' }}>
                  {/* Botão Secundário: Somente Validar Presença */}
                  <button
                    type="button"
                    disabled={isSubmitting || isValidatingOnly}
                    onClick={handleValidateOnly}
                    style={{
                      height: '46px',
                      minHeight: '46px',
                      padding: '0 12px',
                      borderRadius: '16px',
                      border: '1px solid #1C2548',
                      background: '#1A2347',
                      fontSize: '13px',
                      fontWeight: '700',
                      fontFamily: 'Montserrat, sans-serif',
                      color: '#EEF1FA',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '6px',
                      cursor: isSubmitting || isValidatingOnly ? 'not-allowed' : 'pointer',
                      opacity: isSubmitting || isValidatingOnly ? 0.7 : 1,
                      transition: 'all 0.15s ease',
                      whiteSpace: 'nowrap'
                    }}
                  >
                    {isValidatingOnly ? (
                      <>
                        <Loader2 className="animate-spin" size={15} />
                        <span>Validando...</span>
                      </>
                    ) : (
                      <>
                        <UserCheck size={16} color="#8FA0FF" />
                        <span>Somente Validar</span>
                      </>
                    )}
                  </button>

                  {/* Botão Primário com degradê */}
                  <button
                    type="submit"
                    disabled={isSubmitting || isValidatingOnly}
                    className="btn-primary"
                    style={{
                      height: '46px',
                      minHeight: '46px',
                      padding: '0 16px',
                      borderRadius: '16px',
                      border: 'none',
                      fontSize: '14px',
                      fontWeight: '800',
                      fontFamily: 'Montserrat, sans-serif',
                      color: '#FFFFFF',
                      background: 'linear-gradient(135deg, #2563EB 0%, #5B3BE0 55%, #7C3AED 100%)',
                      boxShadow: '0 6px 20px rgba(37, 99, 235, 0.35)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '6px',
                      cursor: isSubmitting || isValidatingOnly ? 'not-allowed' : 'pointer',
                      opacity: isSubmitting || isValidatingOnly ? 0.7 : 1,
                      transition: 'all 0.15s ease',
                      whiteSpace: 'nowrap'
                    }}
                  >
                    {isSubmitting ? (
                      <>
                        <Loader2 className="animate-spin" size={15} />
                        <span>Salvando Lead...</span>
                      </>
                    ) : (
                      <>
                        <CheckCircle2 size={16} />
                        <span>Salvar Lead</span>
                      </>
                    )}
                  </button>
                </div>
              ) : (
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="btn-primary"
                  style={{
                    width: '100%',
                    height: '46px',
                    minHeight: '46px',
                    padding: '0 16px',
                    borderRadius: '16px',
                    border: 'none',
                    fontSize: '14px',
                    fontWeight: '800',
                    fontFamily: 'Montserrat, sans-serif',
                    color: '#FFFFFF',
                    background: 'linear-gradient(135deg, #2563EB 0%, #5B3BE0 55%, #7C3AED 100%)',
                    boxShadow: '0 6px 20px rgba(37, 99, 235, 0.35)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '6px',
                    cursor: isSubmitting ? 'not-allowed' : 'pointer',
                    opacity: isSubmitting ? 0.7 : 1,
                    transition: 'all 0.15s ease'
                  }}
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="animate-spin" size={15} />
                      <span>Salvando Alterações...</span>
                    </>
                  ) : (
                    <>
                      <CheckCircle2 size={16} />
                      <span>Salvar Alterações</span>
                    </>
                  )}
                </button>
              )}
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
