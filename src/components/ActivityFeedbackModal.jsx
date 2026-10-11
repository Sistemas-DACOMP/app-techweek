import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X, Star, Check, Sparkles, Send, Award, ThumbsUp } from 'lucide-react';
import {
  SEMANTIC_RATING_LABELS,
  PERCEPTION_TAGS,
  submitMicroPulseRating,
  markActivityEvaluated,
} from '../lib/liveOpsService';
import { addPointEvent } from '../lib/gameplay';
import { useAuth } from '../contexts/AuthContext';
import { useScrollLock } from '../hooks/useScrollLock';

// Peças leves de confete para celebração de recompensa (+10 XP)
const CONFETTI_PIECES = [
  [-40, -80, 180, 0.25, '#FBBF24', 10, 6],
  [30, -90, -120, 0.3, '#7C3AED', 8, 8],
  [70, -60, 200, 0.35, '#2563EB', 11, 5],
  [-60, -50, -160, 0.4, '#6FD8A6', 9, 9],
  [10, -110, 140, 0.28, '#F59AC0', 10, 6],
  [-20, -100, 220, 0.38, '#FBBF24', 8, 8],
];

export default function ActivityFeedbackModal({
  activity,
  onClose,
  onSuccess,
}) {
  useScrollLock(true);

  let authUser = null;
  try {
    const auth = useAuth();
    authUser = auth?.user;
  } catch (_err) {
    // Fallback gracioso caso executado fora do AuthProvider (ex: testes ou SSR)
  }
  const user = authUser;

  const [rating, setRating] = useState(5);
  const [hoverRating, setHoverRating] = useState(0);
  const [selectedTags, setSelectedTags] = useState(['Didática Clara']);
  const [comment, setComment] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [rewardGranted, setRewardGranted] = useState(false);

  const activeRating = hoverRating || rating;
  const semanticLabel = SEMANTIC_RATING_LABELS[activeRating] || 'Excelente';

  const activityTitle = activity?.title || activity?.name || 'Atividade TechWeek';
  const speakerName = activity?.speaker || activity?.speaker_name || activity?.speakers?.[0]?.name || 'Palestrante Convidado';
  const activityLocation = activity?.location || activity?.room || 'Anfiteatro FACOM';

  // Toggle de tags em 1 toque
  const toggleTag = (tag) => {
    setSelectedTags((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]
    );
  };

  // Tecla Escape para fechar
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && !submitting) onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose, submitting]);

  const handleSubmit = async (e) => {
    if (e) e.preventDefault();
    if (submitting) return;

    setSubmitting(true);

    try {
      // 1. Grava no motor de Live Ops & Micro-Pulse (alimenta Telão e AdminDados)
      const reviewEntry = submitMicroPulseRating({
        activityId: activity?.id || 'geral',
        activityTitle,
        speaker: speakerName,
        rating,
        tag: selectedTags[0] || 'Didática Clara',
        tags: selectedTags,
        comment: comment.trim(),
        userCourse: user?.course || 'Ciência da Computação',
      });

      // 2. Marca atividade como avaliada no storage persistente
      markActivityEvaluated(activity?.id, user?.uid || 'anon');

      // 3. Credita +10 XP no gameplay / gamificação
      try {
        if (user?.uid) {
          await addPointEvent({
            eventType: 'activity_evaluation',
            referenceId: activity?.id || `feedback_${Date.now()}`,
            points: 10,
            metadata: {
              activityTitle,
              rating,
              tags: selectedTags,
            },
          });
        }
      } catch (err) {
        console.warn('[ActivityFeedback] Fallback local para XP:', err);
      }

      // Dispara evento imediato de atualização de pontos na UI
      if (typeof window !== 'undefined') {
        window.dispatchEvent(
          new CustomEvent('facom_points_updated', {
            detail: {
              delta: 10,
              source: 'activity_evaluation',
              activityId: activity?.id,
              event: {
                id: `xp_eval_${Date.now()}`,
                points: 10,
                eventType: 'activity_evaluation',
                referenceId: activity?.id,
              },
            },
          })
        );
      }

      // 4. Animação de Recompensa Imediata
      setRewardGranted(true);
      if (onSuccess) onSuccess(reviewEntry);

      setTimeout(() => {
        onClose();
      }, 1600);
    } catch (err) {
      console.error('[ActivityFeedback] Erro ao enviar avaliação:', err);
      setSubmitting(false);
    }
  };

  if (typeof document === 'undefined') return null;

  return createPortal(
    <>
      <div className="ds-scrim" aria-hidden="true" onClick={onClose} />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="feedback-title"
        className="fixed inset-x-0 bottom-0 top-10 z-[2005] mx-auto flex max-w-[480px] flex-col overflow-hidden rounded-t-[24px] bg-surface text-text shadow-2xl lg:inset-y-auto lg:top-1/2 lg:-translate-y-1/2 lg:rounded-[24px]"
      >
        {/* Topo com Identificação e Recompensa */}
        <div className="relative shrink-0 border-b border-line bg-surface-raised px-5 pb-4 pt-3.5">
          <div className="flex justify-center pb-2 lg:hidden" aria-hidden="true">
            <span className="h-1 w-9 rounded-full bg-line-2" />
          </div>
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <span className="inline-flex items-center gap-1 rounded-full bg-gradient-to-r from-amber-500/20 to-purple-500/20 px-2.5 py-0.5 text-[11px] font-black text-amber-300 border border-amber-500/30">
                  <Sparkles size={12} className="text-amber-400" /> +10 XP Recompensa
                </span>
                <span className="text-[12px] text-text-3 truncate">
                  {activityLocation}
                </span>
              </div>
              <h2 id="feedback-title" className="mt-1.5 truncate text-[18px] font-extrabold leading-snug text-text">
                {activityTitle}
              </h2>
              <p className="truncate text-[13px] text-text-2">
                Palestrante: <span className="font-semibold text-text">{speakerName}</span>
              </p>
            </div>
            <button
              type="button"
              onClick={onClose}
              disabled={submitting}
              aria-label="Fechar"
              className="-mr-2 flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-text-2 hover:bg-surface hover:text-text"
            >
              <X size={18} aria-hidden="true" />
            </button>
          </div>
        </div>

        {/* Conteúdo com Scroll */}
        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-5">
          {rewardGranted ? (
            /* Tela de Sucesso com Animação de +10 XP */
            <div className="relative flex flex-col items-center justify-center py-10 text-center animate-fadeIn">
              {CONFETTI_PIECES.map(([x, y, rr, d, bg, w, h], i) => (
                <span
                  key={i}
                  aria-hidden="true"
                  className="confetti absolute rounded-[2px]"
                  style={{
                    left: '50%',
                    top: '30%',
                    '--x': `${x}px`,
                    '--y': `${y}px`,
                    '--rr': `${rr}deg`,
                    '--d': `${d}s`,
                    width: w,
                    height: h,
                    background: bg,
                  }}
                />
              ))}
              <div className="relative mb-3 flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-tr from-amber-500 to-purple-600 text-white shadow-lg animate-bounce">
                <Award size={32} />
              </div>
              <span className="inline-block rounded-full bg-amber-400/20 px-3 py-1 text-sm font-black text-amber-400 border border-amber-400/30">
                +10 XP CREDITADOS!
              </span>
              <h3 className="mt-2 text-[20px] font-extrabold text-text">
                Obrigado pelo seu feedback!
              </h3>
              <p className="mt-1 text-[13px] text-text-2 max-w-xs">
                Sua avaliação já está refletindo em tempo real nos painéis de qualidade da TechWeek 2026.
              </p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-5">
              {/* Seção 1: Nota de 1 a 5 Estrelas com Rótulos Semânticos */}
              <div className="flex flex-col items-center rounded-2xl bg-surface-raised border border-line p-4 text-center">
                <span className="text-[12px] font-bold uppercase tracking-wider text-text-3">
                  Como foi sua experiência?
                </span>

                {/* Estrelas Interativas */}
                <div
                  className="my-3 flex items-center justify-center gap-2"
                  role="radiogroup"
                  aria-label="Nota da palestra de 1 a 5 estrelas"
                >
                  {[1, 2, 3, 4, 5].map((star) => {
                    const isFilled = star <= activeRating;
                    return (
                      <button
                        key={star}
                        type="button"
                        role="radio"
                        aria-checked={rating === star}
                        aria-label={`${star} estrela${star > 1 ? 's' : ''} - ${SEMANTIC_RATING_LABELS[star]}`}
                        onClick={() => setRating(star)}
                        onMouseEnter={() => setHoverRating(star)}
                        onMouseLeave={() => setHoverRating(0)}
                        className="group relative flex h-11 w-11 items-center justify-center rounded-xl transition-all duration-150 active:scale-90 hover:scale-110 focus:outline-none focus-visible:ring-2 focus-visible:ring-link"
                      >
                        <Star
                          size={28}
                          className={`transition-colors duration-150 ${
                            isFilled
                              ? 'fill-[#FBBF24] text-[#FBBF24] filter drop-shadow-[0_2px_8px_rgba(251,191,36,0.4)]'
                              : 'fill-transparent text-text-4 group-hover:text-text-3'
                          }`}
                        />
                      </button>
                    );
                  })}
                </div>

                {/* Rótulo Semântico com Micro-Animação */}
                <div className="h-6 flex items-center justify-center">
                  <span
                    key={activeRating}
                    className="inline-flex items-center gap-1.5 text-[15px] font-extrabold text-amber-400 transition-all duration-200 animate-fadeIn"
                  >
                    {activeRating === 5 && '🌟 '}
                    {activeRating === 4 && '✨ '}
                    {activeRating === 3 && '👍 '}
                    {activeRating === 2 && '😐 '}
                    {activeRating === 1 && '👎 '}
                    {semanticLabel}
                  </span>
                </div>
              </div>

              {/* Seção 2: Tags de Percepção em 1 Toque */}
              <div>
                <label className="block text-[13px] font-bold text-text-2 mb-2">
                  Destaques da Apresentação (Toque para selecionar)
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {PERCEPTION_TAGS.map((tag) => {
                    const isSelected = selectedTags.includes(tag);
                    return (
                      <button
                        key={tag}
                        type="button"
                        onClick={() => toggleTag(tag)}
                        className={`flex min-h-[44px] items-center justify-between rounded-xl px-3 py-2 text-left text-[12px] font-bold transition-all border ${
                          isSelected
                            ? 'border-link bg-link/15 text-white shadow-sm'
                            : 'border-line bg-surface-raised text-text-2 hover:border-line-2 hover:text-text'
                        }`}
                      >
                        <span>{tag}</span>
                        {isSelected ? (
                          <Check size={14} className="text-link shrink-0 ml-1.5" />
                        ) : (
                          <span className="h-3 w-3 rounded-full border border-line-2 shrink-0 ml-1.5" />
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Seção 3: Comentário Opcional */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label htmlFor="feedback-comment" className="block text-[13px] font-bold text-text-2">
                    Comentário para o Palestrante <span className="text-[11px] font-normal text-text-3">(opcional)</span>
                  </label>
                  <span className="text-[11px] text-text-3">
                    {comment.length}/240
                  </span>
                </div>
                <textarea
                  id="feedback-comment"
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  placeholder="Elogios, dúvidas ou pontos fortes da apresentação..."
                  rows={2}
                  maxLength={240}
                  className="field w-full text-[14px] leading-relaxed resize-none"
                />
              </div>

              {/* Rodapé Fixo de Ação */}
              <div className="pt-2">
                <button
                  type="submit"
                  disabled={submitting}
                  className="btn btn-primary btn-block min-h-[50px] text-[15px] font-extrabold flex items-center justify-center gap-2 shadow-lg"
                >
                  <ThumbsUp size={18} aria-hidden="true" />
                  {submitting ? 'Enviando avaliação...' : 'Enviar Avaliação (+10 XP)'}
                </button>
                <p className="mt-2 text-center text-[11px] text-text-3">
                  Sua pontuação será somada instantaneamente no ranking e exibida nos painéis.
                </p>
              </div>
            </form>
          )}
        </div>
      </div>
    </>,
    document.body
  );
}
