import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Trophy, Crown, Medal, Award, User as UserIcon, Ticket } from 'lucide-react';
import { subscribeToLeaderboardUsers, getLeaderboardUsers, getUserProfile } from '../lib/userService';
import { useAuth } from '../contexts/AuthContext';
import { useUser } from '../hooks/useUser';

export default function Ranking() {
  const navigate = useNavigate();
  const { hasSymplaTicket } = useUser();
  const [ranking, setRanking] = useState([]);
  const [loading, setLoading] = useState(true);
  const [myProfileData, setMyProfileData] = useState(null);
  const { user: authUser } = useAuth();
  const myUserId = authUser?.uid;

  useEffect(() => {
    let isMounted = true;

    // Escuta atualizações do ranking em tempo real com limite 50 (KAN-55)
    const unsubscribe = subscribeToLeaderboardUsers(
      (rows) => {
        if (!isMounted) return;
        setRanking(rows || []);
        setLoading(false);
      },
      (_err) => {
        getLeaderboardUsers(50).then((rows) => {
          if (!isMounted) return;
          setRanking(rows || []);
          setLoading(false);
        });
      },
      50
    );

    return () => {
      isMounted = false;
      if (typeof unsubscribe === 'function') {
        unsubscribe();
      }
    };
  }, []);

  // Busca dados de perfil do usuário atual caso ele ainda não figure no top 50
  useEffect(() => {
    if (!myUserId) return;
    let isMounted = true;

    getUserProfile(myUserId)
      .then((data) => {
        if (!isMounted) return;
        setMyProfileData(data);
      })
      .catch(() => {});

    return () => {
      isMounted = false;
    };
  }, [myUserId]);

  const top3 = ranking.slice(0, 3);
  const restOfRanking = ranking.slice(3);

  // Informações para a barra fixa no rodapé do usuário logado
  const isTicketVerified = Boolean(
    hasSymplaTicket ||
    myProfileData?.hasSymplaTicket ||
    myProfileData?.symplaTicket ||
    myProfileData?.sympla_ticket ||
    myProfileData?.role === 'ADMIN'
  );
  const myRankingEntry = ranking.find((u) => u.id === myUserId);
  const myRank = myRankingEntry ? myRankingEntry.rank : null;
  const myPoints = myRankingEntry
    ? myRankingEntry.points
    : (myProfileData?.pontuacaoTotal ?? myProfileData?.totalPoints ?? 0);
  const rawMyName = myRankingEntry?.username || myProfileData?.username || myProfileData?.firstName || 'Você';
  const myDisplayName = rawMyName.startsWith('@') ? rawMyName : `@${rawMyName}`;
  const myAvatar = myRankingEntry?.avatar_url || myProfileData?.avatarUrl || authUser?.photoURL || null;

  const footerCardStyle = {
    position: 'absolute',
    bottom: '92px',
    left: '16px',
    right: '16px',
    background: 'rgba(15, 23, 42, 0.94)',
    backdropFilter: 'blur(16px)',
    WebkitBackdropFilter: 'blur(16px)',
    border: isTicketVerified ? '1px solid rgba(59, 130, 246, 0.4)' : '1px solid rgba(234, 179, 8, 0.45)',
    borderRadius: '16px',
    padding: '10px 14px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    boxShadow: isTicketVerified
      ? '0 8px 32px rgba(0, 0, 0, 0.6), 0 0 15px rgba(59, 130, 246, 0.25)'
      : '0 8px 32px rgba(0, 0, 0, 0.6), 0 0 15px rgba(234, 179, 8, 0.2)',
    zIndex: 900
  };

  const badgeBoxStyle = {
    width: '32px',
    height: '32px',
    borderRadius: '8px',
    background: isTicketVerified ? 'rgba(59, 130, 246, 0.2)' : 'rgba(234, 179, 8, 0.15)',
    border: isTicketVerified ? '1px solid rgba(59, 130, 246, 0.5)' : '1px solid rgba(234, 179, 8, 0.5)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontWeight: '800',
    fontSize: '0.85rem',
    color: isTicketVerified ? 'var(--primary)' : '#eab308'
  };

  // Organização visual das colunas do pódio: [2º lugar, 1º lugar, 3º lugar]
  const first = top3[0];
  const second = top3[1];
  const third = top3[2];

  const renderPodiumItem = (user, position, height, borderColor, badgeBg, badgeColor, icon) => {
    if (!user) {
      return (
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', opacity: 0.3 }}>
          <div style={{ width: '48px', height: '48px', borderRadius: '50%', background: 'rgba(255,255,255,0.05)', marginBottom: '8px' }} />
          <div style={{ width: '100%', height: `${height}px`, background: 'rgba(255,255,255,0.02)', borderRadius: '12px 12px 0 0' }} />
        </div>
      );
    }

    const isMe = user.id === myUserId;
    const rawName = user.username || user.first_name || 'Participante';
    const displayName = rawName.startsWith('@') ? rawName : `@${rawName}`;
    const initialChar = rawName.replace(/^@/, '').charAt(0).toUpperCase() || 'U';

    return (
      <div
        style={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          position: 'relative',
          zIndex: position === 1 ? 2 : 1
        }}
      >
        {/* Ícone de destaque sobre o 1º lugar */}
        <div style={{ height: '22px', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '4px' }}>
          {icon}
        </div>

        {/* Avatar */}
        <div
          style={{
            width: position === 1 ? '62px' : '52px',
            height: position === 1 ? '62px' : '52px',
            borderRadius: '50%',
            border: `2px solid ${borderColor}`,
            boxShadow: position === 1 ? `0 0 20px ${borderColor}66` : 'none',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            overflow: 'hidden',
            background: 'rgba(255,255,255,0.08)',
            marginBottom: '6px',
            position: 'relative'
          }}
        >
          {user.avatar_url ? (
            <img src={user.avatar_url} alt={displayName} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          ) : (
            <span style={{ fontWeight: 'bold', fontSize: position === 1 ? '1.2rem' : '1rem', color: borderColor }}>
              {initialChar}
            </span>
          )}
        </div>

        {/* Nome e pontos */}
        <span
          style={{
            fontSize: '0.75rem',
            fontWeight: isMe ? '700' : '500',
            color: isMe ? 'var(--primary)' : 'var(--text-primary)',
            maxWidth: '90px',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
            textAlign: 'center',
            marginBottom: '2px'
          }}
        >
          {displayName}
        </span>
        <span
          style={{
            fontSize: '0.8rem',
            fontWeight: '700',
            color: borderColor,
            marginBottom: '8px'
          }}
        >
          {user.points} pts
        </span>

        {/* Pedestal */}
        <div
          style={{
            width: '100%',
            height: `${height}px`,
            background: `linear-gradient(180deg, ${borderColor}22 0%, rgba(255,255,255,0.02) 100%)`,
            border: `1px solid ${borderColor}55`,
            borderBottom: 'none',
            borderRadius: '12px 12px 0 0',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'flex-start',
            paddingTop: '8px',
            boxShadow: position === 1 ? `inset 0 10px 20px ${borderColor}22` : 'none'
          }}
        >
          <div
            style={{
              width: '26px',
              height: '26px',
              borderRadius: '50%',
              background: badgeBg,
              color: badgeColor,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontWeight: '800',
              fontSize: '0.85rem'
            }}
          >
            {position}
          </div>
        </div>
      </div>
    );
  };

  return (
    <>
      <div className="page-container animate-fade-in" style={{ paddingBottom: '170px' }}>
        {/* Cabeçalho */}
        <div style={{ textAlign: 'center', marginTop: '8px', marginBottom: '20px' }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
            <Trophy size={24} style={{ color: '#fbbf24' }} />
            <h2 style={{ fontSize: '1.5rem', fontWeight: '800', margin: 0 }}>Ranking Geral</h2>
          </div>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', margin: 0 }}>
            Top 50 competidores da FACOM Tech Week
          </p>
        </div>

        {loading ? (
          <div style={{ textAlign: 'center', padding: '60px 20px', color: 'var(--text-secondary)' }}>
            <div style={{ fontSize: '0.9rem', marginBottom: '8px' }}>Carregando classificação em tempo real...</div>
          </div>
        ) : ranking.length === 0 ? (
          <div className="glass-panel" style={{ padding: '32px', textAlign: 'center', color: 'var(--text-secondary)' }}>
            Nenhum participante pontuou ainda. Seja o primeiro participando das atividades!
          </div>
        ) : (
          <>
            {/* Pódio estilizado para os 3 primeiros colocados */}
            <div
              style={{
                display: 'flex',
                alignItems: 'flex-end',
                justifyContent: 'center',
                gap: '8px',
                padding: '0 8px',
                marginBottom: '24px'
              }}
            >
              {/* 2º Lugar (Prata) */}
              {renderPodiumItem(
                second,
                2,
                80,
                '#94a3b8',
                '#94a3b8',
                '#000',
                <Medal size={16} style={{ color: '#94a3b8' }} />
              )}

              {/* 1º Lugar (Ouro) */}
              {renderPodiumItem(
                first,
                1,
                110,
                '#fbbf24',
                '#fbbf24',
                '#000',
                <Crown size={20} style={{ color: '#fbbf24' }} />
              )}

              {/* 3º Lugar (Bronze) */}
              {renderPodiumItem(
                third,
                3,
                60,
                '#b45309',
                '#b45309',
                '#fff',
                <Award size={16} style={{ color: '#b45309' }} />
              )}
            </div>

            {/* Lista elegante para as demais posições (4 a 50) */}
            {restOfRanking.length > 0 && (
              <div
                className="glass-panel"
                style={{
                  padding: '12px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '8px',
                  background: 'rgba(255, 255, 255, 0.03)',
                  border: '1px solid rgba(255, 255, 255, 0.06)',
                  borderRadius: '16px'
                }}
              >
                {restOfRanking.map((user) => {
                  const isMe = user.id === myUserId;
                  const rawName = user.username || user.first_name || 'Participante';
                  const displayName = rawName.startsWith('@') ? rawName : `@${rawName}`;
                  const initialChar = rawName.replace(/^@/, '').charAt(0).toUpperCase() || 'U';

                  return (
                    <div
                      key={user.id}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: '10px 12px',
                        borderRadius: '10px',
                        background: isMe ? 'rgba(59, 130, 246, 0.15)' : 'rgba(255, 255, 255, 0.02)',
                        border: isMe ? '1px solid var(--primary)' : '1px solid rgba(255, 255, 255, 0.04)',
                        transition: 'background 0.2s ease'
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        {/* Posição */}
                        <div
                          style={{
                            width: '28px',
                            fontWeight: '700',
                            fontSize: '0.85rem',
                            color: 'var(--text-secondary)',
                            textAlign: 'center'
                          }}
                        >
                          #{user.rank}
                        </div>

                        {/* Avatar */}
                        <div
                          style={{
                            width: '32px',
                            height: '32px',
                            borderRadius: '50%',
                            background: 'rgba(255, 255, 255, 0.08)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            overflow: 'hidden',
                            fontSize: '0.8rem',
                            fontWeight: 'bold',
                            border: '1px solid rgba(255, 255, 255, 0.1)'
                          }}
                        >
                          {user.avatar_url ? (
                            <img src={user.avatar_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                          ) : (
                            initialChar
                          )}
                        </div>

                        {/* Nome */}
                        <div style={{ display: 'flex', flexDirection: 'column' }}>
                          <span style={{ fontWeight: isMe ? '700' : '500', fontSize: '0.9rem' }}>
                            {displayName} {isMe && <span style={{ color: 'var(--primary)', fontSize: '0.75rem' }}>(Você)</span>}
                          </span>
                        </div>
                      </div>

                      {/* Pontos */}
                      <div style={{ fontWeight: '700', color: 'var(--primary)', fontSize: '0.9rem' }}>
                        {user.points} pts
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </>
        )}
      </div>

      {/* Barra fixa no rodapé mostrando a pontuação do próprio usuário logado (KAN-55 / KAN-84) */}
      {authUser && (
        <div style={footerCardStyle}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={badgeBoxStyle}>
              {!isTicketVerified ? (
                <Ticket size={16} />
              ) : (
                myRank ? `#${myRank}` : '-'
              )}
            </div>

            <div
              style={{
                width: '32px',
                height: '32px',
                borderRadius: '50%',
                background: 'rgba(255, 255, 255, 0.08)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                overflow: 'hidden',
                fontSize: '0.8rem',
                fontWeight: 'bold',
                border: '1px solid rgba(255, 255, 255, 0.15)'
              }}
            >
              {myAvatar ? (
                <img src={myAvatar} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              ) : (
                <UserIcon size={16} />
              )}
            </div>

            <div style={{ display: 'flex', flexDirection: 'column' }}>
              <span style={{ fontSize: '0.85rem', fontWeight: '700' }}>
                {myDisplayName} <span style={{ color: !isTicketVerified ? '#eab308' : 'var(--primary)', fontSize: '0.75rem' }}>(Você)</span>
              </span>
              <span style={{ fontSize: '0.7rem', color: !isTicketVerified ? '#fde047' : 'var(--text-secondary)' }}>
                {!isTicketVerified
                  ? 'Conta não verificada (Ingresso pendente)'
                  : (myRank ? `${myRank}º lugar no Ranking` : 'Fora do Top 50')}
              </span>
            </div>
          </div>

          {!isTicketVerified ? (
            <button
              onClick={() => navigate('/profile')}
              style={{
                background: 'linear-gradient(135deg, #eab308, #ca8a04)',
                color: '#0f172a',
                border: 'none',
                borderRadius: '10px',
                padding: '6px 12px',
                fontSize: '0.75rem',
                fontWeight: '700',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                boxShadow: '0 2px 8px rgba(234, 179, 8, 0.3)'
              }}
            >
              <Ticket size={14} />
              Vincular
            </button>
          ) : (
            <div style={{ textAlign: 'right' }}>
              <span style={{ fontSize: '0.65rem', color: 'var(--text-secondary)', display: 'block', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                Pontuação
              </span>
              <span style={{ fontWeight: '800', color: 'var(--primary)', fontSize: '1rem' }}>
                {myPoints} pts
              </span>
            </div>
          )}
        </div>
      )}
    </>
  );
}
