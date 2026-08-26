import { useState, useEffect } from 'react';
import { Trophy, Medal, User } from 'lucide-react';
import { useUser } from '../hooks/useUser';

export default function Ranking() {
  const { points } = useUser();

  const [userInitial, setUserInitial] = useState('V');
  const [avatarUrl, setAvatarUrl] = useState('');
  const [avatarPosition, setAvatarPosition] = useState({ x: 0, y: 0 });
  const [avatarScale, setAvatarScale] = useState(1);

  useEffect(() => {
    const p = localStorage.getItem('facom_user_profile');
    if (p) {
      try {
        const parsed = JSON.parse(p);
        const name = parsed.firstName || parsed.username || 'Visitante';
        setUserInitial(name.charAt(0).toUpperCase());
        if (parsed.avatarUrl) {
          setAvatarUrl(parsed.avatarUrl);
        }
        if (parsed.avatarPosition) {
          setAvatarPosition(parsed.avatarPosition);
        }
        if (parsed.avatarScale) {
          setAvatarScale(parsed.avatarScale);
        }
      } catch (e) { }
    }
  }, []);

  const mockUsers = [
    { name: 'Ana Silva', points: 340, rank: 1 },
    { name: 'Lucas Santos', points: 295, rank: 2 },
    { name: 'Você', points: points, rank: 3 }, // Dynamically injected
    { name: 'Julia Costa', points: 150, rank: 4 },
    { name: 'Pedro Alves', points: 95, rank: 5 },
  ].sort((a, b) => b.points - a.points); // Resort based on user points

  // Re-assign ranks after sorting
  mockUsers.forEach((user, index) => {
    user.rank = index + 1;
  });

  return (
    <div className="page-container animate-fade-in">
      <h2 style={{ textAlign: 'center', marginBottom: '8px', fontSize: '1.5rem', marginTop: '16px' }}>Ranking Top 10</h2>
      <p style={{ textAlign: 'center', color: 'var(--text-secondary)', marginBottom: '24px', fontSize: '0.9rem' }}>Competidores da FACOM Tech Week</p>

      <div className="glass-panel" style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
        {mockUsers.map((user) => (
          <div
            key={user.name}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '12px',
              borderRadius: '8px',
              background: user.name === 'Você' ? 'rgba(14, 165, 233, 0.2)' : 'rgba(255,255,255,0.05)',
              border: user.name === 'Você' ? '1px solid var(--primary)' : '1px solid transparent'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div style={{
                width: '32px',
                height: '32px',
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontWeight: 'bold',
                background: user.rank === 1 ? '#fbbf24' : user.rank === 2 ? '#94a3b8' : user.rank === 3 ? '#b45309' : 'rgba(255,255,255,0.1)',
                color: user.rank <= 3 ? '#000' : 'white'
              }}>
                {user.rank}
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                {user.name === 'Você' ? (
                  avatarUrl ? (
                    
                    <div style={{
                      width: '28px',
                      height: '28px',
                      borderRadius: '50%',
                      overflow: 'hidden',
                      position: 'relative',
                      background: '#000'
                    }}>
                      <img
                        src={avatarUrl}
                        alt="Você"
                        style={{
                          position: 'absolute',
                          width: `${(28 * 200 / 120) * avatarScale}px`,
                          height: 'auto',
                          maxWidth: 'none',
                          left: '50%',
                          top: '50%',
                          transform: `translate(-50%, -50%) translate(${avatarPosition.x * (28 / 120)}px, ${avatarPosition.y * (28 / 120)}px)`,
                          objectFit: 'cover'
                        }}
                      />
                    </div>
                  ) : (
                    <div style={{
                      width: '28px',
                      height: '28px',
                      borderRadius: '50%',
                      background: 'var(--primary-gradient)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontWeight: 'bold',
                      fontSize: '0.9rem',
                      color: 'white'
                    }}>
                      {userInitial}
                    </div>
                  )
                ) : (
                  <div style={{ background: 'rgba(255,255,255,0.1)', padding: '6px', borderRadius: '50%' }}>
                    <User size={16} />
                  </div>
                )}
                <span style={{ fontWeight: user.name === 'Você' ? 'bold' : 'normal' }}>{user.name}</span>
              </div>
            </div>

            <div style={{ fontWeight: 'bold', color: 'var(--primary)' }}>
              {user.points} pts
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}