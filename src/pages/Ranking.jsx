import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Crown, Ticket } from 'lucide-react';
import { subscribeToLeaderboardUsers, getLeaderboardUsers, getUserProfile, getCachedUserProfile } from '../lib/userService';
import { useAuth } from '../contexts/AuthContext';
import { useUser } from '../hooks/useUser';
import ConquistasTabs from '../components/ConquistasTabs';
import SymplaStickyBanner from '../components/SymplaStickyBanner';
import Mascot from '../components/Mascot';
import '../styles/conquistas.css';

export default function Ranking() {
  const navigate = useNavigate();
  const { hasSymplaTicket, points: hookPoints, profile: hookProfile } = useUser();
  const [ranking, setRanking] = useState([]);
  const [loading, setLoading] = useState(true);
  const [myProfileData, setMyProfileData] = useState(() => getCachedUserProfile());
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

  // Escuta atualizações de pontuação local em tempo real
  useEffect(() => {
    const handlePointsUpdated = () => {
      setMyProfileData(getCachedUserProfile(myUserId));
    };
    if (typeof window !== 'undefined') {
      window.addEventListener('facom_points_updated', handlePointsUpdated);
    }
    return () => {
      if (typeof window !== 'undefined') {
        window.removeEventListener('facom_points_updated', handlePointsUpdated);
      }
    };
  }, [myUserId]);

  // Informações para a barra fixa no rodapé do usuário logado
  const isTicketVerified = Boolean(
    hasSymplaTicket ||
    myProfileData?.hasSymplaTicket ||
    myProfileData?.symplaTicket ||
    myProfileData?.sympla_ticket ||
    myProfileData?.role === 'ADMIN'
  );

  // Pontuação oficial em tempo real do usuário autenticado (incluindo eventos locais e remotos)
  const effectivePoints = Math.max(
    Number(hookPoints || 0),
    Number(myProfileData?.pontuacaoTotal ?? myProfileData?.totalPoints ?? 0),
    Number(myProfileData?.total_points ?? 0)
  );

  // Combina os dados do ranking remoto com a pontuação ao vivo do participante logado
  const displayedRanking = useMemo(() => {
    let list = [...ranking];

    if (myUserId) {
      const existingIdx = list.findIndex((u) => u.id === myUserId);
      const myUsername = hookProfile?.username || myProfileData?.username || myProfileData?.firstName || authUser?.displayName || 'Você';
      const myAvatar = hookProfile?.avatarUrl || hookProfile?.avatar_url || myProfileData?.avatarUrl || authUser?.photoURL || null;

      if (existingIdx >= 0) {
        list[existingIdx] = {
          ...list[existingIdx],
          points: Math.max(list[existingIdx].points || 0, effectivePoints),
          avatar_url: list[existingIdx].avatar_url || myAvatar,
          username: list[existingIdx].username || myUsername
        };
      } else {
        list.push({
          id: myUserId,
          username: myUsername,
          first_name: hookProfile?.firstName || myProfileData?.firstName || 'Você',
          last_name: hookProfile?.lastName || myProfileData?.lastName || '',
          avatar_url: myAvatar,
          points: effectivePoints,
          mascot: hookProfile?.mascot || myProfileData?.mascot || 'blue',
          course: hookProfile?.course || myProfileData?.course || '',
          createdAt: myProfileData?.createdAt || null
        });
      }
    }

    // Ordena de forma decrescente pela pontuação
    list.sort((a, b) => (b.points || 0) - (a.points || 0));
    return list.map((item, idx) => ({ ...item, rank: idx + 1 }));
  }, [ranking, myUserId, effectivePoints, hookProfile, myProfileData, authUser]);

  const top3 = displayedRanking.slice(0, 3);
  const restOfRanking = displayedRanking.slice(3);

  const myRankingEntry = displayedRanking.find((u) => u.id === myUserId);
  const myRank = myRankingEntry ? myRankingEntry.rank : 1;
  const myPoints = effectivePoints;

  // "N pts para passar @fulano": quem está logo acima de você na lista.
  const above = myRankingEntry && myRankingEntry.rank > 1 ? displayedRanking[myRankingEntry.rank - 2] : null;
  const toPass = above ? Math.max(1, (above.points || 0) - myPoints + 1) : 0;

  return (
    <>
      <div className={`page-container conq-page animate-fade-in ${authUser ? 'conq-page--footer' : ''}`}>
        <SymplaStickyBanner />
        <div className="px-5">
          <ConquistasTabs active="ranking" />

          {loading ? (
            <div className="mt-[22px] flex flex-col gap-2.5" aria-busy="true" aria-label="Carregando ranking">
              <div className="skeleton h-[230px] rounded-[18px]" />
              {[1, 2, 3, 4].map((i) => <div key={i} className="skeleton h-14" />)}
            </div>
          ) : displayedRanking.length === 0 ? (
            <div className="mt-10 flex flex-col items-center px-4 text-center">
              <Mascot color="purple" style={{ width: 112, height: 112 }} />
              <p className="mt-4 text-[15px] font-bold">Ninguém pontuou ainda</p>
              <p className="mt-1 text-[13px] text-text-2">Faça uma missão e seja o primeiro do ranking.</p>
              <button type="button" className="btn btn-secondary btn-sm mt-5" onClick={() => navigate('/challenges')}>
                Ver missões
              </button>
            </div>
          ) : (
            <>
              <div className="mt-[22px] flex items-end gap-2" role="list" aria-label="Pódio">
                <PodiumColumn user={top3[1]} place={2} myUserId={myUserId} />
                <PodiumColumn user={top3[0]} place={1} myUserId={myUserId} />
                <PodiumColumn user={top3[2]} place={3} myUserId={myUserId} />
              </div>

              {restOfRanking.length > 0 && (
                <ol aria-label="Classificação" className="m-0 flex list-none flex-col gap-1.5 rounded-2xl border border-line bg-[#0F1530] p-2.5">
                  {restOfRanking.map((user) => {
                    const isMe = user.id === myUserId;
                    return (
                      <li
                        key={user.id}
                        aria-current={isMe ? 'true' : undefined}
                        className={`grid grid-cols-[38px_34px_1fr_auto] items-center gap-3 rounded-xl border px-3 py-2.5 ${
                          isMe ? 'border-[rgba(155,123,255,0.5)] bg-[rgba(124,58,237,0.2)]' : 'border-white/[.04] bg-white/[.02]'
                        }`}
                      >
                        <RankMark rank={user.rank} isMe={isMe} />
                        <Avatar user={user} size={34} />
                        <span className={`min-w-0 truncate text-sm ${isMe ? 'font-extrabold' : 'font-semibold'}`}>
                          {handle(user)} {isMe && <span className="text-xs text-[#C4B5FD]">(você)</span>}
                        </span>
                        <span className={`text-sm font-extrabold ${isMe ? 'text-text' : 'text-link'}`}>{user.points || 0} pts</span>
                      </li>
                    );
                  })}
                </ol>
              )}
            </>
          )}
        </div>
      </div>

      {/* Rodapé fixo com a sua posição (KAN-55 / KAN-84) */}
      {authUser && (
        <div
          role="status"
          className="conq-me-footer absolute inset-x-4 z-[900] flex items-center gap-3 rounded-[18px] px-3.5 py-3"
          style={{ background: 'linear-gradient(135deg, #5B21B6, #7C3AED)', boxShadow: '0 10px 30px rgba(0,0,0,0.45)' }}
        >
          {isTicketVerified ? (
            <>
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-white/[.18] text-base font-black">
                {myRank}º
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-[15px] font-extrabold">Você · {myPoints} pts</span>
                <span className="block truncate text-xs text-[#E9DDFF]">
                  {above ? `${toPass} ${toPass === 1 ? 'pt' : 'pts'} para passar ${handle(above)}` : 'Você está na liderança'}
                </span>
              </span>
              <Mascot color="purple" className="animate-none! h-11! w-11! shrink-0" />
            </>
          ) : (
            <>
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-white/[.18]">
                <Ticket size={20} aria-hidden="true" />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-[15px] font-extrabold">Fora do ranking</span>
                <span className="block text-xs text-[#E9DDFF]">Vincule o ingresso para entrar no ranking</span>
              </span>
              <button type="button" className="btn btn-on-gradient btn-sm shrink-0" onClick={() => navigate('/profile')}>
                Vincular
              </button>
            </>
          )}
        </div>
      )}
    </>
  );
}

