import { HashRouter, Routes, Route, NavLink, useLocation, Navigate, useNavigate } from 'react-router-dom';
import { Home, QrCode, ScanLine, Trophy, User } from 'lucide-react';
import { useEffect, useState } from 'react';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import Dashboard from './pages/Dashboard';
import Scanner from './pages/Scanner';
import Profile from './pages/Profile';
import Challenges from './pages/Challenges';
import Ranking from './pages/Ranking';
import Login from './pages/Login';
import Register from './pages/Register';
import Onboarding from './pages/Onboarding';
import InstagramMission from './pages/InstagramMission';
import logoTw from './assets/logo-tw.png';

function AppContent() {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const isAuthPage = location.pathname === '/login' || location.pathname === '/cadastro' || location.pathname === '/onboarding';

  const [isSplashVisible, setIsSplashVisible] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsSplashVisible(false);
    }, 2000);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (!isSplashVisible && !authLoading) {
      if (!user && !isAuthPage) {
        navigate('/login', { replace: true });
      } else if (user && (location.pathname === '/login' || location.pathname === '/cadastro')) {
        navigate('/', { replace: true });
      }
    }
  }, [user, authLoading, isSplashVisible, isAuthPage, navigate, location.pathname]);

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
    <div className="app-wrapper">
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/cadastro" element={<Register />} />
        <Route path="/onboarding" element={<Onboarding />} />
        
        <Route path="/" element={<Dashboard />} />
        <Route path="/scanner" element={<Scanner />} />
        <Route path="/profile" element={<Profile />} />
        <Route path="/challenges" element={<Challenges />} />
        <Route path="/ranking" element={<Ranking />} />
        <Route path="/instagram-mission" element={<InstagramMission />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
      
      {!isAuthPage && (
        <div className="bottom-nav-container">
          <nav className="bottom-nav">
            <NavLink to="/" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
              <Home size={22} />
            </NavLink>
            <NavLink to="/ranking" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
              <Trophy size={22} />
            </NavLink>
            <NavLink to="/scanner" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
              <ScanLine size={24} />
            </NavLink>
            <NavLink to="/challenges" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
              <QrCode size={22} />
            </NavLink>
            <NavLink to="/profile" className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}>
              <User size={22} />
            </NavLink>
          </nav>
        </div>
      )}
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
