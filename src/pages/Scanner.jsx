import { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import { Html5Qrcode } from 'html5-qrcode';
import { QRCodeSVG } from 'qrcode.react';
import {
  Check,
  UserPlus,
  Flag,
  Monitor,
  Flashlight,
  FlashlightOff,
  CameraOff,
  Lock,
  Ticket,
  WifiOff,
  AlertCircle,
  RefreshCw,
  ExternalLink,
  X
} from 'lucide-react';
import { useUser } from '../hooks/useUser';
import { findUserByUsername, getLeaderboardUsers } from '../lib/userService';
import { DEFAULT_ACTIVITIES } from '../lib/activityService';
import { DEFAULT_MISSIONS } from '../lib/missionService';
import { resolveParticipantFromQr } from '../lib/sponsorService';
import { getBadgeQrValue } from '../lib/sympla';
import { stopAllMediaTracks } from '../lib/cameraUtils';
import ParticipantCard, { periodLabel } from '../components/ParticipantCard';
import SymplaRequirementModal from '../components/SymplaRequirementModal';
import Mascot from '../components/Mascot';
import logoTw from '../assets/logo-tw.png';
import '../styles/cracha.css';

// "O que dá para escanear" (board Escanear). Pontos: crachá = registerCodeScan(data, 5);
// QR de missão = "Caça ao QR" (40 pts) em DEFAULT_MISSIONS; telão = presença na atividade.
const SCANNABLES = [
  { Icon: UserPlus, title: 'Crachá de outra pessoa', desc: 'Vira conexão e conta para missões', pts: '+5', tile: 'bg-[rgba(155,123,255,0.18)] text-[#C4B5FD]' },
  { Icon: Flag, title: 'QR de missão', desc: 'Escondidos pelo evento', pts: 'até +40', tile: 'bg-[rgba(242,196,106,0.16)] text-warn' },
  { Icon: Monitor, title: 'Telão da sala', desc: 'Confirma sua presença na atividade', pts: 'presença', tile: 'bg-[rgba(111,216,166,0.16)] text-ok' }
];

const missionTitle = (id) => DEFAULT_MISSIONS.find((m) => m.id === id)?.title || null;

// Normaliza o perfil do useUser (camelCase ou snake_case, vindo do cache local ou do Firestore).
function badgeFromProfile(profile) {
  if (!profile) return null;
  const first = profile.firstName || profile.first_name || '';
  const last = profile.lastName || profile.last_name || '';
  const username = (profile.username || '').replace(/^@/, '');
  return {
    name: profile.displayName || [first, last].filter(Boolean).join(' ') || username || 'Participante',
    username,
    course: profile.course || '',
    period: profile.period || null,
    participantType: profile.participantType || profile.participant_type || 'Participante',
    avatarUrl: profile.avatarUrl || profile.avatar_url || profile.photoURL || null,
    symplaTicket: profile.symplaTicket || profile.sympla_ticket || null,
    uid: profile.uid || profile.id || ''
  };
}

const initialsOf = (name) =>
  (name || 'TW')
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0].toUpperCase())
    .join('') || 'TW';

function BadgeAvatar({ badge, size = 84 }) {
  const [broken, setBroken] = useState(false);
  const src = !broken && badge.avatarUrl;
  return (
    <span
      className="box-border shrink-0 rounded-[24px] bg-[linear-gradient(135deg,#2563EB,#7C3AED)] p-[3px]"
      style={{ width: size, height: size }}
    >
      <span className="flex h-full w-full items-center justify-center overflow-hidden rounded-[21px] bg-bg font-black text-text" style={{ fontSize: Math.round(size * 0.36) }}>
        {src ? <img src={src} alt="" onError={() => setBroken(true)} className="h-full w-full object-cover" /> : <span aria-hidden="true">{initialsOf(badge.name)}</span>}
      </span>
    </span>
  );
}

function BadgeTop({ badge }) {
  return (
    <>
      <span aria-hidden="true" className="mx-auto block h-1.5 w-12 rounded-[3px] bg-bg" />
      <div className="mt-3.5 flex items-center justify-between gap-2">
        <img src={logoTw} alt="FACOM Tech Week" className="h-7 w-[104px] object-contain object-left" />
        <span className="rounded-lg border border-[rgba(107,124,255,0.5)] bg-[rgba(61,80,230,0.2)] px-2.5 py-1 text-[11px] font-extrabold text-[#B4C0FF]">
          {badge.participantType}
        </span>
      </div>
    </>
  );
}

