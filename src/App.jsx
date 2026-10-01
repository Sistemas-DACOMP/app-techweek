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
    return (
      <div className="app-wrapper animate-fade-in" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: 'transparent', zIndex: 9999 }}>
        <img src={logoTw} alt="FACOM Tech Week" style={{ width: '180px', marginBottom: '40px' }} className="animate-fade-in" />
        
        <div style={{ width: '60%', maxWidth: '200px', textAlign: 'center' }}>
          <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '8px', fontWeight: 'bold', letterSpacing: '1px' }}>
            CARREGANDO...
          </div>
          <div style={{ width: '100%', height: '6px', background: 'rgba(255,255,255,0.1)', borderRadius: '4px', overflow: 'hidden', position: 'relative' }}>
            <div 
              style={{ 
                position: 'absolute', 
                top: 0, 
                left: 0, 
                height: '100%', 
                width: '100%',
                background: 'linear-gradient(90deg, var(--primary), #a855f7)', 
                borderRadius: '4px',
                animation: 'loadingBar 2s ease-in-out forwards'
              }} 
            />
          </div>
        </div>
        <style>{`
          @keyframes loadingBar {
            0% { width: 0%; }
            50% { width: 70%; }
            100% { width: 100%; }
          }
        `}</style>
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
