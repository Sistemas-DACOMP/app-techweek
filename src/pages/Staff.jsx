import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Html5Qrcode } from 'html5-qrcode';
import {
  Camera, Check, ChevronDown, ChevronLeft, ChevronRight, ArrowLeftRight, Flashlight,
  Loader2, LogOut, Pencil, ScanLine, ShieldCheck, TriangleAlert, Volume2, VolumeX, X
} from 'lucide-react';
import { subscribeToActivities, DEFAULT_ACTIVITIES } from '../lib/activityService';
import { getMyProfile } from '../lib/gameplay';
import { loginWithEmailAndPassword, logoutUser } from '../lib/auth';
import { auth } from '../lib/firebase';
import { useAuth } from '../contexts/AuthContext';
import { decideAccess } from '../lib/accessGuard';
import { stopAllMediaTracks } from '../lib/cameraUtils';
import Mascot from '../components/Mascot';
import RoleSwitcher from '../components/RoleSwitcher';
import iconeTw from '../assets/icone.png';
import '../styles/staff.css';

// Fallback simulado de leitura só existe fora de produção (mesmo padrão do Scanner.jsx).
const isDevMode = typeof window !== 'undefined' && (
  import.meta.env.DEV || window.location.search.includes('demo=true')
);

const RESULT_MS = 3000;

// Tipo de atividade → rótulo e cor (DESIGN.md §2.3: só ponto ou faixa)
const TYPES = {
  palestra: ['Palestra', 'var(--cat-palestra)'],
  workshop: ['Workshop', 'var(--cat-workshop)'],
  minicurso: ['Minicurso', 'var(--cat-minicurso)'],
  curso: ['Minicurso', 'var(--cat-minicurso)'],
  ativacao: ['Ativação', 'var(--cat-ativacao)'],
  hackathon: ['Hackathon', 'var(--cat-hackathon)'],
};
const typeOf = (t = '') => {
  const k = String(t).toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/s$/, '').trim();
  return TYPES[k] || [t ? t.charAt(0).toUpperCase() + t.slice(1) : 'Atividade', 'var(--link)'];
};

const todayIso = () => new Date().toLocaleDateString('sv-SE');
const nowHm = () => new Date().toTimeString().slice(0, 5);
function activityPhase(a) {
  const today = todayIso();
  if (!a.date) return null;
  if (a.date < today) return 'past';
  if (a.date > today) return null;
  const now = nowHm();
  if (a.endTime && a.endTime <= now) return 'past';
  if (a.time && a.time <= now) return 'now';
  return null;
}
function dayLabel(iso) {
  if (!iso) return 'Sem data';
  const d = new Date(`${iso}T12:00:00`);
  if (Number.isNaN(d.getTime())) return iso;
  const wd = d.toLocaleDateString('pt-BR', { weekday: 'long' }).replace('-feira', '');
  if (iso === todayIso()) return `Hoje · ${wd}, ${d.getDate()}`;
  const mon = d.toLocaleDateString('pt-BR', { month: 'short' }).replace('.', '');
  return `${wd.charAt(0).toUpperCase() + wd.slice(1)}, ${d.getDate()} de ${mon}`;
}
const hm = (date) => date.toTimeString().slice(0, 5);
const initialsOf = (p) => {
  const s = `${p?.first_name || ''} ${p?.last_name || ''}`.trim() || p?.username || 'S';
  return s.split(/\s+/).map((w) => w[0]).slice(0, 2).join('').toUpperCase();
};

const RESULT_COPY = {
  ok: { title: 'Entrada liberada', dot: 'var(--ok)', label: 'Liberada', Icon: Check },
  warn: { title: 'Não está inscrito', dot: 'var(--warn)', label: 'Não inscrito', Icon: TriangleAlert },
  dup: { title: 'Esse crachá já entrou', dot: 'var(--err)', label: 'Já tinha entrado', Icon: X },
  err: { title: 'Não deu para registrar', dot: 'var(--err)', label: 'Erro', Icon: X },
};
const tone = (kind) => (kind === 'ok' ? 'ok' : kind === 'warn' ? 'warn' : 'err');

function TitleBlock({ children }) {
  return (
    <div className="text-center">
      <h1 className="m-0 text-[20px] font-extrabold text-text lg:text-[22px]">{children}</h1>
      <span aria-hidden="true" className="mx-auto mt-[7px] block h-1 w-7 rounded-full" style={{ background: 'var(--title-bar)' }} />
    </div>
  );
}

function RoundButton({ label, onClick, children, ...rest }) {
  return (
    <button type="button" aria-label={label} onClick={onClick} className="press flex h-11 w-11 items-center justify-center rounded-full bg-surface text-text" {...rest}>
      {children}
    </button>
  );
}

