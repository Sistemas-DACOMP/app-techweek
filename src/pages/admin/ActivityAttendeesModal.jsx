import { useState, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { 
  X, 
  Search, 
  Download, 
  Copy, 
  Check, 
  Users, 
  CheckCircle2, 
  Clock, 
  UserCheck, 
  MapPin, 
  Calendar, 
  Ticket, 
  Phone, 
  Mail, 
  ExternalLink,
  AlertCircle
} from 'lucide-react';
import { useScrollLock } from '../../hooks/useScrollLock';
import { 
  subscribeToActivityBookings, 
  formatBookingDateTime 
} from '../../lib/activityService';
import { 
  btn, 
  ICON_BTN, 
  OccBar, 
  EmptyState, 
  typeColor, 
  typeLabel, 
  sessionsOf, 
  firstDate, 
  dayLabel, 
  capacityOf, 
  initials,
  isoToday
} from './ui';

function locationOf(act) {
  if (!act) return 'Local não definido';
  const s = sessionsOf(act);
  return s.length > 1 
    ? [...new Set(s.map((x) => x.location || act.location).filter(Boolean))].join(' / ') 
    : act.location || 'Anfiteatro FACOM';
}

function whenOf(act) {
  if (!act) return 'Data a definir';
  return sessionsOf(act)
    .map((s) => `${dayLabel(/^\d{4}-/.test(s.date || '') ? s.date : firstDate(act))} · ${s.startTime || s.time || ''}`)
    .join(' · ');
}

function sanitizeForCsv(val) {
  if (val === null || val === undefined) return '""';
  const str = String(val).replace(/"/g, '""');
  return `"${str}"`;
}

export default function ActivityAttendeesModal({ activity, usersList = [], onClose }) {
  useScrollLock(true);

  const [activeTab, setActiveTab] = useState('confirmed'); // 'confirmed' | 'waiting'
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);
  const [toastMessage, setToastMessage] = useState(null);

  const [bookingData, setBookingData] = useState({
    confirmed: [],
    waitingList: [],
    all: [],
    stats: { confirmedCount: 0, waitingCount: 0, checkedInCount: 0 }
  });

  // Fecha no ESC
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  // Escuta em tempo real do Firestore (/bookings e /checkins)
  useEffect(() => {
    if (!activity) return;
    setLoading(true);

    const unsub = subscribeToActivityBookings(
      activity,
      (result) => {
        setBookingData(result);
        setLoading(false);
      },
      (err) => {
        console.warn('[ActivityAttendeesModal] Falha ao carregar inscritos:', err);
        setLoading(false);
      },
      { usersList }
    );

    return () => {
      if (typeof unsub === 'function') unsub();
    };
  }, [activity, usersList]);

  const capacity = useMemo(() => capacityOf(activity || {}), [activity]);
  const confirmedList = bookingData.confirmed || [];
  const waitingList = bookingData.waitingList || [];

  // Se a lista de confirmados for 0 e houver alguém na fila de espera, alterna para a fila se desejado
  useEffect(() => {
    if (confirmedList.length === 0 && waitingList.length > 0 && activeTab === 'confirmed') {
      // Mantém 'confirmed' como padrão mas usuário pode alternar
    }
  }, [confirmedList.length, waitingList.length, activeTab]);

  // Filtro de busca instantânea
  const filteredList = useMemo(() => {
    const currentList = activeTab === 'confirmed' ? confirmedList : waitingList;
    if (!search.trim()) return currentList;

    const query = search.trim().toLowerCase();
    return currentList.filter((item) => {
      const name = (item.fullName || item.displayName || '').toLowerCase();
      const email = (item.email || '').toLowerCase();
      const user = (item.username || '').toLowerCase();
      const course = (item.course || '').toLowerCase();
      const phone = (item.phone || '').toLowerCase();
      return (
        name.includes(query) ||
        email.includes(query) ||
        user.includes(query) ||
        course.includes(query) ||
        phone.includes(query)
      );
    });
  }, [activeTab, confirmedList, waitingList, search]);

  // Exportação para CSV (com UTF-8 BOM para Excel / Numbers)
  const handleExportCsv = () => {
    if (!activity) return;

    const headers = [
      'Posição',
      'Aba / Status',
      'Nome Completo',
      '@Username',
      'E-mail',
      'Telefone',
      'Curso',
      'Período',
      'Ingresso Sympla',
      'Nº Ingresso',
      'Data de Inscrição',
      'Check-in Presencial',
      'Data Check-in'
    ];

    const rows = [];

    // Adiciona confirmados
    confirmedList.forEach((item) => {
      rows.push([
        sanitizeForCsv(item.rankLabel || `${item.rank}º`),
        sanitizeForCsv('CONFIRMADO'),
        sanitizeForCsv(item.fullName || item.displayName || 'Participante'),
        sanitizeForCsv(item.username || ''),
        sanitizeForCsv(item.email || ''),
        sanitizeForCsv(item.phone || ''),
        sanitizeForCsv(item.course || ''),
        sanitizeForCsv(item.period || ''),
        sanitizeForCsv(item.hasSymplaTicket ? 'SIM' : 'NÃO'),
        sanitizeForCsv(item.ticketNumber || ''),
        sanitizeForCsv(item.createdAtFormatted || ''),
        sanitizeForCsv(item.checkedIn ? 'PRESENTE' : 'AUSENTE'),
        sanitizeForCsv(item.checkedInAtFormatted || '')
      ]);
    });

    // Adiciona lista de espera
    waitingList.forEach((item) => {
      rows.push([
        sanitizeForCsv(item.rankLabel || `${item.queuePosition}º da fila`),
        sanitizeForCsv('LISTA DE ESPERA'),
        sanitizeForCsv(item.fullName || item.displayName || 'Participante'),
        sanitizeForCsv(item.username || ''),
        sanitizeForCsv(item.email || ''),
        sanitizeForCsv(item.phone || ''),
        sanitizeForCsv(item.course || ''),
        sanitizeForCsv(item.period || ''),
        sanitizeForCsv(item.hasSymplaTicket ? 'SIM' : 'NÃO'),
        sanitizeForCsv(item.ticketNumber || ''),
        sanitizeForCsv(item.createdAtFormatted || ''),
        sanitizeForCsv('FILA DE ESPERA'),
        sanitizeForCsv('')
      ]);
    });

    const csvContent = '\uFEFF' + [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    const safeTitle = (activity.title || 'atividade')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '_')
      .slice(0, 30);
    link.href = url;
    link.download = `inscritos_${safeTitle}_${isoToday()}.csv`;
    link.click();
    URL.revokeObjectURL(url);

    showToast('Planilha CSV gerada e baixada com sucesso!');
  };

  // Cópia de lista para área de transferência (WhatsApp / resumo da equipe)
  const handleCopyList = () => {
    if (!activity) return;

    const confirmedText = confirmedList
      .map(
        (i) =>
          `${i.rankLabel}: ${i.fullName} (${i.email || 'sem email'})${
            i.checkedIn ? ' [PRESENTE NA SALA]' : ''
          }`
      )
      .join('\n');

    const waitingText = waitingList
      .map((i) => `${i.rankLabel}: ${i.fullName} (${i.email || 'sem email'})`)
      .join('\n');

    const summary = [
      `📋 TECHWEEK 2026 · LISTA DE INSCRITOS`,
      `Atividade: ${activity.title}`,
      `Local: ${locationOf(activity)} | Horário: ${whenOf(activity)}`,
      `Lotação: ${bookingData.stats.confirmedCount} confirmados · ${bookingData.stats.waitingCount} na fila de espera · ${bookingData.stats.checkedInCount} presentes`,
      '',
      `--- INSCRITOS CONFIRMADOS (${confirmedList.length}) ---`,
      confirmedText || 'Nenhum confirmado.',
      '',
      `--- LISTA DE ESPERA (${waitingList.length}) ---`,
      waitingText || 'Ninguém na fila.'
    ].join('\n');

    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(summary).then(() => {
        setCopied(true);
        showToast('Lista copiada para a área de transferência!');
        setTimeout(() => setCopied(false), 2500);
      });
    }
  };

  const showToast = (msg) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage(null);
    }, 3000);
  };

  if (typeof document === 'undefined') return null;

  const confirmedCount = bookingData?.stats?.confirmedCount ?? confirmedList.length;
  const waitingCount = bookingData?.stats?.waitingCount ?? waitingList.length;
  const checkedInCount = bookingData?.stats?.checkedInCount ?? confirmedList.filter((b) => b.checkedIn).length;

  const totalVagas = capacity.total > 0 ? capacity.total : 0;
  const vagasRestantes = capacity.limited
    ? Math.max(0, totalVagas - confirmedCount)
    : 'Livre';

  return createPortal(
    <>
      {/* Backdrop */}
      <div 
        className="ds-scrim" 
        aria-hidden="true" 
        onClick={onClose} 
      />

      {/* Toast Feedback */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-[2010] flex items-center gap-2 rounded-xl bg-surface-raised px-4 py-3 text-[14px] font-bold text-text shadow-2xl border border-line animate-fadeIn">
          <CheckCircle2 size={16} className="text-ok" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Modal Container */}
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="activity-attendees-title"
        className="fixed inset-x-0 bottom-0 top-6 z-[2002] mx-auto flex max-w-4xl flex-col overflow-hidden rounded-t-[24px] bg-surface text-text shadow-2xl border border-line lg:inset-y-auto lg:top-1/2 lg:-translate-y-1/2 lg:rounded-[24px] lg:max-h-[90vh]"
      >
        {/* Cabeçalho */}
        <div className="shrink-0 border-b border-line bg-surface-raised px-5 py-4">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0 flex-1">
              {/* Badges superiores */}
              <div className="flex flex-wrap items-center gap-2">
                <span 
                  className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[11px] font-extrabold uppercase tracking-wider"
                  style={{ 
                    color: typeColor(activity?.type),
                    backgroundColor: `${typeColor(activity?.type)}1A`
                  }}
                >
                  <span className="h-1.5 w-1.5 rounded-full" style={{ background: typeColor(activity?.type) }} />
                  {typeLabel(activity?.type)}
                </span>

                <span
                  className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[11px] font-bold ${
                    activity?.isOpenEvent ? 'bg-ok/15 text-ok' : 'bg-gold/15 text-gold'
                  }`}
                >
                  {activity?.isOpenEvent ? (
                    <>
                      <CheckCircle2 size={12} aria-hidden="true" />
                      Evento Aberto (Entrada Livre)
                    </>
                  ) : (
                    <>
                      <Ticket size={12} aria-hidden="true" />
                      Exclusivo Sympla (Passaporte Oficial)
                    </>
                  )}
                </span>
              </div>

              {/* Título da Atividade */}
              <h2 id="activity-attendees-title" className="mt-2 text-[18px] sm:text-[20px] font-extrabold text-text leading-snug">
                {activity?.title || 'Detalhes da Atividade'}
              </h2>

              {/* Metadados: Local & Horário */}
              <div className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-1 text-[13px] text-text-2">
                <span className="inline-flex items-center gap-1.5">
                  <MapPin size={14} className="text-link shrink-0" aria-hidden="true" />
                  <span>{locationOf(activity)}</span>
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <Calendar size={14} className="text-text-3 shrink-0" aria-hidden="true" />
                  <span>{whenOf(activity)}</span>
                </span>
              </div>
            </div>

            {/* Botão Fechar */}
            <button
              type="button"
              onClick={onClose}
              aria-label="Fechar modal"
              className="-mr-1 flex h-11 w-11 items-center justify-center rounded-xl text-text-2 hover:bg-surface hover:text-text transition-colors"
            >
              <X size={20} aria-hidden="true" />
            </button>
          </div>

          {/* Barra de Progresso de Lotação */}
          {capacity.limited && (
            <div className="mt-3.5 pt-3 border-t border-line/60">
              <div className="flex items-center justify-between text-[12px] font-bold text-text-2 mb-1.5">
                <span>Ocupação das Vagas</span>
                <span className="text-text">
                  {confirmedCount} de {totalVagas} ocupadas ({Math.min(100, Math.round((confirmedCount / (totalVagas || 1)) * 100))}%)
                </span>
              </div>
              <OccBar taken={confirmedCount} total={totalVagas} />
            </div>
          )}
        </div>

        {/* Barra de KPIs Resumidos */}
        <div className="shrink-0 grid grid-cols-2 sm:grid-cols-4 gap-2.5 p-4 border-b border-line bg-surface">
          <div className="flex flex-col rounded-xl bg-surface-raised p-3 border border-line">
            <span className="text-[11px] font-bold text-text-3 uppercase tracking-wider">Confirmados</span>
            <div className="mt-1 flex items-baseline gap-1.5">
              <span className="text-[20px] font-extrabold text-link">{confirmedCount}</span>
              <span className="text-[11px] text-text-3">vagas garantidas</span>
            </div>
          </div>

          <div className="flex flex-col rounded-xl bg-surface-raised p-3 border border-line">
            <span className="text-[11px] font-bold text-text-3 uppercase tracking-wider">Fila de Espera</span>
            <div className="mt-1 flex items-baseline gap-1.5">
              <span className="text-[20px] font-extrabold text-warn">{waitingCount}</span>
              <span className="text-[11px] text-text-3">aguardando vaga</span>
            </div>
          </div>

          <div className="flex flex-col rounded-xl bg-surface-raised p-3 border border-line">
            <span className="text-[11px] font-bold text-text-3 uppercase tracking-wider">Presentes na Sala</span>
            <div className="mt-1 flex items-baseline gap-1.5">
              <span className="text-[20px] font-extrabold text-ok">{checkedInCount}</span>
              <span className="text-[11px] text-text-3">check-ins feitos</span>
            </div>
          </div>

          <div className="flex flex-col rounded-xl bg-surface-raised p-3 border border-line">
            <span className="text-[11px] font-bold text-text-3 uppercase tracking-wider">Vagas Restantes</span>
            <div className="mt-1 flex items-baseline gap-1.5">
              <span className="text-[20px] font-extrabold text-text">{vagasRestantes}</span>
              <span className="text-[11px] text-text-3">{capacity.limited ? 'disponíveis' : 'capacidade livre'}</span>
            </div>
          </div>
        </div>

        {/* Toolbar: Busca e Ações Rápidas (Exportar CSV e Copiar Lista) */}
        <div className="shrink-0 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5 px-5 py-3 border-b border-line bg-surface">
          {/* Campo de Busca */}
          <div className="relative flex-1">
            <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-text-3" aria-hidden="true" />
            <input
              type="search"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar por nome, e-mail, curso ou @username..."
              className="w-full h-11 pl-10 pr-3.5 rounded-xl border border-line bg-surface-raised text-[14px] text-text outline-none focus:border-link transition-colors placeholder:text-text-3"
            />
          </div>

          {/* Botões de Ação */}
          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={handleCopyList}
              className={btn('secondary', 'min-h-11 px-3.5 text-[13px]')}
              title="Copiar resumo de inscritos para a área de transferência"
            >
              {copied ? <Check size={16} className="text-ok" aria-hidden="true" /> : <Copy size={16} aria-hidden="true" />}
              <span>{copied ? 'Copiado!' : 'Copiar Lista'}</span>
            </button>

            <button
              type="button"
              onClick={handleExportCsv}
              className={btn('action', 'min-h-11 px-3.5 text-[13px]')}
              title="Baixar lista completa em arquivo CSV (Excel)"
            >
              <Download size={16} aria-hidden="true" />
              <span>Exportar CSV</span>
            </button>
          </div>
        </div>

        {/* Abas Segmentadas: Confirmados vs Fila de Espera */}
        <div className="shrink-0 flex border-b border-line bg-surface px-5">
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === 'confirmed'}
            onClick={() => setActiveTab('confirmed')}
            className={`min-h-12 border-b-[3px] px-4 text-[14px] font-extrabold transition-colors flex items-center gap-2 ${
              activeTab === 'confirmed'
                ? 'border-link text-link'
                : 'border-transparent text-text-2 hover:text-text'
            }`}
          >
            <CheckCircle2 size={16} aria-hidden="true" />
            <span>Inscritos Confirmados</span>
            <span className={`rounded-full px-2 py-0.5 text-[11px] font-extrabold ${
              activeTab === 'confirmed' ? 'bg-link/20 text-link' : 'bg-surface-raised text-text-3'
            }`}>
              {confirmedList.length}
            </span>
          </button>

          <button
            type="button"
            role="tab"
            aria-selected={activeTab === 'waiting'}
            onClick={() => setActiveTab('waiting')}
            className={`min-h-12 border-b-[3px] px-4 text-[14px] font-extrabold transition-colors flex items-center gap-2 ${
              activeTab === 'waiting'
                ? 'border-warn text-warn'
                : 'border-transparent text-text-2 hover:text-text'
            }`}
          >
            <Clock size={16} aria-hidden="true" />
            <span>Lista de Espera</span>
            <span className={`rounded-full px-2 py-0.5 text-[11px] font-extrabold ${
              activeTab === 'waiting' ? 'bg-warn/20 text-warn' : 'bg-surface-raised text-text-3'
            }`}>
              {waitingList.length}
            </span>
          </button>
        </div>

        {/* Lista de Participantes com Rolagem */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-2.5">
          {loading ? (
            <div className="py-12 flex flex-col items-center justify-center gap-3 text-text-3">
              <div className="h-8 w-8 animate-spin rounded-full border-2 border-link border-t-transparent" />
              <p className="text-[14px]">Carregando lista em tempo real...</p>
            </div>
          ) : filteredList.length === 0 ? (
            <div className="py-12">
              <EmptyState>
                {search.trim() ? (
                  <>Nenhum participante encontrado para <strong className="text-text">"{search}"</strong>.</>
                ) : activeTab === 'confirmed' ? (
                  'Nenhum participante inscrito nesta atividade até o momento.'
                ) : (
                  'Nenhum participante na fila de espera desta atividade.'
                )}
              </EmptyState>
            </div>
          ) : (
            filteredList.map((attendee) => {
              const isWaiting = activeTab === 'waiting';

              return (
                <article
                  key={attendee.id || attendee.userId}
                  className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-[16px] bg-surface-raised p-3.5 sm:p-4 border border-line transition-all hover:border-line-2"
                >
                  {/* Lado Esquerdo: Posição, Avatar e Dados */}
                  <div className="flex items-start gap-3 min-w-0 flex-1">
                    {/* Badge de Posição / Ordem */}
                    <div
                      className={`shrink-0 flex items-center justify-center font-extrabold rounded-xl ${
                        isWaiting
                          ? 'px-2.5 h-8 text-[11px] bg-warn/15 text-warn border border-warn/30'
                          : 'h-9 w-9 text-[13px] bg-link/15 text-link border border-link/30'
                      }`}
                      title={attendee.rankLabel}
                    >
                      {attendee.rankLabel}
                    </div>

                    {/* Avatar do Participante */}
                    <div className="shrink-0 h-10 w-10 rounded-full bg-[#2A3570] text-white flex items-center justify-center text-[13px] font-extrabold overflow-hidden border border-line">
                      {attendee.avatarUrl ? (
                        <img src={attendee.avatarUrl} alt="" className="h-full w-full object-cover" />
                      ) : (
                        initials(attendee.fullName)
                      )}
                    </div>

                    {/* Identificação e Curso */}
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-extrabold text-[15px] text-text truncate">
                          {attendee.fullName}
                        </span>
                        {attendee.username && (
                          <span className="text-[12px] font-semibold text-text-3">
                            {attendee.username}
                          </span>
                        )}
                      </div>

                      {/* Curso e Período */}
                      <p className="mt-0.5 text-[12px] text-text-2 truncate">
                        {attendee.course ? (
                          <>
                            {attendee.course}
                            {attendee.period ? ` · ${attendee.period}` : ''}
                          </>
                        ) : (
                          attendee.participantType || 'Estudante'
                        )}
                      </p>

                      {/* Contato: E-mail e Telefone */}
                      <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-[12px] text-text-3">
                        {attendee.email && (
                          <a
                            href={`mailto:${attendee.email}`}
                            className="inline-flex items-center gap-1 hover:text-link transition-colors"
                            title={`Enviar e-mail para ${attendee.email}`}
                          >
                            <Mail size={12} aria-hidden="true" />
                            <span className="truncate max-w-[200px]">{attendee.email}</span>
                          </a>
                        )}

                        {attendee.phone && (
                          <a
                            href={`https://wa.me/55${attendee.phone.replace(/\D/g, '')}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 hover:text-ok transition-colors"
                            title={`Conversar no WhatsApp (${attendee.phone})`}
                          >
                            <Phone size={12} aria-hidden="true" />
                            <span>{attendee.phone}</span>
                          </a>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Lado Direito: Status de Presença, Sympla e Horário */}
                  <div className="flex sm:flex-col items-center sm:items-end justify-between sm:justify-center gap-1.5 pt-2 sm:pt-0 border-t sm:border-t-0 border-line/60 shrink-0">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      {/* Badge Ingresso Sympla */}
                      <span
                        className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold ${
                          attendee.hasSymplaTicket ? 'bg-ok/15 text-ok' : 'bg-surface text-text-3'
                        }`}
                      >
                        {attendee.hasSymplaTicket ? '✓ Sympla' : 'Acesso Geral'}
                      </span>

                      {/* Badge de Presença Presencial (apenas na aba de confirmados) */}
                      {!isWaiting && (
                        <span
                          className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[11px] font-bold ${
                            attendee.checkedIn ? 'bg-ok/15 text-ok' : 'bg-surface text-text-3'
                          }`}
                        >
                          {attendee.checkedIn ? (
                            <>
                              <UserCheck size={12} aria-hidden="true" />
                              <span>Presente</span>
                            </>
                          ) : (
                            <span>Aguardando entrada</span>
                          )}
                        </span>
                      )}
                    </div>

                    {/* Data/Hora de Inscrição */}
                    <span className="text-[11px] text-text-3">
                      {isWaiting ? 'Entrou na fila: ' : 'Inscrito: '}
                      <strong className="font-semibold text-text-2">{attendee.createdAtFormatted}</strong>
                    </span>

                    {/* Horário de Check-in se realizado */}
                    {!isWaiting && attendee.checkedIn && attendee.checkedInAtFormatted && (
                      <span className="text-[10px] text-ok">
                        Check-in às {attendee.checkedInAtFormatted}
                      </span>
                    )}
                  </div>
                </article>
              );
            })
          )}
        </div>

        {/* Rodapé do Modal */}
        <div className="shrink-0 flex items-center justify-between gap-3 border-t border-line bg-surface-raised px-5 py-3">
          <span className="text-[12px] text-text-3">
            Exibindo <strong className="text-text">{filteredList.length}</strong> de{' '}
            <strong className="text-text">
              {activeTab === 'confirmed' ? confirmedList.length : waitingList.length}
            </strong>{' '}
            participantes
          </span>

          <button
            type="button"
            onClick={onClose}
            className={btn('secondary', 'min-h-11 px-5 text-[14px]')}
          >
            Fechar
          </button>
        </div>
      </div>
    </>,
    document.body
  );
}