/* ---------- Peças visuais ---------- */

const AVATAR_BG = ['#5B2B8C', '#2D3A8C', '#1E5F74', '#2F6B4F', '#6B2D5C', '#3B4A9E', '#7A3E2B'];

const rawName = (u) => String(u?.username || u?.first_name || 'Participante').replace(/^@/, '');
const handle = (u) => `@${rawName(u)}`;

function initials(u) {
  if (u?.first_name && u?.last_name) return (u.first_name[0] + u.last_name[0]).toUpperCase();
  const parts = rawName(u).split(/[._\-\s]+/).filter(Boolean);
  return ((parts[0]?.[0] || '') + (parts[1]?.[0] || parts[0]?.[1] || '')).toUpperCase() || 'U';
}

function avatarBg(u) {
  const s = String(u?.id || rawName(u));
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0;
  return AVATAR_BG[h % AVATAR_BG.length];
}

function Avatar({ user, size }) {
  return (
    <span
      className="flex shrink-0 items-center justify-center overflow-hidden rounded-full font-extrabold"
      style={{ width: size, height: size, background: avatarBg(user), fontSize: Math.round(size * 0.35) }}
    >
      {user.avatar_url ? <img src={user.avatar_url} alt="" className="h-full w-full object-cover" /> : initials(user)}
    </span>
  );
}

