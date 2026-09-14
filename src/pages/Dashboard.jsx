import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import MascotDuo from '../components/MascotDuo';
import logoTw from '../assets/logo-tw.png';
import { getMyProfile } from '../lib/gameplay';
import { getActiveSchedule, SCHEDULE_EVENT_NAME } from '../lib/scheduleManager';
import LectureCard from '../components/LectureCard';
import LectureModal from '../components/LectureModal';
import LectureScanner from '../components/LectureScanner';
import NotificationBell from '../components/NotificationBell';

export default function Dashboard() {
  const navigate = useNavigate();
  const [firstName, setFirstName] = useState('Visitante');
  const [avatarUrl, setAvatarUrl] = useState(null);
  const [selectedLecture, setSelectedLecture] = useState(null);
  const [showLectureScanner, setShowLectureScanner] = useState(false);
  const [scheduleList, setScheduleList] = useState(() => getActiveSchedule());

  useEffect(() => {
    getMyProfile()
      .then(profile => {
        if (!profile) return;
        setFirstName(profile.first_name || profile.username || 'Visitante');
        setAvatarUrl(profile.avatar_url);
      })
      .catch(() => { });
  }, []);

  useEffect(() => {
    const handleScheduleUpdate = () => {
      setScheduleList(getActiveSchedule());
    };
    window.addEventListener(SCHEDULE_EVENT_NAME, handleScheduleUpdate);
    return () => window.removeEventListener(SCHEDULE_EVENT_NAME, handleScheduleUpdate);
  }, []);

  return (
    <div className="page-container animate-fade-in dashboard-page">

      {/* White top section with mascots waving */}
      <div className="hero-white">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
          <div style={{ width: '88px' }}></div>
          <img src={logoTw} alt="Tech Week Logo" style={{ height: '60px' }} />
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <NotificationBell />
            <div
              className="header-avatar"
              style={{ overflow: 'hidden', cursor: 'pointer' }}
              onClick={() => navigate('/profile')}
            >
              {avatarUrl
                ? <img src={avatarUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                : firstName.charAt(0).toUpperCase()}
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', justifyContent: 'center', margin: '20px 0' }}>
          <MascotDuo />
        </div>
        <h2 style={{ color: 'white', textAlign: 'center', marginTop: '16px', marginBottom: '24px', fontSize: '1.5rem', fontWeight: '700' }}>Olá, {firstName}!</h2>
      </div>

      {/* Blue section with the event schedule */}
      <div className="schedule-panel">
        <h3 className="font-lastica schedule-title">Programação</h3>

        {scheduleList.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '24px 10px', color: 'rgba(255,255,255,0.7)', fontSize: '0.9rem' }}>
            Nenhuma atividade cadastrada no momento.
          </div>
        ) : (
          scheduleList.map((lecture) => (
            <LectureCard
              key={lecture.id}
              title={lecture.title}
              time={lecture.time}
              location={lecture.location}
              onClick={() => setSelectedLecture(lecture)}
            />
          ))
        )}

        <LectureModal
          lecture={selectedLecture}
          onClose={() => setSelectedLecture(null)}
          onValidate={() => setShowLectureScanner(true)}
        />

        {showLectureScanner && (
          <LectureScanner
            lecture={selectedLecture}
            onClose={() => {
              setShowLectureScanner(false);
              setSelectedLecture(null);
            }}
            onBack={() => setShowLectureScanner(false)}
          />
        )}

      </div>
    </div>
  );
}