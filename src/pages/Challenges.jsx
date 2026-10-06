import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate, useLocation } from 'react-router-dom';
import { useUser } from '../hooks/useUser';
import { Check, MapPin, Camera, Users, MessageSquare, X, Search, Lock, Loader2, Trash2, QrCode, Sparkles, Zap, CircleHelp } from 'lucide-react';
import { uploadMissionPhoto } from '../lib/gameplay';
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
import PassportTab, { SPONSORS_CONFIG, TIER_STYLE } from '../components/PassportTab';
import ConquistasTabs from '../components/ConquistasTabs';
import Mascot from '../components/Mascot';
import { useScrollLock } from '../hooks/useScrollLock';
import '../styles/conquistas.css';

/* ---------- Estilo do cartão de missão (DESIGN.md §6 Missões) ---------- */

const CARD_STYLES = ['padrao', 'secreta', 'caca-qr', 'relampago', 'patrocinador', 'quiz', 'stories'];
const STYLE_ALIASES = { default: 'padrao', secret: 'secreta', 'caca-ao-qr': 'caca-qr', 'caca-ao-qr-code': 'caca-qr', qr: 'caca-qr', flash: 'relampago', sponsor: 'patrocinador', story: 'stories', instagram: 'stories' };
const normalizeStyle = (s) => {
  const k = String(s).normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim().replace(/[\s_]+/g, '-');
  return CARD_STYLES.includes(k) ? k : STYLE_ALIASES[k] || null;
};

/** Patrocinador da missão, se ela aponta para um dos estandes do passaporte. */
function missionSponsor(m) {
  const key = String(m?.sponsorId || m?.autoConfig?.targetId || (m?.id || '').replace(/^sponsor_/, '')).toLowerCase();
  return SPONSORS_CONFIG[key] || null;
}

/**
 * Estilo visual do cartão. Respeita `m.cardStyle` (escolhido no admin) e, sem ele,
 * deriva dos campos que a missão já tem.
 */
export function missionStyle(m) {
  const explicit = m?.cardStyle && normalizeStyle(m.cardStyle);
  if (explicit) return explicit;
  const id = m?.id || '';
  if (m?.isFlash) return 'relampago';
  if (id === 'secret_qr' || m?.autoConfig?.eventType === 'secret_qr') return 'caca-qr';
  if (id === 'secret_password' || m?.triggerMode === 'secret') return 'secreta';
  if (id === 'instagram_story') return 'stories';
  if (m?.triggerMode === 'quiz' || m?.quizConfig || id.includes('quiz')) return 'quiz';
  if (missionSponsor(m)) return 'patrocinador';
  return 'padrao';
}

const isPassportMission = (c) => c.autoConfig?.eventType === 'passport_complete' || c.id?.includes('passport') || c.id === 'sponsor_colecao';

const ctaLabel = (c) => {
  if (c.id === 'instagram_story') return 'Criar story';
  if (c.isAction) return 'Começar';
  if (c.triggerMode === 'quiz') return 'Fazer quiz';
  if (c.triggerMode === 'secret') return 'Desvendar';
  if (c.triggerMode === 'auto' || c.type === 'auto') return isPassportMission(c) ? 'Ver passaporte' : 'Escanear';
  return 'Responder';
};

const toDate = (v) => (v?.toDate ? v.toDate() : v ? new Date(v) : null);
const formatDeadline = (v) => {
  const d = toDate(v);
  if (!d || isNaN(d.getTime())) return null;
  return `termina às ${d.getHours()}h${d.getMinutes() ? String(d.getMinutes()).padStart(2, '0') : ''}`;
};

const CATEGORY_TINT = { sponsors: '#67D4E8', networking: '#B9A6F5', social: '#F59AC0' };