export default function Staff() {
  const navigate = useNavigate();
  const { user: authUser, loading: authLoading } = useAuth();
  const [loading, setLoading] = useState(true);
  const [authorized, setAuthorized] = useState(false);
  const [profile, setProfile] = useState(null);
  const [activities, setActivities] = useState([]);
  const [selectedActivity, setSelectedActivity] = useState('');
  const [scanning, setScanning] = useState(false);
  const [scanResult, setScanResult] = useState(null); // { status: 'green'|'yellow'|'red', kind: 'ok'|'warn'|'dup'|'err', message }
  const [processing, setProcessing] = useState(false);

  // Apresentação (não muda regra): conta, câmera, som, lanterna, histórico local de leituras
  const [showAccount, setShowAccount] = useState(false);
  const [showAllDays, setShowAllDays] = useState(false);
  const [camera, setCamera] = useState('starting'); // 'starting' | 'on' | 'blocked'
  const [cameraDenied, setCameraDenied] = useState(true);
  const [cameraAttempt, setCameraAttempt] = useState(0);
  const [soundOn, setSoundOn] = useState(true);
  const [torch, setTorch] = useState({ supported: false, on: false });
  const [reads, setReads] = useState([]); // leituras feitas neste aparelho nesta sessão
  const scannerRef = useRef(null);
  const busyRef = useRef(false);
  const resetTimer = useRef(null);
  const handleScanRef = useRef(null);

  // Estados de login de Staff
  const [staffEmail, setStaffEmail] = useState('');
  const [staffPassword, setStaffPassword] = useState('');
  const [loginLoading, setLoginLoading] = useState(false);
  const [loginError, setLoginError] = useState('');

  // Só decide painel x login depois que o Firebase restaurou a sessão (senão o reload pisca o login).
  useEffect(() => {
    if (authLoading) return;
    if (!authUser) {
      setProfile(null);
      setAuthorized(false);
      setLoading(false);
      return;
    }
    let cancelled = false;
    async function checkAuth() {
      try {
        const profile = await getMyProfile();
        if (cancelled) return;
        setProfile(profile);
        // Papel vem só do perfil/claims do servidor; a UI não é autorização (o backend barra /api/staff/*).
        const ok = decideAccess({ authLoading: false, user: authUser, profileReady: !!profile, role: profile?.role, allowed: ['STAFF', 'ADMIN'] }) === 'allowed';
        setAuthorized(ok);
        if (ok) fetchActivities();
      } catch (error) {
        console.error('Auth error', error);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    checkAuth();
    return () => { cancelled = true; };
  }, [authLoading, authUser]);

  const handleStaffLogin = async (e) => {
    if (e) e.preventDefault();
    if (!staffEmail || !staffPassword || loginLoading) return;
    setLoginLoading(true);
    setLoginError('');
    try {
      const res = await loginWithEmailAndPassword(staffEmail, staffPassword);
      if (!res.success) {
        setLoginError(res.error || 'Credenciais inválidas.');
      }
    } catch (err) {
      setLoginError(err.message || 'Falha ao autenticar.');
    } finally {
      setLoginLoading(false);
    }
  };

  const handleStaffLogout = async () => {
    setShowAccount(false);
    setAuthorized(false);
    await logoutUser();
  };

  const fetchActivities = () => {
    try {
      subscribeToActivities((list) => {
        if (list && list.length > 0) {
          setActivities(list);
        } else {
          setActivities(DEFAULT_ACTIVITIES);
        }
      });
    } catch (_e) {
      setActivities(DEFAULT_ACTIVITIES);
    }
  };

  // Pré-seleciona a atividade que está acontecendo agora (só conveniência; staff pode trocar)
  useEffect(() => {
    if (selectedActivity || activities.length === 0) return;
    const now = activities.find((a) => activityPhase(a) === 'now');
    if (now) setSelectedActivity(now.id);
  }, [activities, selectedActivity]);

  useEffect(() => {
    if (!scanning || !selectedActivity || showAccount) return;

    let isMounted = true;
    let started = false;
    const scanner = new Html5Qrcode('staff-reader');
    scannerRef.current = scanner;

    scanner
      .start(
        { facingMode: 'environment' },
        { fps: 10 },
        (result) => {
          if (!isMounted) return;
          handleScanRef.current(result);
        },
        () => {}
      )
      .then(() => {
        if (!isMounted) {
          scanner.stop().catch(() => {});
          return;
        }
        started = true;
        setCamera('on');
        try {
          setTorch({ supported: scanner.getRunningTrackCameraCapabilities().torchFeature().isSupported(), on: false });
        } catch (_e) {
          setTorch({ supported: false, on: false });
        }
      })
      .catch((err) => {
        if (!isMounted) return;
        setCameraDenied(/NotAllowed|Permission/i.test(String(err?.name || err)));
        setCamera('blocked');
      });

    return () => {
      isMounted = false;
      scannerRef.current = null;
      if (started) {
        scanner.stop().then(() => scanner.clear()).catch((e) => console.error('Failed to clear scanner', e));
      }
      stopAllMediaTracks();
    };
  }, [scanning, selectedActivity, showAccount, cameraAttempt]);

  useEffect(() => () => clearTimeout(resetTimer.current), []);

  // Mostra o resultado e guarda no histórico local. A decisão continua vindo do servidor (handleScan).
  const showResult = (result, participantUid) => {
    setScanResult(result);
    setReads((prev) => [{ id: Date.now(), uid: participantUid ? String(participantUid) : '', kind: result.kind, at: new Date() }, ...prev].slice(0, 30));
  };

  const dismissResult = () => {
    clearTimeout(resetTimer.current);
    setScanResult(null);
    setProcessing(false);
    busyRef.current = false;
  };

  const handleScan = async (data) => {
    if (processing || busyRef.current) return;
    busyRef.current = true;
    setProcessing(true);

    let participantUid = null;
    try {
      // Trying to parse as JSON if it's the expected format
      const decoded = decodeURIComponent(data);
      if (decoded.startsWith('{') && decoded.endsWith('}')) {
        const parsed = JSON.parse(decoded);
        participantUid = parsed.uid || parsed.username;
      } else {
        participantUid = data;
      }
    } catch (e) {
      participantUid = data;
    }

    if (!participantUid) {
      showResult({ status: 'red', kind: 'err', message: 'Esse QR não é um crachá da Tech Week.' }, null);
      playSound('error');
      resetTimer.current = setTimeout(dismissResult, RESULT_MS);
      return;
    }

    try {
      // Chamada para `POST /api/checkin/entrance` enviando `{ participantUid, activityId }`.
      const headers = { 'Content-Type': 'application/json' };
      if (auth.currentUser) {
        headers['Authorization'] = `Bearer ${await auth.currentUser.getIdToken()}`;
      }

      const response = await fetch(`${import.meta.env.VITE_API_URL || ''}/api/checkin/entrance`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ participantUid, activityId: selectedActivity })
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        if (response.status === 409) {
          // Entrada duplicada
          showResult({ status: 'red', kind: 'dup', message: 'A entrada dessa pessoa já foi registrada nesta atividade. Confira se é a mesma pessoa do crachá.' }, participantUid);
          playSound('error');
        } else if (response.status === 403) {
          // Aluno não inscrito
          showResult({ status: 'yellow', kind: 'warn', message: 'Não encontramos inscrição dessa pessoa nesta atividade.' }, participantUid);
          playSound('warn');
        } else {
          showResult({ status: 'red', kind: 'err', message: errorData.message || 'Erro ao registrar check-in.' }, participantUid);
          playSound('error');
        }
      } else {
        // Sucesso
        showResult({ status: 'green', kind: 'ok', message: 'Entrada registrada. Lembre a pessoa de ler o QR do telão antes de sair.' }, participantUid);
        playSound('success');
      }
    } catch (err) {
      if (isDevMode) {
        // Simulação só em dev/demo, para testar a UI sem backend local rodando.
        console.warn("Backend call failed, simulating response for test", err);
        const rand = Math.random();
        if (rand > 0.6) {
          showResult({ status: 'green', kind: 'ok', message: '[TESTE] Entrada confirmada com sucesso.' }, participantUid);
          playSound('success');
        } else if (rand > 0.3) {
          showResult({ status: 'yellow', kind: 'warn', message: '[TESTE] Aluno não inscrito previamente.' }, participantUid);
          playSound('warn');
        } else {
          showResult({ status: 'red', kind: 'dup', message: '[TESTE] Entrada duplicada.' }, participantUid);
          playSound('error');
        }
      } else {
        showResult({ status: 'red', kind: 'err', message: 'A conexão falhou e a entrada não foi registrada. Leia o crachá de novo.' }, participantUid);
        playSound('error');
      }
    } finally {
      resetTimer.current = setTimeout(dismissResult, RESULT_MS);
    }
  };
  handleScanRef.current = handleScan;

  const playSound = (type) => {
    if (!soundOn) return;
    // Simple beep with AudioContext
    try {
      const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      const oscillator = audioCtx.createOscillator();
      const gainNode = audioCtx.createGain();

      oscillator.connect(gainNode);
      gainNode.connect(audioCtx.destination);

      if (type === 'success') {
        oscillator.frequency.value = 800;
        oscillator.type = 'sine';
        gainNode.gain.setValueAtTime(0.1, audioCtx.currentTime);
        oscillator.start();
        oscillator.stop(audioCtx.currentTime + 0.2);
      } else if (type === 'warn') {
        oscillator.frequency.value = 400;
        oscillator.type = 'triangle';
        gainNode.gain.setValueAtTime(0.1, audioCtx.currentTime);
        oscillator.start();
        oscillator.stop(audioCtx.currentTime + 0.3);
      } else {
        oscillator.frequency.value = 200;
        oscillator.type = 'sawtooth';
        gainNode.gain.setValueAtTime(0.1, audioCtx.currentTime);
        oscillator.start();
        oscillator.stop(audioCtx.currentTime + 0.4);
      }
    } catch (e) {
      console.error("Audio API not supported");
    }
  };

  const toggleTorch = async () => {
    const next = !torch.on;
    try {
      await scannerRef.current?.getRunningTrackCameraCapabilities().torchFeature().apply(next);
      setTorch((t) => ({ ...t, on: next }));
    } catch (_e) {
      setTorch({ supported: false, on: false });
    }
  };

  const startReading = () => {
    setCamera('starting');
    setScanning(true);
  };
  const retryCamera = () => {
    setCamera('starting');
    setCameraAttempt((n) => n + 1);
  };
  const backToChoice = () => {
    dismissResult();
    setScanning(false);
  };

  // ---------- Carregando ----------
  if (loading) {
    return (
      <div className="staff-root mx-auto w-full max-w-[430px] px-5 pt-[18px]" aria-busy="true" aria-label="Carregando a portaria">
        <div className="skeleton mx-auto h-7 w-32" />
        <div className="skeleton mt-6 h-[76px] rounded-[18px]" />
        <div className="skeleton mt-6 h-[120px] rounded-[18px]" />
        <div className="skeleton mt-2.5 h-[120px] rounded-[18px]" />
      </div>
    );
  }

  // ---------- Login de Staff ----------
  if (!authorized) {
    return (
      <main className="staff-root mx-auto flex min-h-dvh w-full max-w-[430px] flex-col justify-center px-5 py-8">
        <div className="mb-7 flex flex-col items-center gap-4">
          <img src={iconeTw} alt="Tech Week" className="h-9 w-[34px] object-contain" />
          <TitleBlock>Portaria</TitleBlock>
          <p className="m-0 text-center text-[14px] leading-normal text-text-2">
            Entre com a sua conta de staff para ler os crachás na entrada das salas.
          </p>
        </div>

        <form onSubmit={handleStaffLogin} className="ds-card flex flex-col gap-4 p-5" noValidate>
          {loginError && (
            <p role="alert" className="m-0 rounded-xl px-3.5 py-3 text-[13px] font-semibold text-err" style={{ background: 'rgba(245,154,154,.1)' }}>
              {loginError}
            </p>
          )}
          <div>
            <label htmlFor="staff-email" className="field-label">E-mail</label>
            <input
              id="staff-email"
              type="email"
              required
              autoComplete="email"
              placeholder="voce@techweek.com"
              value={staffEmail}
              onChange={(e) => setStaffEmail(e.target.value)}
              className="field"
              aria-invalid={loginError ? 'true' : undefined}
            />
          </div>
          <div>
            <label htmlFor="staff-pass" className="field-label">Senha</label>
            <input
              id="staff-pass"
              type="password"
              required
              autoComplete="current-password"
              value={staffPassword}
              onChange={(e) => setStaffPassword(e.target.value)}
              className="field"
              aria-invalid={loginError ? 'true' : undefined}
            />
          </div>
          <button type="submit" disabled={loginLoading} className="btn btn-primary btn-block mt-1">
            {loginLoading ? <Loader2 size={18} className="animate-spin" aria-hidden="true" /> : <ShieldCheck size={18} aria-hidden="true" />}
            {loginLoading ? 'Entrando' : 'Entrar na portaria'}
          </button>
        </form>
      </main>
    );
  }

  const name = `${profile?.first_name || ''} ${profile?.last_name || ''}`.trim() || 'Staff';
  const initials = initialsOf(profile);
  const roleLabel = profile?.role === 'ADMIN' ? 'Admin' : 'Staff';

  const avatarButton = (
    <button type="button" aria-label="Sua conta" onClick={() => setShowAccount(true)} className="press flex h-11 w-11 items-center justify-center rounded-full lg:hidden">
      <span className="flex h-9 w-9 rounded-full p-[2px]" style={{ background: 'var(--role-staff)' }}>
        <span className="flex h-full w-full items-center justify-center rounded-full bg-surface-raised text-[12px] font-extrabold text-text">{initials}</span>
      </span>
    </button>
  );
  const accountChip = (
    <button
      type="button"
      onClick={() => setShowAccount(true)}
      className="press hidden h-[46px] items-center gap-2.5 rounded-full border bg-surface py-0 pl-[5px] pr-3.5 text-left lg:inline-flex"
      style={{ borderColor: 'color-mix(in srgb, var(--role-staff) 33%, transparent)' }}
    >
      <span className="flex h-9 w-9 items-center justify-center rounded-full bg-surface-raised text-[12px] font-extrabold text-text" style={{ boxShadow: 'inset 0 0 0 2px var(--role-staff)' }}>{initials}</span>
      <span>
        <span className="block text-[13px] font-bold text-text">{name}</span>
        <span className="block text-[12px] font-bold" style={{ color: 'var(--role-staff)' }}>{roleLabel} · trocar conta</span>
      </span>
      <ChevronDown size={16} className="text-text-3" aria-hidden="true" />
    </button>
  );

  // ---------- Sua conta (3.07) ----------
  if (showAccount) {
    return (
      <main className="staff-root mx-auto w-full max-w-[430px] pb-8">
        <header className="grid grid-cols-[44px_1fr_44px] items-center px-3 pt-[18px]">
          <button type="button" aria-label="Voltar" onClick={() => setShowAccount(false)} className="press flex h-11 w-11 items-center justify-center text-text">
            <ChevronLeft size={22} aria-hidden="true" />
          </button>
          <TitleBlock>Sua conta</TitleBlock>
          <span />
        </header>

        <div
          className="mx-5 mt-6 flex items-center gap-3.5 rounded-[18px] border p-4"
          style={{ background: 'linear-gradient(135deg, color-mix(in srgb, var(--role-staff) 15%, transparent), var(--surface) 70%)', borderColor: 'color-mix(in srgb, var(--role-staff) 33%, transparent)' }}
        >
          <span className="h-[60px] w-[60px] shrink-0 rounded-full p-[3px]" style={{ background: 'var(--role-staff)' }}>
            {profile?.avatar_url ? (
              <img src={profile.avatar_url} alt="" className="h-full w-full rounded-full object-cover" />
            ) : (
              <span className="flex h-full w-full items-center justify-center rounded-full bg-surface-raised text-[19px] font-extrabold text-text">{initials}</span>
            )}
          </span>
          <span className="min-w-0 flex-1">
            <span className="block truncate text-[18px] font-extrabold text-text">{name}</span>
            <span className="mt-px block truncate text-[13px] text-text-2">{profile?.username ? `@${profile.username} · ` : ''}equipe da portaria</span>
            <span className="mt-1.5 inline-block rounded-[9px] px-2.5 py-[3px] text-[12px] font-extrabold" style={{ color: 'var(--role-staff)', background: 'color-mix(in srgb, var(--role-staff) 15%, transparent)' }}>
              Você está como Staff
            </span>
          </span>
        </div>

        <div className="mx-5 mt-3.5 rounded-2xl bg-surface px-3.5">
          <button type="button" onClick={() => navigate('/profile?edit=true')} className="flex min-h-[60px] w-full items-center gap-3 text-left text-text">
            <span aria-hidden="true" className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[11px] text-link" style={{ background: 'color-mix(in srgb, var(--link) 13%, transparent)' }}>
              <Pencil size={18} />
            </span>
            <span className="flex-1">
              <span className="block text-[15px] font-bold">Editar perfil</span>
              <span className="mt-px block text-[13px] text-text-3">Foto, nome e redes</span>
            </span>
            <ChevronRight size={18} className="text-text-4" aria-hidden="true" />
          </button>
        </div>

        <section aria-labelledby="staff-trocar" className="mx-5 mt-[22px]">
          <h2 id="staff-trocar" className="mb-2 mt-0 text-[16px] font-extrabold text-text">Trocar de conta</h2>
          <RoleSwitcher role={profile?.role || 'STAFF'} current="STAFF" />
          <p className="mx-0.5 mb-0 mt-2 text-[12px] text-text-4">Só aparecem os papéis que a sua conta tem.</p>
        </section>

        <button type="button" onClick={handleStaffLogout} className="btn btn-danger btn-sm mx-5 mt-[18px] w-[calc(100%-40px)]">
          <LogOut size={18} aria-hidden="true" />
          Sair da conta
        </button>
      </main>
    );
  }

  const current = activities.find((a) => a.id === selectedActivity);

  // ---------- Escolher atividade (3.01) ----------
  if (!scanning) {
    const sorted = [...activities].sort((a, b) => `${a.date || ''}${a.time || ''}`.localeCompare(`${b.date || ''}${b.time || ''}`));
    const days = [...new Set(sorted.map((a) => a.date || ''))];
    const today = todayIso();
    const mainDay = days.includes(today) ? today : days.find((d) => d > today) || days[days.length - 1];
    const visibleDays = showAllDays ? days : [mainDay];

    return (
      <div className="staff-root w-full pb-[120px]">
        <header className="mx-auto grid max-w-[1440px] grid-cols-[44px_1fr_44px] items-center px-3 pt-[18px] lg:grid-cols-[1fr_auto_1fr] lg:px-8 lg:pt-5">
          <span className="flex items-center justify-center gap-2.5 lg:justify-start">
            <img src={iconeTw} alt="Tech Week" className="h-7 w-[26px] object-contain" />
            <span className="hidden text-[14px] font-bold text-text-2 lg:inline">Tech Week 2026</span>
          </span>
          <TitleBlock>Portaria</TitleBlock>
          <span className="flex justify-center lg:justify-end">{avatarButton}{accountChip}</span>
        </header>

        <main className="mx-auto max-w-[560px]">
          <div className="mx-5 mt-6 flex items-center gap-3 rounded-[18px] bg-surface py-3 pl-2 pr-3.5">
            <Mascot className="staff-still shrink-0" style={{ width: 52, height: 52, cursor: 'default' }} />
            <p className="m-0 flex-1 text-[14px] leading-[1.45] text-text">
              <b className="text-[#B4C0FF]">Oi, {profile?.first_name || 'staff'}!</b> Qual atividade você está recebendo agora?
            </p>
          </div>

          {activities.length === 0 ? (
            <div className="mx-5 mt-6 flex flex-col gap-2.5" aria-busy="true" aria-label="Carregando atividades">
              <div className="skeleton h-[120px] rounded-[18px]" />
              <div className="skeleton h-[120px] rounded-[18px]" />
            </div>
          ) : (
            <div role="radiogroup" aria-label="Atividade">
              {visibleDays.map((day) => (
                <section key={day || 'sem-data'}>
                  <h2 className="mx-5 mb-2.5 mt-6 text-[14px] font-extrabold text-text-2">{dayLabel(day)}</h2>
                  <div className="mx-5 flex flex-col gap-2.5">
                    {sorted.filter((a) => (a.date || '') === day).map((a) => {
                      const checked = a.id === selectedActivity;
                      const phase = activityPhase(a);
                      const [typeLabel, typeColor] = typeOf(a.type);
                      const enrolled = Number(a.total_inscritos);
                      return (
                        <label
                          key={a.id}
                          className={`press relative flex cursor-pointer gap-3.5 rounded-[18px] border-2 p-4 has-[:focus-visible]:outline has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-link ${checked ? 'staff-now border-link' : 'border-transparent bg-surface'}`}
                          style={phase === 'past' && !checked ? { opacity: 0.55 } : undefined}
                        >
                          <input type="radio" name="atividade" value={a.id} checked={checked} onChange={() => setSelectedActivity(a.id)} className="sr-only" />
                          {checked ? (
                            <span aria-hidden="true" className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-action">
                              <Check size={14} strokeWidth={3} color="#fff" />
                            </span>
                          ) : (
                            <span aria-hidden="true" className="h-6 w-6 shrink-0 rounded-full border-2 border-[#3A4675]" />
                          )}
                          <span className="min-w-0 flex-1">
                            <span className="flex items-center gap-2">
                              <span className="text-[20px] font-black text-text">{a.time || '--:--'}</span>
                              {phase === 'now' && <span className="rounded-[9px] px-[9px] py-[3px] text-[11px] font-extrabold text-ok" style={{ background: 'rgba(111,216,166,.16)' }}>Agora</span>}
                              {phase === 'past' && <span className="rounded-[9px] bg-surface-raised px-[9px] py-[3px] text-[11px] font-extrabold text-text-3">Encerrada</span>}
                            </span>
                            <span className="mt-1.5 flex items-center gap-1.5 text-[12px] font-extrabold" style={{ color: typeColor }}>
                              <span aria-hidden="true" className="h-[7px] w-[7px] rounded-full" style={{ background: typeColor }} />
                              {typeLabel}
                            </span>
                            <span className="mt-0.5 block text-[15px] font-bold leading-[1.35] text-text">{a.title}</span>
                            <span className="mt-1 block text-[13px] text-text-2">
                              {[a.location, Number.isFinite(enrolled) ? `${enrolled} inscritos` : null].filter(Boolean).join(' · ')}
                            </span>
                          </span>
                        </label>
                      );
                    })}
                  </div>
                </section>
              ))}
            </div>
          )}

          {days.length > 1 && (
            <button type="button" onClick={() => setShowAllDays((v) => !v)} aria-expanded={showAllDays} className="mx-auto mt-2.5 flex h-11 items-center justify-center gap-1.5 px-4 text-[14px] font-bold text-link">
              {showAllDays ? 'Mostrar só um dia' : 'Ver outros dias'}
              <ChevronRight size={16} aria-hidden="true" className={showAllDays ? '-rotate-90' : ''} />
            </button>
          )}
        </main>

        <div className="fixed inset-x-0 bottom-0 z-10 flex justify-center border-t border-line bg-nav px-5 pb-[max(26px,env(safe-area-inset-bottom))] pt-3.5">
          <button type="button" className="btn btn-action btn-block max-w-[520px] text-[16px]" style={{ minHeight: 54 }} disabled={!selectedActivity} onClick={startReading}>
            <Camera size={20} aria-hidden="true" />
            Começar a leitura
          </button>
        </div>
      </div>
    );
  }

  // ---------- Câmera bloqueada (3.06) ----------
  if (camera === 'blocked') {
    return (
      <main className="staff-root mx-auto min-h-dvh w-full max-w-[430px] pb-[170px]">
        <header className="grid grid-cols-[44px_1fr_44px] items-center px-3 pt-[18px]">
          <RoundButton label="Voltar" onClick={backToChoice}><ChevronLeft size={20} aria-hidden="true" /></RoundButton>
          <TitleBlock>Portaria</TitleBlock>
          <span />
        </header>
        <div className="mx-7 mt-14 flex flex-col items-center text-center">
          <Mascot isCoveringEyes style={{ width: 112, height: 112, cursor: 'default' }} />
          <h2 className="mb-0 mt-5 text-[22px] font-extrabold text-text">
            {cameraDenied ? 'A câmera está bloqueada' : 'Não conseguimos abrir a câmera'}
          </h2>
          <p className="mb-0 mt-2 text-[15px] leading-normal text-text-2">
            {cameraDenied
              ? 'Sem ela não dá para ler os crachás. Libere o acesso nas permissões do navegador.'
              : 'Sem ela não dá para ler os crachás. Veja se outro app está usando a câmera ou se o aparelho tem uma.'}
          </p>
        </div>
        <ol className="mx-5 mb-0 mt-6 list-decimal rounded-[18px] bg-surface py-4 pl-9 pr-4 text-[14px] leading-[1.7] text-[#C3C9DE]">
          {cameraDenied ? (
            <>
              <li>Toque no cadeado ao lado do endereço</li>
              <li>Em <b className="text-text">Câmera</b>, escolha <b className="text-text">Permitir</b></li>
            </>
          ) : (
            <>
              <li>Feche outros apps ou abas que usam a câmera</li>
              <li>Confira se o navegador tem acesso à câmera</li>
            </>
          )}
          <li>Volte aqui e toque em tentar de novo</li>
        </ol>
        <div className="fixed inset-x-0 bottom-0 mx-auto flex max-w-[430px] flex-col gap-2 px-5 pb-[max(26px,env(safe-area-inset-bottom))] pt-3.5">
          <button type="button" onClick={retryCamera} className="btn btn-action btn-block text-[16px]" style={{ minHeight: 54 }}>
            <Camera size={20} aria-hidden="true" />
            Tentar de novo
          </button>
        </div>
      </main>
    );
  }

  // ---------- Leitor (3.02 / 3.08) ----------
  const [, curColor] = typeOf(current?.type);
  const curPhase = current ? activityPhase(current) : null;
  const okCount = reads.filter((r) => r.kind === 'ok').length;
  const enrolledNow = Number(current?.total_inscritos);
  const last = reads[0];
  const result = scanResult && RESULT_COPY[scanResult.kind || (scanResult.status === 'green' ? 'ok' : scanResult.status === 'yellow' ? 'warn' : 'err')];
  const resultKind = scanResult?.kind || (scanResult?.status === 'green' ? 'ok' : scanResult?.status === 'yellow' ? 'warn' : 'err');
  const readLabel = (r) => (r.uid ? `Crachá ···${r.uid.slice(-6)}` : 'QR não reconhecido');

  return (
    <div className="staff-root w-full pb-10">
      <header className="mx-auto grid max-w-[1440px] grid-cols-[44px_1fr_44px] items-center px-3 pt-[18px] lg:grid-cols-[1fr_auto_1fr] lg:px-8 lg:pt-5">
        <span className="flex items-center justify-center gap-2.5 lg:justify-start">
          <span className="lg:hidden"><RoundButton label="Voltar para a escolha de atividade" onClick={backToChoice}><ChevronLeft size={20} aria-hidden="true" /></RoundButton></span>
          <img src={iconeTw} alt="Tech Week" className="hidden h-7 w-[26px] object-contain lg:block" />
          <span className="hidden text-[14px] font-bold text-text-2 lg:inline">Tech Week 2026</span>
        </span>
        <TitleBlock>Portaria</TitleBlock>
        <span className="flex items-center justify-center gap-2.5 lg:justify-end">
          <RoundButton label={soundOn ? 'Som ligado' : 'Som desligado'} aria-pressed={soundOn} onClick={() => setSoundOn((v) => !v)}>
            {soundOn ? <Volume2 size={20} aria-hidden="true" /> : <VolumeX size={20} aria-hidden="true" />}
          </RoundButton>
          {accountChip}
        </span>
      </header>

      <main className="mx-auto mt-[22px] grid max-w-[1440px] gap-5 px-5 lg:mt-1 lg:grid-cols-2 lg:items-start lg:px-8">
        <section className="flex min-w-0 flex-col gap-3 lg:gap-3.5" aria-label="Leitor">
          <div className="staff-now flex items-center gap-3 rounded-2xl py-3 pl-4 pr-3 lg:rounded-[18px] lg:py-3.5 lg:pl-[18px]" style={{ borderLeft: `4px solid ${curColor}` }}>
            <span className="min-w-0 flex-1">
              <span className="block truncate text-[12px] font-extrabold" style={{ color: curPhase === 'now' ? 'var(--ok)' : curColor }}>
                {[curPhase === 'now' ? 'Agora' : current?.time, current?.location].filter(Boolean).join(' · ')}
              </span>
              <span className="mt-0.5 block truncate text-[14px] font-bold text-text lg:text-[16px] lg:font-extrabold">{current?.title || 'Atividade'}</span>
            </span>
            <button type="button" onClick={backToChoice} className="press flex h-10 shrink-0 items-center gap-1.5 rounded-xl bg-surface-selected px-3 text-[13px] font-bold text-text lg:h-[42px] lg:text-[14px]">
              <ArrowLeftRight size={16} aria-hidden="true" />
              Trocar
            </button>
          </div>

          <div className="grid grid-cols-2 gap-2 lg:gap-3">
            <div className="rounded-2xl bg-surface px-2 py-3 text-center">
              <div className="text-[26px] font-black text-ok">{okCount}</div>
              <div className="mt-0.5 text-[12px] font-bold text-text-2">Liberadas aqui</div>
            </div>
            <div className="rounded-2xl bg-surface px-2 py-3 text-center">
              <div className="text-[26px] font-black text-link">{Number.isFinite(enrolledNow) ? enrolledNow : '–'}</div>
              <div className="mt-0.5 text-[12px] font-bold text-text-2">Inscritos</div>
            </div>
          </div>

          <section aria-label="Câmera" className="staff-camera relative h-[300px] overflow-hidden rounded-3xl lg:h-auto lg:aspect-[4/3]">
            <div id="staff-reader" />
            <svg aria-hidden="true" viewBox="0 0 220 220" className="pointer-events-none absolute left-1/2 top-1/2 -ml-[95px] -mt-[105px] h-[190px] w-[190px] lg:-ml-[110px] lg:-mt-[110px] lg:h-[220px] lg:w-[220px]">
              <g fill="none" stroke="#EEF1FA" strokeWidth="7" strokeLinecap="round">
                <path d="M6 54V26a20 20 0 0 1 20-20h28" />
                <path d="M166 6h28a20 20 0 0 1 20 20v28" />
                <path d="M214 166v28a20 20 0 0 1-20 20h-28" />
                <path d="M54 214H26a20 20 0 0 1-20-20v-28" />
              </g>
            </svg>
            <p className="absolute inset-x-0 bottom-0 m-0 bg-gradient-to-t from-[rgba(10,15,36,.7)] to-transparent pb-3.5 pt-8 text-center text-[14px] font-bold text-[#E0E7FF] lg:pb-4 lg:text-[15px]" aria-live="polite">
              {camera === 'starting' ? 'Abrindo a câmera…' : processing && !scanResult ? 'Conferindo o crachá…' : 'Aponte para o crachá'}
            </p>
            {torch.supported && (
              <button type="button" aria-label="Lanterna" aria-pressed={torch.on} onClick={toggleTorch} className="press absolute right-3 top-3 flex h-11 w-11 items-center justify-center rounded-full text-text" style={{ background: torch.on ? 'var(--warn)' : 'rgba(10,15,36,.6)', color: torch.on ? '#0A0F24' : undefined }}>
                <Flashlight size={20} aria-hidden="true" />
              </button>
            )}
          </section>

          {last && (
            <div className="staff-banner hidden items-center gap-3 rounded-[18px] px-4 py-3.5 lg:flex" data-kind={tone(last.kind)}>
              <span aria-hidden="true" className="flex h-10 w-10 items-center justify-center rounded-full" style={{ background: 'color-mix(in srgb, var(--c) 18%, transparent)', color: 'var(--c)' }}>
                {(() => { const I = RESULT_COPY[last.kind].Icon; return <I size={20} strokeWidth={2.6} />; })()}
              </span>
              <span className="flex-1">
                <span className="block text-[16px] font-extrabold" style={{ color: 'var(--c)' }}>{RESULT_COPY[last.kind].title}</span>
                <span className="block text-[13px] text-[#D3D8EA]">{readLabel(last)}</span>
              </span>
              <span className="text-[13px] text-[#C3C9DE]">{hm(last.at)}</span>
            </div>
          )}

          <section className="mt-1.5 lg:hidden" aria-labelledby="staff-ultimas">
            <h2 id="staff-ultimas" className="mb-1 mt-0 text-[14px] font-extrabold text-text-2">Últimas leituras</h2>
            {reads.length === 0 ? (
              <p className="m-0 py-2.5 text-[13px] text-text-3">As leituras feitas neste aparelho aparecem aqui.</p>
            ) : (
              <ul className="m-0 list-none p-0">
                {reads.slice(0, 5).map((r) => (
                  <li key={r.id} className="flex items-center gap-3 border-b border-line py-2.5">
                    <span aria-hidden="true" className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-surface-raised text-text-2"><ScanLine size={16} /></span>
                    <span className="flex-1 truncate text-[14px] font-bold text-text">{readLabel(r)}</span>
                    <span className="text-[12px] text-text-3">{hm(r.at)}</span>
                    <span role="img" aria-label={RESULT_COPY[r.kind].label} className="h-2.5 w-2.5 rounded-full" style={{ background: RESULT_COPY[r.kind].dot }} />
                  </li>
                ))}
              </ul>
            )}
          </section>
        </section>

        <section className="hidden min-w-0 rounded-[20px] bg-surface p-5 lg:block" aria-labelledby="staff-passou">
          <h2 id="staff-passou" className="m-0 text-[17px] font-extrabold text-text">Quem já passou</h2>
          <p className="mb-3 mt-1.5 text-[13px] text-text-3">Leituras feitas neste aparelho desde que você abriu a portaria.</p>
          {reads.length === 0 ? (
            <p className="m-0 border-t border-line py-6 text-center text-[14px] text-text-3">Nenhuma leitura ainda.</p>
          ) : (
            <table className="w-full border-collapse">
              <thead>
                <tr>
                  <th className="px-3 pb-2.5 text-left text-[12px] font-bold text-text-3">Crachá</th>
                  <th className="px-3 pb-2.5 text-left text-[12px] font-bold text-text-3">Hora</th>
                  <th className="px-3 pb-2.5 text-left text-[12px] font-bold text-text-3">Resultado</th>
                </tr>
              </thead>
              <tbody>
                {reads.map((r) => (
                  <tr key={r.id} className="border-t border-line">
                    <td className="p-3 text-[14px] font-bold text-text">{readLabel(r)}</td>
                    <td className="p-3 text-[14px] text-text-2">{hm(r.at)}</td>
                    <td className="p-3">
                      <span className="inline-flex items-center gap-1.5 text-[13px] font-extrabold" style={{ color: RESULT_COPY[r.kind].dot }}>
                        <span aria-hidden="true" className="h-2 w-2 rounded-full" style={{ background: RESULT_COPY[r.kind].dot }} />
                        {RESULT_COPY[r.kind].label}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </section>
      </main>

      {/* Resultado em tela cheia no celular (3.03 · 3.04 · 3.05); no desktop vira o banner acima */}
      {scanResult && result && (
        <div role="alert" data-kind={tone(resultKind)} className="staff-result fixed inset-0 z-[3000] flex flex-col items-center px-6 pb-8 pt-[72px] lg:hidden">
          <span aria-hidden="true" className="staff-result-icon flex h-28 w-28 items-center justify-center rounded-full">
            <result.Icon size={60} strokeWidth={2.6} />
          </span>
          <h1 className="staff-result-title mb-0 mt-7 text-center text-[32px] font-black leading-[1.15]">{result.title}</h1>
          <p className="mb-0 mt-3.5 max-w-[360px] text-center text-[16px] leading-normal text-[#E7EAF4]">{scanResult.message}</p>
          {resultKind === 'warn' && (
            <p className="mb-0 mt-[18px] rounded-[14px] px-3.5 py-3 text-[13px] leading-normal text-[#E7EAF4]" style={{ background: 'rgba(0,0,0,.25)' }}>
              No app: Agenda → {current?.title || 'atividade'} → <b>Reservar vaga</b> ou <b>Entrar na lista de espera</b>
            </p>
          )}
          <div className="mt-auto w-full max-w-[430px]">
            <div className="flex justify-between text-[13px] font-bold text-[#C3C9DE]">
              <span>{resultKind === 'ok' ? 'Próxima leitura' : 'Volta ao leitor'} em {RESULT_MS / 1000} s</span>
              <span>ou toque abaixo</span>
            </div>
            <div className="mt-2 h-1.5 overflow-hidden rounded-[3px]" style={{ background: 'rgba(255,255,255,.12)' }}>
              <div key={reads[0]?.id} className="staff-countdown h-1.5 rounded-[3px]" style={{ '--t': `${RESULT_MS}ms` }} />
            </div>
            <button type="button" onClick={dismissResult} className="press mt-4 flex h-[54px] w-full items-center justify-center rounded-2xl text-[16px] font-extrabold text-white" style={{ background: 'rgba(255,255,255,.12)' }}>
              {resultKind === 'ok' ? 'Ler próximo' : 'Voltar ao leitor'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
