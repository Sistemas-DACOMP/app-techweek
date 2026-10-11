import { useEffect, useState } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import {
  Maximize2, Minimize2, X, QrCode, Calendar, Trophy, Megaphone,
  Clock, MapPin, Users, Award, Sparkles, CheckCircle2, Star, ChevronDown
} from 'lucide-react';
import logoTw from '../../assets/logo-tw.png';
import iconeTw from '../../assets/icone.png';
import { typeColor, typeLabel, startTime, sessionsOf, liveStatus, dayLabel, firstDate, initials } from './ui';
import { getStageDisplayMode, setStageDisplayMode, STAGE_MODES } from '../../lib/liveOpsService';

/* 2.07 Telão Multi-Modo Orquestrado: QR fixo, Grade Ao Vivo, Leaderboard XP e Avisos Oficiais */
export default function Telao({
  activity,
  qrValue,
  activities = [],
  usersList = [],
  feedPosts = [],
  onClose,
}) {
  const [full, setFull] = useState(false);
  const [mode, setMode] = useState(() => getStageDisplayMode());
  const [now, setNow] = useState(new Date());
  const [selectedClosingId, setSelectedClosingId] = useState(activity?.id || '');

  const color = typeColor(activity?.type);
  const s = (activity ? sessionsOf(activity)[0] : null) || {};
  const end = s.endTime || activity?.endTime;
  const place = s.location || activity?.location || 'Anfiteatro FACOM';

  useEffect(() => {
    const onKey = (e) => e.key === 'Escape' && onClose();
    const onFs = () => setFull(!!document.fullscreenElement);
    document.addEventListener('keydown', onKey);
    document.addEventListener('fullscreenchange', onFs);

    // Relógio de atualização ao vivo do telão
    const timer = setInterval(() => setNow(new Date()), 10000);

    return () => {
      document.removeEventListener('keydown', onKey);
      document.removeEventListener('fullscreenchange', onFs);
      clearInterval(timer);
    };
  }, [onClose]);

  const handleModeChange = (newMode) => {
    setMode(newMode);
    setStageDisplayMode(newMode);
  };

  const toggleFull = () => (document.fullscreenElement ? document.exitFullscreen() : document.documentElement.requestFullscreen()).catch(() => {});

  // Preparar dados para o modo 'agenda'
  const liveActivities = activities.filter((a) => liveStatus(a, now) === 'live');
  const upcomingActivities = activities
    .filter((a) => liveStatus(a, now) === 'future')
    .sort((a, b) => startTime(a).localeCompare(startTime(b)))
    .slice(0, 6);

  // Preparar dados para o modo 'ranking'
  const topUsers = [...usersList]
    .filter((u) => !u.role || u.role === 'PARTICIPANT')
    .sort((a, b) => (Number(b.totalPoints ?? b.pontuacaoTotal) || 0) - (Number(a.totalPoints ?? a.pontuacaoTotal) || 0))
    .slice(0, 10);

  // Preparar dados para o modo 'feed'
  const activeNotices = feedPosts.slice(0, 4);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Telão Orquestrado TechWeek"
      className="fixed inset-0 z-[9999] overflow-auto bg-bg text-text"
      style={{ background: 'radial-gradient(circle at 20% 0%, #1A1F5C 0%, var(--bg) 60%)' }}
    >
      {/* Barra de Controle Superior do Operador de Telão */}
      <header className="sticky top-0 z-20 flex flex-wrap items-center justify-between gap-3 border-b border-line/40 bg-surface/80 px-6 py-3 backdrop-blur-md">
        <div className="flex items-center gap-3">
          <img src={iconeTw} alt="" className="h-7 w-7 object-contain" />
          <span className="hidden text-[13px] font-black uppercase tracking-wider text-text-3 sm:inline">
            Telão TechWeek 2026
          </span>
        </div>

        {/* Seletor de Modo Orquestrado */}
        <div className="flex items-center gap-1.5 rounded-full border border-line bg-surface-raised p-1 shadow-inner">
          <button
            type="button"
            onClick={() => handleModeChange('presenca')}
            className={`flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[12px] font-bold transition-all ${
              mode === 'presenca'
                ? 'bg-link text-[#0A0F24] shadow-sm'
                : 'text-text-3 hover:text-text'
            }`}
          >
            <QrCode size={14} aria-hidden="true" />
            <span>Presença</span>
          </button>
          <button
            type="button"
            onClick={() => handleModeChange('fechamento')}
            className={`flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[12px] font-bold transition-all ${
              mode === 'fechamento'
                ? 'bg-warn text-[#0A0F24] shadow-sm'
                : 'text-text-3 hover:text-text'
            }`}
          >
            <Star size={14} aria-hidden="true" />
            <span>Fechamento</span>
          </button>
          <button
            type="button"
            onClick={() => handleModeChange('agenda')}
            className={`flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[12px] font-bold transition-all ${
              mode === 'agenda'
                ? 'bg-link text-[#0A0F24] shadow-sm'
                : 'text-text-3 hover:text-text'
            }`}
          >
            <Calendar size={14} aria-hidden="true" />
            <span>Grade ao Vivo</span>
          </button>
          <button
            type="button"
            onClick={() => handleModeChange('ranking')}
            className={`flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[12px] font-bold transition-all ${
              mode === 'ranking'
                ? 'bg-link text-[#0A0F24] shadow-sm'
                : 'text-text-3 hover:text-text'
            }`}
          >
            <Trophy size={14} aria-hidden="true" />
            <span>Leaderboard</span>
          </button>
          <button
            type="button"
            onClick={() => handleModeChange('feed')}
            className={`flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[12px] font-bold transition-all ${
              mode === 'feed'
                ? 'bg-link text-[#0A0F24] shadow-sm'
                : 'text-text-3 hover:text-text'
            }`}
          >
            <Megaphone size={14} aria-hidden="true" />
            <span>Avisos</span>
          </button>
        </div>

        {/* Botões de Tela Cheia e Fechar */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={toggleFull}
            className="press inline-flex h-9 items-center gap-1.5 rounded-xl border border-line bg-surface-selected px-3.5 text-[13px] font-bold"
          >
            {full ? <Minimize2 size={15} aria-hidden="true" /> : <Maximize2 size={15} aria-hidden="true" />}
            <span className="hidden sm:inline">{full ? 'Sair tela cheia' : 'Tela cheia'}</span>
          </button>
          <button
            type="button"
            onClick={onClose}
            className="press inline-flex h-9 items-center gap-1.5 rounded-xl border border-line bg-surface-selected px-3.5 text-[13px] font-bold hover:text-warn"
          >
            <X size={15} aria-hidden="true" />
            <span>Fechar</span>
          </button>
        </div>
      </header>

      {/* CONTEÚDO PRINCIPAL DE ACORDO COM O MODO */}

      {/* MODO 1: QR CODE DE PRESENÇA (OFICIAL) COM FECHAMENTO, PALESTRANTES E AVALIAÇÃO */}
      {mode === 'presenca' && activity && (() => {
        const rawSpeakers = Array.isArray(activity.speakers) && activity.speakers.length > 0
          ? activity.speakers
          : activity.speaker
            ? activity.speaker.split(',').map((n, i) => ({
                name: n.trim(),
                role: i === 0 ? activity.speakerRole || '' : '',
                photo: i === 0 ? activity.speakerPhoto || '' : '',
              })).filter((s) => s.name)
            : [];
        const displaySpeakers = rawSpeakers.length > 0
          ? rawSpeakers
          : [{ name: 'Comissão Organizadora FACOM', role: 'FACOM / UFU', photo: '' }];

        return (
          <main className="relative mx-auto grid min-h-[calc(100vh-70px)] max-w-[1680px] items-center gap-10 px-8 py-10 lg:grid-cols-[minmax(0,1.2fr)_minmax(420px,580px)] lg:gap-16 lg:px-16 animate-in fade-in">
            {/* Iluminação de Palco Sutil */}
            <div aria-hidden="true" className="pointer-events-none absolute -left-20 top-1/4 h-[500px] w-[500px] rounded-full bg-[#2563EB]/10 blur-[120px]" />
            <div aria-hidden="true" className="pointer-events-none absolute right-10 top-1/3 h-[500px] w-[500px] rounded-full bg-[#7C3AED]/15 blur-[140px]" />

            {/* COLUNA ESQUERDA: IDENTIDADE DA PALESTRA, PALESTRANTES E CALL TO ACTION */}
            <div className="relative z-10 flex flex-col justify-center">
              {/* Logo e Tag de Sessão */}
              <div className="flex flex-wrap items-center gap-4">
                <img src={logoTw} alt="FACOM Tech Week" className="h-12 w-48 object-contain object-left lg:h-14 lg:w-56" />
                <span className="inline-flex items-center gap-2 rounded-full border border-ok/30 bg-ok/10 px-3.5 py-1 text-[13px] font-black uppercase tracking-wider text-ok">
                  <span className="h-2.5 w-2.5 rounded-full bg-ok animate-pulse" />
                  Check-in & Avaliação Aberta
                </span>
              </div>

              {/* Local, Tipo e Horário */}
              <div className="mt-6 flex flex-wrap items-center gap-3 text-[18px] font-extrabold lg:text-[22px]">
                <span className="inline-flex items-center gap-2 text-ok">
                  <MapPin size={20} className="shrink-0" />
                  {place}
                </span>
                <span className="text-text-3">·</span>
                <span style={{ color }}>{typeLabel(activity.type)}</span>
                <span className="text-text-3">·</span>
                <span className="inline-flex items-center gap-1.5 text-text-2">
                  <Clock size={19} className="shrink-0" />
                  {startTime(activity)}{end ? ` – ${end}` : ''}
                </span>
              </div>

              {/* Título da Palestra em Destaque Cinematográfico */}
              <h1 className="m-0 mt-3 text-[34px] font-black leading-[1.08] tracking-[-0.03em] text-text lg:text-[58px]">
                {activity.title}
              </h1>

              {/* PALESTRANTE(S) EM CARDS COMPACTOS E ELEGANTES */}
              <div className="mt-6">
                <span className="block text-[12px] font-black uppercase tracking-widest text-text-3">
                  {displaySpeakers.length > 1 ? 'Palestrantes Convidados' : 'Palestrante Convidado'}
                </span>
                <div className="mt-2.5 grid grid-cols-1 gap-3 sm:grid-cols-2">
                  {displaySpeakers.map((spk, idx) => (
                    <div
                      key={idx}
                      className="flex items-center gap-3.5 rounded-2xl border border-line-2 bg-surface/85 p-3.5 shadow-lg backdrop-blur-md transition-all"
                    >
                      {spk.photo ? (
                        <img
                          src={spk.photo}
                          alt={spk.name}
                          className="h-14 w-14 shrink-0 rounded-full border-2 border-link/60 object-cover shadow-md"
                        />
                      ) : (
                        <div
                          className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full text-[17px] font-black text-white shadow-md"
                          style={{ background: 'var(--brand-gradient)' }}
                        >
                          {initials(spk.name)}
                        </div>
                      )}
                      <div className="min-w-0 flex-1">
                        <div className="truncate text-[17px] font-black leading-snug text-text">
                          {spk.name}
                        </div>
                        {spk.role && (
                          <div className="truncate text-[13px] font-semibold text-link">
                            {spk.role}
                          </div>
                        )}
                        {spk.bio && (
                          <div className="line-clamp-1 mt-0.5 text-[11px] text-text-3">
                            {spk.bio}
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* CARD DE CHAMADA: AVALIE E RESGATE XP */}
              <div className="mt-8 rounded-2xl border border-you/40 bg-gradient-to-r from-you/20 via-surface to-surface-raised p-5 shadow-xl">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="flex items-center gap-2.5">
                    <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-you/30 text-you-text">
                      <Sparkles size={20} className="animate-pulse" />
                    </span>
                    <div>
                      <span className="block text-[17px] font-black text-text lg:text-[19px]">
                        Escaneie para avaliar e resgatar XP
                      </span>
                      <span className="block text-[13px] font-medium text-text-2">
                        Sua nota desbloqueia o certificado e os pontos instantaneamente no crachá
                      </span>
                    </div>
                  </div>
                  <span className="rounded-full bg-you/30 px-4 py-1.5 text-[16px] font-black text-you-text shadow-inner">
                    +{activity.points || 50} pts XP
                  </span>
                </div>

                {/* 3 Passos Rápidos */}
                <ol className="m-0 mt-4 grid grid-cols-1 gap-2.5 border-t border-line/60 pt-4 sm:grid-cols-3">
                  {[
                    { n: '1', title: 'Abra o App', desc: 'Acesse app TechWeek' },
                    { n: '2', title: 'Toque em Crachá', desc: 'Aba central > Escanear' },
                    { n: '3', title: 'Aponte & Avalie', desc: 'Dê sua nota de 1 a 5 ⭐' },
                  ].map((step) => (
                    <li key={step.n} className="flex items-center gap-3">
                      <span
                        aria-hidden="true"
                        className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-[14px] font-black text-white shadow-md"
                        style={{ background: 'var(--brand-gradient)' }}
                      >
                        {step.n}
                      </span>
                      <div className="min-w-0">
                        <span className="block text-[13px] font-bold text-text">{step.title}</span>
                        <span className="block text-[11px] text-text-3">{step.desc}</span>
                      </div>
                    </li>
                  ))}
                </ol>
              </div>
            </div>

            {/* COLUNA DIREITA: ESTAÇÃO DO QR CODE CINEMATOGRÁFICO */}
            <div className="relative z-10 flex flex-col items-center justify-center">
              <div
                className="relative rounded-[36px] bg-white p-7 text-center shadow-[0_20px_90px_rgba(61,80,230,0.45)] ring-4 ring-white/10 lg:p-9"
              >
                {/* Plaqueta Superior do QR */}
                <div className="mb-4 inline-flex items-center gap-2 rounded-full bg-[#0A0F24] px-4 py-1 text-[11px] font-black uppercase tracking-wider text-white">
                  <CheckCircle2 size={13} className="text-ok" />
                  Presença & Avaliação Oficial
                </div>

                {/* QR Code SVG em Alta Resolução */}
                <div className="flex items-center justify-center">
                  <QRCodeSVG
                    value={qrValue}
                    size={360}
                    level="H"
                    includeMargin={false}
                  />
                </div>

                {/* Sub-legenda do QR */}
                <div className="mt-4 border-t border-gray-200 pt-3 text-[13px] font-extrabold text-gray-800">
                  Válido para check-in nesta sala até o término da sessão
                </div>
              </div>

              {/* Reafirmação e Lembrete */}
              <div className="mt-6 flex flex-col items-center gap-1.5 text-center">
                <p className="m-0 flex items-center gap-2 text-[17px] font-black text-text lg:text-[20px]">
                  <Clock size={18} className="text-warn" />
                  Leia antes de sair da sala
                </p>
                <p className="m-0 text-[13px] font-medium text-text-3">
                  Aponte a câmera do celular ou o leitor integrado do app TechWeek
                </p>
              </div>
            </div>
          </main>
        );
      })()}

      {/* MODO NOVO: QR CODE DE FECHAMENTO & AVALIAÇÃO DA PALESTRA (+10 XP) */}
      {mode === 'fechamento' && (() => {
        const closingAct = activities.find((a) => a.id === selectedClosingId) || activity || liveActivities[0] || activities[0] || {
          id: 'palestra_encerramento',
          title: 'Palestra de Encerramento TechWeek',
          type: 'palestra',
          location: 'Anfiteatro FACOM',
          points: 50,
        };
        const closingColor = typeColor(closingAct?.type);
        const closingSessions = sessionsOf(closingAct);
        const cs = closingSessions[0] || {};
        const closingEnd = cs.endTime || closingAct?.endTime;
        const closingPlace = cs.location || closingAct?.location || 'Anfiteatro FACOM';

        const rawSpeakers = Array.isArray(closingAct.speakers) && closingAct.speakers.length > 0
          ? closingAct.speakers
          : closingAct.speaker
            ? closingAct.speaker.split(',').map((n, i) => ({
                name: n.trim(),
                role: i === 0 ? closingAct.speakerRole || '' : '',
                photo: i === 0 ? closingAct.speakerPhoto || '' : '',
              })).filter((s) => s.name)
            : [];
        const displaySpeakers = rawSpeakers.length > 0
          ? rawSpeakers
          : [{ name: 'Comissão Organizadora FACOM', role: 'FACOM / UFU', photo: '' }];

        const closingQrValue = JSON.stringify({
          type: 'closing_evaluation',
          activityId: closingAct.id,
          lectureId: closingAct.id,
          title: closingAct.title,
          action: 'feedback',
          points: 10,
          url: `https://techweek.facom.ufu.br/agenda?evaluate=${closingAct.id}`
        });

        return (
          <main className="relative mx-auto grid min-h-[calc(100vh-70px)] max-w-[1680px] items-center gap-10 px-8 py-10 lg:grid-cols-[minmax(0,1.2fr)_minmax(420px,580px)] lg:gap-16 lg:px-16 animate-in fade-in">
            {/* Iluminação de Palco Temática Dourada/Púrpura */}
            <div aria-hidden="true" className="pointer-events-none absolute -left-20 top-1/4 h-[500px] w-[500px] rounded-full bg-[#F59E0B]/15 blur-[130px]" />
            <div aria-hidden="true" className="pointer-events-none absolute right-10 top-1/3 h-[500px] w-[500px] rounded-full bg-[#7C3AED]/20 blur-[150px]" />

            {/* COLUNA ESQUERDA: PALESTRA, PALESTRANTES E GUIA DE AVALIAÇÃO */}
            <div className="relative z-10 flex flex-col justify-center">
              {/* Logo, Status de Fechamento e Seletor de Palestra */}
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div className="flex flex-wrap items-center gap-3">
                  <img src={logoTw} alt="FACOM Tech Week" className="h-12 w-48 object-contain object-left lg:h-14 lg:w-56" />
                  <span className="inline-flex items-center gap-2 rounded-full border border-warn/40 bg-warn/10 px-3.5 py-1 text-[13px] font-black uppercase tracking-wider text-warn">
                    <Sparkles size={14} className="text-warn animate-pulse" />
                    Fechamento & Avaliação de Conteúdo
                  </span>
                </div>

                {activities.length > 1 && (
                  <div className="flex items-center gap-2 rounded-xl border border-line-2 bg-surface/80 px-3 py-1.5 shadow-sm">
                    <span className="text-[11px] font-bold text-text-3 uppercase">Sessão:</span>
                    <select
                      value={closingAct.id}
                      onChange={(e) => setSelectedClosingId(e.target.value)}
                      className="bg-transparent text-[13px] font-extrabold text-text outline-none cursor-pointer max-w-[220px] truncate"
                    >
                      {activities.map((a) => (
                        <option key={a.id} value={a.id} className="bg-surface text-text">
                          {a.title}
                        </option>
                      ))}
                    </select>
                  </div>
                )}
              </div>

              {/* Informações de Local e Horário */}
              <div className="mt-6 flex flex-wrap items-center gap-3 text-[18px] font-extrabold lg:text-[22px]">
                <span className="inline-flex items-center gap-2 text-link">
                  <MapPin size={20} className="shrink-0" />
                  {closingPlace}
                </span>
                <span className="text-text-3">·</span>
                <span style={{ color: closingColor }}>{typeLabel(closingAct.type)}</span>
                <span className="text-text-3">·</span>
                <span className="inline-flex items-center gap-1.5 text-text-2">
                  <Clock size={19} className="shrink-0" />
                  {startTime(closingAct)}{closingEnd ? ` – ${closingEnd}` : ''}
                </span>
              </div>

              {/* Título da Palestra Encerrada */}
              <h1 className="m-0 mt-3 text-[34px] font-black leading-[1.08] tracking-[-0.03em] text-text lg:text-[54px]">
                {closingAct.title}
              </h1>

              {/* Palestrantes Convidados */}
              <div className="mt-6">
                <span className="block text-[12px] font-black uppercase tracking-widest text-text-3">
                  {displaySpeakers.length > 1 ? 'Palestrantes da Sessão' : 'Palestrante da Sessão'}
                </span>
                <div className="mt-2.5 grid grid-cols-1 gap-3 sm:grid-cols-2">
                  {displaySpeakers.map((spk, idx) => (
                    <div
                      key={idx}
                      className="flex items-center gap-3.5 rounded-2xl border border-line-2 bg-surface/85 p-3.5 shadow-lg backdrop-blur-md"
                    >
                      {spk.photo ? (
                        <img
                          src={spk.photo}
                          alt={spk.name}
                          className="h-14 w-14 shrink-0 rounded-full border-2 border-warn/60 object-cover shadow-md"
                        />
                      ) : (
                        <div
                          className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full text-[17px] font-black text-white shadow-md"
                          style={{ background: 'var(--brand-gradient)' }}
                        >
                          {initials(spk.name)}
                        </div>
                      )}
                      <div className="min-w-0 flex-1">
                        <div className="truncate text-[17px] font-black leading-snug text-text">
                          {spk.name}
                        </div>
                        {spk.role && (
                          <div className="truncate text-[13px] font-semibold text-warn">
                            {spk.role}
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* JORNADA FLUIDA DE AVALIAÇÃO: ESTRELAS + TAGS + +10 XP */}
              <div className="mt-8 rounded-3xl border border-warn/35 bg-gradient-to-r from-warn/15 via-surface to-surface-raised p-6 shadow-2xl">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-warn/25 text-warn shadow-inner">
                      <Star size={22} className="fill-warn text-warn animate-bounce" />
                    </span>
                    <div>
                      <span className="block text-[18px] font-black text-text lg:text-[20px]">
                        Avalie a Palestra & Resgate +10 XP
                      </span>
                      <span className="block text-[13px] font-medium text-text-2">
                        Seu feedback direciona a premiação de melhores conteúdos e credita pontos na hora
                      </span>
                    </div>
                  </div>
                  <span className="rounded-full bg-warn/25 px-4 py-1.5 text-[16px] font-black text-warn shadow-inner">
                    +10 pts bônus
                  </span>
                </div>

                {/* 5 Estrelas Animadas e Rótulos Semânticos */}
                <div className="mt-5 rounded-2xl border border-line bg-surface/80 p-4">
                  <span className="block text-[11px] font-black uppercase tracking-wider text-text-3 mb-2.5">
                    Nota de 1 a 5 Estrelas
                  </span>
                  <div className="flex flex-wrap items-center gap-2 sm:gap-4">
                    {[
                      { n: 1, label: 'Regular' },
                      { n: 2, label: 'Boa' },
                      { n: 3, label: 'Muito Boa' },
                      { n: 4, label: 'Excelente' },
                      { n: 5, label: 'Espetacular!' }
                    ].map((star) => (
                      <div key={star.n} className="flex items-center gap-1.5 rounded-xl border border-line bg-surface-raised px-3 py-1.5 shadow-sm">
                        <Star size={16} className="fill-warn text-warn" />
                        <span className="text-[12px] font-black text-text">{star.n}</span>
                        <span className="text-[11px] font-semibold text-text-3 hidden sm:inline">· {star.label}</span>
                      </div>
                    ))}
                  </div>

                  {/* Tags de Percepção em 1 Toque */}
                  <span className="block text-[11px] font-black uppercase tracking-wider text-text-3 mt-4 mb-2">
                    Tags de Percepção em 1 Toque
                  </span>
                  <div className="flex flex-wrap gap-1.5">
                    {[
                      'Didática Clara',
                      'Mão na Massa / Prático',
                      'Inovador & Tendências',
                      'Slides Excelentes',
                      'Ritmo Rápido',
                      'Conteúdo Denso'
                    ].map((tag) => (
                      <span
                        key={tag}
                        className="rounded-full border border-line-2 bg-surface px-3 py-1 text-[11px] font-bold text-text-2 shadow-xs"
                      >
                        ✓ {tag}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* COLUNA DIREITA: QR CODE DE FECHAMENTO CINEMATOGRÁFICO */}
            <div className="relative z-10 flex flex-col items-center justify-center">
              <div className="relative rounded-[36px] bg-white p-7 text-center shadow-[0_20px_90px_rgba(245,158,11,0.4)] ring-4 ring-white/10 lg:p-9">
                {/* Plaqueta Superior */}
                <div className="mb-4 inline-flex items-center gap-2 rounded-full bg-[#0A0F24] px-4 py-1 text-[11px] font-black uppercase tracking-wider text-white">
                  <CheckCircle2 size={13} className="text-warn" />
                  QR Code Oficial de Fechamento & Avaliação
                </div>

                {/* QR Code SVG em Alta Resolução */}
                <div className="flex items-center justify-center">
                  <QRCodeSVG
                    value={closingQrValue}
                    size={360}
                    level="H"
                    includeMargin={false}
                  />
                </div>

                {/* Sub-legenda */}
                <div className="mt-4 border-t border-gray-200 pt-3 text-[13px] font-extrabold text-gray-800">
                  Validação instantânea de presença final e feedback
                </div>
              </div>

              {/* Passos Rápidos */}
              <div className="mt-6 flex flex-col items-center gap-1.5 text-center">
                <p className="m-0 flex items-center gap-2 text-[17px] font-black text-text lg:text-[20px]">
                  <Sparkles size={18} className="text-warn" />
                  Aponte a câmera e garanta seus +10 XP
                </p>
                <p className="m-0 text-[13px] font-medium text-text-3">
                  Compatível com a câmera padrão do celular ou o leitor de Crachá do app
                </p>
              </div>
            </div>
          </main>
        );
      })()}

      {/* MODO 2: GRADE AO VIVO (AGENDA DINÂMICA) */}
      {mode === 'agenda' && (
        <main className="mx-auto max-w-[1500px] px-8 py-10 animate-in fade-in">
          <div className="mb-10 flex flex-wrap items-center justify-between gap-4">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full border border-ok/30 bg-ok/10 px-3.5 py-1 text-[13px] font-black text-ok uppercase tracking-wider">
                <span className="h-2 w-2 rounded-full bg-ok animate-pulse" />
                Ao Vivo no Campus FACOM / UFU
              </div>
              <h1 className="m-0 mt-2 text-[36px] font-black tracking-tight lg:text-[54px]">
                Programação da TechWeek
              </h1>
            </div>
            <div className="text-right">
              <span className="text-[32px] font-black tracking-tight text-link">
                {String(now.getHours()).padStart(2, '0')}:{String(now.getMinutes()).padStart(2, '0')}
              </span>
              <span className="block text-[14px] font-bold text-text-3">Horário Oficial de Brasília</span>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-8 lg:grid-cols-2">
            {/* Acontecendo Agora */}
            <div className="rounded-3xl border border-line bg-surface/70 p-6 backdrop-blur-md">
              <div className="mb-4 flex items-center justify-between border-b border-line pb-3">
                <span className="flex items-center gap-2 text-[16px] font-black text-ok">
                  <span className="h-3 w-3 rounded-full bg-ok animate-ping" />
                  Acontecendo Agora
                </span>
                <span className="text-[13px] font-bold text-text-3">{liveActivities.length} ativas</span>
              </div>
              {liveActivities.length === 0 ? (
                <div className="py-12 text-center text-text-3">
                  Nenhuma atividade com transmissão ativa neste minuto. Próxima sessão inicia em breve.
                </div>
              ) : (
                <div className="space-y-4">
                  {liveActivities.map((act) => (
                    <div key={act.id} className="rounded-2xl border border-line bg-surface-raised p-5 shadow-lg">
                      <div className="flex items-center justify-between gap-2">
                        <span className="rounded-full bg-link/15 px-3 py-1 text-[12px] font-extrabold text-link">
                          {act.location || 'Auditório'}
                        </span>
                        <span className="text-[14px] font-black text-ok">+{act.points || 50} XP</span>
                      </div>
                      <h3 className="m-0 mt-2 text-[20px] font-black text-text">{act.title}</h3>
                      <div className="mt-3 flex items-center gap-4 text-[13px] text-text-3">
                        <span className="flex items-center gap-1.5"><Clock size={15} /> {startTime(act)}</span>
                        {act.speaker && <span>Palestrante: <b className="text-text">{act.speaker}</b></span>}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* A Seguir */}
            <div className="rounded-3xl border border-line bg-surface/70 p-6 backdrop-blur-md">
              <div className="mb-4 flex items-center justify-between border-b border-line pb-3">
                <span className="flex items-center gap-2 text-[16px] font-black text-text">
                  <Calendar size={18} className="text-link" />
                  Próximas Sessões
                </span>
                <span className="text-[13px] font-bold text-text-3">A seguir na grade</span>
              </div>
              <div className="space-y-3">
                {upcomingActivities.length === 0 ? (
                  <div className="py-12 text-center text-text-3">
                    Grade de hoje concluída ou sem próximas sessões registradas.
                  </div>
                ) : (
                  upcomingActivities.map((act) => (
                    <div key={act.id} className="flex items-center justify-between gap-4 rounded-xl border border-line/60 bg-surface-raised/60 p-3.5">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-[13px] font-black text-link">{startTime(act)}</span>
                          <span className="text-[11px] text-text-3 font-semibold">· {act.location || 'Auditório'}</span>
                        </div>
                        <h4 className="m-0 truncate text-[15px] font-bold text-text">{act.title}</h4>
                      </div>
                      <span className="shrink-0 text-[12px] font-black text-text-3">+{act.points || 50} pts</span>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </main>
      )}

      {/* MODO 3: RANKING & LEADERBOARD XP */}
      {mode === 'ranking' && (
        <main className="mx-auto max-w-[1300px] px-8 py-10 animate-in fade-in">
          <div className="mb-8 text-center">
            <div className="inline-flex items-center gap-2 rounded-full border border-warn/30 bg-warn/10 px-4 py-1 text-[13px] font-black text-warn uppercase tracking-wider">
              <Trophy size={16} /> Placar Geral em Tempo Real
            </div>
            <h1 className="m-0 mt-2 text-[38px] font-black tracking-tight lg:text-[56px]">
              Top 10 TechWeek Gamificação
            </h1>
            <p className="m-0 mt-1 text-[16px] text-text-2">
              Os participantes com maior engajamento em palestras, estandes e desafios da feira.
            </p>
          </div>

          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            {topUsers.map((user, idx) => {
              const pts = Number(user.totalPoints ?? user.pontuacaoTotal) || 0;
              const isPodium = idx < 3;
              const podiumColors = ['#FBBF24', '#CBD5E1', '#CD7F32'];
              return (
                <div
                  key={user.id || idx}
                  className={`flex items-center justify-between gap-4 rounded-2xl border p-4 shadow-md transition-all ${
                    isPodium
                      ? 'border-line-2 bg-surface-raised'
                      : 'border-line bg-surface'
                  }`}
                >
                  <div className="flex items-center gap-3.5 min-w-0">
                    <span
                      className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-[16px] font-black"
                      style={{
                        background: isPodium ? podiumColors[idx] : 'var(--surface-raised)',
                        color: isPodium ? '#0A0F24' : 'var(--text-3)',
                      }}
                    >
                      #{idx + 1}
                    </span>
                    <div className="min-w-0">
                      <span className="truncate text-[16px] font-black text-text block">
                        {user.fullName || user.displayName || user.firstName || 'Participante'}
                      </span>
                      <span className="text-[12px] text-text-3 font-semibold">
                        {user.course || 'Graduação UFU'}
                      </span>
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <span className="text-[20px] font-black text-link">{pts.toLocaleString('pt-BR')}</span>
                    <span className="block text-[11px] font-bold uppercase tracking-wider text-text-3">Pontos XP</span>
                  </div>
                </div>
              );
            })}
          </div>
        </main>
      )}

      {/* MODO 4: AVISOS & TRANSMISSÃO */}
      {mode === 'feed' && (
        <main className="mx-auto max-w-[1200px] px-8 py-10 animate-in fade-in">
          <div className="mb-10 text-center">
            <div className="inline-flex items-center gap-2 rounded-full border border-link/30 bg-link/10 px-4 py-1 text-[13px] font-black text-link uppercase tracking-wider">
              <Megaphone size={16} /> Canal Oficial de Transmissão
            </div>
            <h1 className="m-0 mt-2 text-[38px] font-black tracking-tight lg:text-[54px]">
              Comunicados da Organização
            </h1>
          </div>

          <div className="space-y-6">
            {activeNotices.length === 0 ? (
              <div className="rounded-3xl border border-line bg-surface p-12 text-center text-text-3">
                Nenhum comunicado recente publicado no feed da TechWeek.
              </div>
            ) : (
              activeNotices.map((post) => (
                <div key={post.id} className="rounded-3xl border border-line bg-surface-raised p-7 shadow-xl">
                  <div className="flex items-center justify-between gap-4 border-b border-line pb-4">
                    <div className="flex items-center gap-3">
                      <img src={iconeTw} alt="" className="h-8 w-8 object-contain" />
                      <div>
                        <span className="text-[16px] font-black text-text block">{post.author || 'Coordenação TechWeek'}</span>
                        <span className="text-[12px] text-text-3">{post.formattedTime || 'Recente'}</span>
                      </div>
                    </div>
                    <span className="rounded-full bg-link/15 px-3 py-1 text-[12px] font-black text-link">
                      Oficial
                    </span>
                  </div>
                  <p className="m-0 mt-5 text-[20px] font-semibold leading-relaxed text-text">
                    {post.content}
                  </p>
                </div>
              ))
            )}
          </div>
        </main>
      )}
    </div>
  );
}
