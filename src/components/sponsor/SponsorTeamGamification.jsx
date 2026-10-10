import { useMemo } from 'react';
import { Trophy, Target, Zap, Award, Sparkles, TrendingUp } from 'lucide-react';
import Mascot from '../Mascot';

const AVATAR_BG = ['#2A3570', '#4C2A85', '#1E5A6B', '#7A3A22', '#2C5E3F', '#6B2D5C'];
const bgFor = (s = '') => AVATAR_BG[[...s].reduce((a, c) => a + c.charCodeAt(0), 0) % AVATAR_BG.length];
const initialsOf = (n = '') => n.trim().split(/\s+/).map((x) => x[0]).slice(0, 2).join('').toUpperCase() || '?';

/**
 * Painel de Gamificação e Energia da Equipe do Estande (Booth OS).
 */
export default function SponsorTeamGamification({
  leads = [],
  currentUserEmail = '',
  targetLeads = 100,
  sponsorName = 'Estande',
  className = ''
}) {
  const { totalLeads, attendantsRanking, myScans, myRank, progressPct } = useMemo(() => {
    const total = leads.length;
    const counts = {};

    leads.forEach((lead) => {
      const email = lead.collectedByEmail || lead.sponsorUid || 'Estande Geral';
      counts[email] = (counts[email] || 0) + 1;
    });

    const ranking = Object.entries(counts)
      .map(([email, count]) => {
        const isMe = currentUserEmail && email.toLowerCase() === currentUserEmail.toLowerCase();
        const displayName = email.split('@')[0];
        return {
          email,
          name: displayName,
          count,
          isMe
        };
      })
      .sort((a, b) => b.count - a.count);

    const myIndex = ranking.findIndex((r) => r.isMe);
    const myRankPos = myIndex >= 0 ? myIndex + 1 : null;
    const myCount = myIndex >= 0 ? ranking[myIndex].count : 0;
    const pct = Math.min(100, Math.round((total / Math.max(targetLeads, 1)) * 100));

    return {
      totalLeads: total,
      attendantsRanking: ranking,
      myScans: myCount,
      myRank: myRankPos,
      progressPct: pct
    };
  }, [leads, currentUserEmail, targetLeads]);

  return (
    <div className={`sponsor-gamification rounded-2xl border border-border bg-surface p-4 sm:p-5 ${className}`}>
      {/* Header & Goal */}
      <div className="flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-[#FBBF24]/15 text-[#FBBF24]">
              <Trophy size={18} />
            </span>
            <div>
              <div className="text-[14px] font-extrabold text-text">Meta do Estande {sponsorName}</div>
              <div className="text-[11px] text-text-3">Ritmo de coleta e conexão com os talentos</div>
            </div>
          </div>

          <div className="text-right">
            <span className="text-[20px] font-black text-[#FBBF24]">{totalLeads}</span>
            <span className="text-[12px] font-bold text-text-3"> / {targetLeads}</span>
          </div>
        </div>

        {/* Progress bar */}
        <div className="flex flex-col gap-1.5">
          <div className="h-2.5 w-full overflow-hidden rounded-full bg-surface-raised">
            <div
              className="h-full rounded-full transition-all duration-500 ease-out"
              style={{
                width: `${progressPct}%`,
                background:
                  progressPct >= 100
                    ? 'linear-gradient(90deg, #6FD8A6, #34D399)'
                    : 'linear-gradient(90deg, #2563EB, #7C3AED)'
              }}
            />
          </div>
          <div className="flex justify-between text-[11px] font-bold text-text-3">
            <span>{progressPct}% da meta concluída</span>
            <span>{Math.max(0, targetLeads - totalLeads)} leads para o objetivo</span>
          </div>
        </div>
      </div>

      {/* Mascot Encouragement Banner */}
      <div className="mt-4 flex items-center gap-3 rounded-xl border border-border/60 bg-surface-raised/50 p-2.5">
        <Mascot name="alan" mood="happy" size={38} className="shrink-0" />
        <div className="min-w-0 text-[12px] text-text-2">
          {totalLeads === 0 ? (
            <span>Prontos para começar? Bipe o crachá dos alunos e inicie conexões valiosas!</span>
          ) : progressPct >= 100 ? (
            <span className="font-bold text-[#6FD8A6]">
              Incrível! A meta do estande foi batida! Continuem conectando os melhores talentos.
            </span>
          ) : (
            <span>
              <strong className="text-text">Estande a todo vapor!</strong> Você já capturou{' '}
              <strong className="text-link">{myScans} leads</strong> ({myRank ? `${myRank}º lugar no time` : 'registre o primeiro'}).
            </span>
          )}
        </div>
      </div>

      {/* Attendants Leaderboard */}
      {attendantsRanking.length > 0 && (
        <div className="mt-4 flex flex-col gap-2">
          <div className="text-[11px] font-extrabold uppercase tracking-wider text-text-3">
            Ranking da Equipe no Estande
          </div>
          <div className="flex flex-col gap-1.5">
            {attendantsRanking.slice(0, 5).map((attendant, index) => {
              const medalColor =
                index === 0 ? '#FBBF24' : index === 1 ? '#94A3B8' : index === 2 ? '#D97706' : null;

              return (
                <div
                  key={attendant.email}
                  className={`flex items-center justify-between rounded-xl px-3 py-2 text-[12px] transition-all ${
                    attendant.isMe
                      ? 'border border-[#8FA0FF]/40 bg-surface-selected/80 font-bold text-text'
                      : 'border border-border/40 bg-surface-raised/40 text-text-2'
                  }`}
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <span
                      className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[10px] font-black"
                      style={{
                        background: medalColor ? `${medalColor}25` : 'rgba(255,255,255,0.06)',
                        color: medalColor || 'var(--text-3)'
                      }}
                    >
                      {index + 1}º
                    </span>

                    <span
                      className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[10px] font-black text-white"
                      style={{ background: bgFor(attendant.name) }}
                    >
                      {initialsOf(attendant.name)}
                    </span>

                    <span className="truncate">
                      {attendant.name}
                      {attendant.isMe && (
                        <span className="ml-1.5 rounded-full bg-link/20 px-1.5 py-0.5 text-[10px] text-link">
                          Você
                        </span>
                      )}
                    </span>
                  </div>

                  <div className="flex items-center gap-1 shrink-0 font-extrabold text-text">
                    <span>{attendant.count}</span>
                    <span className="text-[10px] font-normal text-text-4">scans</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