function RankMark({ rank, isMe }) {
  if (rank <= 5 && !isMe) {
    return (
      <span
        aria-label={`${rank}º lugar`}
        className="flex h-7 w-7 items-center justify-center rounded-full text-[13px] font-black text-[#D6DCFF]"
        style={{ background: 'linear-gradient(160deg, #2A3570, #1A2347)', boxShadow: 'inset 0 0 0 1.5px #8FA0FF80' }}
      >
        {rank}º
      </span>
    );
  }
  return <span className={`text-[13px] font-extrabold ${isMe ? 'text-you-text' : 'text-text-3'}`}>{rank}º</span>;
}

// Medalhas da develop (DESIGN.md §2.7): Medal e Award do lucide com o número da posição desenhado.
function PlaceIcon({ place }) {
  if (place === 1) return <Crown size={22} color="var(--podium-1)" strokeWidth={2.2} aria-label="Coroa de 1º lugar" role="img" />;
  if (place === 2) {
    return (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="var(--podium-2)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" role="img" aria-label="Medalha de 2º lugar">
        <path d="M7.21 15 2.66 7.14a2 2 0 0 1 .13-2.2L4.4 2.8A2 2 0 0 1 6 2h12a2 2 0 0 1 1.6.8l1.6 2.14a2 2 0 0 1 .14 2.2L16.79 15" />
        <path d="M11 12 5.12 2.2" />
        <path d="m13 12 5.88-9.8" />
        <path d="M8 7h8" />
        <circle cx="12" cy="17" r="5" />
        <path d="M10.5 15.8a1.5 1.5 0 1 1 2.7.9l-2.7 2.6h3" strokeWidth="1.6" />
      </svg>
    );
  }
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="var(--podium-3-text)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" role="img" aria-label="Medalha de 3º lugar">
      <path d="m15.477 12.89 1.515 8.526a.5.5 0 0 1-.81.47l-3.58-2.687a1 1 0 0 0-1.197 0l-3.586 2.686a.5.5 0 0 1-.81-.469l1.514-8.526" />
      <circle cx="12" cy="8" r="6" />
      <path d="M10.6 5.9h2.7l-1.5 1.8a1.4 1.4 0 1 1-1.3 2.1" strokeWidth="1.6" />
    </svg>
  );
}

const PODIUM = {
  1: { color: 'var(--podium-1)', hex: '#FBBF24', text: 'var(--podium-1)', avatar: 72, base: 116, num: 30 },
  2: { color: 'var(--podium-2)', hex: '#94A3B8', text: 'var(--podium-2)', avatar: 58, base: 84, num: 24 },
  3: { color: 'var(--podium-3)', hex: '#B45309', text: 'var(--podium-3-text)', avatar: 58, base: 64, num: 24 },
};

function PodiumColumn({ user, place, myUserId }) {
  const p = PODIUM[place];
  const pedestal = (
    <span
      className="mt-2 box-border flex w-full items-start justify-center rounded-[14px_14px_4px_4px] border border-b-0 pt-2.5 font-black"
      style={{ height: p.base, fontSize: p.num, color: p.text, background: `linear-gradient(180deg, ${p.hex}55, ${p.hex}10)`, borderColor: `${p.hex}66` }}
      aria-hidden="true"
    >
      {place}
    </span>
  );
  if (!user) {
    return <div className="flex flex-1 flex-col items-center opacity-30" role="listitem" aria-label={`${place}º lugar vago`}>{pedestal}</div>;
  }
  const isMe = user.id === myUserId;
  return (
    <div className="flex min-w-0 flex-1 flex-col items-center" role="listitem" aria-label={`${place}º lugar: ${handle(user)}, ${user.points || 0} pts`}>
      <span className="flex h-6 items-center"><PlaceIcon place={place} /></span>
      <span
        className="box-border rounded-full p-[3px]"
        style={{ width: p.avatar, height: p.avatar, background: p.color, boxShadow: place === 1 ? `0 0 22px ${p.hex}66` : 'none' }}
      >
        <Avatar user={user} size={p.avatar - 6} />
      </span>
      <span className={`mt-1.5 max-w-full truncate text-[13px] font-extrabold ${isMe ? 'text-you-text' : ''}`}>{handle(user)}</span>
      <span className="text-xs font-bold" style={{ color: p.text }}>{user.points || 0} pts</span>
      {pedestal}
    </div>
  );
}
