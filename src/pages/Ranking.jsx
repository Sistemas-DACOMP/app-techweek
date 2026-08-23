import { useState, useEffect } from 'react';
import { User } from 'lucide-react';
import { supabase } from '../lib/supabaseClient';
import { getRanking } from '../lib/gameplay';

export default function Ranking() {
  const [ranking, setRanking] = useState([]);
  const [myUserId, setMyUserId] = useState(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setMyUserId(data.user?.id ?? null));

    getRanking()
      .then(rows => {
        // A view já vem ordenada por total_points desc, created_at asc
        // (critério de desempate — ver PLAN.md).
        const withRank = rows.map((row, index) => ({ ...row, rank: index + 1 }));
        setRanking(withRank);
      })
      .catch(() => setRanking([]));
  }, []);

  return (
    <div className="page-container animate-fade-in">
      <h2 style={{ textAlign: 'center', marginBottom: '8px', fontSize: '1.5rem', marginTop: '16px' }}>Ranking Top 10</h2>
      <p style={{ textAlign: 'center', color: 'var(--text-secondary)', marginBottom: '24px', fontSize: '0.9rem' }}>Competidores da FACOM Tech Week</p>

      <div className="glass-panel" style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
        {ranking.slice(0, 10).map((user) => {
          const isMe = user.user_id === myUserId;
          const displayName = user.first_name || user.username || 'Participante';
          return (
            <div
              key={user.user_id}
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
                  <div style={{ background: 'rgba(255,255,255,0.1)', padding: '6px', borderRadius: '50%' }}>
                    <User size={16} />
                  </div>
                  <span style={{ fontWeight: isMe ? 'bold' : 'normal' }}>{isMe ? 'Você' : displayName}</span>
                </div>
              </div>

              <div style={{ fontWeight: 'bold', color: 'var(--primary)' }}>
                {user.total_points} pts
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