const cardClass =
  'mt-4 rounded-[26px] border border-[#2A3460] bg-[linear-gradient(180deg,#151D3E_0%,#0F1530_100%)] px-[18px] pt-3.5';

// Meu QR (board Cracha)
function MyBadge({ badge, points, onZoom }) {
  const id = badge.symplaTicket?.ticketNumber || badge.uid.slice(0, 8).toUpperCase();
  return (
    <>
      <section aria-label="Meu crachá digital" className={`${cardClass} pb-4 shadow-[0_18px_44px_rgba(0,0,0,0.45)]`}>
        <BadgeTop badge={badge} />
        <div className="mt-3.5 flex flex-col items-center text-center">
          <BadgeAvatar badge={badge} />
          <div className="mt-2.5 text-[21px] font-black">{badge.name}</div>
          {badge.username && <div className="mt-0.5 text-sm font-bold text-link">@{badge.username}</div>}
          {(badge.course || badge.period) && (
            <div className="mt-1 text-[13px] text-text-2">
              {[badge.course, periodLabel(badge.period)].filter(Boolean).join(' · ')}
            </div>
          )}
        </div>
        <div className="mt-3.5 flex justify-center">
          <button
            type="button"
            onClick={onZoom}
            aria-label="Ampliar QR Code do crachá"
            className="press cursor-pointer rounded-[18px] border-0 bg-[#F4F5FA] p-2.5 leading-[0]"
          >
            <QRCodeSVG value={getBadgeQrValue(badge)} size={164} bgColor="#F4F5FA" fgColor="#0A0F24" level="M" />
          </button>
        </div>
        <div className="mt-3 flex justify-center">
          <span className="inline-flex h-[30px] items-center gap-1.5 rounded-[15px] bg-[rgba(111,216,166,0.14)] px-3 text-xs font-extrabold text-ok">
            <Check size={14} strokeWidth={2.6} aria-hidden="true" />
            Ingresso Sympla vinculado
          </span>
        </div>
        <div className="mt-3.5 flex items-center justify-between border-t border-dashed border-[#2A3460] pt-3 text-xs text-text-3">
          {id ? <span>ID #{id}</span> : <span />}
          <span>
            <b className="text-[15px] text-[#C4B5FD]">{points}</b> pts
          </span>
        </div>
      </section>
      <p className="mx-3 mt-3 mb-0 text-center text-[13px] leading-normal text-text-3">
        Mostre na entrada e nos estandes. Toque no código para ampliar.
      </p>
    </>
  );
}

// Sem ingresso (board CrachaBloqueado). O QR borrado é decorativo, não é o código da pessoa.
function LockedBadge({ badge, onLink }) {
  return (
    <section aria-label="Meu crachá digital" className={`${cardClass} pb-[18px]`}>
      <BadgeTop badge={badge} />
      <div className="mt-3 flex flex-col items-center text-center">
        <BadgeAvatar badge={badge} size={76} />
        <div className="mt-2 text-xl font-black">{badge.name}</div>
        {badge.username && <div className="text-sm font-bold text-link">@{badge.username}</div>}
      </div>
      <div className="relative mx-auto mt-3.5 h-[184px] w-[184px] overflow-hidden rounded-[18px] bg-[#F4F5FA]">
        <div aria-hidden="true" className="opacity-55 blur-[6px]">
          <QRCodeSVG value="facom-techweek" size={184} bgColor="#F4F5FA" fgColor="#0A0F24" />
        </div>
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-[rgba(10,15,36,0.55)] text-center">
          <span className="flex h-[46px] w-[46px] items-center justify-center rounded-full bg-action">
            <Lock size={22} strokeWidth={2.2} color="#fff" aria-hidden="true" />
          </span>
          <span className="text-sm font-black">QR bloqueado</span>
        </div>
      </div>
      <p className="mt-3 mb-0 text-center text-[13px] leading-normal text-[#C3C9DE]">
        Vincule seu ingresso Sympla para liberar o QR na entrada e nos estandes.
      </p>
      <button type="button" onClick={onLink} className="btn btn-primary btn-block mt-3.5 min-h-[54px] text-base">
        <Ticket size={20} aria-hidden="true" />
        Vincular ingresso
      </button>
    </section>
  );
}

// Offline (board EstOfflineCracha): o QR é gerado no aparelho a partir do perfil em cache.
function OfflineBadge({ badge }) {
  return (
    <section aria-label="Seu crachá" className="mt-4 rounded-[22px] bg-surface">
      <div className="flex items-center justify-between rounded-t-[22px] px-[18px] pt-3.5 pb-10" style={{ background: 'var(--brand-gradient)' }}>
        <img src={logoTw} alt="FACOM Tech Week" className="h-8 w-[120px] object-contain object-left brightness-0 invert" />
        <span className="flex items-center gap-1.5 rounded-[10px] bg-[rgba(10,15,36,0.35)] px-2.5 py-1 text-xs font-extrabold">
          <WifiOff size={14} aria-hidden="true" />
          offline
        </span>
      </div>
      <div className="-mt-[30px] flex flex-col items-center px-[18px] pb-[18px]">
        <span className="box-border h-16 w-16 rounded-full bg-surface p-[3px]">
          <span className="flex h-full w-full items-center justify-center overflow-hidden rounded-full bg-surface-raised text-xl font-extrabold">
            {badge.avatarUrl ? <img src={badge.avatarUrl} alt="" className="h-full w-full object-cover" /> : <span aria-hidden="true">{initialsOf(badge.name)}</span>}
          </span>
        </span>
        <div className="mt-2 text-lg font-extrabold">{badge.name}</div>
        <div className="mt-3.5 rounded-2xl bg-[#F4F5FA] p-2.5 leading-[0]">
          <QRCodeSVG value={getBadgeQrValue(badge)} size={168} bgColor="#F4F5FA" fgColor="#0A0F24" level="M" title="QR Code do seu crachá" />
        </div>
        <div className="mt-3 flex items-center gap-1.5 text-[13px] font-bold text-ok">
          <Check size={15} strokeWidth={2.6} aria-hidden="true" />
          Salvo neste celular · funciona offline
        </div>
      </div>
    </section>
  );
}

function CameraFrame({ live }) {
  return (
    <div aria-hidden="true" className="pointer-events-none absolute top-1/2 left-1/2 z-[8] -mt-[120px] -ml-[110px] h-[220px] w-[220px]">
      <svg width="220" height="220" viewBox="0 0 220 220">
        <defs>
          <linearGradient id="cracha-frame" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor="#6B8CFF" />
            <stop offset="1" stopColor="#B794FF" />
          </linearGradient>
        </defs>
        {['M6 54 V26 a20 20 0 0 1 20 -20 H54', 'M166 6 H194 a20 20 0 0 1 20 20 V54', 'M214 166 V194 a20 20 0 0 1 -20 20 H166', 'M54 214 H26 a20 20 0 0 1 -20 -20 V166'].map((d) => (
          <path key={d} d={d} fill="none" stroke="url(#cracha-frame)" strokeWidth="6" strokeLinecap="round" />
        ))}
      </svg>
      <span className={`absolute top-[104px] left-6 h-[3px] w-[172px] rounded-sm bg-[#B794FF] opacity-70 ${live ? 'cracha-scanline-live' : ''}`} />
    </div>
  );
}

export default function Scanner() {
  const navigate = useNavigate();
  const [scanResult, setScanResult] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [cameraError, setCameraError] = useState(null);
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [tab, setTab] = useState('qr'); // o botão central da barra abre em Meu QR (DESIGN.md §5)
  const [cameraAttempt, setCameraAttempt] = useState(0);
  const [torchSupported, setTorchSupported] = useState(false);
  const [torchOn, setTorchOn] = useState(false);
  const [isOnline, setIsOnline] = useState(() => (typeof navigator === 'undefined' ? true : navigator.onLine));
  const [showLinkTicket, setShowLinkTicket] = useState(false);
  const [qrZoom, setQrZoom] = useState(false);
  const { registerCodeScan, profile, points, hasSymplaTicket } = useUser();
  const badge = badgeFromProfile(profile);

  const scannerRef = useRef(null);
  const isStartingRef = useRef(false);
  const isMountedRef = useRef(true);

  // O botão demo só existe no build de desenvolvimento; parâmetro de URL não libera nada em produção.
  const isDevMode = import.meta.env.DEV;

  useEffect(() => {
    const update = () => setIsOnline(navigator.onLine);
    window.addEventListener('online', update);
    window.addEventListener('offline', update);
    return () => {
      window.removeEventListener('online', update);
      window.removeEventListener('offline', update);
    };
  }, []);

  // Sem rede só o crachá funciona: a aba Escanear não registraria a leitura.
  const showScanTab = tab === 'scan' && isOnline;

  const stopScannerCamera = async () => {
    setIsCameraActive(false);
    setTorchSupported(false);
    setTorchOn(false);
    stopAllMediaTracks();
    if (scannerRef.current) {
      try {
        if (scannerRef.current.isScanning) {
          await scannerRef.current.stop();
        }
        await scannerRef.current.clear();
      } catch (_e) {
        // Ignora caso já esteja parado
      }
      scannerRef.current = null;
    }
    stopAllMediaTracks();
  };

  useEffect(() => {
    isMountedRef.current = true;

    // Câmera só liga na aba Escanear; resultado aberto ou outra aba desligam o hardware
    if (scanResult || !showScanTab) {
      stopScannerCamera();
      return;
    }

    const startCamera = async () => {
      if (isStartingRef.current || scannerRef.current?.isScanning) return;
      isStartingRef.current = true;

      try {
        setCameraError(null);
        setIsCameraActive(false);

        await stopScannerCamera();

        if (!isMountedRef.current) {
          isStartingRef.current = false;
          return;
        }

        const viewportEl = document.getElementById('techweek-camera-viewport');
        if (!viewportEl) {
          isStartingRef.current = false;
          return;
        }

        const html5QrCode = new Html5Qrcode('techweek-camera-viewport');
        scannerRef.current = html5QrCode;

        await html5QrCode.start(
          { facingMode: 'environment' },
          {
            fps: 10,
            qrbox: { width: 220, height: 220 },
            aspectRatio: 1
          },
          (decodedText) => {
            if (!isMountedRef.current) return;
            // Desliga o hardware da câmera imediatamente ao capturar o código
            stopScannerCamera();
            handleScan(decodedText);
          },
          () => {}
        );

        if (!isMountedRef.current || scanResult) {
          await stopScannerCamera();
          return;
        }

        setIsCameraActive(true);
        try {
          setTorchSupported(html5QrCode.getRunningTrackCameraCapabilities().torchFeature().isSupported());
        } catch {
          setTorchSupported(false);
        }
      } catch (err) {
        if (!isMountedRef.current) return;
        console.warn('Erro ao inicializar câmera do scanner:', err);
        setCameraError('Permissão de câmera não concedida ou dispositivo sem câmera.');
        stopAllMediaTracks();
      } finally {
        isStartingRef.current = false;
      }
    };

    startCamera();

    // Desliga a câmera se o app for minimizado ou a aba for para segundo plano
    const handleVisibilityChange = () => {
      if (document.hidden) {
        stopScannerCamera();
      } else if (isMountedRef.current && !scanResult) {
        startCamera();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('pagehide', stopAllMediaTracks);

    return () => {
      isMountedRef.current = false;
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('pagehide', stopAllMediaTracks);
      stopScannerCamera();
    };
  }, [scanResult, showScanTab, cameraAttempt]);

  const toggleTorch = async () => {
    try {
      await scannerRef.current?.getRunningTrackCameraCapabilities().torchFeature().apply(!torchOn);
      setTorchOn(!torchOn);
    } catch {
      setTorchSupported(false);
    }
  };

  // Esc fecha resultado / QR ampliado
  useEffect(() => {
    if (!scanResult && !qrZoom) return;
    const onKey = (e) => {
      if (e.key === 'Escape') {
        setScanResult(null);
        setQrZoom(false);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [scanResult, qrZoom]);

  const handleScan = async (data) => {
    setIsLoading(true);

    let isUserQr = false;
    let isActivityQr = false;
    let activityData = null;
    let usernameToValidate = null;
    let participantData = null;

    // 1. Tenta identificar payload JSON (Participante ou Atividade)
    try {
      const decoded = decodeURIComponent(data);
      if (decoded.startsWith('{') && decoded.endsWith('}')) {
        const parsed = JSON.parse(decoded);
        if (parsed.username || parsed.participantUid || (parsed.uid && !parsed.lectureId)) {
          isUserQr = true;
          usernameToValidate = parsed.username || null;
          participantData = parsed;
        } else if (parsed.lectureId || parsed.activityId) {
          isActivityQr = true;
          const actId = parsed.lectureId || parsed.activityId;
          activityData = DEFAULT_ACTIVITIES.find(a => a.id === actId) || { id: actId, title: 'Atividade TechWeek' };
        }
      }
    } catch {
      try {
        if (data.startsWith('{') && data.endsWith('}')) {
          const parsed = JSON.parse(data);
          if (parsed.username || parsed.participantUid || (parsed.uid && !parsed.lectureId)) {
            isUserQr = true;
            usernameToValidate = parsed.username || null;
            participantData = parsed;
          } else if (parsed.lectureId || parsed.activityId) {
            isActivityQr = true;
            const actId = parsed.lectureId || parsed.activityId;
            activityData = DEFAULT_ACTIVITIES.find(a => a.id === actId) || { id: actId, title: 'Atividade TechWeek' };
          }
        }
      } catch {}
    }

    // Se não for atividade e ainda não tiver identificado participante, tenta resolver pelo helper do crachá/sympla
    if (!isActivityQr && !isUserQr) {
      try {
        const resolved = await resolveParticipantFromQr(data);
        if (resolved) {
          isUserQr = true;
          usernameToValidate = resolved.username || null;
          participantData = resolved;
        }
      } catch {}
    }

    let fetchedProfile = null;
    if (isUserQr && usernameToValidate) {
      fetchedProfile = await findUserByUsername(usernameToValidate).catch(() => null);

      if (!fetchedProfile && !participantData) {
        setIsLoading(false);
        setScanResult({ 
          status: 'error',
          title: 'QR Code não identificado',
          message: 'Usuário não encontrado no banco de dados. Verifique se o código é válido.' 
        });
        return;
      }
    }

    const result = await registerCodeScan(data, 5);

    // Constrói objeto enriquecido do participante para o card (KAN-95)
    const consolidatedParticipant = isUserQr ? {
      name: fetchedProfile?.displayName || 
            [fetchedProfile?.firstName, fetchedProfile?.lastName].filter(Boolean).join(' ') || 
            participantData?.name || 
            participantData?.username || 
            usernameToValidate || 
            'Participante',
      username: fetchedProfile?.username || participantData?.username || usernameToValidate || '',
      avatarUrl: fetchedProfile?.avatarUrl || fetchedProfile?.photoURL || participantData?.avatarUrl || participantData?.photoURL || null,
      course: fetchedProfile?.course || participantData?.course || 'Computação',
      period: fetchedProfile?.period || participantData?.period || null,
      participantType: fetchedProfile?.participantType || fetchedProfile?.participant_type || participantData?.participantType || 'Aluno da UFU',
      phone: fetchedProfile?.phone || participantData?.phone || '',
      email: fetchedProfile?.email || participantData?.email || '',
      linkedin: fetchedProfile?.linkedin || participantData?.linkedin || '',
      instagram: fetchedProfile?.instagram || participantData?.instagram || '',
      github: fetchedProfile?.github || participantData?.github || ''
    } : null;

    if (result && result.success) {
      if (isUserQr) {
        setScanResult({ 
          status: 'success',
          type: 'participant',
          title: 'QR Code identificado',
          message: 'Conexão realizada com sucesso!',
          points: 5,
          challenges: result.unlockedChallenges,
          participant: consolidatedParticipant
        });
      } else if (isActivityQr) {
        setScanResult({
          status: 'success',
          type: 'activity',
          title: 'Atividade identificada',
          message: 'Presença e participação confirmadas!',
          points: 5,
          activity: activityData
        });
      } else {
        setScanResult({ 
          status: 'success',
          type: 'code',
          title: 'Código identificado',
          message: 'Participação registrada com sucesso!',
          points: 5,
          challenges: result.unlockedChallenges
        });
      }
    } else {
      // Estado Já Lido ou Inválido
      setScanResult({ 
        status: 'already_scanned',
        type: isUserQr ? 'participant' : 'generic',
        title: 'Código já processado',
        message: 'Você já escaneou este código anteriormente.',
        participant: consolidatedParticipant
      });
    }

    setIsLoading(false);
  };

  const simulateScan = async () => {
    setIsLoading(true);

    try {
      const users = await getLeaderboardUsers(10).catch(() => []);
      const validUsers = (users || []).filter(u => u.username || u.displayName);
      if (validUsers.length > 0) {
        const randomDbUser = validUsers[Math.floor(Math.random() * validUsers.length)];
        const payload = JSON.stringify({
          username: randomDbUser.username || '',
          name: randomDbUser.displayName || [randomDbUser.firstName, randomDbUser.lastName].filter(Boolean).join(' ') || randomDbUser.username || 'Participante',
          course: randomDbUser.course || '',
          participantType: randomDbUser.participant_type || randomDbUser.participantType || 'Participante',
          period: randomDbUser.period || null,
          avatarUrl: randomDbUser.avatarUrl || randomDbUser.photoURL || '',
          linkedin: randomDbUser.linkedin || '',
          instagram: randomDbUser.instagram || '',
          github: randomDbUser.github || ''
        });
        handleScan(payload);
        return;
      }
    } catch (e) {
      console.error("Falha ao simular scan:", e);
    }

    const fallbackUser = {
      username: 'lucas_silva',
      name: 'Lucas Silva',
      course: 'Sistemas de Informação',
      participantType: 'Aluno da UFU',
      period: 4,
      avatarUrl: '',
      linkedin: '',
      instagram: '',
      github: ''
    };
    handleScan(JSON.stringify(fallbackUser));
  };

  const isParticipantResult = Boolean(scanResult?.participant);
  const unlocked = (scanResult?.challenges || []).map(missionTitle).filter(Boolean);
  const closeResultAndScan = () => {
    setScanResult(null);
    setTab('scan');
  };

  return (
    <div className="no-scrollbar mx-auto h-full w-full max-w-[430px] overflow-x-hidden overflow-y-auto px-5 pt-[18px] pb-[max(120px,calc(env(safe-area-inset-bottom)+110px))] text-text">
      {!isOnline ? (
        <>
          <div role="status" className="flex items-center gap-3 rounded-2xl border border-[#A9B1CC55] bg-surface py-3 pr-3 pl-3.5">
            <WifiOff size={20} className="shrink-0 text-text-2" aria-hidden="true" />
            <span className="min-w-0 flex-1">
              <span className="block text-sm font-extrabold text-text-2">Você está sem internet</span>
              <span className="mt-px block text-xs text-[#C3C9DE]">Seu crachá e a agenda salva continuam funcionando.</span>
            </span>
          </div>
          {!badge ? (
            <p className="mt-6 text-center text-[13px] text-text-2">
              Abra o crachá uma vez com internet para salvá-lo neste celular.
            </p>
          ) : hasSymplaTicket ? (
            <OfflineBadge badge={badge} />
          ) : (
            <LockedBadge badge={badge} onLink={() => setShowLinkTicket(true)} />
          )}
        </>
      ) : (
        <>
          <div role="tablist" aria-label="Crachá" className="grid grid-cols-2 gap-1 rounded-[14px] bg-surface p-1">
            {[
              ['scan', 'Escanear'],
              ['qr', 'Meu QR']
            ].map(([key, label]) => (
              <button
                key={key}
                type="button"
                role="tab"
                id={`cracha-tab-${key}`}
                aria-selected={tab === key}
                aria-controls={`cracha-panel-${key}`}
                onClick={() => setTab(key)}
                className={`h-10 cursor-pointer rounded-[10px] border-0 font-[Montserrat] text-sm transition-colors duration-150 ${
                  tab === key ? 'bg-surface-selected font-bold text-text' : 'bg-transparent font-semibold text-text-2'
                }`}
              >
                {label}
              </button>
            ))}
          </div>

          {tab === 'scan' ? (
            <div role="tabpanel" id="cracha-panel-scan" aria-labelledby="cracha-tab-scan">
              <section
                aria-label="Câmera"
                className="relative mt-[18px] h-[330px] overflow-hidden rounded-[26px] bg-[radial-gradient(120%_90%_at_50%_40%,#2B3157_0%,#11152A_70%)]"
              >
                <div aria-hidden="true" className="cracha-stripes absolute inset-0" />
                {/* Elemento de montagem do Html5Qrcode */}
                <div id="techweek-camera-viewport" />

                {cameraError ? (
                  <div className="absolute inset-0 z-[9] flex flex-col items-center justify-center gap-2 px-8 text-center">
                    <span className="mb-1 flex h-12 w-12 items-center justify-center rounded-full bg-surface-selected text-text-2">
                      <CameraOff size={22} aria-hidden="true" />
                    </span>
                    <span className="text-[15px] font-extrabold">Câmera indisponível</span>
                    <span className="text-[13px] leading-snug text-text-2">
                      Permita o acesso à câmera nas configurações do navegador para ler QR Codes.
                    </span>
                    <button type="button" onClick={() => setCameraAttempt((n) => n + 1)} className="btn btn-secondary btn-sm mt-2">
                      <RefreshCw size={16} aria-hidden="true" />
                      Tentar de novo
                    </button>
                  </div>
                ) : (
                  <>
                    <CameraFrame live={isCameraActive && !isLoading} />
                    <div aria-live="polite" className="absolute inset-x-0 bottom-[18px] z-[9] text-center text-sm font-semibold text-[#E0E7FF]">
                      {isLoading ? 'Lendo o código…' : isCameraActive ? 'Aponte para um QR Code' : 'Abrindo a câmera…'}
                    </div>
                  </>
                )}

                <button
                  type="button"
                  onClick={toggleTorch}
                  disabled={!torchSupported}
                  aria-pressed={torchSupported ? torchOn : undefined}
                  aria-label={torchSupported ? (torchOn ? 'Desligar lanterna' : 'Ligar lanterna') : 'Lanterna indisponível neste aparelho'}
                  className="press absolute top-3.5 right-3.5 z-10 flex h-11 w-11 cursor-pointer items-center justify-center rounded-full border-0 bg-[rgba(10,15,36,0.55)] text-text disabled:cursor-not-allowed disabled:opacity-45"
                >
                  {torchOn ? <FlashlightOff size={20} aria-hidden="true" /> : <Flashlight size={20} aria-hidden="true" />}
                </button>
              </section>

              <section aria-labelledby="cracha-oq" className="mt-5">
                <h2 id="cracha-oq" className="mt-0 mb-2.5 text-sm font-extrabold text-text-2">
                  O que dá para escanear
                </h2>
                <div className="flex flex-col gap-2">
                  {SCANNABLES.map(({ Icon, title, desc, pts, tile }) => (
                    <div key={title} className="flex items-center gap-3.5 rounded-2xl bg-surface px-3.5 py-3">
                      <span className={`flex h-[42px] w-[42px] shrink-0 items-center justify-center rounded-full ${tile}`}>
                        <Icon size={20} aria-hidden="true" />
                      </span>
                      <span className="flex-1">
                        <span className="block text-[15px] font-bold">{title}</span>
                        <span className="mt-px block text-[13px] text-text-2">{desc}</span>
                      </span>
                      <span className="pts-chip rounded-[10px]">{pts}</span>
                    </div>
                  ))}
                </div>
              </section>

              {/* Simulação de leitura: só DEV */}
              {isDevMode && (
                <div className="mt-3 text-center">
                  <button
                    type="button"
                    onClick={simulateScan}
                    disabled={isLoading}
                    className="inline-flex min-h-11 cursor-pointer items-center gap-1.5 border-0 bg-transparent px-2 text-xs font-medium text-text-4"
                  >
                    <RefreshCw size={12} aria-hidden="true" />
                    Simulação de leitura (ambiente de testes)
                  </button>
                </div>
              )}
            </div>
          ) : (
            <div role="tabpanel" id="cracha-panel-qr" aria-labelledby="cracha-tab-qr">
              {!badge ? (
                <div className="skeleton mt-4 h-[540px] rounded-[26px]" aria-label="Carregando crachá" />
              ) : hasSymplaTicket ? (
                <MyBadge badge={badge} points={points} onZoom={() => setQrZoom(true)} />
              ) : (
                <LockedBadge badge={badge} onLink={() => setShowLinkTicket(true)} />
              )}
            </div>
          )}
        </>
      )}

      <SymplaRequirementModal isOpen={showLinkTicket} onClose={() => setShowLinkTicket(false)} featureName="o QR do seu crachá" />

      {/* QR ampliado */}
      {qrZoom && badge && typeof document !== 'undefined' && createPortal(
        <>
          <div className="ds-scrim" onClick={() => setQrZoom(false)} aria-hidden="true" />
          <div
            role="dialog"
            aria-modal="true"
            aria-label="QR Code do crachá ampliado"
            className="fixed inset-0 z-[2001] m-auto flex h-fit w-fit flex-col items-center gap-4"
          >
            <div className="rounded-3xl bg-[#F4F5FA] p-4 leading-[0]">
              <QRCodeSVG value={getBadgeQrValue(badge)} size={Math.min(320, (typeof window !== 'undefined' ? window.innerWidth : 360) - 72)} bgColor="#F4F5FA" fgColor="#0A0F24" level="M" />
            </div>
            <button type="button" onClick={() => setQrZoom(false)} className="btn btn-secondary btn-sm" autoFocus>
              <X size={16} aria-hidden="true" />
              Fechar
            </button>
          </div>
        </>,
        document.body
      )}

      {/* Resultado da leitura (board EscanearOk) */}
      {scanResult && typeof document !== 'undefined' && createPortal(
        <div className="fixed inset-0 z-[2000] bg-bg">
          <div aria-hidden="true" className="absolute inset-0 bg-[radial-gradient(70%_45%_at_50%_30%,#3B2B9A_0%,#121647_45%,#0A0F24_80%)]" />
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="cracha-result-title"
            className="relative mx-auto flex h-full max-w-[430px] flex-col px-4 pt-10 pb-[max(28px,env(safe-area-inset-bottom))]"
          >
            <div className="no-scrollbar flex min-h-0 flex-1 flex-col items-center overflow-y-auto rounded-[28px] border border-[#2E3878] bg-[#0F1530] p-[18px] text-center shadow-[0_24px_60px_rgba(0,0,0,0.5)] [animation:dsFadeUp_300ms_var(--ease-out)_both]">
              {isParticipantResult ? (
                <ParticipantCard
                  participant={scanResult.participant}
                  titleId="cracha-result-title"
                  points={scanResult.status === 'success' ? scanResult.points : null}
                  eyebrow={scanResult.status === 'success' ? 'Conexão feita!' : 'Vocês já estão conectados'}
                  eyebrowTone={scanResult.status === 'success' ? 'ok' : 'neutral'}
                />
              ) : (
                <div className="flex w-full flex-1 flex-col items-center justify-center">
                  <span
                    className={`flex h-16 w-16 items-center justify-center rounded-full ${
                      scanResult.status === 'success' ? 'bg-[rgba(111,216,166,0.16)] text-ok' : 'bg-[rgba(242,196,106,0.16)] text-warn'
                    }`}
                  >
                    {scanResult.status === 'success' ? <Check size={30} strokeWidth={2.6} aria-hidden="true" /> : <AlertCircle size={30} aria-hidden="true" />}
                  </span>
                  <h2 id="cracha-result-title" className="mt-4 mb-0 text-[22px] font-black">{scanResult.title}</h2>
                  <p className="mt-1.5 mb-0 text-sm text-text-2">{scanResult.message}</p>
                  {scanResult.status === 'success' && scanResult.points ? (
                    <span className="pts-chip mt-3">+{scanResult.points} pts</span>
                  ) : null}
                  {scanResult.activity && (
                    <div className="mt-5 w-full rounded-2xl bg-surface p-3.5 text-left">
                      <div className="text-[15px] font-extrabold">{scanResult.activity.title}</div>
                      {scanResult.activity.time && (
                        <div className="mt-1 text-[13px] text-text-2">
                          {scanResult.activity.time}
                          {scanResult.activity.location ? ` · ${scanResult.activity.location}` : ''}
                        </div>
                      )}
                      <button
                        type="button"
                        onClick={() => {
                          setScanResult(null);
                          navigate('/agenda');
                        }}
                        className="btn btn-secondary btn-sm btn-block mt-3"
                      >
                        Ver na programação
                        <ExternalLink size={15} aria-hidden="true" />
                      </button>
                    </div>
                  )}
                </div>
              )}

              {unlocked.length > 0 && (
                <div className="mt-auto flex w-full items-center gap-2.5 pt-3.5">
                  <Mascot color="purple" style={{ width: 40, height: 40, flexShrink: 0 }} />
                  <span className="flex-1 text-left text-[13px] leading-snug text-you-text">
                    Missão <b>{unlocked[0]}</b> concluída!
                    {unlocked.length > 1 ? ` E mais ${unlocked.length - 1}.` : ''}
                  </span>
                </div>
              )}
              {unlocked.length === 0 && <div className="mt-auto" />}
              <button type="button" onClick={closeResultAndScan} className="btn btn-primary btn-block mt-3 shrink-0 text-base">
                Escanear outro
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}
