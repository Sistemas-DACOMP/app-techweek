import { useState, useEffect, useCallback, useMemo } from 'react';
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
  UserCheck,
  Pencil
} from 'lucide-react';
import { GitHubIcon, LinkedInIcon, InstagramIcon, formatSocialUrl } from './ParticipantCard';
import WhatsAppButton from './WhatsAppButton';
import { submitLead, updateLead } from '../lib/sponsorService';
import { getSponsorSettings, getActiveOutreachMessage } from '../lib/sponsorSettingsService';

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
 * Formata o período acadêmico de forma consistente, evitando repetições como "6º Períodoº Período".
 */
export const formatPeriod = (period) => {
  if (!period && period !== 0) return null;
  const pStr = String(period).trim();
  if (!pStr) return null;
  if (pStr.toLowerCase().includes('período') || pStr.toLowerCase().includes('periodo')) {
    return pStr;
  }
  return `${pStr}º Período`;
};

/**
 * Modal completo de Lead para Patrocinadores (Design System TechWeek).
 * 
 * Suporta dois fluxos principais:
 * 1. Leitura Nova (isExistingLead = false): pós-leitura de QR Code, inicia em modo cadastro para qualificar e salvar.
 * 2. Lead Existente no CRM (isExistingLead = true):
 *    - Modo Leitura / Ficha Estratégica de CRM (padrão): Exibe o perfil qualificado, nota sem formulário,
 *      ações estratégicas de contato (WhatsApp com mensagem personalizada de recrutador, e-mail, redes),
 *      tags em chips estáticos, anotações em bloco executivo e botão "Editar Avaliação e Notas".
 *    - Modo Edição (ao clicar em 'Editar Avaliação e Notas'): Abre as estrelas interativas,
 *      chips rápidos e campo de notas, com ações "Cancelar" e "Salvar Alterações".
 */
