import { HashRouter, Routes, Route, NavLink, useLocation, Navigate, useNavigate } from 'react-router-dom';
import { Home, QrCode, ScanLine, Trophy, User } from 'lucide-react';
import { useEffect } from 'react';
import Dashboard from './pages/Dashboard';
import Scanner from './pages/Scanner';
import Profile from './pages/Profile';
import Challenges from './pages/Challenges';
import Ranking from './pages/Ranking';
import Login from './pages/Login';
import Register from './pages/Register';
import Onboarding from './pages/Onboarding';

import InstagramMission from './pages/InstagramMission';
import AdminDashboard from './pages/admin/AdminDashboard';
import FlashMissionAlert from './components/FlashMissionAlert';
import { useState } from 'react';
import logoTw from './assets/logo-tw.png';
import { Loader2 } from 'lucide-react';

function AppContent() {
  const location = useLocation();
  const navigate = useNavigate();
  const isAdminPage = location.pathname === '/admin';
  const isAuthPage = location.pathname === '/login' || location.pathname === '/cadastro' || location.pathname === '/onboarding' || isAdminPage;

  const [isSplashVisible, setIsSplashVisible] = useState(true);

  useEffect(() => {
    const isLoggedIn = localStorage.getItem('facom_logged_in');
    if (!isLoggedIn && !isAuthPage && !isSplashVisible && !isAdminPage) {
      navigate('/login');
    }
  }, [isAuthPage, isAdminPage, navigate, isSplashVisible]);

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsSplashVisible(false);
    }, 4000);
    return () => clearTimeout(timer);
  }, []);

  if (isSplashVisible) {
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
                animation: 'loadingBar 4s ease-in-out forwards'
              }} 
              />
          </div>
        </div>
        <style>{`
          @keyframes loadingBar {
            0% { width: 0%; }
            20% { width: 30%; }
            50% { width: 60%; }
            80% { width: 90%; }
            100% { width: 100%; }
          }
        `}</style>
      </div>
    );
  }

  return (
    <div className={`app-wrapper ${isAdminPage ? 'admin-app-wrapper' : ''}`}>
      <FlashMissionAlert />
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/cadastro" element={<Register />} />
        <Route path="/onboarding" element={<Onboarding />} />
        <Route path="/admin" element={<AdminDashboard />} />
        
        {/* Protected Routes */}
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
    <HashRouter>
      <AppContent />
    </HashRouter>
  );
}

export default App;
