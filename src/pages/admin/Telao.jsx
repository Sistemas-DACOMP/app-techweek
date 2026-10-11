import { useEffect, useState } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import {
  Maximize2, Minimize2, X, QrCode, Calendar, Trophy, Megaphone,
  Clock, MapPin, Users, Award, Sparkles, CheckCircle2
} from 'lucide-react';
import logoTw from '../../assets/logo-tw.png';
import iconeTw from '../../assets/icone.png';
import { typeColor, typeLabel, startTime, sessionsOf, liveStatus, dayLabel, firstDate } from './ui';
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

      {/* MODO 1: QR CODE DE PRESENÇA (OFICIAL) */}
      {mode === 'presenca' && activity && (
        <main className="mx-auto grid min-h-[calc(100vh-64px)] max-w-[1500px] items-center gap-12 px-8 py-12 lg:grid-cols-[minmax(0,1fr)_minmax(320px,560px)] lg:gap-24 lg:px-20 animate-in fade-in">
          <div>
            <img src={logoTw} alt="FACOM Tech Week" className="h-16 w-60 object-contain object-left" />
            <div className="mt-8 flex flex-wrap items-center gap-3.5 text-[22px] font-extrabold lg:text-[26px]">
              <span aria-hidden="true" className="h-3.5 w-3.5 rounded-full bg-ok" style={{ boxShadow: '0 0 0 6px rgba(111,216,166,0.25)' }} />
              <span className="text-ok">{place}</span>
              <span style={{ color }}>· {typeLabel(activity.type)}</span>
            </div>
            <h1 className="m-0 mt-4 text-[38px] font-black leading-[1.05] tracking-[-0.02em] lg:text-[68px]">
              {activity.title}
            </h1>
            <div className="mt-6 flex flex-wrap items-center gap-4 text-[20px] text-text-2 lg:text-[24px]">
              <span>{startTime(activity)}{end ? ` – ${end}` : ''}</span>
              <span className="rounded-[16px] bg-[rgba(124,58,237,0.3)] px-[18px] py-1.5 font-extrabold text-white">
                +{activity.points || 50} pts
              </span>
            </div>
            <ol className="m-0 mt-12 flex list-none flex-wrap gap-6 p-0">
              {['Abra o app', 'Toque em Crachá', 'Escanear'].map((t, i) => (
                <li key={t} className="flex items-center gap-3.5 text-[18px] font-bold lg:text-[22px]">
                  <span
                    aria-hidden="true"
                    className="flex h-11 w-11 items-center justify-center rounded-full text-[20px] font-black text-white"
                    style={{ background: 'var(--brand-gradient)' }}
                  >
                    {i + 1}
                  </span>
                  {t}
                </li>
              ))}
            </ol>
          </div>
          <div className="flex flex-col items-center">
            <div className="rounded-[40px] bg-white p-9" style={{ boxShadow: '0 30px 80px rgba(91,59,224,0.45)' }}>
              <QRCodeSVG value={qrValue} size={400} level="H" includeMargin={false} />
            </div>
            <p className="m-0 mt-6 text-[20px] font-bold text-text-2 lg:text-[22px]">
              Aponte a câmera ou o leitor do app TechWeek
            </p>
          </div>
        </main>
      )}

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