export default function Challenges() {
  const { completedChallenges, completeChallenge, hasCompletedChallenge, hasSymplaTicket } = useUser();
  const navigate = useNavigate();
  const location = useLocation();
  // Aba interna vem da URL (?tab=passport), assim o cabeçalho compartilhado com /ranking navega por link.
  const activeTab = new URLSearchParams(location?.search || '').get('tab') === 'passport' ? 'passport' : 'missions';

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

  // Inscrição em tempo real de missões dinâmicas (KAN-104 e KAN-106)
  const [missions, setMissions] = useState([]);
  const [loadingMissions, setLoadingMissions] = useState(true);
  const [activeFlashCountdown, setActiveFlashCountdown] = useState(null);
  const [flashFraction, setFlashFraction] = useState(1);

  useEffect(() => {
    const unsub = subscribeToMissions((list) => {
      setMissions(list || []);
      setLoadingMissions(false);
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

    const totalMs = (Number(activeFlashMission.flashConfig.durationMinutes) || 0) * 60000;
    const tick = () => {
      const exp = activeFlashMission.flashConfig.expiresAt.toDate
        ? activeFlashMission.flashConfig.expiresAt.toDate()
        : new Date(activeFlashMission.flashConfig.expiresAt);
      const diffMs = exp.getTime() - Date.now();
      setFlashFraction(totalMs > 0 ? Math.min(1, Math.max(0, diffMs / totalMs)) : 1);
      if (diffMs <= 0) {
        setActiveFlashCountdown('00:00');
        clearInterval(interval);
      } else {
        const mins = Math.floor(diffMs / 60000);
        const secs = Math.floor((diffMs % 60000) / 1000);
        setActiveFlashCountdown(`${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`);
      }
    };
    const interval = setInterval(tick, 1000);
    tick();

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
      case 'MessageCircle': return MessageSquare;
      case 'Zap': return Zap;
      case 'HelpCircle': return CircleHelp;
      case 'QrCode': return QrCode;
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


  const closeManual = () => {
    setActiveManualChallenge(null);
    setManualForm({});
    setPhotoFiles({});
    setPhotoPreviews({});
  };

  const isDone = (c) => (hasCompletedChallenge && hasCompletedChallenge(c.id)) || completedChallenges.includes(c.id);
  const visibleMissions = missions.filter(m => m.status !== 'paused');
  const doneMissions = visibleMissions.filter(isDone);
  const flashInBanner = activeFlashMission && isFlashMissionActive(activeFlashMission) && !isDone(activeFlashMission) ? activeFlashMission : null;
  const availableMissions = visibleMissions.filter(m => !isDone(m) && m !== flashInBanner);
  const earnedPts = doneMissions.reduce((s, m) => s + (Number(m.points) || 0), 0);
  const openPts = visibleMissions.filter(m => !isDone(m)).reduce((s, m) => s + (Number(m.points) || 0), 0);

  return (
    <div className="page-container conq-page animate-fade-in">
      <SymplaStickyBanner />
      <div className="px-5">
        <ConquistasTabs active={activeTab === 'passport' ? 'passport' : 'missions'} />

        {activeTab === 'passport' ? (
          <PassportTab userProfile={profile} />
        ) : loadingMissions ? (
          <div className="mt-[18px] flex flex-col gap-2.5" aria-busy="true" aria-label="Carregando missões">
            <div className="skeleton h-[80px] rounded-[18px]" />
            {[1, 2, 3].map((i) => <div key={i} className="skeleton h-[132px] rounded-[18px]" />)}
          </div>
        ) : visibleMissions.length === 0 ? (
          <div className="mt-10 flex flex-col items-center px-4 text-center">
            <Mascot color="purple" style={{ width: 112, height: 112 }} />
            <p className="mt-4 text-[15px] font-bold text-text">Nenhuma missão no ar agora</p>
            <p className="mt-1 text-[13px] text-text-2">Novas missões aparecem aqui durante o evento. Enquanto isso, visite os estandes.</p>
            <button type="button" className="btn btn-secondary btn-sm mt-5" onClick={() => navigate('/challenges?tab=passport', { replace: true })}>
              Ver passaporte
            </button>
          </div>
        ) : (
          <>
            <SummaryRing done={doneMissions.length} total={visibleMissions.length} earned={earnedPts} open={openPts} />

            {flashInBanner && (
              <FlashBanner
                mission={flashInBanner}
                countdown={activeFlashCountdown}
                fraction={flashFraction}
                onJoin={() => handleSimulateChallenge(flashInBanner)}
              />
            )}

            {availableMissions.length > 0 && (
              <section aria-labelledby="missoes-disponiveis">
                <div className="mb-2.5 mt-[22px] flex items-baseline justify-between">
                  <h2 id="missoes-disponiveis" className="m-0 text-base font-extrabold">Disponíveis</h2>
                  <span className="text-xs font-bold text-text-3">
                    {availableMissions.length} {availableMissions.length === 1 ? 'missão' : 'missões'}
                  </span>
                </div>
                <div className="flex flex-col gap-2.5">
                  {availableMissions.map((m) => (
                    <MissionCard key={m.id} mission={m} getIcon={getMissionIcon} onStart={() => handleSimulateChallenge(m)} />
                  ))}
                </div>
              </section>
            )}

            {doneMissions.length > 0 && (
              <section aria-labelledby="missoes-feitas">
                <div className="mb-2.5 mt-[22px] flex items-baseline justify-between">
                  <h2 id="missoes-feitas" className="m-0 text-base font-extrabold">Feitas</h2>
                  <span className="text-xs font-bold text-text-3">{doneMissions.length}</span>
                </div>
                <div className="flex flex-col gap-2.5">
                  {doneMissions.map((m) => (
                    <MissionCard key={m.id} mission={m} getIcon={getMissionIcon} done />
                  ))}
                </div>
              </section>
            )}
          </>
        )}
      </div>

      {activeManualChallenge && typeof document !== 'undefined' && createPortal(
        <>
          <div className="ds-scrim" onClick={closeManual} aria-hidden="true" />
          <div className="ds-sheet" role="dialog" aria-modal="true" aria-labelledby="mission-sheet-title">
            <div className="flex items-start justify-between gap-3">
              <h2 id="mission-sheet-title" className="m-0 text-lg font-extrabold text-text">
                {activeManualChallenge.title || activeManualChallenge.name}
              </h2>
              <button type="button" onClick={closeManual} aria-label="Fechar" className="-mr-2 -mt-2 flex h-11 w-11 shrink-0 items-center justify-center rounded-full border-0 bg-transparent text-text-2">
                <X size={22} aria-hidden="true" />
              </button>
            </div>

            <p className="mb-5 mt-1 text-sm leading-relaxed text-text-2">
              {activeManualChallenge.description}
            </p>

            <form onSubmit={handleManualSubmit} className="flex flex-col gap-4">
              {/* QUIZ DINÂMICO (KAN-104) */}
              {activeManualChallenge.quizConfig && (
                <fieldset className="m-0 border-0 p-0">
                  <legend className="mb-2.5 text-[15px] font-bold text-text">
                    {activeManualChallenge.quizConfig.question}
                  </legend>
                  <div className="flex flex-col gap-2">
                    {activeManualChallenge.quizConfig.options?.map((opt, oIdx) => {
                      const selected = manualForm['quizAnswer'] === oIdx;
                      return (
                        <label
                          key={oIdx}
                          className={`flex min-h-12 cursor-pointer items-center gap-3 rounded-xl border-[1.5px] px-3.5 text-sm text-text ${selected ? 'border-link bg-[rgba(143,160,255,0.12)]' : 'border-field-line bg-field'}`}
                        >
                          <input
                            type="radio"
                            name="quizOption"
                            className="accent-[#3D50E6]"
                            checked={selected}
                            onChange={() => setManualForm(prev => ({ ...prev, quizAnswer: oIdx }))}
                            required
                          />
                          <span>{opt}</span>
                        </label>
                      );
                    })}
                  </div>
                </fieldset>
              )}

              {/* PALAVRA SECRETA (SE NÃO ESTIVER EM FIELDS) */}
              {(activeManualChallenge.triggerMode === 'secret' || activeManualChallenge.isSecret) && (!activeManualChallenge.fields || activeManualChallenge.fields.length === 0) && (
                <div>
                  <label htmlFor="mf-secretWord" className="field-label">Palavra-chave</label>
                  <input
                    id="mf-secretWord"
                    type="text"
                    value={manualForm['secretWord'] || ''}
                    onChange={(e) => setManualForm(prev => ({ ...prev, secretWord: e.target.value }))}
                    className="field"
                    required
                    placeholder="Digite a palavra que você encontrou"
                    autoFocus
                  />
                </div>
              )}

              {/* CAMPOS DINÂMICOS */}
              {activeManualChallenge.fields && activeManualChallenge.fields.map(field => (
                <div key={field.id}>
                  <label htmlFor={`mf-${field.id}`} className="field-label">{field.label}</label>
                  {field.type === 'select' && (
                    <select
                      id={`mf-${field.id}`}
                      value={manualForm[field.id] || ''}
                      onChange={(e) => setManualForm({ ...manualForm, [field.id]: e.target.value })}
                      className="field"
                      required
                    >
                      <option value="" disabled>Selecione...</option>
                      {field.options.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                    </select>
                  )}
                  {field.type === 'text' && (
                    <input
                      id={`mf-${field.id}`}
                      type="text"
                      value={manualForm[field.id] || ''}
                      onChange={(e) => setManualForm({ ...manualForm, [field.id]: e.target.value })}
                      className="field"
                      required
                    />
                  )}
                  {field.type === 'password' && (
                    <input
                      id={`mf-${field.id}`}
                      type="text"
                      value={manualForm[field.id] || ''}
                      onChange={(e) => setManualForm({ ...manualForm, [field.id]: e.target.value })}
                      className="field"
                      required
                      placeholder="Palavra-chave"
                    />
                  )}
                  {field.type === 'textarea' && (
                    <textarea
                      id={`mf-${field.id}`}
                      value={manualForm[field.id] || ''}
                      onChange={(e) => setManualForm({ ...manualForm, [field.id]: e.target.value })}
                      className="field"
                      rows="3"
                      style={{ resize: 'none', padding: '12px 14px' }}
                      required
                      minLength={activeManualChallenge.id === 'sponsor_tecnologia' ? 15 : undefined}
                    />
                  )}
                  {field.type === 'photo' && (
                    <div>
                      {!photoPreviews[field.id] ? (
                        <input
                          id={`mf-${field.id}`}
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
                          className="field"
                          style={{ padding: '12px 14px' }}
                          required
                        />
                      ) : (
                        <div className="relative mt-2 overflow-hidden rounded-xl border border-line-2">
                          <img
                            src={photoPreviews[field.id]}
                            alt="Pré-visualização da missão"
                            className="block max-h-[200px] w-full object-cover"
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
                            aria-label="Remover foto"
                            className="absolute right-2 top-2 flex h-11 w-11 items-center justify-center rounded-full border-0 bg-[rgba(5,8,20,0.7)] text-err"
                          >
                            <Trash2 size={18} aria-hidden="true" />
                          </button>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ))}

              <button type="submit" className="btn btn-primary btn-block mt-2" disabled={isSubmitting}>
                {isSubmitting && <Loader2 size={18} className="animate-spin" aria-hidden="true" />}
                {isSubmitting ? 'Enviando...' : 'Concluir missão'}
              </button>
            </form>
          </div>
        </>,
        document.body
      )}

      {selectedAutoChallenge && typeof document !== 'undefined' && createPortal(
        <>
          <div className="ds-scrim" onClick={() => setSelectedAutoChallenge(null)} aria-hidden="true" />
          <div className="ds-sheet" role="dialog" aria-modal="true" aria-labelledby="auto-sheet-title">
            <div className="flex items-start gap-3">
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[rgba(143,160,255,0.13)] text-link">
                <QrCode size={20} aria-hidden="true" />
              </span>
              <div className="min-w-0 flex-1">
                <h2 id="auto-sheet-title" className="m-0 text-lg font-extrabold text-text">
                  {selectedAutoChallenge.title || selectedAutoChallenge.name}
                </h2>
                <span className="pts-chip mt-1">+{selectedAutoChallenge.points} pts</span>
              </div>
              <button type="button" onClick={() => setSelectedAutoChallenge(null)} aria-label="Fechar" className="-mr-2 -mt-2 flex h-11 w-11 shrink-0 items-center justify-center rounded-full border-0 bg-transparent text-text-2">
                <X size={22} aria-hidden="true" />
              </button>
            </div>

            <p className="mb-4 mt-3 text-sm leading-relaxed text-text-2">
              {selectedAutoChallenge.description}
            </p>

            <div className="mb-5 flex items-start gap-2.5 rounded-xl bg-surface-raised p-3.5">
              <Zap size={18} className="mt-0.5 shrink-0 text-link" aria-hidden="true" />
              <p className="m-0 text-[13px] leading-snug text-text-2">
                <b className="text-text">Os pontos entram sozinhos.</b> Não precisa enviar nada: o app registra assim que você fizer a ação no evento.
              </p>
            </div>

            <div className="flex flex-col gap-2.5">
              {(selectedAutoChallenge.autoConfig?.eventType === 'lecture_checkin' || selectedAutoChallenge.id?.includes('lecture')) ? (
                <button
                  type="button"
                  className="btn btn-primary btn-block"
                  onClick={() => {
                    setSelectedAutoChallenge(null);
                    navigate('/agenda');
                  }}
                >
                  Ver programação
                </button>
              ) : isPassportMission(selectedAutoChallenge) ? (
                <button
                  type="button"
                  className="btn btn-primary btn-block"
                  onClick={() => {
                    setSelectedAutoChallenge(null);
                    navigate('/challenges?tab=passport', { replace: true });
                  }}
                >
                  Ver passaporte
                </button>
              ) : (
                <button
                  type="button"
                  className="btn btn-primary btn-block"
                  onClick={() => {
                    setSelectedAutoChallenge(null);
                    navigate('/scanner');
                  }}
                >
                  <Camera size={18} aria-hidden="true" />
                  Abrir câmera e escanear
                </button>
              )}

              <button type="button" className="btn btn-secondary btn-block" onClick={() => setSelectedAutoChallenge(null)}>
                Voltar
              </button>
            </div>
          </div>
        </>,
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

/* ---------- Peças visuais ---------- */

function SummaryRing({ done, total, earned, open }) {
  const C = 126; // 2πr, r = 20
  const offset = total > 0 ? C * (1 - done / total) : C;
  return (
    <div className="mt-[18px] flex items-center gap-3.5 rounded-[18px] bg-surface px-4 py-3.5">
      <svg width="52" height="52" viewBox="0 0 52 52" aria-hidden="true" className="shrink-0">
        <defs>
          <linearGradient id="conq-ring-grad" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor="#2563EB" />
            <stop offset="1" stopColor="#9B7BFF" />
          </linearGradient>
        </defs>
        <circle cx="26" cy="26" r="20" fill="none" stroke="var(--surface-raised)" strokeWidth="6" />
        <circle
          className="conq-ring-fill"
          cx="26" cy="26" r="20" fill="none" stroke="url(#conq-ring-grad)" strokeWidth="6" strokeLinecap="round"
          strokeDasharray={C} strokeDashoffset={offset} transform="rotate(-90 26 26)"
        />
        <text x="26" y="30" textAnchor="middle" fontFamily="Montserrat" fontSize="12" fontWeight="900" fill="var(--text)">{done}/{total}</text>
      </svg>
      <span className="flex-1">
        <span className="block text-[15px] font-extrabold">{done} de {total} {total === 1 ? 'missão feita' : 'missões feitas'}</span>
        <span className="mt-0.5 block text-[13px] text-text-2">
          <b className="text-you-text">+{earned} pts</b> até agora · <b className="text-text">{open} pts</b> em jogo
        </span>
      </span>
    </div>
  );
}

function FlashBanner({ mission, countdown, fraction, onJoin }) {
  return (
    <div className="relative mt-3 overflow-hidden rounded-[18px] border border-[rgba(245,158,11,0.28)] bg-surface px-4 py-3.5">
      <div className="flex items-center gap-3">
        <span className="relative flex h-[42px] w-[42px] shrink-0 items-center justify-center rounded-full bg-[rgba(245,158,11,0.16)]">
          <span className="conq-wave absolute inset-0 rounded-full border-2 border-[rgba(245,158,11,0.5)]" aria-hidden="true" />
          <span className="conq-bolt flex">
            <Zap size={20} color="var(--gold)" strokeWidth={2.2} aria-hidden="true" />
          </span>
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-xs font-extrabold text-gold">
            Relâmpago{countdown ? ` · ${countdown} restantes` : ''}
          </span>
          <span className="mt-0.5 block text-[15px] font-extrabold">
            {mission.title || mission.name} <span className="text-you-text">+{mission.points}</span>
          </span>
        </span>
        <button type="button" className="btn btn-action btn-sm press shrink-0" onClick={onJoin}>
          Participar
        </button>
      </div>
      <div className="relative mt-3 h-1 overflow-hidden rounded-sm bg-surface-raised" aria-hidden="true">
        <span className="conq-drain block h-1 rounded-sm bg-gold" style={{ transform: `scaleX(${fraction})` }} />
      </div>
    </div>
  );
}

const TWINKLES = [
  { left: 30, top: 8, size: 9, delay: '0s' },
  { left: 250, top: 14, size: 7, delay: '0.8s' },
  { left: 200, top: 78, size: 8, delay: '1.6s' },
];

function MissionIcon({ style, mission, sponsor, done, getIcon }) {
  const base = 'relative flex h-11 w-11 items-center justify-center overflow-hidden rounded-xl';
  if (done) {
    const Icon = getIcon(mission.icon || MapPin);
    return <span className={`${base} bg-[rgba(111,216,166,0.13)] text-ok`}><Icon size={20} aria-hidden="true" /></span>;
  }
  switch (style) {
    case 'secreta':
      return (
        <span className={base} style={{ background: 'linear-gradient(135deg, #7C3AED, #4C1D95)', boxShadow: '0 0 18px rgba(124,58,237,0.55)', overflow: 'visible' }}>
          <Lock size={20} color="#fff" aria-hidden="true" />
        </span>
      );
    case 'caca-qr':
      return (
        <span className={`${base} bg-[rgba(245,158,11,0.13)]`}>
          <span className="conq-radar absolute -inset-2.5" aria-hidden="true" />
          <QrCode size={20} color="var(--gold)" className="relative" aria-hidden="true" />
        </span>
      );
    case 'relampago':
      return <span className={`${base} bg-[rgba(245,158,11,0.16)]`}><Zap size={20} color="var(--gold)" aria-hidden="true" /></span>;
    case 'stories':
      return (
        <span className="h-11 w-11 rounded-xl p-0.5" style={{ background: 'linear-gradient(45deg, #F58529, #DD2A7B, #8134AF)' }}>
          <span className="flex h-full w-full items-center justify-center rounded-[10px] bg-surface">
            <Camera size={20} color="#F59AC0" aria-hidden="true" />
          </span>
        </span>
      );
    case 'quiz':
      return <span className={`${base} bg-[rgba(143,160,255,0.13)] text-link`}><CircleHelp size={20} aria-hidden="true" /></span>;
    case 'patrocinador':
      if (sponsor) {
        return (
          <span className={`${base} bg-[#F4F5FA]`}>
            <img src={sponsor.logo} alt={sponsor.name} className="max-h-5 max-w-9 object-contain" />
          </span>
        );
      }
    // fallthrough: sem logo conhecido, usa o ícone padrão
    default: {
      const Icon = getIcon(mission.icon || MapPin);
      const tint = CATEGORY_TINT[mission.category] || '#8FA0FF';
      return <span className={base} style={{ background: `${tint}22`, color: tint }}><Icon size={20} aria-hidden="true" /></span>;
    }
  }
}

function MissionCard({ mission, getIcon, onStart, done = false }) {
  const style = missionStyle(mission);
  const sponsor = style === 'patrocinador' ? missionSponsor(mission) : null;
  const tier = sponsor ? TIER_STYLE[sponsor.tier] : null;
  const secret = style === 'secreta' && !done;
  const hint = mission.secretConfig?.hint || mission.hint;
  const deadline = style === 'caca-qr' ? formatDeadline(mission.endsAt || mission.availableUntil || mission.deadline) : null;
  const quizCount = mission.quizConfig?.questions?.length || (mission.quizConfig?.question ? 1 : 0);
  const quizMinutes = mission.quizConfig?.minutes || mission.quizConfig?.durationMinutes;

  let cardStyle;
  if (done) cardStyle = { background: '#0F1530', borderColor: 'var(--line)', opacity: 0.75 };
  else if (secret) cardStyle = { background: 'linear-gradient(135deg, #1D1347, #0E0B26)', borderColor: 'rgba(167,139,250,0.45)', boxShadow: '0 10px 26px -14px rgba(124,58,237,0.8)' };
  else if (tier?.tint) cardStyle = { background: `linear-gradient(160deg, ${tier.tint}, var(--surface) 45%)`, borderColor: tier.cardLine };
  else if (style === 'relampago') cardStyle = { borderColor: 'rgba(245,158,11,0.28)' };

  return (
    <article className="relative overflow-hidden rounded-[18px] border border-line bg-surface p-3.5" style={cardStyle}>
      {secret && (
        <>
          <span className="conq-dots absolute inset-0" aria-hidden="true" />
          <span className="conq-float absolute -top-3.5 right-[92px] text-[92px] font-black leading-none text-[rgba(167,139,250,0.10)]" aria-hidden="true">?</span>
          {TWINKLES.map((t) => (
            <svg key={t.left} className="conq-twinkle absolute" aria-hidden="true" width={t.size} height={t.size} viewBox="0 0 10 10" style={{ left: t.left, top: t.top, animationDelay: t.delay }}>
              <path d="M5 0 6 4 10 5 6 6 5 10 4 6 0 5 4 4z" fill="#E9DDFF" />
            </svg>
          ))}
        </>
      )}

      <div className="relative grid grid-cols-[44px_1fr] items-start gap-3">
        <MissionIcon style={style} mission={mission} sponsor={sponsor} done={done} getIcon={getIcon} />
        <span className="min-w-0">
          <h3 className={`m-0 text-[15px] font-extrabold ${secret ? 'text-[#E9DDFF]' : 'text-text'}`}>{mission.title || mission.name}</h3>
          {mission.description && <p className="m-0 mt-[3px] text-[13px] leading-[1.4] text-text-2">{mission.description}</p>}
        </span>
      </div>

      <div className="relative mt-3 flex items-center gap-2 border-t border-white/[.06] pt-3">
        <span className="flex min-w-0 flex-1 flex-wrap items-center gap-1.5">
          <span
            className="pts-chip"
            style={done ? { background: 'rgba(111,216,166,0.14)', color: 'var(--ok)' } : secret ? { background: 'rgba(124,58,237,0.5)', color: '#fff' } : undefined}
          >
            +{mission.points} pts
          </span>
          {!done && secret && hint && (
            <span className="inline-flex items-center gap-1.5 rounded-lg bg-white/[.06] px-2 py-0.5 text-xs font-bold text-[#C4B5FD]">
              Dica:<span className="tracking-[2px] text-white blur-[3.5px]">{hint}</span>
            </span>
          )}
          {!done && deadline && <span className="text-xs font-bold text-gold">{deadline}</span>}
          {!done && style === 'relampago' && <span className="text-xs font-bold text-gold">Relâmpago</span>}
          {!done && style === 'quiz' && quizCount > 0 && (
            <span className="text-xs font-bold text-text-3">
              {quizCount} {quizCount === 1 ? 'pergunta' : 'perguntas'}{quizMinutes ? ` · ${quizMinutes} min` : ''}
            </span>
          )}
          {!done && tier && (
            <span className="rounded-lg px-2 py-0.5 text-xs font-extrabold" style={{ background: tier.soft, color: tier.text }}>{tier.label}</span>
          )}
        </span>
        {done ? (
          <span className="inline-flex h-9 items-center gap-1.5 rounded-[10px] bg-[rgba(111,216,166,0.14)] px-3 text-[13px] font-extrabold text-ok">
            <Check size={15} strokeWidth={2.6} aria-hidden="true" />
            Feita
          </span>
        ) : (
          <button
            type="button"
            className="btn btn-action btn-sm press shrink-0"
            style={secret ? { background: 'linear-gradient(135deg, #7C3AED, #A855F7)' } : undefined}
            onClick={onStart}
          >
            {ctaLabel(mission)}
          </button>
        )}
      </div>
    </article>
  );
}
