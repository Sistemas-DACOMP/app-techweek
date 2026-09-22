import { useState, useEffect } from 'react';
import { getLeaderboardUsers } from '../lib/userService';
import { useAuth } from '../contexts/AuthContext';

export default function Ranking() {
  const [ranking, setRanking] = useState([]);
  const [loading, setLoading] = useState(true);
  const { user: authUser } = useAuth();
  const myUserId = authUser?.uid;

  useEffect(() => {
    getLeaderboardUsers(10)
      .then(rows => {
        setRanking(rows || []);
        setLoading(false);
      })
      .catch(() => {
        setRanking([]);
        setLoading(false);
      });
  }, []);

  return (
    <div className="page-container animate-fade-in">
      <h2 style={{ textAlign: 'center', marginBottom: '8px', fontSize: '1.5rem', marginTop: '16px' }}>Ranking Top 10</h2>
      <p style={{ textAlign: 'center', color: 'var(--text-secondary)', marginBottom: '24px', fontSize: '0.9rem' }}>Competidores da FACOM Tech Week</p>

      {loading ? (
        <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-secondary)' }}>Carregando classificação...</div>
      ) : ranking.length === 0 ? (
        <div className="glass-panel" style={{ padding: '32px', textAlign: 'center', color: 'var(--text-secondary)' }}>
          Nenhum participante pontuou ainda. Seja o primeiro participando das atividades!
        </div>
      ) : (
        <div className="glass-panel" style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {ranking.slice(0, 10).map((user) => {
            const isMe = user.id === myUserId;
            const rawName = user.username || user.first_name || 'Participante';
            const displayName = rawName.startsWith('@') ? rawName : `@${rawName}`;
            const initialChar = rawName.replace(/^@/, '').charAt(0).toUpperCase() || 'U';
            const pointsDisplay = user.points ?? user.total_points ?? 0;

            return (
              <div
                key={user.id}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '12px',
                  borderRadius: '8px',
                  background: isMe ? 'rgba(14, 165, 233, 0.2)' : 'rgba(255,255,255,0.05)',
                  border: isMe ? '1px solid var(--primary)' : '1px solid transparent'
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
                    <div style={{ width: '28px', height: '28px', borderRadius: '50%', background: 'rgba(255,255,255,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', fontSize: '0.75rem', fontWeight: 'bold' }}>
                      {user.avatar_url
                        ? <img src={user.avatar_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                        : initialChar}
                    </div>
                    <span style={{ fontWeight: isMe ? 'bold' : 'normal' }}>{isMe ? `${displayName} (Você)` : displayName}</span>
                  </div>
                </div>

                <div style={{ fontWeight: 'bold', color: 'var(--primary)' }}>
                  {pointsDisplay} pts
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}