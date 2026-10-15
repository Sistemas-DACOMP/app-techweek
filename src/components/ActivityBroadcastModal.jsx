import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X, Send, Megaphone, Users, UserCheck, Clock, AlertTriangle, CheckCircle2, History } from 'lucide-react';
import {
  BROADCAST_TEMPLATES,
  sendActivityBroadcast,
  getActivityBroadcasts,
} from '../lib/liveOpsService';
import { useScrollLock } from '../hooks/useScrollLock';

const AUDIENCES = [
  { id: 'all', label: 'Todos os Inscritos', icon: Users, desc: 'Notifica todos os alunos com vaga confirmada' },
  { id: 'checked_in', label: 'Apenas Presentes', icon: UserCheck, desc: 'Notifica quem já fez check-in na sala' },
  { id: 'pending', label: 'Apenas Pendentes', icon: Clock, desc: 'Notifica quem ainda não chegou (alerta de início)' },
];

export default function ActivityBroadcastModal({ activity, onClose, onSuccess }) {
  useScrollLock(true);

  const [audience, setAudience] = useState('all');
  const [selectedTemplate, setSelectedTemplate] = useState('start_10m');
  const [title, setTitle] = useState('');
  const [message, setMessage] = useState('');
  const [urgent, setUrgent] = useState(false);
  const [history, setHistory] = useState([]);
  const [sending, setSending] = useState(false);
  const [sentSuccess, setSentSuccess] = useState(false);

  const activityTitle = activity?.title || 'Atividade Selecionada';
  const activityLocation = activity?.location || 'Local da Atividade';
  const activityTime = activity?.time || 'Horário Oficial';
  const totalSubscribers = activity?.total_inscritos || activity?.inscritos || 0;

  // Carrega histórico de avisos enviados para esta atividade
  const refreshHistory = () => {
    if (activity?.id) {
      setHistory(getActivityBroadcasts(activity.id));
    }
  };

  useEffect(() => {
    refreshHistory();
  }, [activity?.id]);

  // Aplica o template escolhido substituindo as variáveis dinâmicas
  const applyTemplate = (tplId) => {
    setSelectedTemplate(tplId);
    const tpl = BROADCAST_TEMPLATES.find((t) => t.id === tplId);
    if (!tpl) return;

    if (tpl.id === 'custom') {
      setTitle('Comunicado aos Participantes');
      setMessage('');
      return;
    }

    const compiledTitle = tpl.title.replace('{titulo}', activityTitle).replace('{local}', activityLocation);
    const compiledMessage = tpl.message.replace('{titulo}', activityTitle).replace('{local}', activityLocation);

    setTitle(compiledTitle);
    setMessage(compiledMessage);
  };

  // Inicializa com o template padrão de 10 minutos
  useEffect(() => {
    applyTemplate('start_10m');
  }, [activity]);

  // Fechar com tecla Escape
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  const handleSend = async (e) => {
    e.preventDefault();
    if (!message.trim() || sending) return;

    setSending(true);
    try {
      const result = sendActivityBroadcast({
        activityId: activity.id,
        activityTitle,
        location: activityLocation,
        targetAudience: audience,
        title: title.trim() || `Aviso: ${activityTitle}`,
        message: message.trim(),
        urgent,
      });

      setSentSuccess(true);
      refreshHistory();
      if (onSuccess) onSuccess(result);

      setTimeout(() => {
        setSentSuccess(false);
        onClose();
      }, 1500);
    } catch (err) {
      console.error('[ActivityBroadcast] Erro ao disparar aviso:', err);
    } finally {
      setSending(false);
    }
  };

  if (typeof document === 'undefined') return null;

  return createPortal(
    <>
      <div className="ds-scrim" aria-hidden="true" onClick={onClose} />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="broadcast-modal-title"
        className="fixed inset-x-0 bottom-0 top-[max(48px,calc(env(safe-area-inset-top)+12px))] z-[2002] mx-auto flex max-w-[560px] flex-col overflow-hidden rounded-t-[24px] bg-surface text-text shadow-2xl lg:inset-y-auto lg:top-1/2 lg:-translate-y-1/2 lg:rounded-[24px]"
      >
        {/* Cabeçalho */}
        <div className="shrink-0 border-b border-line bg-surface-raised px-5 py-4">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-link/15 px-2.5 py-0.5 text-[12px] font-black text-link">
                <Megaphone size={13} aria-hidden="true" /> Live Ops • Disparo Segmentado
              </span>
              <h2 id="broadcast-modal-title" className="mt-1 truncate text-[18px] font-extrabold text-text">
                Enviar Aviso aos Inscritos
              </h2>
              <p className="mt-0.5 truncate text-[13px] text-text-2">
                {activityTitle} · <span className="font-semibold text-text">{activityLocation}</span> ({activityTime})
              </p>
            </div>
            <button
              type="button"
              onClick={onClose}
              aria-label="Fechar"
              className="-mr-2 flex h-9 w-9 items-center justify-center rounded-full text-text-2 hover:bg-surface hover:text-text"
            >
              <X size={18} aria-hidden="true" />
            </button>
          </div>
        </div>

        {/* Corpo com Scroll */}
        <div className="flex-1 overflow-y-auto p-5 pb-[max(20px,calc(env(safe-area-inset-bottom)+12px))] space-y-4">
          {sentSuccess ? (
            <div className="flex flex-col items-center justify-center py-10 text-center animate-fadeIn">
              <div className="flex h-14 w-14 items-center justify-center rounded-full bg-ok/20 text-ok mb-3">
                <CheckCircle2 size={32} />
              </div>
              <h3 className="text-[17px] font-extrabold text-text">Aviso disparado com sucesso!</h3>
              <p className="mt-1 text-[13px] text-text-2 max-w-sm">
                Os participantes no grupo selecionado receberam a notificação instantânea no aplicativo.
              </p>
            </div>
          ) : (
            <form onSubmit={handleSend} className="space-y-4">
              {/* Seleção do Público-Alvo */}
              <div>
                <label className="block text-[13px] font-bold text-text-2 mb-2">
                  Público de Destino ({totalSubscribers > 0 ? `${totalSubscribers} inscritos` : 'Grupo da atividade'})
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  {AUDIENCES.map((aud) => {
                    const Icon = aud.icon;
                    const isSelected = audience === aud.id;
                    return (
                      <button
                        key={aud.id}
                        type="button"
                        onClick={() => setAudience(aud.id)}
                        className={`flex flex-col items-start p-2.5 rounded-xl border text-left transition-all ${
                          isSelected
                            ? 'border-link bg-link/10 text-link'
                            : 'border-line bg-surface-raised text-text-2 hover:border-line-2 hover:text-text'
                        }`}
                      >
                        <div className="flex items-center gap-1.5 text-[12px] font-bold">
                          <Icon size={14} className={isSelected ? 'text-link' : 'text-text-3'} />
                          <span>{aud.label}</span>
                        </div>
                        <span className="mt-1 text-[11px] leading-tight text-text-3 line-clamp-2">
                          {aud.desc}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Modelos Rápidos de Mensagem */}
              <div>
                <label className="block text-[13px] font-bold text-text-2 mb-2">
                  Modelos Rápidos (1 Toque)
                </label>
                <div className="flex flex-wrap gap-1.5">
                  {BROADCAST_TEMPLATES.map((tpl) => (
                    <button
                      key={tpl.id}
                      type="button"
                      onClick={() => applyTemplate(tpl.id)}
                      className={`min-h-[34px] rounded-lg px-3 text-[12px] font-bold transition-colors ${
                        selectedTemplate === tpl.id
                          ? 'bg-link text-white'
                          : 'bg-surface-raised text-text-2 hover:bg-surface-selected hover:text-text'
                      }`}
                    >
                      {tpl.name}
                    </button>
                  ))}
                </div>
              </div>

              {/* Título da Notificação */}
              <div>
                <label htmlFor="broadcast-title" className="block text-[13px] font-bold text-text-2 mb-1.5">
                  Título da Notificação
                </label>
                <input
                  id="broadcast-title"
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Ex: Início em 10 minutos"
                  className="field w-full text-[14px]"
                  maxLength={70}
                  required
                />
              </div>

              {/* Mensagem */}
              <div>
                <label htmlFor="broadcast-message" className="block text-[13px] font-bold text-text-2 mb-1.5">
                  Mensagem aos Participantes
                </label>
                <textarea
                  id="broadcast-message"
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder="Digite a mensagem que aparecerá na barra de notificações dos alunos..."
                  rows={3}
                  className="field w-full text-[14px] leading-relaxed resize-none"
                  maxLength={300}
                  required
                />
                <div className="mt-1 flex items-center justify-between text-[11px] text-text-3">
                  <span>Suporta menção à sala e horário</span>
                  <span>{message.length} / 300</span>
                </div>
              </div>

              {/* Toggle de Urgência */}
              <label className="flex items-center gap-2.5 p-3 rounded-xl border border-line bg-surface-raised cursor-pointer hover:bg-surface-selected transition-colors">
                <input
                  type="checkbox"
                  checked={urgent}
                  onChange={(e) => setUrgent(e.target.checked)}
                  className="h-4 w-4 rounded border-field-line text-link focus:ring-link"
                />
                <span className="flex items-center gap-1.5 text-[13px] font-semibold text-text">
                  <AlertTriangle size={15} className={urgent ? 'text-warn' : 'text-text-3'} />
                  Destacar como urgente (destaque visual prioritário na central)
                </span>
              </label>

              {/* Histórico Recente de Disparos */}
              {history.length > 0 && (
                <div className="pt-2 border-t border-line">
                  <span className="flex items-center gap-1 text-[12px] font-bold text-text-3 mb-2">
                    <History size={13} /> Histórico de Disparos ({history.length})
                  </span>
                  <div className="space-y-1.5 max-h-28 overflow-y-auto pr-1">
                    {history.slice(0, 3).map((item) => (
                      <div key={item.id} className="p-2 rounded-lg bg-surface-raised border border-line text-[11px] text-text-2">
                        <div className="flex items-center justify-between gap-1 font-bold text-text">
                          <span className="truncate">{item.title}</span>
                          <span className="text-[10px] text-text-3 shrink-0">
                            {item.sentAt ? new Date(item.sentAt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }) : ''}
                          </span>
                        </div>
                        <p className="mt-0.5 truncate text-text-3">{item.message}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Rodapé de Ações */}
              <div className="flex items-center justify-end gap-2 pt-3 border-t border-line">
                <button
                  type="button"
                  onClick={onClose}
                  className="btn btn-secondary min-h-11 px-4 text-[14px]"
                  disabled={sending}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={sending || !message.trim()}
                  className="btn btn-primary min-h-11 px-5 text-[14px] font-bold"
                >
                  <Send size={15} aria-hidden="true" />
                  {sending ? 'Disparando...' : 'Disparar Aviso Agora'}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </>,
    document.body
  );
}
