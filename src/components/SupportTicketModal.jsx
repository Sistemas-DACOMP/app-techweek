import { useState, useEffect, useMemo } from 'react';
import {
  LifeBuoy,
  X,
  Plus,
  Send,
  Clock,
  CheckCircle2,
  AlertTriangle,
  Flame,
  Phone,
  MapPin,
  Building2,
  Wrench,
  Check,
  MessageSquare,
  Sparkles,
  ChevronRight,
  RefreshCw,
} from 'lucide-react';
import {
  getTickets,
  createTicket,
  addTicketNote,
  updateTicketStatus,
  SPONSOR_TICKET_CATEGORIES,
  SPONSOR_PRESETS,
  STAFF_TICKET_CATEGORIES,
  STAFF_PRESETS,
  TICKETS_UPDATED_EVENT,
} from '../lib/ticketService';
import Mascot from './Mascot';

const CONTACT_PHONE_STORAGE = 'techweek_last_ticket_phone';

const PRIORITY_CONFIG = {
  baixa: { label: 'Baixa', color: 'var(--text-3)', bg: 'rgba(255,255,255,0.06)', border: 'var(--line)' },
  media: { label: 'Média', color: 'var(--link)', bg: 'rgba(96,165,250,0.12)', border: 'rgba(96,165,250,0.3)' },
  alta: { label: 'Alta', color: 'var(--warn)', bg: 'rgba(245,158,11,0.15)', border: 'rgba(245,158,11,0.35)' },
  urgente: { label: 'Urgente', color: 'var(--err)', bg: 'rgba(239,68,68,0.18)', border: 'rgba(239,68,68,0.4)' },
};

const STATUS_CONFIG = {
  open: { label: 'Aberto · Na Fila', color: 'var(--warn)', bg: 'rgba(245,158,11,0.15)', dot: '#F59E0B' },
  in_progress: { label: 'Em Atendimento', color: 'var(--link)', bg: 'rgba(96,165,250,0.15)', dot: '#60A5FA' },
  resolved: { label: 'Resolvido', color: 'var(--ok)', bg: 'rgba(16,185,129,0.15)', dot: '#10B981' },
  cancelled: { label: 'Cancelado', color: 'var(--text-4)', bg: 'rgba(255,255,255,0.05)', dot: '#6B7280' },
};

function formatRelativeTime(iso) {
  if (!iso) return '';
  const diffSec = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (diffSec < 60) return 'agora mesmo';
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `há ${diffMin} ${diffMin === 1 ? 'minuto' : 'minutos'}`;
  const diffH = Math.floor(diffMin / 60);
  if (diffH < 24) return `há ${diffH} ${diffH === 1 ? 'hora' : 'horas'}`;
  return new Date(iso).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });
}