export default function SponsorLeadModal({
  participant,
  sponsorProfile,
  isExistingLead = false,
  customTags,
  customOutreachMessage,
  onClose,
  onLeadCaptured,
  onLeadUpdated,
  onValidateOnly
}) {
  const [isEditing, setIsEditing] = useState(!isExistingLead);
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
  const [avatarBroken, setAvatarBroken] = useState(false);

  useEffect(() => {
    if (participant) {
      setRating(participant.rating || 0);
      setNotes(participant.notes || '');
      setIsEditing(!isExistingLead);
      setSavedLeadData(null);
      setErrorMsg(null);
      setEmailCopied(false);
      setUpdateSuccessToast(false);
      setNotesFocused(false);
      setAvatarBroken(false);
    }
  }, [participant, isExistingLead]);

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

  const sponsorCompanyName = sponsorProfile?.companyName || sponsorProfile?.empresa || sponsorProfile?.displayName || 'Empresa Patrocinadora';
  const sponsorCompanyId = sponsorProfile?.companyId || sponsorProfile?.empresa || sponsorProfile?.companyName;

  // Tags dinâmicas configuradas pelo patrocinador (com fallback nas 8 tags padrão)
  const effectiveTags = useMemo(() => {
    if (Array.isArray(customTags) && customTags.length > 0) {
      return customTags;
    }
    if (sponsorCompanyId) {
      try {
        const s = getSponsorSettings(sponsorCompanyId);
        if (Array.isArray(s?.tags) && s.tags.length > 0) {
          return s.tags;
        }
      } catch (_) {}
    }
    return QUICK_RECRUITMENT_TAGS;
  }, [customTags, sponsorCompanyId]);

  // Mensagem personalizada de recrutador para WhatsApp (com suporte ao template ativo do estande)
  const recruiterOutreachMessage = useMemo(() => {
    if (customOutreachMessage) return customOutreachMessage;
    if (sponsorCompanyId) {
      try {
        return getActiveOutreachMessage(sponsorCompanyId, {
          name: participant?.name,
          companyName: sponsorCompanyName,
          course: participant?.course,
        });
      } catch (_) {}
    }
    return `Olá, ${participant?.name || 'tudo bem'}! Foi ótimo conversar com você no estande da ${sponsorCompanyName} na TechWeek! Gostaríamos de marcar uma conversa rápida sobre nossas oportunidades. Qual o seu melhor horário?`;
  }, [customOutreachMessage, sponsorCompanyId, participant?.name, participant?.course, sponsorCompanyName]);

  // Título amigável do modelo de WhatsApp padrão configurado
  const activeTemplateTitle = useMemo(() => {
    try {
      const settings = getSponsorSettings(sponsorCompanyId);
      const activeId = settings?.activeTemplateId || 'recruiter_outreach';
      const active = (settings?.templates || []).find((t) => t.id === activeId);
      return active?.title || 'Abordagem Geral';
    } catch (_) {
      return 'Abordagem Geral';
    }
  }, [sponsorCompanyId]);

  if (!participant) return null;

  const participantUid = participant.participantUid || participant.uid || participant.id;

  const affiliation = getAffiliationBadge(participant);
  const cleanInstitution = getCleanInstitution(participant, affiliation?.label);

  const displayRating = hoverRating || rating || 0;
  const currentClassification = RATING_CLASSIFICATIONS[displayRating] || RATING_CLASSIFICATIONS[0];
  const isNotesExpanded = notesFocused || (notes && notes.length > 0);

  // Lista consolidada de tags ativas para exibição de CRM
  const activeTags = Array.from(new Set([
    ...(Array.isArray(participant?.tags) ? participant.tags : []),
    ...((notes || '').match(/\[([^\]]+)\]/g)?.map(m => m.slice(1, -1).trim()).filter(Boolean) || [])
  ]));

  // Anotações em texto limpo (removendo tags com colchetes para visualização executiva)
  const cleanNotes = (notes || '').replace(/\[([^\]]+)\]/g, '').trim();

  // Avatar e handle normalizados
  const effectiveAvatar = !avatarBroken ? (participant.avatarUrl || participant.photoURL || null) : null;
  const cleanHandle = participant.username ? `@${String(participant.username).replace(/^@/, '').trim()}` : null;

  // URLs de redes sociais
  const githubUrl = participant.github ? formatSocialUrl('github', participant.github) : null;
  const linkedinUrl = participant.linkedin ? formatSocialUrl('linkedin', participant.linkedin) : null;
  const instagramUrl = participant.instagram ? formatSocialUrl('instagram', participant.instagram) : null;

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

  const handleCancelEdit = () => {
    setRating(participant.rating || 0);
    setNotes(participant.notes || '');
    setErrorMsg(null);
    setIsEditing(false);
    triggerHaptic(15);
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
        setIsEditing(false);
        setTimeout(() => setUpdateSuccessToast(false), 3500);

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

  // Título e badge contextual do cabeçalho
  const headerTitle = !isExistingLead
    ? 'Novo Lead'
    : isEditing
      ? 'Editar Avaliação'
      : 'Ficha do Candidato';

  const headerBadgeLabel = !isExistingLead ? 'ESTANDE' : 'CRM';

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
        padding: 'max(14px, env(safe-area-inset-top, 0px)) 14px max(14px, env(safe-area-inset-bottom, 0px))',
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
        {/* 1. HEADER MODAL (Fixo no topo, hierarquia limpa e sem aperto)            */}
        {/* ========================================================================= */}
        <div
          style={{
            flexShrink: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '12px',
            padding: '14px 18px',
            borderBottom: '1px solid rgba(28, 37, 72, 0.6)',
            background: 'rgba(10, 15, 36, 0.6)'
          }}
        >
          {/* Informações de Título e Empresa (Hierarquia Vertical Desafogada) */}
          <div
            style={{
              flex: 1,
              minWidth: 0,
              display: 'flex',
              flexDirection: 'column',
              gap: '3px'
            }}
          >
            {/* Linha 1: Título e Badge Semântico */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Sparkles size={14} color="#8FA0FF" style={{ flexShrink: 0 }} />
              <h2
                style={{
                  fontSize: '15px',
                  fontWeight: '800',
                  color: '#EEF1FA',
                  margin: 0,
                  lineHeight: 1.2,
                  letterSpacing: '-0.01em',
                  whiteSpace: 'nowrap'
                }}
              >
                {headerTitle}
              </h2>
              <span
                style={{
                  padding: '2px 7px',
                  borderRadius: '6px',
                  background: 'rgba(37, 99, 235, 0.18)',
                  border: '1px solid rgba(56, 189, 248, 0.35)',
                  color: '#8FA0FF',
                  fontSize: '10px',
                  fontWeight: '800',
                  letterSpacing: '0.04em',
                  lineHeight: 1,
                  flexShrink: 0
                }}
              >
                {headerBadgeLabel}
              </span>
            </div>

            {/* Linha 2: Empresa Patrocinadora (Subtítulo com ícone e respiro total) */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '5px',
                fontSize: '12px',
                color: '#A9B1CC',
                fontWeight: '600',
                minWidth: 0
              }}
              title={sponsorCompanyName}
            >
              <Building2 size={12} color="#8FA0FF" style={{ flexShrink: 0 }} />
              <span
                style={{
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap'
                }}
              >
                {sponsorCompanyName}
              </span>
            </div>
          </div>

          {/* Botão de Fechar com Touch Target Confortável (44px) */}
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
        {/* TELA DE SUCESSO PÓS-SALVAR (CAPTURAS NOVAS) COM ATALHOS DE CONTATO        */}
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
                    <div>
                      <WhatsAppButton
                        phone={savedLeadData.phone}
                        participantName={savedLeadData.name}
                        companyName={sponsorCompanyName}
                        customMessage={recruiterOutreachMessage}
                        label="WhatsApp"
                        size="sm"
                        fullWidth
                      />
                      <div style={{ fontSize: '10px', color: '#10B981', marginTop: '4px', textAlign: 'center', fontWeight: '600' }}>
                        Padrão: {activeTemplateTitle}
                      </div>
                    </div>
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
              <span>Escanear Próximo Aluno</span>
            </button>
          </div>
        ) : isExistingLead && !isEditing ? (
          /* ========================================================================= */
          /* MODO 1: FICHA ESTRATÉGICA DE CRM (LEITURA LIMPA & ABORDAGEM DE OUTREACH)   */
          /* ========================================================================= */
          <div
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
              {/* Toast de Sucesso para Atualizações no CRM */}
              {updateSuccessToast && (
                <div
                  role="status"
                  style={{
                    background: 'rgba(111, 216, 166, 0.15)',
                    border: '1px solid #6FD8A6',
                    borderRadius: '12px',
                    padding: '10px 14px',
                    color: '#6FD8A6',
                    fontSize: '12px',
                    fontWeight: '700',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    marginBottom: '14px',
                    animation: 'fadeIn 0.2s ease-out'
                  }}
                >
                  <CheckCircle2 size={16} />
                  <span>Alterações salvas com sucesso no CRM!</span>
                </div>
              )}

              {/* CARD DE IDENTIDADE DO CANDIDATO (DOSSIÊ) */}
              <div
                style={{
                  background: '#1A2347',
                  borderRadius: '16px',
                  padding: '14px',
                  border: '1px solid #1C2548',
                  marginBottom: '14px',
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: '12px'
                }}
              >
                {/* Avatar com foto ou iniciais em gradiente */}
                <div
                  style={{
                    width: '50px',
                    height: '50px',
                    borderRadius: '14px',
                    background: 'linear-gradient(135deg, #2563EB, #7C3AED)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#FFFFFF',
                    fontWeight: '800',
                    fontSize: '18px',
                    flexShrink: 0,
                    boxShadow: '0 4px 14px rgba(37, 99, 235, 0.3)',
                    overflow: 'hidden'
                  }}
                >
                  {effectiveAvatar ? (
                    <img
                      src={effectiveAvatar}
                      alt={participant.name || 'Participante'}
                      onError={() => setAvatarBroken(true)}
                      style={{ width: '100%', height: '100%', borderRadius: '14px', objectFit: 'cover' }}
                    />
                  ) : (
                    (participant.name || 'P').charAt(0).toUpperCase()
                  )}
                </div>

                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap', marginBottom: '2px' }}>
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

                  {cleanHandle && (
                    <div style={{ fontSize: '11.5px', fontWeight: '600', color: '#8FA0FF', marginBottom: '3px' }}>
                      {cleanHandle}
                    </div>
                  )}

                  {participant.course && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12.5px', color: '#A9B1CC', lineHeight: 1.35, marginTop: '2px', flexWrap: 'wrap' }}>
                      <GraduationCap size={14} color="#8FA0FF" style={{ flexShrink: 0 }} />
                      <span>
                        {participant.course}
                        {participant.period ? ` · ${formatPeriod(participant.period)}` : ''}
                        {cleanInstitution ? ` · ${cleanInstitution}` : ''}
                      </span>
                    </div>
                  )}
                </div>
              </div>

              {/* CARD DE AVALIAÇÃO DE TALENTO (ESTÁTICO & EXECUTIVO) */}
              <div
                style={{
                  background: '#1A2347',
                  borderRadius: '16px',
                  padding: '12px 14px',
                  border: '1px solid #1C2548',
                  marginBottom: '14px'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px', gap: '8px' }}>
                  <span style={{ fontSize: '10.5px', fontWeight: '800', color: '#8FA0FF', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                    Avaliação no Estande
                  </span>

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
                      boxShadow: rating > 0 ? `0 0 10px ${currentClassification.bg}` : 'none'
                    }}
                  >
                    {rating > 0 && <Star size={11} fill={currentClassification.color} color={currentClassification.color} />}
                    <span>{rating > 0 ? `${Number(rating).toFixed(1)} ★ — ` : ''}{currentClassification.label}</span>
                  </span>
                </div>

                {/* 5 Estrelas Estáticas Douradas */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  {[1, 2, 3, 4, 5].map((starValue) => {
                    const isFilled = rating >= starValue;
                    return (
                      <div
                        key={starValue}
                        style={{
                          width: '32px',
                          height: '32px',
                          borderRadius: '8px',
                          background: isFilled ? 'rgba(251, 191, 36, 0.12)' : 'rgba(255, 255, 255, 0.03)',
                          border: isFilled ? '1px solid rgba(251, 191, 36, 0.35)' : '1px solid rgba(255, 255, 255, 0.06)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          boxShadow: isFilled ? '0 0 8px rgba(251, 191, 36, 0.2)' : 'none'
                        }}
                      >
                        <Star
                          size={18}
                          fill={isFilled ? '#FBBF24' : 'none'}
                          color={isFilled ? '#FBBF24' : 'rgba(255, 255, 255, 0.25)'}
                          strokeWidth={1.5}
                          style={{
                            filter: isFilled ? 'drop-shadow(0 0 4px rgba(251, 191, 36, 0.5))' : 'none'
                          }}
                        />
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* AÇÕES ESTRATÉGICAS DE CONTATO & OUTREACH (HERO SECTION) */}
              <div style={{ marginBottom: '14px' }}>
                <div style={{ fontSize: '10.5px', fontWeight: '800', color: '#A9B1CC', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '8px' }}>
                  Contato Estratégico · Outreach
                </div>

                {/* Botão de Destaque WhatsApp com mensagem de recrutador */}
                {participant.phone && (
                  <div style={{ marginBottom: '10px' }}>
                    <WhatsAppButton
                      phone={participant.phone}
                      participantName={participant.name}
                      companyName={sponsorCompanyName}
                      customMessage={recruiterOutreachMessage}
                      label="WhatsApp"
                      size="md"
                      fullWidth
                    />
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', fontSize: '11px', color: '#A9B1CC', marginTop: '6px' }}>
                      <span style={{ color: '#10B981', fontWeight: '700', display: 'flex', alignItems: 'center', gap: '3px' }}>
                        Modelo Padrão:
                      </span>
                      <span style={{ color: '#EEF1FA', background: 'rgba(16, 185, 129, 0.12)', border: '1px solid rgba(16, 185, 129, 0.3)', padding: '1px 8px', borderRadius: '6px', fontWeight: '600', fontSize: '10.5px' }}>
                        {activeTemplateTitle}
                      </span>
                    </div>
                  </div>
                )}

                {/* Ações de E-mail: Exibição Elegante + Copiar e Abrir */}
                {participant.email && (
                  <div
                    style={{
                      background: '#1A2347',
                      border: '1px solid #1C2548',
                      borderRadius: '14px',
                      padding: '10px 12px',
                      marginBottom: '8px'
                    }}
                  >
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px',
                        fontSize: '12px',
                        color: '#A9B1CC',
                        marginBottom: '8px',
                        wordBreak: 'break-all'
                      }}
                    >
                      <Mail size={13} color="#8FA0FF" style={{ flexShrink: 0 }} />
                      <span style={{ fontWeight: '600' }}>{participant.email}</span>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                      <button
                        type="button"
                        onClick={handleCopyEmail}
                        style={{
                          minHeight: '44px',
                          background: emailCopied ? 'rgba(16, 185, 129, 0.2)' : '#121A36',
                          border: emailCopied ? '1px solid #10B981' : '1px solid #1C2548',
                          borderRadius: '10px',
                          color: emailCopied ? '#34D399' : '#EEF1FA',
                          fontSize: '12px',
                          fontWeight: '700',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: '6px',
                          transition: 'all 0.2s ease',
                          padding: '0 8px'
                        }}
                      >
                        {emailCopied ? <CheckCircle2 size={14} /> : <Copy size={14} />}
                        <span>{emailCopied ? 'E-mail Copiado!' : 'Copiar E-mail'}</span>
                      </button>

                      <a
                        href={`mailto:${participant.email}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{
                          minHeight: '44px',
                          background: '#121A36',
                          border: '1px solid #1C2548',
                          borderRadius: '10px',
                          color: '#8FA0FF',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: '6px',
                          fontSize: '12px',
                          fontWeight: '700',
                          textDecoration: 'none',
                          padding: '0 8px'
                        }}
                        title="Abrir aplicativo de e-mail"
                      >
                        <ExternalLink size={13} />
                        <span>Abrir E-mail</span>
                      </a>
                    </div>
                  </div>
                )}

                {/* Links Profissionais & Redes Sociais (GitHub, LinkedIn, Instagram) */}
                {(githubUrl || linkedinUrl || instagramUrl) && (
                  <div
                    style={{
                      display: 'grid',
                      gridTemplateColumns: `repeat(${[githubUrl, linkedinUrl, instagramUrl].filter(Boolean).length}, minmax(0, 1fr))`,
                      gap: '8px'
                    }}
                  >
                    {githubUrl && (
                      <a
                        href={githubUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        title={participant.github ? `GitHub: @${participant.github.replace(/^@/, '').trim()}` : 'Ver GitHub'}
                        style={{
                          minHeight: '44px',
                          background: '#1A2347',
                          border: '1px solid #1C2548',
                          borderRadius: '10px',
                          color: '#8FA0FF',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: '6px',
                          fontSize: '12px',
                          fontWeight: '700',
                          textDecoration: 'none',
                          padding: '8px 10px'
                        }}
                      >
                        <GitHubIcon size={14} color="#8FA0FF" />
                        <span>GitHub</span>
                        <ExternalLink size={11} />
                      </a>
                    )}

                    {linkedinUrl && (
                      <a
                        href={linkedinUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        title="Ver Perfil no LinkedIn"
                        style={{
                          minHeight: '44px',
                          background: '#1A2347',
                          border: '1px solid #1C2548',
                          borderRadius: '10px',
                          color: '#60A5FA',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: '6px',
                          fontSize: '12px',
                          fontWeight: '700',
                          textDecoration: 'none',
                          padding: '8px 10px'
                        }}
                      >
                        <LinkedInIcon size={14} color="#60A5FA" />
                        <span>LinkedIn</span>
                        <ExternalLink size={11} />
                      </a>
                    )}

                    {instagramUrl && (
                      <a
                        href={instagramUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        title={participant.instagram ? `Instagram: @${participant.instagram.replace(/^@/, '').trim()}` : 'Ver Instagram'}
                        style={{
                          minHeight: '44px',
                          background: '#1A2347',
                          border: '1px solid #1C2548',
                          borderRadius: '10px',
                          color: '#F472B6',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: '6px',
                          fontSize: '12px',
                          fontWeight: '700',
                          textDecoration: 'none',
                          padding: '8px 10px'
                        }}
                      >
                        <InstagramIcon size={14} color="#F472B6" />
                        <span>Instagram</span>
                        <ExternalLink size={11} />
                      </a>
                    )}
                  </div>
                )}
              </div>

              {/* COMPETÊNCIAS & TAGS (CHIPS ESTÁTICOS) */}
              {activeTags.length > 0 && (
                <div style={{ marginBottom: '14px' }}>
                  <div style={{ fontSize: '10.5px', fontWeight: '800', color: '#A9B1CC', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '8px' }}>
                    Competências & Tags
                  </div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                    {activeTags.map((tag) => (
                      <span
                        key={tag}
                        style={{
                          background: 'rgba(37, 99, 235, 0.15)',
                          border: '1px solid rgba(56, 189, 248, 0.35)',
                          color: '#8FA0FF',
                          padding: '4px 10px',
                          borderRadius: '8px',
                          fontSize: '11px',
                          fontWeight: '700',
                          letterSpacing: '0.02em',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '4px'
                        }}
                      >
                        <span>{tag}</span>
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* ANOTAÇÕES DO ESTANDE (BLOCO EDITORIAL / EXECUTIVO) */}
              <div style={{ marginBottom: '14px' }}>
                <div style={{ fontSize: '10.5px', fontWeight: '800', color: '#A9B1CC', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '8px' }}>
                  Anotações & Observações da Equipe
                </div>

                <div
                  style={{
                    background: '#131B3A',
                    borderRadius: '14px',
                    padding: '12px 14px',
                    border: '1px solid #1C2548'
                  }}
                >
                  {cleanNotes ? (
                    <p style={{ fontSize: '12.5px', color: '#EEF1FA', lineHeight: 1.5, margin: 0 }}>
                      {cleanNotes}
                    </p>
                  ) : (
                    <p style={{ fontSize: '12px', color: '#8790AE', fontStyle: 'italic', margin: 0 }}>
                      Nenhuma observação textual registrada durante a conversa no estande.
                    </p>
                  )}
                </div>
              </div>

              {/* METADADOS E AUDITORIA */}
              {(participant.createdAt || participant.collectedByEmail) && (
                <div style={{ padding: '8px 12px', background: '#0F1424', borderRadius: '10px', border: '1px solid #1C2548', marginBottom: '10px', fontSize: '11px', color: '#8790AE' }}>
                  {participant.collectedByEmail && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '2px' }}>
                      <UserCheck size={12} color="#8FA0FF" />
                      <span>Coletado por: <strong>{participant.collectedByEmail}</strong></span>
                    </div>
                  )}
                  {participant.createdAt && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <Calendar size={12} color="#8FA0FF" />
                      <span>Data de registro: {formatLeadDate(participant.createdAt)}</span>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* STICKY FOOTER DO MODO CRM (FECHAR + EDITAR AVALIAÇÃO) */}
            <div
              style={{
                flexShrink: 0,
                padding: '12px 20px 16px',
                borderTop: '1px solid rgba(28, 37, 72, 0.6)',
                background: 'rgba(10, 15, 36, 0.95)',
                backdropFilter: 'blur(8px)',
                display: 'grid',
                gridTemplateColumns: '1fr 1.25fr',
                gap: '10px',
                alignItems: 'center'
              }}
            >
              {/* Botão Secundário Fechar */}
              <button
                type="button"
                onClick={onClose}
                style={{
                  height: '46px',
                  minHeight: '46px',
                  borderRadius: '16px',
                  border: '1px solid #1C2548',
                  background: '#1A2347',
                  color: '#A9B1CC',
                  fontSize: '13px',
                  fontWeight: '700',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  transition: 'all 0.15s ease'
                }}
              >
                Fechar
              </button>

              {/* Botão Ação Editar Avaliação */}
              <button
                type="button"
                onClick={() => {
                  setIsEditing(true);
                  triggerHaptic(20);
                }}
                style={{
                  height: '46px',
                  minHeight: '46px',
                  borderRadius: '16px',
                  border: '1px solid rgba(56, 189, 248, 0.4)',
                  background: 'rgba(37, 99, 235, 0.15)',
                  color: '#8FA0FF',
                  fontSize: '13px',
                  fontWeight: '800',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '7px',
                  transition: 'all 0.15s ease',
                  boxShadow: '0 4px 14px rgba(37, 99, 235, 0.15)'
                }}
              >
                <Pencil size={15} />
                <span>Editar Avaliação</span>
              </button>
            </div>
          </div>
        ) : (
          /* ========================================================================= */
          /* MODO 2: FORMULÁRIO DE EDIÇÃO / CADASTRO DE LEAD (INTERATIVO)             */
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
              {/* CARD COMPLETO DO PARTICIPANTE ESCANEADO */}
              <div
                style={{
                  background: '#1A2347',
                  borderRadius: '16px',
                  padding: '14px',
                  border: '1px solid #1C2548',
                  marginBottom: '14px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '10px'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
                  {/* Avatar com iniciais ou foto */}
                  <div
                    style={{
                      width: '52px',
                      height: '52px',
                      borderRadius: '14px',
                      background: 'linear-gradient(135deg, #2563EB, #7C3AED)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: '#FFFFFF',
                      fontWeight: '800',
                      fontSize: '19px',
                      flexShrink: 0,
                      boxShadow: '0 4px 12px rgba(37, 99, 235, 0.25)',
                      overflow: 'hidden'
                    }}
                  >
                    {effectiveAvatar ? (
                      <img
                        src={effectiveAvatar}
                        alt={participant.name || 'Participante'}
                        onError={() => setAvatarBroken(true)}
                        style={{ width: '100%', height: '100%', borderRadius: '14px', objectFit: 'cover' }}
                      />
                    ) : (
                      (participant.name || 'P').charAt(0).toUpperCase()
                    )}
                  </div>

                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap', marginBottom: '2px' }}>
                      <h3 style={{ fontSize: '1.08rem', fontWeight: '800', color: '#EEF1FA', margin: 0, lineHeight: 1.25 }}>
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

                    {cleanHandle && (
                      <div style={{ fontSize: '11.5px', fontWeight: '600', color: '#8FA0FF', marginBottom: '2px' }}>
                        {cleanHandle}
                      </div>
                    )}

                    {participant.course && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '5px', fontSize: '12px', color: '#A9B1CC', lineHeight: 1.35, marginTop: '2px', flexWrap: 'wrap' }}>
                        <GraduationCap size={13} color="#8FA0FF" style={{ flexShrink: 0 }} />
                        <span>
                          {participant.course}
                          {participant.period ? ` · ${formatPeriod(participant.period)}` : ''}
                          {cleanInstitution ? ` · ${cleanInstitution}` : ''}
                        </span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Dados de Contato e Redes Sociais do Participante */}
                {(participant.email || participant.phone || githubUrl || linkedinUrl || instagramUrl) && (
                  <div
                    style={{
                      borderTop: '1px solid rgba(255, 255, 255, 0.06)',
                      paddingTop: '10px',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '8px'
                    }}
                  >
                    {(participant.email || participant.phone) && (
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px 14px', fontSize: '11.5px', color: '#A9B1CC' }}>
                        {participant.email && (
                          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', minWidth: 0 }}>
                            <Mail size={12} color="#8FA0FF" style={{ flexShrink: 0 }} />
                            <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                              {participant.email}
                            </span>
                          </div>
                        )}
                        {participant.phone && (
                          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', flexShrink: 0 }}>
                            <Phone size={12} color="#34D399" style={{ flexShrink: 0 }} />
                            <span>{participant.phone}</span>
                          </div>
                        )}
                      </div>
                    )}

                    {(githubUrl || linkedinUrl || instagramUrl) && (
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                        {linkedinUrl && (
                          <a
                            href={linkedinUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '5px',
                              padding: '4px 9px',
                              borderRadius: '8px',
                              background: 'rgba(59, 130, 246, 0.12)',
                              border: '1px solid rgba(59, 130, 246, 0.28)',
                              color: '#60A5FA',
                              fontSize: '11px',
                              fontWeight: '700',
                              textDecoration: 'none'
                            }}
                          >
                            <LinkedInIcon size={12} color="#60A5FA" />
                            <span>LinkedIn</span>
                            <ExternalLink size={10} />
                          </a>
                        )}
                        {githubUrl && (
                          <a
                            href={githubUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '5px',
                              padding: '4px 9px',
                              borderRadius: '8px',
                              background: 'rgba(143, 160, 255, 0.12)',
                              border: '1px solid rgba(143, 160, 255, 0.28)',
                              color: '#8FA0FF',
                              fontSize: '11px',
                              fontWeight: '700',
                              textDecoration: 'none'
                            }}
                          >
                            <GitHubIcon size={12} color="#8FA0FF" />
                            <span>GitHub</span>
                            <ExternalLink size={10} />
                          </a>
                        )}
                        {instagramUrl && (
                          <a
                            href={instagramUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '5px',
                              padding: '4px 9px',
                              borderRadius: '8px',
                              background: 'rgba(244, 114, 182, 0.12)',
                              border: '1px solid rgba(244, 114, 182, 0.28)',
                              color: '#F472B6',
                              fontSize: '11px',
                              fontWeight: '700',
                              textDecoration: 'none'
                            }}
                          >
                            <InstagramIcon size={12} color="#F472B6" />
                            <span>Instagram</span>
                            <ExternalLink size={10} />
                          </a>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* AVALIAÇÃO DO CANDIDATO (ESTRELAS INTERATIVAS 0 A 5) */}
              <div style={{ marginBottom: '14px' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px', gap: '8px' }}>
                  <label style={{ fontSize: '11px', fontWeight: '700', color: '#A9B1CC', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    Avaliação
                  </label>

                  <button
                    type="button"
                    onClick={() => {
                      if (rating > 0 || hoverRating > 0) {
                        setRating(0);
                        setHoverRating(0);
                        triggerHaptic(20);
                      }
                    }}
                    title={rating > 0 ? 'Clique para remover a avaliação' : undefined}
                    style={{
                      fontSize: '11.5px',
                      fontWeight: '700',
                      fontFamily: 'Montserrat, sans-serif',
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
                      cursor: rating > 0 ? 'pointer' : 'default',
                      boxShadow: displayRating > 0 ? `0 0 10px ${currentClassification.bg}` : 'none'
                    }}
                  >
                    {displayRating > 0 && <Star size={11} fill={currentClassification.color} color={currentClassification.color} />}
                    <span>
                      {displayRating > 0 ? `${displayRating} ★ — ` : ''}{currentClassification.label}
                    </span>
                    {rating > 0 && (
                      <X size={11} color={currentClassification.color} style={{ marginLeft: '2px', opacity: 0.85 }} />
                    )}
                  </button>
                </div>

                {/* Estrelas interativas com touch target de 44px */}
                <div
                  style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '4px' }}
                  onPointerLeave={() => setHoverRating(0)}
                >
                  {[1, 2, 3, 4, 5].map((starValue) => {
                    const isFilled = displayRating >= starValue;
                    const isCurrentRating = Number(rating) === starValue;
                    return (
                      <button
                        key={starValue}
                        type="button"
                        aria-pressed={isCurrentRating}
                        onClick={() => {
                          const nextVal = isCurrentRating ? 0 : starValue;
                          setRating(nextVal);
                          setHoverRating(0);
                          triggerHaptic(30);
                        }}
                        onPointerEnter={(e) => {
                          if (e.pointerType === 'mouse') {
                            setHoverRating(starValue);
                          }
                        }}
                        onPointerLeave={() => setHoverRating(0)}
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
                        aria-label={
                          isCurrentRating
                            ? `Remover avaliação de ${starValue} estrelas`
                            : `${starValue} estrelas - ${RATING_CLASSIFICATIONS[starValue].label}`
                        }
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

              {/* CHIPS RÁPIDOS DE 1 TOQUE (8 TAGS TÉCNICAS) */}
              <div style={{ marginBottom: '14px' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '6px' }}>
                  <label style={{ fontSize: '11px', fontWeight: '700', color: '#A9B1CC', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    Chips Rápidos (1 Toque)
                  </label>
                </div>

                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                  {effectiveTags.map((tag) => {
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

              {/* ANOTAÇÃO AUTO-EXPANSÍVEL */}
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
            </div>

            {/* STICKY FOOTER DE AÇÕES */}
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
                  {/* Somente Validar Presença */}
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

                  {/* Salvar Lead */}
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
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.35fr', gap: '8px', alignItems: 'center' }}>
                  {/* Cancelar Edição */}
                  <button
                    type="button"
                    disabled={isSubmitting}
                    onClick={handleCancelEdit}
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
                      color: '#A9B1CC',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      cursor: isSubmitting ? 'not-allowed' : 'pointer',
                      transition: 'all 0.15s ease'
                    }}
                  >
                    Cancelar
                  </button>

                  {/* Salvar Alterações */}
                  <button
                    type="submit"
                    disabled={isSubmitting}
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
                      cursor: isSubmitting ? 'not-allowed' : 'pointer',
                      opacity: isSubmitting ? 0.7 : 1,
                      transition: 'all 0.15s ease',
                      whiteSpace: 'nowrap'
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
                </div>
              )}
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
