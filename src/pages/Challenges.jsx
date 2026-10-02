import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate, useLocation } from 'react-router-dom';
import { useUser } from '../hooks/useUser';
import { CheckCircle, MapPin, Camera, Users, MessageCircle, X, Search, Lock, ArrowLeft, Loader2, Trash2, QrCode, Sparkles, Zap, HelpCircle } from 'lucide-react';
import { getMyProfile, uploadMissionPhoto } from '../lib/gameplay';
import { onAuthChange } from '../lib/auth';
import { getUserProfile, getCachedUserProfile } from '../lib/userService';
import { validateMissionPhoto } from '../lib/validators';
import { 
  subscribeToMissions, 
  DEFAULT_MISSIONS, 
  validateSecretWord, 
  validateQuizAnswer, 
  isFlashMissionActive 
} from '../lib/missionService';
import FeedbackModal from '../components/FeedbackModal';
import SymplaRequirementModal from '../components/SymplaRequirementModal';
import SymplaStickyBanner from '../components/SymplaStickyBanner';
import PassportTab from '../components/PassportTab';
import { useScrollLock } from '../hooks/useScrollLock';

export default function Challenges() {
  const { completedChallenges, completeChallenge, hasCompletedChallenge, hasSymplaTicket } = useUser();
  const navigate = useNavigate();
  const location = useLocation();
  const [activeTab, setActiveTab] = useState(() => {
    try {
      const searchParams = new URLSearchParams(window?.location?.search || '');
      return searchParams.get('tab') === 'passport' ? 'passport' : 'missions';
    } catch {
      return 'missions';
    }
  });

  useEffect(() => {
    try {
      const searchParams = new URLSearchParams(location?.search || '');
      const tab = searchParams.get('tab');
      if (tab === 'passport') setActiveTab('passport');
      else if (tab === 'missions') setActiveTab('missions');
    } catch {}
  }, [location?.search]);

  const [activeManualChallenge, setActiveManualChallenge] = useState(null);
  const [selectedAutoChallenge, setSelectedAutoChallenge] = useState(null);
  useScrollLock(!!activeManualChallenge || !!selectedAutoChallenge);
  const [manualForm, setManualForm] = useState({});
  const [photoFiles, setPhotoFiles] = useState({});
  const [photoPreviews, setPhotoPreviews] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [feedback, setFeedback] = useState(null);
  const [showSymplaModal, setShowSymplaModal] = useState(false);

  const [profile, setProfile] = useState(() => {
    const cached = getCachedUserProfile();
    return {
      firstName: cached?.firstName || 'Participante',
      avatarUrl: cached?.avatarUrl || ''
    };
  });

  useEffect(() => {
    const unsubscribe = onAuthChange(async (user) => {
      if (!user) {
        setProfile({ firstName: 'Visitante', avatarUrl: '' });
        return;
      }

      const formatFirstName = (email, displayName) => {
        if (displayName && displayName.trim()) return displayName.trim().split(' ')[0];
        if (!email) return 'Participante';
        const raw = email.split('@')[0].split(/[._-]/)[0];
        return raw ? raw.charAt(0).toUpperCase() + raw.slice(1).toLowerCase() : 'Participante';
      };

      const fallbackName = formatFirstName(user.email, user.displayName);
      const fallbackAvatar = user.photoURL || '';

      setProfile({ firstName: fallbackName, avatarUrl: fallbackAvatar });

      try {
        const p = await getUserProfile(user.uid);
        if (p) {
          setProfile({
            ...p,
            uid: user.uid,
            firstName: p.firstName || p.displayName?.split(' ')[0] || p.username || fallbackName,
            avatarUrl: p.avatarUrl || p.photoURL || fallbackAvatar
          });
        }
      } catch (e) {
        // mantém fallback já definido
      }
    });

    return () => unsubscribe();
  }, []);

  // Inscrição em tempo real de missões dinâmicas (KAN-104)
  const [missions, setMissions] = useState(DEFAULT_MISSIONS);
  const [activeFlashCountdown, setActiveFlashCountdown] = useState(null);

  useEffect(() => {
    const unsub = subscribeToMissions((list) => {
      setMissions(list && list.length > 0 ? list : DEFAULT_MISSIONS);
    });
    return () => unsub();
  }, []);

  // Encontra missão relâmpago ativa
  const activeFlashMission = missions.find(m => isFlashMissionActive(m));

  useEffect(() => {
    if (!activeFlashMission?.flashConfig?.expiresAt) {
      setActiveFlashCountdown(null);
      return;
    }

    const interval = setInterval(() => {
      const exp = activeFlashMission.flashConfig.expiresAt.toDate 
        ? activeFlashMission.flashConfig.expiresAt.toDate() 
        : new Date(activeFlashMission.flashConfig.expiresAt);
      const diffMs = exp.getTime() - Date.now();
      if (diffMs <= 0) {
        setActiveFlashCountdown('00:00');
        clearInterval(interval);
      } else {
        const mins = Math.floor(diffMs / 60000);
        const secs = Math.floor((diffMs % 60000) / 1000);
        setActiveFlashCountdown(`${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`);
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [activeFlashMission]);

  const getMissionIcon = (iconName) => {
    if (typeof iconName === 'object' || typeof iconName === 'function') return iconName;
    switch (iconName) {
      case 'Camera': return Camera;
      case 'MapPin': return MapPin;
      case 'Users': return Users;
      case 'Lock': return Lock;
      case 'Search': return Search;
      case 'MessageCircle': return MessageCircle;
      case 'Zap': return Zap;
      case 'HelpCircle': return HelpCircle;
      case 'Sparkles':
      default:
        return Sparkles;
    }
  };

  const handleSimulateChallenge = async (challenge) => {
    if (!hasSymplaTicket) {
      setShowSymplaModal(true);
      return;
    }

    if (challenge.id === 'instagram_story') {
      navigate('/instagram-mission');
      return;
    }

    // Modal de preenchimento manual (formulários, quiz, segredo)
    if (challenge.triggerMode === 'form' || 
        challenge.triggerMode === 'secret' || 
        challenge.triggerMode === 'quiz' || 
        challenge.type === 'manual' || 
        challenge.isSecret || 
        challenge.quizConfig) {
      setActiveManualChallenge(challenge);
      setManualForm({});
      setPhotoFiles({});
      setPhotoPreviews({});
      return;
    }

    if (challenge.type === 'auto' || challenge.triggerMode === 'auto') {
      setSelectedAutoChallenge(challenge);
      return;
    }

    const res = await completeChallenge(challenge.id, challenge.points);
    if (res && (res.success || res === true)) {
      setFeedback({
        type: 'success',
        title: 'Desafio Concluído!',
        message: `Parabéns! Você completou "${challenge.title || challenge.name}" e pontuou com sucesso.`,
        points: (res && res.points) || challenge.points
      });
    } else if (res && res.alreadyCompleted) {
      setFeedback({
        type: 'warning',
        title: 'Desafio Já Concluído',
        message: 'Você já completou este desafio anteriormente!'
      });
    } else {
      setFeedback({
        type: 'error',
        title: 'Erro ao Pontuar',
        message: (res && res.error) || 'Não foi possível registrar seus pontos no momento. Tente novamente.'
      });
    }
  };

  const handleManualSubmit = async (e) => {
    e.preventDefault();
    if (!activeManualChallenge || isSubmitting) return;

    // Validação de palavra secreta
    if (activeManualChallenge.triggerMode === 'secret' || activeManualChallenge.isSecret || activeManualChallenge.id === 'secret_password') {
      const pass = manualForm['password'] || manualForm['secretWord'];
      const expected = activeManualChallenge.secretConfig?.secretWord || 'OPORTUNIDADES';
      if (!validateSecretWord(pass, expected)) {
        setFeedback({
          type: 'warning',
          title: 'Palavra-chave Incorreta',
          message: 'A palavra-chave inserida não está certa. Continue procurando pelos stands!'
        });
        return;
      }
    }

    // Validação de quiz
    if (activeManualChallenge.triggerMode === 'quiz' && activeManualChallenge.quizConfig) {
      const selectedIndex = manualForm['quizAnswer'];
      const correctIndex = activeManualChallenge.quizConfig.correctOptionIndex;
      if (!validateQuizAnswer(selectedIndex, correctIndex)) {
        setFeedback({
          type: 'warning',
          title: 'Resposta Incorreta',
          message: 'Ops! A alternativa selecionada não está correta. Revise com o stand e tente novamente!'
        });
        return;
      }
    }

    setIsSubmitting(true);
    try {
      const finalMetadata = { ...manualForm, submitted_at: new Date().toISOString() };

      // Se a missão possuir campo de foto, faz o upload real antes de concluir
      const photoField = activeManualChallenge.fields?.find(f => f.type === 'photo');
      if (photoField) {
        const file = photoFiles[photoField.id];
        if (!file) {
          setFeedback({
            type: 'warning',
            title: 'Foto Obrigatória',
            message: 'Por favor, tire ou anexe uma foto comprovando a missão.'
          });
          setIsSubmitting(false);
          return;
        }

        const publicUrl = await uploadMissionPhoto(file, activeManualChallenge.id);
        finalMetadata[photoField.id] = publicUrl;
        finalMetadata.photo_url = publicUrl;
      }

      if (hasCompletedChallenge && hasCompletedChallenge(activeManualChallenge.id)) {
        setFeedback({
          type: 'warning',
          title: 'Missão Já Concluída',
          message: 'Esta missão já foi concluída anteriormente!'
        });
        setActiveManualChallenge(null);
        return;
      }

      // Respostas da missão manual vão como metadata do evento de pontos
      const res = await completeChallenge(activeManualChallenge.id, activeManualChallenge.points, finalMetadata);
      if (res && (res.success || res === true)) {
        setFeedback({
          type: 'success',
          title: 'Missão Concluída!',
          message: `Você cumpriu a missão "${activeManualChallenge.title || activeManualChallenge.name}" com sucesso!`,
          points: (res && res.points) || activeManualChallenge.points
        });
        setActiveManualChallenge(null);
        setManualForm({});
        setPhotoFiles({});
        setPhotoPreviews({});
      } else if (res && res.alreadyCompleted) {
        setFeedback({
          type: 'warning',
          title: 'Missão Já Concluída',
          message: 'Esta missão já foi concluída anteriormente!'
        });
        setActiveManualChallenge(null);
      } else {
        setFeedback({
          type: 'error',
          title: 'Não foi possível concluir',
          message: (res && res.error) || 'Não foi possível registrar sua comprovação. Tente novamente.'
        });
      }
    } catch (err) {
      console.error('Erro ao enviar missão:', err);
      setFeedback({
        type: 'error',
        title: 'Erro ao Concluir Missão',
        message: 'Não foi possível registrar sua comprovação no momento. Verifique sua conexão e tente novamente.'
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="page-container animate-fade-in" style={{ paddingBottom: '120px' }}>
      <SymplaStickyBanner />
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '22px' }}>
        <div>
          <h1
            style={{
              fontFamily: "'Space Grotesk', -apple-system, BlinkMacSystemFont, sans-serif",
              fontSize: '1.75rem',
              fontWeight: 800,
              color: '#F8FAFC',
              margin: 0,
              letterSpacing: '-0.03em',
              lineHeight: 1.15
            }}
          >
            Missões
          </h1>
          <p
            style={{
              fontSize: '0.80rem',
              color: '#94A3B8',
              margin: '3px 0 0',
              fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, sans-serif"
            }}
          >
            Complete desafios e acumule pontos
          </p>
        </div>
        <div
          style={{
            width: '40px',
            height: '40px',
            borderRadius: '12px',
            backgroundColor: '#0F141F',
            border: '1px solid #1E293B',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontWeight: 'bold',
            fontSize: '1rem',
            overflow: 'hidden',
            position: 'relative'
          }}
        >
          {profile.avatarUrl ? (
            <img
              src={profile.avatarUrl}
              alt="Avatar"
              style={{ width: '100%', height: '100%', objectFit: 'cover' }}
            />
          ) : (
            profile.firstName
              ? profile.firstName.charAt(0).toUpperCase()
              : 'V'
          )}
        </div>
      </div>

      {/* Abas de Navegação: [ Missões ] | [ Passaporte ] */}
      <div
        style={{
          display: 'flex',
          backgroundColor: '#0F141F',
          padding: '4px',
          borderRadius: '14px',
          border: '1px solid #1E293B',
          marginBottom: '20px',
          gap: '6px'
        }}
      >
        <button
          type="button"
          onClick={() => setActiveTab('missions')}
          style={{
            flex: 1,
            padding: '10px 14px',
            borderRadius: '10px',
            border: 'none',
            fontSize: '0.85rem',
            fontWeight: 700,
            cursor: 'pointer',
            transition: 'all 0.2s ease',
            backgroundColor: activeTab === 'missions' ? '#2563EB' : 'transparent',
            color: activeTab === 'missions' ? '#FFFFFF' : '#94A3B8',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '8px'
          }}
        >
          <span>Missões</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('passport')}
          style={{
            flex: 1,
            padding: '10px 14px',
            borderRadius: '10px',
            border: 'none',
            fontSize: '0.85rem',
            fontWeight: 700,
            cursor: 'pointer',
            transition: 'all 0.2s ease',
            backgroundColor: activeTab === 'passport' ? '#2563EB' : 'transparent',
            color: activeTab === 'passport' ? '#FFFFFF' : '#94A3B8',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '8px'
          }}
        >
          <span>Passaporte</span>
        </button>
      </div>

      {activeTab === 'passport' ? (
        <PassportTab userProfile={profile} />
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {!hasSymplaTicket && (
            <div
              style={{
                padding: '16px 18px',
                borderRadius: '16px',
                background: 'linear-gradient(135deg, rgba(234, 179, 8, 0.15), rgba(161, 98, 7, 0.08))',
                border: '1px solid rgba(234, 179, 8, 0.35)',
                color: '#fef08a',
                display: 'flex',
                flexDirection: 'column',
                gap: '8px'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontWeight: '700', fontSize: '0.95rem' }}>
                <span>⚠️</span>
                <span>Ingresso Sympla Pendente</span>
              </div>
              <p style={{ margin: 0, fontSize: '0.82rem', color: 'rgba(255, 255, 255, 0.85)', lineHeight: '1.4' }}>
                Vincule seu ingresso oficial do Sympla para desbloquear o envio de missões, fotos e acumular pontos no ranking da TechWeek.
              </p>
              <button
                onClick={() => navigate('/profile')}
                style={{
                  alignSelf: 'flex-start',
                  marginTop: '4px',
                  padding: '6px 14px',
                  borderRadius: '10px',
                  background: '#eab308',
                  color: '#0f172a',
                  border: 'none',
                  fontWeight: '700',
                  fontSize: '0.8rem',
                  cursor: 'pointer'
                }}
              >
                Vincular Ingresso no Perfil →
              </button>
            </div>
          )}

          {/* BANNER DE MISSÃO RELÂMPAGO AO VIVO (KAN-104) */}
          {activeFlashMission && isFlashMissionActive(activeFlashMission) && (
            <div style={{
              margin: '6px 0 16px',
              padding: '16px 18px',
              borderRadius: '16px',
              background: 'linear-gradient(135deg, rgba(245, 158, 11, 0.25) 0%, rgba(180, 83, 9, 0.2) 100%)',
              border: '1px solid #F59E0B',
              boxShadow: '0 8px 24px rgba(245, 158, 11, 0.25)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '12px'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flex: 1, minWidth: 0 }}>
                <div style={{ width: '42px', height: '42px', borderRadius: '12px', backgroundColor: '#F59E0B', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, boxShadow: '0 0 16px rgba(245,158,11,0.6)' }}>
                  <Zap size={22} color="#000000" />
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                    <span style={{ fontSize: '0.66rem', fontWeight: 800, backgroundColor: '#F59E0B', color: '#000', padding: '1px 6px', borderRadius: '4px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                      ⚡ MISSÃO RELÂMPAGO
                    </span>
                    {activeFlashCountdown && (
                      <span style={{ fontSize: '0.78rem', fontWeight: 800, color: '#FDE68A', fontFamily: 'monospace' }}>
                        ⏱️ {activeFlashCountdown}
                      </span>
                    )}
                  </div>
                  <div style={{ fontSize: '0.92rem', fontWeight: 700, color: '#FFFFFF', marginTop: '3px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {activeFlashMission.title || activeFlashMission.name}
                  </div>
                  {activeFlashMission.flashConfig?.mascotDialogue && (
                    <div style={{ fontSize: '0.75rem', color: '#FDE68A', marginTop: '2px', fontStyle: 'italic', lineHeight: 1.3 }}>
                      {activeFlashMission.flashConfig.mascotDialogue}
                    </div>
                  )}
                </div>
              </div>

              <button
                type="button"
                onClick={() => handleSimulateChallenge(activeFlashMission)}
                style={{
                  padding: '9px 16px',
                  backgroundColor: '#F59E0B',
                  color: '#000000',
                  fontWeight: 800,
                  fontSize: '0.80rem',
                  borderRadius: '10px',
                  border: 'none',
                  cursor: 'pointer',
                  whiteSpace: 'nowrap',
                  flexShrink: 0,
                  boxShadow: '0 4px 12px rgba(245,158,11,0.4)'
                }}
              >
                PARTICIPAR
              </button>
            </div>
          )}

          {missions.filter(m => m.status !== 'paused').map((challenge) => {
            const isCompleted = (hasCompletedChallenge && hasCompletedChallenge(challenge.id)) || completedChallenges.includes(challenge.id);
            const isHighlighted = (challenge.id === 'instagram_story' || challenge.isFlash) && !isCompleted;
            const isSecret = (challenge.isSecret || challenge.triggerMode === 'secret') && !isCompleted;
            const IconComponent = getMissionIcon(challenge.icon || MapPin);

            return (
              <div 
                key={challenge.id} 
                className={`card ${isHighlighted || isSecret ? 'card-highlight' : ''}`} 
                onClick={() => !isCompleted && handleSimulateChallenge(challenge)}
                style={{ 
                  display: 'flex', 
                  justifyContent: 'space-between', 
                  alignItems: 'center', 
                  gap: '16px',
                  padding: '16px 18px',
                  opacity: isCompleted ? 0.8 : 1, 
                  backgroundColor: isSecret ? 'rgba(37, 99, 235, 0.12)' : (challenge.isFlash ? 'rgba(245, 158, 11, 0.08)' : '#0F141F'), 
                  borderColor: isCompleted ? 'rgba(16, 185, 129, 0.3)' : isSecret ? 'rgba(59, 130, 246, 0.35)' : (challenge.isFlash ? 'rgba(245, 158, 11, 0.4)' : '#1E293B'),
                  borderRadius: '14px',
                  cursor: isCompleted ? 'default' : 'pointer'
                }}
              >
                <div style={{ display: 'flex', gap: '14px', alignItems: 'center', flex: 1, minWidth: 0 }}>
                  <div 
                    style={{ 
                      width: '46px',
                      height: '46px',
                      borderRadius: '12px',
                      background: isCompleted ? 'rgba(16, 185, 129, 0.12)' : isHighlighted || isSecret ? 'rgba(37, 99, 235, 0.22)' : 'rgba(255,255,255,0.05)', 
                      border: `1px solid ${isCompleted ? 'rgba(16, 185, 129, 0.25)' : isHighlighted || isSecret ? 'rgba(59, 130, 246, 0.35)' : 'rgba(255,255,255,0.08)'}`,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0,
                      color: isCompleted ? '#34D399' : isHighlighted || isSecret ? '#93C5FD' : '#60A5FA' 
                    }}
                  >
                    <IconComponent size={22} />
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <h3 style={{ fontSize: '0.92rem', fontWeight: 700, margin: 0, lineHeight: 1.3, color: '#F8FAFC' }}>
                        {challenge.title || challenge.name}
                      </h3>
                      {challenge.isFlash && (
                        <span style={{ fontSize: '0.62rem', backgroundColor: '#78350F', color: '#FDE68A', padding: '1px 5px', borderRadius: '4px', fontWeight: 700 }}>
                          ⚡ RELÂMPAGO
                        </span>
                      )}
                    </div>
                    <p style={{ fontSize: '0.76rem', color: isHighlighted || isSecret ? 'rgba(255,255,255,0.85)' : '#94A3B8', margin: '4px 0 0', lineHeight: 1.35 }}>
                      {challenge.description}
                    </p>
                    <div style={{ marginTop: '5px', fontSize: '0.74rem', fontFamily: "'JetBrains Mono', monospace", fontWeight: 700, color: isCompleted ? '#34D399' : isHighlighted || isSecret ? '#93C5FD' : '#60A5FA' }}>
                      +{challenge.points} pts
                    </div>
                  </div>
                </div>

                {!isCompleted ? (
                  <button
                    type="button"
                    style={{
                      padding: '8px 16px',
                      fontSize: '0.78rem',
                      fontFamily: "'Space Grotesk', -apple-system, BlinkMacSystemFont, sans-serif",
                      fontWeight: 700,
                      letterSpacing: '0.01em',
                      background: challenge.isFlash ? 'linear-gradient(135deg, #F59E0B 0%, #D97706 100%)' : 'linear-gradient(135deg, #2563EB 0%, #1D4ED8 100%)',
                      color: challenge.isFlash ? '#000000' : '#FFFFFF',
                      border: challenge.isFlash ? '1px solid rgba(245, 158, 11, 0.6)' : '1px solid rgba(96, 165, 250, 0.45)',
                      boxShadow: challenge.isFlash ? '0 2px 10px rgba(245, 158, 11, 0.35)' : '0 2px 10px rgba(37, 99, 235, 0.35)',
                      borderRadius: '10px',
                      cursor: 'pointer',
                      whiteSpace: 'nowrap',
                      flexShrink: 0,
                      display: 'inline-flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      transition: 'all 0.15s ease'
                    }}
                    onClick={(e) => {
                      e.stopPropagation();
                      handleSimulateChallenge(challenge);
                    }}
                  >
                    {challenge.id === 'instagram_story' ? 'Criar Story' : challenge.isAction ? 'Começar' : (challenge.triggerMode === 'quiz' ? 'Fazer Quiz' : challenge.triggerMode === 'secret' ? 'Desvendar' : challenge.triggerMode === 'auto' || challenge.type === 'auto' ? ((challenge.autoConfig?.eventType === 'passport_complete' || challenge.id?.includes('passport') || challenge.id === 'sponsor_colecao') ? 'Ver Passaporte' : 'Escanear') : 'Responder')}
                  </button>
                ) : (
                  <div
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '6px',
                      color: '#34D399',
                      fontSize: '0.78rem',
                      fontFamily: "'Space Grotesk', -apple-system, BlinkMacSystemFont, sans-serif",
                      fontWeight: 700,
                      letterSpacing: '0.02em',
                      padding: '7px 14px',
                      backgroundColor: 'rgba(16, 185, 129, 0.10)',
                      borderRadius: '10px',
                      border: '1px solid rgba(16, 185, 129, 0.32)',
                      boxShadow: '0 0 10px rgba(16, 185, 129, 0.12)',
                      whiteSpace: 'nowrap',
                      flexShrink: 0
                    }}
                  >
                    <CheckCircle size={15} color="#34D399" />
                    <span>Feito</span>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {activeManualChallenge && typeof document !== 'undefined' && createPortal(
        <div 
          className="modal-overlay-fixed"
          onClick={() => {
            setActiveManualChallenge(null);
            setManualForm({});
            setPhotoFiles({});
            setPhotoPreviews({});
          }}
          style={{ 
            background: 'rgba(0,0,0,0.82)', 
            backdropFilter: 'blur(12px)',
            WebkitBackdropFilter: 'blur(12px)',
            padding: '20px'
          }}
        >
          <div 
            className="card modal-card-fixed" 
            onClick={(e) => e.stopPropagation()}
            style={{ width: '100%', maxWidth: '420px', background: 'var(--card-bg)' }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h3 style={{ fontSize: '1.2rem', color: 'white' }}>{activeManualChallenge.title || activeManualChallenge.name}</h3>
              <button
                type="button"
                onClick={() => {
                  setActiveManualChallenge(null);
                  setManualForm({});
                  setPhotoFiles({});
                  setPhotoPreviews({});
                }}
                style={{ background: 'none', border: 'none', color: 'white', cursor: 'pointer' }}
              >
                <X size={24} />
              </button>
            </div>

            <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', marginBottom: '24px' }}>
              {activeManualChallenge.description}
            </p>

            <form onSubmit={handleManualSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {/* QUIZ DINÂMICO (KAN-104) */}
              {activeManualChallenge.quizConfig && (
                <div style={{ backgroundColor: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '10px', padding: '14px' }}>
                  <label style={{ display: 'block', fontSize: '0.88rem', fontWeight: 600, color: 'white', marginBottom: '10px' }}>
                    ❓ {activeManualChallenge.quizConfig.question}
                  </label>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {activeManualChallenge.quizConfig.options?.map((opt, oIdx) => (
                      <label key={oIdx} style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '10px',
                        padding: '10px 12px',
                        borderRadius: '8px',
                        border: '1px solid',
                        borderColor: manualForm['quizAnswer'] === oIdx ? '#3B82F6' : 'rgba(255,255,255,0.1)',
                        backgroundColor: manualForm['quizAnswer'] === oIdx ? 'rgba(59, 130, 246, 0.2)' : 'transparent',
                        cursor: 'pointer',
                        color: 'white',
                        fontSize: '0.82rem'
                      }}>
                        <input
                          type="radio"
                          name="quizOption"
                          checked={manualForm['quizAnswer'] === oIdx}
                          onChange={() => setManualForm(prev => ({ ...prev, quizAnswer: oIdx }))}
                          required
                        />
                        <span>{opt}</span>
                      </label>
                    ))}
                  </div>
                </div>
              )}

              {/* PALAVRA SECRETA (SE NÃO ESTIVER EM FIELDS) */}
              {(activeManualChallenge.triggerMode === 'secret' || activeManualChallenge.isSecret) && (!activeManualChallenge.fields || activeManualChallenge.fields.length === 0) && (
                <div>
                  <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '8px' }}>
                    Palavra-chave Secreta
                  </label>
                  <input
                    type="text"
                    value={manualForm['secretWord'] || ''}
                    onChange={(e) => setManualForm(prev => ({ ...prev, secretWord: e.target.value }))}
                    className="login-input"
                    required
                    placeholder="Digite a palavra secreta encontrada..."
                    autoFocus
                  />
                </div>
              )}

              {/* CAMPOS DINÂMICOS */}
              {activeManualChallenge.fields && activeManualChallenge.fields.map(field => (
                <div key={field.id}>
                  <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '8px' }}>
                    {field.label}
                  </label>
                  {field.type === 'select' && (
                    <select
                      value={manualForm[field.id] || ''}
                      onChange={(e) => setManualForm({ ...manualForm, [field.id]: e.target.value })}
                      className="login-input"
                      required
                    >
                      <option value="" disabled>Selecione...</option>
                      {field.options.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                    </select>
                  )}
                  {field.type === 'text' && (
                    <input
                      type="text"
                      value={manualForm[field.id] || ''}
                      onChange={(e) => setManualForm({ ...manualForm, [field.id]: e.target.value })}
                      className="login-input"
                      required
                    />
                  )}
                  {field.type === 'password' && (
                    <input
                      type="text"
                      value={manualForm[field.id] || ''}
                      onChange={(e) => setManualForm({ ...manualForm, [field.id]: e.target.value })}
                      className="login-input"
                      required
                      placeholder="Palavra-chave"
                    />
                  )}
                  {field.type === 'textarea' && (
                    <textarea
                      value={manualForm[field.id] || ''}
                      onChange={(e) => setManualForm({ ...manualForm, [field.id]: e.target.value })}
                      className="login-input"
                      rows="3"
                      style={{ resize: 'none', fontFamily: "'Inter', sans-serif" }}
                      required
                      minLength={activeManualChallenge.id === 'sponsor_tecnologia' ? 15 : undefined}
                    />
                  )}
                  {field.type === 'photo' && (
                    <div>
                      {!photoPreviews[field.id] ? (
                        <input
                          type="file"
                          accept="image/png,image/jpeg,image/webp,image/gif"
                          capture="environment"
                          onChange={(e) => {
                            const file = e.target.files[0];
                            if (!file) return;
                            const validation = validateMissionPhoto(file);
                            if (!validation.valid) {
                              if (validation.reason === 'too_large') {
                                setFeedback({
                                  type: 'warning',
                                  title: 'Foto Muito Grande',
                                  message: 'A foto deve ter no máximo 5MB para otimizar o envio.'
                                });
                              } else if (validation.reason === 'invalid_type') {
                                setFeedback({
                                  type: 'warning',
                                  title: 'Formato Inválido',
                                  message: 'Formato de imagem inválido. Use PNG, JPEG, WebP ou GIF.'
                                });
                              } else {
                                setFeedback({
                                  type: 'error',
                                  title: 'Arquivo Inválido',
                                  message: 'Não foi possível ler este arquivo. Selecione uma foto válida.'
                                });
                              }
                              e.target.value = '';
                              return;
                            }
                            setPhotoFiles(prev => ({ ...prev, [field.id]: file }));
                            setPhotoPreviews(prev => ({ ...prev, [field.id]: URL.createObjectURL(file) }));
                          }}
                          className="login-input"
                          style={{ padding: '8px' }}
                          required
                        />
                      ) : (
                        <div style={{ position: 'relative', marginTop: '8px', borderRadius: '8px', overflow: 'hidden', border: '1px solid rgba(255,255,255,0.2)' }}>
                          <img
                            src={photoPreviews[field.id]}
                            alt="Pré-visualização da missão"
                            style={{ width: '100%', maxHeight: '200px', objectFit: 'cover', display: 'block' }}
                          />
                          <button
                            type="button"
                            onClick={() => {
                              setPhotoFiles(prev => {
                                const copy = { ...prev };
                                delete copy[field.id];
                                return copy;
                              });
                              setPhotoPreviews(prev => {
                                const copy = { ...prev };
                                delete copy[field.id];
                                return copy;
                              });
                            }}
                            style={{
                              position: 'absolute',
                              top: '8px',
                              right: '8px',
                              background: 'rgba(0,0,0,0.7)',
                              border: 'none',
                              color: '#ef4444',
                              borderRadius: '50%',
                              width: '32px',
                              height: '32px',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              cursor: 'pointer'
                            }}
                            title="Remover foto"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ))}

              <button
                type="submit"
                className="login-btn"
                disabled={isSubmitting}
                style={{
                  marginTop: '16px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                  opacity: isSubmitting ? 0.7 : 1,
                  cursor: isSubmitting ? 'not-allowed' : 'pointer'
                }}
              >
                {isSubmitting && <Loader2 size={18} className="animate-spin" />}
                {isSubmitting ? 'Enviando comprovação...' : 'Completar Missão'}
              </button>
            </form>
          </div>
        </div>,
        document.body
      )}

      {selectedAutoChallenge && typeof document !== 'undefined' && createPortal(
        <div 
          className="modal-overlay-fixed"
          onClick={() => setSelectedAutoChallenge(null)}
          style={{ 
            background: 'rgba(0,0,0,0.82)', 
            backdropFilter: 'blur(12px)',
            WebkitBackdropFilter: 'blur(12px)',
            padding: '20px'
          }}
        >
          <div 
            className="card modal-card-fixed" 
            onClick={(e) => e.stopPropagation()}
            style={{ width: '100%', maxWidth: '400px', background: 'var(--card-bg)', border: '1px solid #1E293B', borderRadius: '16px', padding: '24px' }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div style={{ background: 'rgba(37, 99, 235, 0.2)', padding: '10px', borderRadius: '12px', color: '#60A5FA' }}>
                  <QrCode size={22} />
                </div>
                <div>
                  <h3 style={{ fontSize: '1.1rem', color: 'white', margin: 0 }}>{selectedAutoChallenge.title || selectedAutoChallenge.name}</h3>
                  <span style={{ fontSize: '0.78rem', fontWeight: 700, color: '#38BDF8' }}>+{selectedAutoChallenge.points} XP / Pontos</span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSelectedAutoChallenge(null)}
                style={{ background: 'none', border: 'none', color: '#94A3B8', cursor: 'pointer' }}
              >
                <X size={22} />
              </button>
            </div>

            <p style={{ fontSize: '0.88rem', color: 'var(--text-secondary)', lineHeight: '1.4', marginBottom: '20px' }}>
              {selectedAutoChallenge.description}
            </p>

            {/* AVISO DE VALIDAÇÃO AUTOMÁTICA */}
            <div style={{
              padding: '12px 14px',
              borderRadius: '12px',
              background: 'rgba(56, 189, 248, 0.08)',
              border: '1px solid rgba(56, 189, 248, 0.25)',
              display: 'flex',
              alignItems: 'flex-start',
              gap: '10px',
              marginBottom: '20px'
            }}>
              <Zap size={18} color="#38BDF8" style={{ flexShrink: 0, marginTop: '2px' }} />
              <div style={{ fontSize: '0.80rem', color: '#E2E8F0', lineHeight: 1.4 }}>
                <strong style={{ color: '#38BDF8', display: 'block', marginBottom: '2px' }}>Validação Automática pelo App</strong>
                Esta missão não precisa de envio manual. O app computa seus pontos automaticamente assim que você realizar a ação correspondente no evento.
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {(selectedAutoChallenge.autoConfig?.eventType === 'lecture_checkin' || selectedAutoChallenge.id?.includes('lecture')) ? (
                <button
                  type="button"
                  onClick={() => {
                    setSelectedAutoChallenge(null);
                    navigate('/schedule');
                  }}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '8px',
                    backgroundColor: '#2563EB',
                    border: '1px solid #3B82F6',
                    color: 'white',
                    height: '46px',
                    borderRadius: '12px',
                    fontWeight: 700,
                    fontSize: '0.88rem',
                    cursor: 'pointer',
                    boxShadow: '0 4px 14px rgba(37, 99, 235, 0.35)'
                  }}
                >
                  <span>Ver Grade de Palestras</span>
                </button>
              ) : (selectedAutoChallenge.autoConfig?.eventType === 'passport_complete' || selectedAutoChallenge.id?.includes('passport') || selectedAutoChallenge.id === 'sponsor_colecao') ? (
                <button
                  type="button"
                  onClick={() => {
                    setSelectedAutoChallenge(null);
                    setActiveTab('passport');
                  }}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '8px',
                    backgroundColor: '#2563EB',
                    border: '1px solid #3B82F6',
                    color: 'white',
                    height: '46px',
                    borderRadius: '12px',
                    fontWeight: 700,
                    fontSize: '0.88rem',
                    cursor: 'pointer'
                  }}
                >
                  <span>Ver Passaporte de Stands</span>
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => {
                    setSelectedAutoChallenge(null);
                    navigate('/scanner');
                  }}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '8px',
                    backgroundColor: '#2563EB',
                    border: '1px solid #3B82F6',
                    color: 'white',
                    height: '46px',
                    borderRadius: '12px',
                    fontWeight: 700,
                    fontSize: '0.88rem',
                    cursor: 'pointer',
                    boxShadow: '0 4px 14px rgba(37, 99, 235, 0.35)'
                  }}
                >
                  <Camera size={18} />
                  <span>Escanear QR Code com Câmera</span>
                </button>
              )}

              <button
                type="button"
                onClick={() => setSelectedAutoChallenge(null)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  backgroundColor: 'rgba(255, 255, 255, 0.04)',
                  border: '1px solid rgba(255, 255, 255, 0.08)',
                  color: '#94A3B8',
                  height: '40px',
                  borderRadius: '10px',
                  fontSize: '0.82rem',
                  fontWeight: 600,
                  cursor: 'pointer'
                }}
              >
                Voltar
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* Card Modal Estilizado de Feedback (Sucesso / Erro / Atenção) */}
      <FeedbackModal
        isOpen={!!feedback}
        type={feedback?.type}
        title={feedback?.title}
        message={feedback?.message}
        points={feedback?.points}
        onClose={() => setFeedback(null)}
      />

      <SymplaRequirementModal
        isOpen={showSymplaModal}
        onClose={() => setShowSymplaModal(false)}
        featureName="o envio de missões e pontuação"
      />
    </div>
  );
}
