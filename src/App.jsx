import { HashRouter, Routes, Route, useLocation, Navigate, useNavigate } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import Dashboard from './pages/Dashboard';
import Feed from './pages/Feed';
import Agenda from './pages/Agenda';
import Scanner from './pages/Scanner';
import Profile from './pages/Profile';
import Challenges from './pages/Challenges';
import Ranking from './pages/Ranking';
import Login from './pages/Login';
import Register from './pages/Register';
import Onboarding from './pages/Onboarding';
import Staff from './pages/Staff';
import Admin from './pages/Admin';
import InstagramMission from './pages/InstagramMission';
import Sponsor from './pages/Sponsor';
import Terms from './pages/Terms';
import BottomNavigation from './components/BottomNavigation';
import logoTw from './assets/logo-tw.png';
import Mascot from './components/Mascot';
import './styles/entrada.css';
import { getAppSubdomain } from './lib/subdomain';
import { stopAllMediaTracks } from './lib/cameraUtils';

function AppContent() {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const isPortalPage = location.pathname === '/admin' || location.pathname === '/staff';
  const isAuthPage = location.pathname === '/login' || location.pathname === '/cadastro' || location.pathname === '/onboarding' || location.pathname === '/termos';

  const [isSplashVisible, setIsSplashVisible] = useState(true);

  // Detecção de subdomínio: admin.* ou staff.*
  useEffect(() => {
    const sub = getAppSubdomain();
    if (sub === 'admin' && location.pathname !== '/admin') {
      navigate('/admin', { replace: true });
    } else if (sub === 'staff' && location.pathname !== '/staff') {
      navigate('/staff', { replace: true });
    }
  }, [location.pathname, navigate]);

  // Garante que a câmera nunca fique em uso quando o usuário estiver fora da tela do scanner
  useEffect(() => {
    const allowedCameraRoutes = ['/scanner', '/sponsor', '/staff', '/instagram-mission'];
    if (!allowedCameraRoutes.includes(location.pathname)) {
      stopAllMediaTracks();
    }
  }, [location.pathname]);

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsSplashVisible(false);
    }, 2000);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (!isSplashVisible && !authLoading) {
      if (!user && !isAuthPage && !isPortalPage) {
        navigate('/login', { replace: true });
      } else if (user && location.pathname === '/login') {
        const hasOnboarding = localStorage.getItem('facom_onboarding_completed') === 'true';
        navigate(hasOnboarding ? '/' : '/onboarding', { replace: true });
      }
    }
  }, [user, authLoading, isSplashVisible, isAuthPage, isPortalPage, navigate, location.pathname]);

  if (isSplashVisible || authLoading) {
    // Abertura (EstAbertura, DESIGN.md §6/§9): única tela com animação em tela cheia.
    return (
      <div className="app-wrapper ent-bg-splash text-text" role="status" aria-live="polite" aria-label="Abrindo o app da Tech Week">
        <div className="absolute top-1/2 left-1/2 h-[844px] w-[390px] -translate-x-1/2 -translate-y-1/2">
          <div aria-hidden="true" className="absolute top-[452px] left-1/2 -ml-[150px] h-10 w-[300px] rounded-[50%] bg-[radial-gradient(closest-side,rgba(0,0,0,0.5),rgba(0,0,0,0))]" />
          <div className="ent-crew absolute inset-0">
            <div className="ent-crew-bob absolute inset-0">
              <div className="ent-sign absolute top-[286px] left-[75px] flex h-24 w-60 items-center justify-center rounded-[20px] border-2 border-[#2E3878] bg-surface shadow-[0_16px_40px_rgba(0,0,0,0.45)]">
                <img src={logoTw} alt="FACOM Tech Week" className="h-[54px] w-[200px] object-contain" />
              </div>
              <div className="absolute top-[348px] -left-2" aria-hidden="true">
                <Mascot color="blue" isWaving className="ent-still" style={{ width: 124, height: 124 }} />
              </div>
              <div className="absolute top-[348px] left-[274px] -scale-x-100" aria-hidden="true">
                <Mascot color="purple" isWaving className="ent-still" style={{ width: 124, height: 124 }} />
              </div>
            </div>
          </div>
          <div className="ent-splash-text absolute inset-x-0 top-[548px] text-center">
            <div className="text-2xl font-extrabold">Bora pra <span className="ent-grad-text">Tech Week!</span></div>
            <div className="mt-1.5 text-sm text-text-2">Abrindo sua semana…</div>
          </div>
          <div className="ent-dots absolute inset-x-0 top-[632px] flex justify-center gap-2" aria-hidden="true">
            <span className="size-2 rounded-full bg-[#5B7CFF]" />
            <span className="size-2 rounded-full bg-[#8F7BFF]" />
            <span className="size-2 rounded-full bg-[#B794FF]" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={isPortalPage ? "portal-wrapper" : "app-wrapper"}>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/cadastro" element={<Register />} />
        <Route path="/onboarding" element={<Onboarding />} />
        <Route path="/termos" element={<Terms />} />
        
        <Route path="/" element={<Dashboard />} />
        <Route path="/feed" element={<Feed />} />
        <Route path="/agenda" element={<Agenda />} />
        <Route path="/scanner" element={<Scanner />} />
        <Route path="/profile" element={<Profile />} />
        <Route path="/challenges" element={<Challenges />} />
        <Route path="/ranking" element={<Ranking />} />
        <Route path="/instagram-mission" element={<InstagramMission />} />
        <Route path="/sponsor" element={<Sponsor />} />
        <Route path="/staff" element={<Staff />} />
        <Route path="/admin" element={<Admin />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
      
      {!isAuthPage && !isPortalPage && <BottomNavigation />}
    </div>
  );
}

function App() {
  return (
    <AuthProvider>
      <HashRouter>
        <AppContent />
      </HashRouter>
    </AuthProvider>
  );
}

export default App;
