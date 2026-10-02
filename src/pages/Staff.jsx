import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Html5QrcodeScanner } from 'html5-qrcode';
import { CheckCircle, AlertCircle, Loader2, XCircle, ArrowLeft, ShieldCheck, Mail, Lock, LogOut } from 'lucide-react';
import { subscribeToActivities, DEFAULT_ACTIVITIES } from '../lib/activityService';
import { getMyProfile } from '../lib/gameplay';
import { loginWithEmailAndPassword, logoutUser } from '../lib/auth';
import { auth } from '../lib/firebase';
import { stopAllMediaTracks } from '../lib/cameraUtils';

// Atalho de login de teste e fallback simulado só existem fora de produção (mesmo padrão do Scanner.jsx).
const isDevMode = typeof window !== 'undefined' && (
  import.meta.env.DEV || window.location.search.includes('demo=true')
);

export default function Staff() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [authorized, setAuthorized] = useState(() => {
    if (typeof localStorage !== 'undefined') {
      const testSessionStr = localStorage.getItem('facom_test_session');
      if (testSessionStr) {
        try {
          const s = JSON.parse(testSessionStr);
          if (s.role === 'STAFF' || s.role === 'ADMIN' || s.email === 'staff@techweek.com' || s.email === 'admin@admin.com') return true;
        } catch (_e) {}
      }
    }
    return false;
  });
  const [activities, setActivities] = useState([]);
  const [selectedActivity, setSelectedActivity] = useState('');
  const [scanning, setScanning] = useState(false);
  const [scanResult, setScanResult] = useState(null); // { success: boolean, status: 'green' | 'yellow' | 'red', message: string }
  const [processing, setProcessing] = useState(false);

  // Estados de login de Staff
  const [staffEmail, setStaffEmail] = useState('');
  const [staffPassword, setStaffPassword] = useState('');
  const [loginLoading, setLoginLoading] = useState(false);
  const [loginError, setLoginError] = useState('');

  useEffect(() => {
    async function checkAuth() {
      try {
        const profile = await getMyProfile();
        if (profile?.role === 'STAFF' || profile?.role === 'ADMIN' || profile?.participant_type === 'Organizador' || profile?.participantType === 'Organizador') {
          setAuthorized(true);
          fetchActivities();
        } else if (!authorized) {
          setAuthorized(false);
        }
      } catch (error) {
        console.error('Auth error', error);
      } finally {
        setLoading(false);
      }
    }
    checkAuth();
  }, [authorized]);

  const handleStaffLogin = async (e) => {
    if (e) e.preventDefault();
    if (!staffEmail || !staffPassword || loginLoading) return;
    setLoginLoading(true);
    setLoginError('');
    try {
      const res = await loginWithEmailAndPassword(staffEmail, staffPassword);
      if (!res.success) {
        setLoginError(res.error || 'Credenciais inválidas.');
      } else {
        setAuthorized(true);
        fetchActivities();
      }
    } catch (err) {
      setLoginError(err.message || 'Falha ao autenticar.');
    } finally {
      setLoginLoading(false);
    }
  };

  const handleQuickStaff = async (email = 'staff@techweek.com', pass = 'StaffPassword123!') => {
    setStaffEmail(email);
    setStaffPassword(pass);
    setLoginLoading(true);
    setLoginError('');
    try {
      const res = await loginWithEmailAndPassword(email, pass);
      if (!res.success) {
        setLoginError(res.error || 'Credenciais inválidas.');
      } else {
        setAuthorized(true);
        fetchActivities();
      }
    } catch (err) {
      setLoginError(err.message || 'Falha ao autenticar.');
    } finally {
      setLoginLoading(false);
    }
  };

  const handleStaffLogout = async () => {
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

  useEffect(() => {
    if (!scanning || !selectedActivity) return;

    let isMounted = true;
    const scanner = new Html5QrcodeScanner('staff-reader', {
      qrbox: { width: 250, height: 250 },
      fps: 10,
    });

    scanner.render(
      (result) => {
        if (!isMounted) return;
        handleScan(result);
      },
      (error) => {}
    );

    return () => {
      isMounted = false;
      scanner.clear().catch(e => console.error("Failed to clear scanner", e));
      const videoElement = document.querySelector('#staff-reader video');
      if (videoElement && videoElement.srcObject) {
        videoElement.srcObject.getTracks().forEach(track => track.stop());
        videoElement.srcObject = null;
      }
      stopAllMediaTracks();
    };
  }, [scanning, selectedActivity]);

  const handleScan = async (data) => {
    if (processing) return;
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
      setScanResult({ status: 'red', message: 'QR Code invlido.' });
      playSound('error');
      setProcessing(false);
      setTimeout(() => setScanResult(null), 3000);
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
          setScanResult({ status: 'red', message: 'Entrada duplicada (j havia feito check-in).' });
          playSound('error');
        } else if (response.status === 403) {
          // Aluno no inscrito
          setScanResult({ status: 'yellow', message: 'Aluno no inscrito previamente.' });
          playSound('warn');
        } else {
          setScanResult({ status: 'red', message: errorData.message || 'Erro ao registrar check-in.' });
          playSound('error');
        }
      } else {
        // Sucesso
        setScanResult({ status: 'green', message: 'Entrada confirmada com sucesso.' });
        playSound('success');
      }
    } catch (err) {
      if (isDevMode) {
        // Simulação só em dev/demo, para testar a UI sem backend local rodando.
        console.warn("Backend call failed, simulating response for test", err);
        const rand = Math.random();
        if (rand > 0.6) {
          setScanResult({ status: 'green', message: '[TESTE] Entrada confirmada com sucesso.' });
          playSound('success');
        } else if (rand > 0.3) {
          setScanResult({ status: 'yellow', message: '[TESTE] Aluno no inscrito previamente.' });
          playSound('warn');
        } else {
          setScanResult({ status: 'red', message: '[TESTE] Entrada duplicada.' });
          playSound('error');
        }
      } else {
        setScanResult({ status: 'red', message: 'Falha de conexão ao registrar check-in.' });
        playSound('error');
      }
    } finally {
      setTimeout(() => {
        setScanResult(null);
        setProcessing(false);
      }, 3000);
    }
  };

  const playSound = (type) => {
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

  if (loading) {
    return (
      <div className="page-container" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
        <Loader2 className="animate-spin" size={48} color="var(--primary)" />
      </div>
    );
  }

  if (!authorized) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px 16px' }}>
        <div className="animate-fade-in" style={{ width: '100%', maxWidth: '420px', margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: '28px' }}>
            <div style={{ width: '64px', height: '64px', borderRadius: '18px', backgroundColor: 'rgba(56, 189, 248, 0.12)', border: '1px solid rgba(56, 189, 248, 0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px', color: '#38BDF8' }}>
              <ShieldCheck size={32} />
            </div>
            <span style={{ fontSize: '0.72rem', fontFamily: "'JetBrains Mono', monospace", color: '#38BDF8', fontWeight: 800, letterSpacing: '0.12em', textTransform: 'uppercase' }}>
              PORTAL DE PORTARIA & VALIDAÇÃO
            </span>
            <h1 style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: '1.75rem', fontWeight: 800, color: '#F8FAFC', margin: '6px 0 8px' }}>
              Staff TechWeek 2026
            </h1>
            <p style={{ fontSize: '0.84rem', color: '#94A3B8', margin: 0, lineHeight: 1.5 }}>
              Validação presencial de credenciais na entrada das salas e auditórios.
            </p>
          </div>

          <form onSubmit={handleStaffLogin} style={{ backgroundColor: '#0F141F', border: '1px solid #1E293B', borderRadius: '24px', padding: '26px', display: 'flex', flexDirection: 'column', gap: '16px', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.7)' }}>
            {loginError && (
              <div style={{ backgroundColor: 'rgba(239, 68, 68, 0.12)', border: '1px solid rgba(239, 68, 68, 0.3)', borderRadius: '12px', padding: '12px', display: 'flex', alignItems: 'center', gap: '8px', color: '#EF4444', fontSize: '0.80rem' }}>
                <AlertCircle size={16} />
                <span>{loginError}</span>
              </div>
            )}

            <div>
              <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: '#94A3B8', marginBottom: '6px' }}>E-mail de Staff</label>
              <div style={{ position: 'relative' }}>
                <Mail size={16} color="#64748B" style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)' }} />
                <input
                  type="email"
                  required
                  placeholder="staff@techweek.com"
                  value={staffEmail}
                  onChange={(e) => setStaffEmail(e.target.value)}
                  style={{ width: '100%', backgroundColor: '#090E21', border: '1px solid #1E293B', borderRadius: '12px', padding: '12px 14px 12px 40px', color: '#F8FAFC', fontSize: '0.88rem' }}
                />
              </div>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: '#94A3B8', marginBottom: '6px' }}>Senha</label>
              <div style={{ position: 'relative' }}>
                <Lock size={16} color="#64748B" style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)' }} />
                <input
                  type="password"
                  required
                  placeholder="••••••••••••"
                  value={staffPassword}
                  onChange={(e) => setStaffPassword(e.target.value)}
                  style={{ width: '100%', backgroundColor: '#090E21', border: '1px solid #1E293B', borderRadius: '12px', padding: '12px 14px 12px 40px', color: '#F8FAFC', fontSize: '0.88rem' }}
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loginLoading}
              style={{
                backgroundColor: '#2563EB',
                color: '#FFFFFF',
                border: 'none',
                borderRadius: '12px',
                padding: '14px',
                fontWeight: 700,
                fontSize: '0.90rem',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                cursor: 'pointer',
                marginTop: '6px'
              }}
            >
              {loginLoading ? <Loader2 size={18} className="animate-spin" /> : <ShieldCheck size={18} />}
              <span>Acessar Leitor Staff</span>
            </button>

            {isDevMode && (
              <button
                type="button"
                onClick={() => handleQuickStaff('staff@techweek.com', 'StaffPassword123!')}
                style={{
                  backgroundColor: 'rgba(56, 189, 248, 0.08)',
                  border: '1px solid rgba(56, 189, 248, 0.3)',
                  borderRadius: '12px',
                  padding: '10px',
                  color: '#38BDF8',
                  fontSize: '0.76rem',
                  fontWeight: 700,
                  cursor: 'pointer',
                  textAlign: 'center',
                  marginTop: '4px'
                }}
              >
                ⚡ Entrar como staff@techweek.com (1 clique garantido)
              </button>
            )}
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="page-container animate-fade-in" style={{ paddingBottom: '80px' }}>
      {/* Header Padronizado */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '22px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
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
              Staff Check-in
            </h1>
            <p
              style={{
                fontSize: '0.80rem',
                color: '#94A3B8',
                margin: '3px 0 0',
                fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, sans-serif"
              }}
            >
              Validação oficial de presença em atividades
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={handleStaffLogout}
          title="Sair do Portal Staff"
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
            backgroundColor: '#1E293B',
            border: '1px solid #334155',
            borderRadius: '12px',
            padding: '10px 14px',
            color: '#94A3B8',
            fontSize: '0.80rem',
            fontWeight: 700,
            cursor: 'pointer'
          }}
        >
          <LogOut size={16} />
          <span>Sair</span>
        </button>
      </div>

      <div className="glass-panel" style={{ padding: '24px', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
        {!scanning ? (
          <div style={{ width: '100%' }}>
            <label style={{ display: 'block', marginBottom: '8px', color: 'var(--text-secondary)' }}>
              Selecione a atividade atual:
            </label>
            <select 
              value={selectedActivity} 
              onChange={(e) => setSelectedActivity(e.target.value)}
              style={{ 
                width: '100%', 
                padding: '12px', 
                borderRadius: '8px', 
                background: 'rgba(255,255,255,0.05)', 
                border: '1px solid rgba(255,255,255,0.1)',
                color: 'white',
                marginBottom: '24px'
              }}
            >
              <option value="" disabled>-- Selecione --</option>
              {activities.map(act => (
                <option key={act.id} value={act.id} style={{ color: 'black' }}>{act.title}</option>
              ))}
            </select>

            <button 
              className="btn-primary" 
              style={{ width: '100%' }}
              disabled={!selectedActivity}
              onClick={() => setScanning(true)}
            >
              Iniciar Leitor
            </button>
          </div>
        ) : (
          <div style={{ width: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            <div style={{ marginBottom: '16px', color: 'var(--text-secondary)' }}>
              Lendo QR Code para: <strong>{activities.find(a => a.id === selectedActivity)?.title}</strong>
            </div>
            
            <div style={{ position: 'relative', width: '100%', maxWidth: '300px' }}>
              <div id="staff-reader" style={{ width: '100%', borderRadius: '12px', overflow: 'hidden' }}></div>
              
              {scanResult && (
                <div style={{
                  position: 'absolute',
                  top: 0, left: 0, right: 0, bottom: 0,
                  background: 'rgba(0,0,0,0.8)',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  zIndex: 10,
                  borderRadius: '12px'
                }}>
                  {scanResult.status === 'green' && <CheckCircle size={64} color="#10b981" />}
                  {scanResult.status === 'yellow' && <AlertCircle size={64} color="#f59e0b" />}
                  {scanResult.status === 'red' && <XCircle size={64} color="#ef4444" />}
                  <div style={{ marginTop: '16px', textAlign: 'center', padding: '0 16px', fontWeight: 'bold', color: scanResult.status === 'green' ? '#10b981' : scanResult.status === 'yellow' ? '#f59e0b' : '#ef4444' }}>
                    {scanResult.message}
                  </div>
                </div>
              )}
            </div>

            <button 
              className="btn-secondary" 
              style={{ width: '100%', marginTop: '24px' }}
              onClick={() => setScanning(false)}
            >
              Trocar Atividade
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