export default function SupportTicketModal({
  isOpen,
  onClose,
  role = 'SPONSOR',
  entityName = '',
  senderName = '',
  senderEmail = '',
  defaultLocation = '',
}) {
  const [activeTab, setActiveTab] = useState('new'); // 'new' | 'list'
  const [tickets, setTickets] = useState([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successToast, setSuccessToast] = useState('');

  // Form states
  const [category, setCategory] = useState(role === 'SPONSOR' ? 'infra' : 'crowd');
  const [priority, setPriority] = useState('media');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [location, setLocation] = useState(defaultLocation);
  const [phone, setPhone] = useState(() => {
    try {
      return localStorage.getItem(CONTACT_PHONE_STORAGE) || '';
    } catch {
      return '';
    }
  });

  // Reply note in list
  const [replyTextMap, setReplyTextMap] = useState({});
  const [sendingReplyId, setSendingReplyId] = useState(null);

  const categories = role === 'SPONSOR' ? SPONSOR_TICKET_CATEGORIES : STAFF_TICKET_CATEGORIES;
  const presets = role === 'SPONSOR' ? SPONSOR_PRESETS : STAFF_PRESETS;

  // Carrega e atualiza chamados em tempo real
  const reloadTickets = () => {
    const all = getTickets();
    const myEntity = (entityName || '').trim().toLowerCase();
    const myRole = role.toUpperCase();
    const myEmail = (senderEmail || '').trim().toLowerCase();

    const filtered = all.filter((t) => {
      if (t.role !== myRole) return false;
      if (myEntity && (t.entityName || '').toLowerCase().includes(myEntity)) return true;
      if (myEmail && (t.senderEmail || '').toLowerCase() === myEmail) return true;
      return true;
    });

    setTickets(filtered);
  };

  useEffect(() => {
    if (!isOpen) return;
    reloadTickets();
    if (defaultLocation && !location) {
      setLocation(defaultLocation);
    }

    const handleUpdate = () => reloadTickets();
    window.addEventListener(TICKETS_UPDATED_EVENT, handleUpdate);
    return () => window.removeEventListener(TICKETS_UPDATED_EVENT, handleUpdate);
  }, [isOpen, defaultLocation, entityName, role, senderEmail]);

  // Lock body scroll
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
      const handleKeyDown = (e) => {
        if (e.key === 'Escape') onClose();
      };
      window.addEventListener('keydown', handleKeyDown);
      return () => {
        document.body.style.overflow = '';
        window.removeEventListener('keydown', handleKeyDown);
      };
    }
  }, [isOpen, onClose]);

  const activeTickets = useMemo(() => {
    return tickets.filter((t) => t.status === 'open' || t.status === 'in_progress');
  }, [tickets]);

  const handleApplyPreset = (preset) => {
    setTitle(preset.title);
    setDescription(preset.description);
    setCategory(preset.category);
    setPriority(preset.priority);
  };

  const handleSubmitTicket = (e) => {
    e.preventDefault();
    if (!title.trim()) return;

    setIsSubmitting(true);
    try {
      if (phone.trim()) {
        try {
          localStorage.setItem(CONTACT_PHONE_STORAGE, phone.trim());
        } catch {
          // ignore
        }
      }

      createTicket({
        role,
        senderName: senderName || (role === 'SPONSOR' ? 'Representante do Estande' : 'Monitor Staff'),
        senderEmail,
        senderPhone: phone.trim(),
        entityName: entityName || (role === 'SPONSOR' ? 'Estande Patrocinador' : 'Portaria Staff'),
        location: location.trim() || defaultLocation || 'Local não informado',
        category,
        priority,
        title: title.trim(),
        description: description.trim(),
      });

      setTitle('');
      setDescription('');
      setSuccessToast('Chamado registrado com sucesso! A coordenação foi notificada.');
      setTimeout(() => setSuccessToast(''), 4000);
      setActiveTab('list');
      reloadTickets();
    } catch (err) {
      console.error('Erro ao abrir chamado:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSendReply = (ticketId) => {
    const text = replyTextMap[ticketId];
    if (!text || !text.trim()) return;

    setSendingReplyId(ticketId);
    try {
      addTicketNote(ticketId, {
        author: senderName || (role === 'SPONSOR' ? entityName : 'Staff'),
        text: text.trim(),
        isStaffOrAdmin: false,
      });
      setReplyTextMap((prev) => ({ ...prev, [ticketId]: '' }));
      reloadTickets();
    } finally {
      setSendingReplyId(null);
    }
  };

  const handleMarkResolvedByRequester = (ticketId) => {
    updateTicketStatus(
      ticketId,
      'resolved',
      null,
      `Resolvido pelo solicitante (${senderName || entityName}).`
    );
    reloadTickets();
  };

  if (!isOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="ticket-modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5"
    >
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/75 backdrop-blur-sm transition-opacity"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Modal Container */}
      <div
        className="relative flex flex-col w-full max-w-[580px] max-h-[90vh] bg-surface rounded-[24px] border border-line shadow-2xl overflow-hidden animate-scale-up"
        style={{ background: 'var(--surface)' }}
      >
        {/* Header */}
        <header className="flex items-center justify-between px-5 pt-4 pb-3 border-b border-line shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <span
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl"
              style={{
                background: role === 'SPONSOR' ? 'rgba(245,158,11,0.15)' : 'rgba(96,165,250,0.15)',
                color: role === 'SPONSOR' ? '#F59E0B' : '#60A5FA',
              }}
            >
              <LifeBuoy size={20} aria-hidden="true" />
            </span>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h2 id="ticket-modal-title" className="m-0 text-[16px] sm:text-[18px] font-extrabold text-text truncate">
                  Central de Apoio & Chamados
                </h2>
                <span
                  className="px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-wider"
                  style={{
                    background: role === 'SPONSOR' ? 'rgba(245,158,11,0.2)' : 'rgba(96,165,250,0.2)',
                    color: role === 'SPONSOR' ? '#F59E0B' : '#60A5FA',
                  }}
                >
                  {role === 'SPONSOR' ? (entityName || 'Patrocinador') : 'Staff Portaria'}
                </span>
              </div>
              <p className="m-0 text-[12px] text-text-3 truncate">
                Comunicação direta com a coordenação e equipe de infraestrutura
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Fechar"
            className="press flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-surface-raised text-text-2 hover:text-text"
          >
            <X size={18} />
          </button>
        </header>

        {/* Tab Selector */}
        <div className="flex items-center gap-1 px-5 pt-3 border-b border-line/60 bg-surface-raised/40 shrink-0">
          <button
            type="button"
            onClick={() => setActiveTab('new')}
            className={`press flex items-center gap-1.5 pb-2.5 px-3 text-[13px] font-bold border-b-2 transition-all ${
              activeTab === 'new'
                ? 'border-link text-text font-black'
                : 'border-transparent text-text-3 hover:text-text'
            }`}
          >
            <Plus size={15} />
            <span>Abrir Novo Chamado</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('list')}
            className={`press flex items-center gap-1.5 pb-2.5 px-3 text-[13px] font-bold border-b-2 transition-all ${
              activeTab === 'list'
                ? 'border-link text-text font-black'
                : 'border-transparent text-text-3 hover:text-text'
            }`}
          >
            <Clock size={15} />
            <span>Meus Chamados</span>
            {tickets.length > 0 && (
              <span
                className={`ml-1 rounded-full px-1.5 py-0.2 text-[10px] font-black ${
                  activeTickets.length > 0 ? 'bg-warn text-bg' : 'bg-surface-raised text-text-3'
                }`}
              >
                {tickets.length}
              </span>
            )}
          </button>
        </div>

        {/* Success Toast */}
        {successToast && (
          <div className="mx-5 mt-3 flex items-center gap-2 p-3 rounded-xl bg-ok/15 border border-ok/30 text-ok text-[13px] font-bold animate-fade-in shrink-0">
            <CheckCircle2 size={16} className="shrink-0" />
            <span>{successToast}</span>
          </div>
        )}

        {/* Modal Body with Scroll */}
        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
          {/* ================================================================= */}
          {/* TAB 1: NOVO CHAMADO                                               */}
          {/* ================================================================= */}
          {activeTab === 'new' && (
            <form onSubmit={handleSubmitTicket} className="space-y-4">
              {/* Presets Rápidas (1 Toque) */}
              <div>
                <label className="block text-[11px] font-black uppercase tracking-wider text-text-3 mb-1.5">
                  Sugestões Rápidas (1 Toque)
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {presets.slice(0, 4).map((p, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => handleApplyPreset(p)}
                      className="press flex items-start gap-2 p-2.5 text-left rounded-xl bg-surface-raised border border-line hover:border-link/50 transition-colors"
                    >
                      <Sparkles size={14} className="text-link shrink-0 mt-0.5" />
                      <div className="min-w-0">
                        <span className="block text-[12px] font-bold text-text leading-tight truncate">
                          {p.title}
                        </span>
                        <span className="block text-[10px] text-text-3 line-clamp-1 mt-0.5">
                          {p.description}
                        </span>
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Categoria */}
              <div>
                <label className="block text-[11px] font-black uppercase tracking-wider text-text-3 mb-1.5">
                  Categoria da Solicitação
                </label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="w-full h-11 px-3.5 rounded-xl bg-surface-raised border border-line text-text text-[13px] font-bold focus:border-link focus:outline-none"
                >
                  {categories.map((c) => (
                    <option key={c.id} value={c.id} className="bg-surface text-text">
                      {c.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* Nível de Urgência / Prioridade */}
              <div>
                <label className="block text-[11px] font-black uppercase tracking-wider text-text-3 mb-1.5">
                  Nível de Urgência
                </label>
                <div className="grid grid-cols-4 gap-1.5">
                  {Object.entries(PRIORITY_CONFIG).map(([key, cfg]) => {
                    const isSelected = priority === key;
                    return (
                      <button
                        key={key}
                        type="button"
                        onClick={() => setPriority(key)}
                        className={`press flex flex-col items-center justify-center py-2 px-1 rounded-xl text-center border transition-all ${
                          isSelected
                            ? 'font-black shadow-xs'
                            : 'bg-surface-raised border-line text-text-3 hover:text-text'
                        }`}
                        style={
                          isSelected
                            ? { background: cfg.bg, color: cfg.color, borderColor: cfg.border }
                            : undefined
                        }
                      >
                        {key === 'urgente' ? (
                          <Flame size={14} className="mb-0.5" />
                        ) : key === 'alta' ? (
                          <AlertTriangle size={14} className="mb-0.5" />
                        ) : null}
                        <span className="text-[12px]">{cfg.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Localização & Telefone (2 colunas) */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-black uppercase tracking-wider text-text-3 mb-1.5">
                    Local / Ponto de Apoio
                  </label>
                  <div className="relative">
                    <MapPin size={15} className="absolute left-3 top-3 text-text-3" />
                    <input
                      type="text"
                      value={location}
                      onChange={(e) => setLocation(e.target.value)}
                      placeholder="Ex: Estande KANASTRA, Sala 5R..."
                      className="w-full h-11 pl-9 pr-3 rounded-xl bg-surface-raised border border-line text-text text-[13px] placeholder:text-text-4 focus:border-link focus:outline-none"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-black uppercase tracking-wider text-text-3 mb-1.5">
                    WhatsApp para Resposta Rápida
                  </label>
                  <div className="relative">
                    <Phone size={15} className="absolute left-3 top-3 text-text-3" />
                    <input
                      type="tel"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="Ex: (34) 99123-4567"
                      className="w-full h-11 pl-9 pr-3 rounded-xl bg-surface-raised border border-line text-text text-[13px] placeholder:text-text-4 focus:border-link focus:outline-none"
                    />
                  </div>
                </div>
              </div>

              {/* Título */}
              <div>
                <label className="block text-[11px] font-black uppercase tracking-wider text-text-3 mb-1.5">
                  Título do Chamado *
                </label>
                <input
                  type="text"
                  required
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Ex: Falta de extensão de energia / Reforço na portaria"
                  className="w-full h-11 px-3.5 rounded-xl bg-surface-raised border border-line text-text text-[13px] font-bold placeholder:text-text-4 placeholder:font-normal focus:border-link focus:outline-none"
                />
              </div>

              {/* Detalhes / Descrição */}
              <div>
                <label className="block text-[11px] font-black uppercase tracking-wider text-text-3 mb-1.5">
                  Detalhes da Solicitação
                </label>
                <textarea
                  rows={3}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Descreva o que está acontecendo e do que você precisa com mais detalhes..."
                  className="w-full p-3 rounded-xl bg-surface-raised border border-line text-text text-[13px] placeholder:text-text-4 focus:border-link focus:outline-none resize-none"
                />
              </div>

              {/* Submit Button */}
              <div className="pt-2">
                <button
                  type="submit"
                  disabled={isSubmitting || !title.trim()}
                  className="press flex items-center justify-center gap-2 w-full h-12 rounded-xl text-[14px] font-black tracking-wide text-bg transition-opacity disabled:opacity-50"
                  style={{
                    background: role === 'SPONSOR' ? '#F59E0B' : 'var(--link)',
                    boxShadow: role === 'SPONSOR' ? '0 4px 14px rgba(245,158,11,0.3)' : '0 4px 14px rgba(96,165,250,0.3)',
                  }}
                >
                  <Send size={16} />
                  <span>{isSubmitting ? 'Registrando Chamado...' : 'Enviar Chamado para a Coordenação'}</span>
                </button>
              </div>
            </form>
          )}

          {/* ================================================================= */}
          {/* TAB 2: MEUS CHAMADOS                                              */}
          {/* ================================================================= */}
          {activeTab === 'list' && (
            <div className="space-y-3">
              {tickets.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-10 text-center">
                  <Mascot size={56} mood="happy" className="mb-3" />
                  <p className="m-0 text-[15px] font-extrabold text-text">Nenhum chamado aberto</p>
                  <p className="m-0 mt-1 text-[12px] text-text-3 max-w-[280px]">
                    Sua equipe ainda não registrou nenhum pedido de apoio. Quando precisar, abra um chamado pela aba ao lado!
                  </p>
                  <button
                    type="button"
                    onClick={() => setActiveTab('new')}
                    className="press mt-4 inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-surface-raised border border-line text-[13px] font-bold text-link"
                  >
                    <Plus size={15} /> Abrir meu primeiro chamado
                  </button>
                </div>
              ) : (
                tickets.map((tkt) => {
                  const statusCfg = STATUS_CONFIG[tkt.status] || STATUS_CONFIG.open;
                  const priorityCfg = PRIORITY_CONFIG[tkt.priority] || PRIORITY_CONFIG.media;

                  return (
                    <div
                      key={tkt.id}
                      className="rounded-2xl border border-line bg-surface-raised/70 p-4 space-y-3 transition-all"
                      style={{
                        borderLeftWidth: '4px',
                        borderLeftColor: tkt.priority === 'urgente' ? 'var(--err)' : statusCfg.dot,
                      }}
                    >
                      {/* Top Bar do Card */}
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <div className="flex items-center gap-2 flex-wrap">
                            <span
                              className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-[10px] font-black uppercase tracking-wider"
                              style={{ background: statusCfg.bg, color: statusCfg.color }}
                            >
                              <span className="h-1.5 w-1.5 rounded-full" style={{ background: statusCfg.dot }} />
                              {statusCfg.label}
                            </span>

                            <span
                              className="px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider"
                              style={{ background: priorityCfg.bg, color: priorityCfg.color }}
                            >
                              {priorityCfg.label}
                            </span>

                            <span className="text-[11px] text-text-4 font-mono">
                              #{tkt.id.slice(-6).toUpperCase()}
                            </span>
                          </div>

                          <h3 className="m-0 mt-1.5 text-[14px] sm:text-[15px] font-extrabold text-text">
                            {tkt.title}
                          </h3>
                        </div>

                        {/* Tempo relativo */}
                        <span className="text-[11px] text-text-3 shrink-0">
                          {formatRelativeTime(tkt.createdAt)}
                        </span>
                      </div>

                      {/* Descrição e local */}
                      {tkt.description && (
                        <p className="m-0 text-[12px] text-text-2 leading-relaxed whitespace-pre-wrap">
                          {tkt.description}
                        </p>
                      )}

                      <div className="flex items-center gap-4 text-[11px] text-text-3 pt-1 border-t border-line/50">
                        <span className="flex items-center gap-1">
                          <MapPin size={12} className="text-text-4" />
                          <span>{tkt.location}</span>
                        </span>
                        {tkt.assignedTo && (
                          <span className="flex items-center gap-1 text-link font-bold">
                            <Wrench size={12} />
                            <span>Responsável: {tkt.assignedTo}</span>
                          </span>
                        )}
                      </div>

                      {/* Notas e Respostas da Coordenação */}
                      {Array.isArray(tkt.notes) && tkt.notes.length > 0 && (
                        <div className="space-y-1.5 pt-2">
                          <span className="block text-[10px] font-black uppercase tracking-wider text-text-3">
                            Histórico de Atendimento
                          </span>
                          <div className="space-y-1.5">
                            {tkt.notes.map((n) => (
                              <div
                                key={n.id}
                                className={`p-2.5 rounded-xl text-[12px] ${
                                  n.isStaffOrAdmin
                                    ? 'bg-link/10 border border-link/25 text-text'
                                    : 'bg-surface border border-line text-text-2'
                                }`}
                              >
                                <div className="flex items-center justify-between gap-2 mb-1">
                                  <span className={`font-black text-[11px] ${n.isStaffOrAdmin ? 'text-link' : 'text-text'}`}>
                                    {n.author} {n.isStaffOrAdmin && '· Organização'}
                                  </span>
                                  <span className="text-[10px] text-text-4">
                                    {formatRelativeTime(n.createdAt)}
                                  </span>
                                </div>
                                <p className="m-0 leading-normal">{n.text}</p>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Réplica Rápida ou Marcar como Resolvido */}
                      {tkt.status !== 'resolved' && (
                        <div className="pt-2 border-t border-line/60 space-y-2">
                          <div className="flex items-center gap-2">
                            <input
                              type="text"
                              value={replyTextMap[tkt.id] || ''}
                              onChange={(e) =>
                                setReplyTextMap((prev) => ({ ...prev, [tkt.id]: e.target.value }))
                              }
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                  e.preventDefault();
                                  handleSendReply(tkt.id);
                                }
                              }}
                              placeholder="Adicionar complemento ou recado..."
                              className="flex-1 h-9 px-3 rounded-lg bg-surface border border-line text-[12px] text-text placeholder:text-text-4 focus:border-link focus:outline-none"
                            />
                            <button
                              type="button"
                              onClick={() => handleSendReply(tkt.id)}
                              disabled={sendingReplyId === tkt.id || !(replyTextMap[tkt.id] || '').trim()}
                              className="press flex h-9 px-3 items-center justify-center rounded-lg bg-link text-bg font-bold text-[12px] disabled:opacity-40"
                            >
                              <Send size={13} />
                            </button>
                          </div>

                          <div className="flex justify-end">
                            <button
                              type="button"
                              onClick={() => handleMarkResolvedByRequester(tkt.id)}
                              className="press text-[11px] font-bold text-ok hover:underline flex items-center gap-1"
                            >
                              <CheckCircle2 size={13} />
                              <span>Marcar como resolvido por nós</span>
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          )}
        </div>

        {/* Rodapé do Modal */}
        <footer className="flex items-center justify-between px-5 py-3 border-t border-line bg-surface-raised/40 shrink-0">
          <span className="text-[11px] text-text-4">
            {role === 'SPONSOR' ? 'Estande & Patrocínio TechWeek' : 'Equipe de Staff & Portaria'}
          </span>
          <button
            type="button"
            onClick={onClose}
            className="press px-4 py-1.5 rounded-xl bg-surface border border-line text-[12px] font-bold text-text hover:bg-surface-raised"
          >
            Fechar
          </button>
        </footer>
      </div>
    </div>
  );
}
