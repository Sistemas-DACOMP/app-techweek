import { useState, useEffect, useCallback, useRef } from 'react';
import { getMyProfile, updateMascot, uploadAvatar, getMyPointEvents, addPointEvent } from '../lib/gameplay';
import { onAuthChange } from '../lib/auth';
import { getCachedUserProfile, isAdminEmail, updateUserProfile, syncUserRankingInFirestore } from '../lib/userService';
import { verifySymplaTicket, getCachedSymplaTicket, setCachedSymplaTicket } from '../lib/sympla';
import { calculateLevel } from '../lib/level';
import { useNotifications } from './useNotifications';

export function useUser() {
  const [profile, setProfile] = useState(() => getCachedUserProfile());
  const [pointEvents, setPointEvents] = useState([]);
  const [loading, setLoading] = useState(false);
  const [ticketLoading, setTicketLoading] = useState(false);
  const [profileReady, setProfileReady] = useState(false); // true só quando há sessão e o perfil chegou
  const scannedCodesRef = useRef(new Set());
  const syncedTicketEmailRef = useRef(null);
  const { addNotification } = useNotifications();

  const load = useCallback(async () => {
    try {
      const [profileData, events] = await Promise.all([getMyProfile(), getMyPointEvents()]);
      setProfile(prev => {
        if (!prev && !profileData) return null;
        const targetUid = profileData?.uid || profileData?.id || prev?.uid || prev?.id;
        const targetEmail = profileData?.email || prev?.email;
        const resolvedTicket =
          profileData?.symplaTicket ||
          profileData?.sympla_ticket ||
          prev?.symplaTicket ||
          prev?.sympla_ticket ||
          getCachedSymplaTicket(targetEmail, targetUid) ||
          null;
        if (!prev) {
          return resolvedTicket
            ? {
                ...profileData,
                symplaTicket: resolvedTicket,
                ticketId: profileData?.ticketId || resolvedTicket.ticketNumber || null,
                hasSymplaTicket: true
              }
            : profileData;
        }
        return {
          ...prev,
          ...profileData,
          avatarUrl: profileData?.avatarUrl || profileData?.avatar_url || prev.avatarUrl || prev.avatar_url,
          symplaTicket: resolvedTicket,
          ticketId: profileData?.ticketId || prev.ticketId || resolvedTicket?.ticketNumber || null,
          hasSymplaTicket: !!(
            profileData?.hasSymplaTicket ||
            resolvedTicket ||
            prev.hasSymplaTicket
          )
        };
      });
      setProfileReady(!!profileData);
      setPointEvents(events || []);
    } catch (_err) {
      // Offline fallback: mantém estado vazio sem quebrar a UI
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
    const unsubscribe = onAuthChange(() => {
      load();
    });

    const handlePointsUpdated = (e) => {
      if (e.detail?.event) {
        setPointEvents((prev) => {
          const refId = e.detail.event.reference_id || e.detail.event.referenceId;
          const exists = prev.some(
            (ev) => (ev.reference_id || ev.referenceId) === refId || ev.id === e.detail.event.id
          );
          if (exists) return prev;
          return [...prev, e.detail.event];
        });
      } else if (typeof e.detail?.delta === 'number' && e.detail.delta > 0) {
        setProfile((prev) => {
          if (!prev) return prev;
          const nextTotal = Math.max(Number(prev.totalPoints || prev.pontuacaoTotal || 0) + e.detail.delta, 0);
          return {
            ...prev,
            totalPoints: nextTotal,
            pontuacaoTotal: nextTotal
          };
        });
      }
    };

    const handleProfileUpdated = (e) => {
      if (e.detail && typeof e.detail === 'object') {
        setProfile((prev) => ({ ...(prev || {}), ...e.detail }));
      } else {
        const freshCached = getCachedUserProfile();
        if (freshCached) {
          setProfile((prev) => ({ ...(prev || {}), ...freshCached }));
        }
      }
    };

    if (typeof window !== 'undefined') {
      window.addEventListener('facom_points_updated', handlePointsUpdated);
      window.addEventListener('facom_profile_updated', handleProfileUpdated);
    }

    return () => {
      unsubscribe();
      if (typeof window !== 'undefined') {
        window.removeEventListener('facom_points_updated', handlePointsUpdated);
        window.removeEventListener('facom_profile_updated', handleProfileUpdated);
      }
    };
  }, [load]);

  // Auto-sincronização proativa do ingresso Sympla caso não esteja no perfil nem no cache
  useEffect(() => {
    const email = profile?.email ? String(profile.email).trim().toLowerCase() : '';
    const uid = profile?.uid || profile?.id || null;
    if (!email) return;

    const existingTicket =
      profile?.symplaTicket ||
      profile?.sympla_ticket ||
      getCachedSymplaTicket(email, uid);

    if (existingTicket?.qrCodeData || existingTicket?.ticketNumber || profile?.ticketId) {
      if (!profile?.symplaTicket && existingTicket) {
        setProfile((prev) =>
          prev
            ? {
                ...prev,
                symplaTicket: existingTicket,
                ticketId: prev.ticketId || existingTicket.ticketNumber || null,
                hasSymplaTicket: true
              }
            : prev
        );
      }
      return;
    }

    if (syncedTicketEmailRef.current === email) return;
    syncedTicketEmailRef.current = email;

    let cancelled = false;
    setTicketLoading(true);

    verifySymplaTicket({ email })
      .then((res) => {
        if (cancelled) return;
        const ticketData = res?.symplaTicket || res?.participant;
        if ((res?.verified || res?.hasTicket) && ticketData) {
          const normalizedTicket = {
            ...ticketData,
            ticketNumber: ticketData.ticketNumber || ticketData.ticket_number || null,
            qrCodeData: ticketData.qrCodeData || ticketData.ticket_num_qr_code || ticketData.ticketNumber || null
          };
          setCachedSymplaTicket(email, uid, normalizedTicket, res?.participant || null);
          setProfile((prev) =>
            prev
              ? {
                  ...prev,
                  hasSymplaTicket: true,
                  symplaTicket: normalizedTicket,
                  ticketId: prev.ticketId || normalizedTicket.ticketNumber || null
                }
              : prev
          );
          if (uid) {
            updateUserProfile(uid, {
              hasSymplaTicket: true,
              symplaTicket: normalizedTicket,
              ticketId: normalizedTicket.ticketNumber || null
            }).catch(() => {});
          }
        }
      })
      .catch(() => {})
      .finally(() => {
        if (!cancelled) {
          setTicketLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [profile?.email, profile?.uid, profile?.id, profile?.symplaTicket, profile?.sympla_ticket, profile?.ticketId]);

  const eventPoints = pointEvents.reduce((sum, event) => sum + (event.points || 0), 0);
  const profilePoints = profile?.totalPoints || profile?.pontuacaoTotal || profile?.total_points || 0;
  const points = Math.max(eventPoints, profilePoints);
  const userLevel = calculateLevel(points);

  useEffect(() => {
    const uid = profile?.uid || profile?.id;
    if (!uid || points <= 0) return;
    if (typeof syncUserRankingInFirestore === 'function') {
      syncUserRankingInFirestore(uid, points, profile).catch(() => {});
    }
  }, [points, profile?.uid, profile?.id, profile?.username, profile?.firstName, profile?.avatarUrl, profile?.avatar_url]);

  const scannedCodes = pointEvents
    .filter(event => (event.event_type || event.eventType) === 'scan')
    .map(event => event.reference_id || event.referenceId);

  const completedChallenges = pointEvents
    .filter(event => {
      const type = (event.event_type || event.eventType || '').toLowerCase();
      return type === 'challenge' || type === 'manual_challenge' || type === 'mission';
    })
    .map(event => {
      const ref = event.reference_id || event.referenceId;
      if (ref) return ref;
      if (event.id) {
        return event.id.replace(/^(manual_challenge_|challenge_|mission_)/, '');
      }
      return null;
    })
    .filter(Boolean);

  const mascot = profile?.mascot || 'blue';
  const avatarUrl = profile?.avatar_url || profile?.avatarUrl || profile?.photoURL || null;

  const hasScannedCode = (code) => scannedCodes.includes(code) || scannedCodesRef.current.has(code);
  const hasCompletedChallenge = (challengeId) => {
    if (!challengeId) return false;
    if (challengeId === 'sponsor_colecao' || challengeId === 'passport_complete') {
      const visitedCount = Object.keys(profile?.visitedSponsors || {}).length;
      if (profile?.goldenTicketAwarded || visitedCount >= 5) {
        return true;
      }
    }
    return (
      completedChallenges.includes(challengeId) ||
      pointEvents.some(event => {
        const ref = event.reference_id || event.referenceId;
        const id = event.id || '';
        return (
          ref === challengeId ||
          id === challengeId ||
          id.endsWith(`_${challengeId}`) ||
          id.includes(challengeId)
        );
      })
    );
  };

  const changeMascot = async (color) => {
    await updateMascot(color);
    setProfile(prev => (prev ? { ...prev, mascot: color } : prev));
  };

  const changeAvatar = async (file) => {
    const publicUrl = await uploadAvatar(file);
    setProfile(prev => (prev ? { ...prev, avatar_url: publicUrl } : prev));
    return publicUrl;
  };

  // Grava o evento via backend (KAN-79); o doc id determinístico
  // (eventType+referenceId) garante que a mesma ação nunca rende pontos duas vezes.
  const recordEvent = async (eventType, referenceId, amount, metadata = null) => {
    const result = await addPointEvent({ eventType, referenceId, points: amount, metadata });
    if (result && (result.success || result.alreadyClaimed)) {
      const creditedPoints = result.alreadyClaimed ? 0 : amount;
      setPointEvents(prev => {
        const exists = prev.some(e => (e.reference_id || e.referenceId) === referenceId);
        if (exists) return prev;
        return [...prev, { event_type: eventType, reference_id: referenceId, points: creditedPoints, metadata }];
      });
    }
    return result;
  };

  const registerCodeScan = async (data, amount = 5, resolvedProfile = null) => {
    let codeStr = data;
    let scannedProfile = null;

    // Check if it's JSON from a user profile
    try {
      const decoded = decodeURIComponent(data);
      if (decoded.startsWith('{') && decoded.endsWith('}')) {
        const parsed = JSON.parse(decoded);
        if (parsed.username || parsed.uid || parsed.participantUid || parsed.email) {
          scannedProfile = parsed;
          const idKey = (parsed.username || parsed.uid || parsed.participantUid || parsed.email || data).replace(/^@/, '');
          codeStr = `user_${idKey}`;
        }
      }
    } catch (e) {
      try {
        if (typeof data === 'string' && data.startsWith('{') && data.endsWith('}')) {
          const parsed = JSON.parse(data);
          if (parsed.username || parsed.uid || parsed.participantUid || parsed.email) {
            scannedProfile = parsed;
            const idKey = (parsed.username || parsed.uid || parsed.participantUid || parsed.email || data).replace(/^@/, '');
            codeStr = `user_${idKey}`;
          }
        }
      } catch (e2) {}
    }

    if (!scannedProfile && resolvedProfile) {
      scannedProfile = resolvedProfile;
      const idKey = String(
        resolvedProfile.username ||
        resolvedProfile.uid ||
        resolvedProfile.participantUid ||
        resolvedProfile.email ||
        data
      ).replace(/^@/, '');
      codeStr = `user_${idKey}`;
    } else if (scannedProfile && resolvedProfile) {
      scannedProfile = { ...resolvedProfile, ...scannedProfile };
    }

    // 1. Detectar auto-scan (escanear o próprio crachá)
    const myUid = profile?.uid || profile?.id;
    const myUsername = (profile?.username || '').replace(/^@/, '').toLowerCase();
    const myTicket = profile?.symplaTicket || profile?.sympla_ticket;
    const myQrData = myTicket?.qrCodeData || null;
    const myTicketNumber = myTicket?.ticketNumber || profile?.ticketId || null;
    const targetUid = scannedProfile?.uid || scannedProfile?.participantUid;
    const targetUsername = (scannedProfile?.username || '').replace(/^@/, '').toLowerCase();
    const trimmedRaw = typeof data === 'string' ? data.trim() : '';

    if (
      (myUid && targetUid && myUid === targetUid) ||
      (myUsername && targetUsername && myUsername === targetUsername) ||
      (myQrData && trimmedRaw && trimmedRaw === myQrData) ||
      (myTicketNumber && trimmedRaw && (trimmedRaw === myTicketNumber || trimmedRaw.replace(/^SYMPLA:/i, '') === myTicketNumber))
    ) {
      return { success: false, selfScan: true, error: 'Você escaneou o seu próprio crachá.' };
    }

    // 2. Se já foi escaneado anteriormente, permite a leitura normalmente, porém sem pontuar novamente (points: 0)
    if (hasScannedCode(codeStr)) {
      return {
        success: true,
        points: 0,
        alreadyScanned: true,
        unlockedChallenges: [],
        isProfile: !!scannedProfile,
        scannedProfile
      };
    }

    // 3. Registrar o evento
    const scanResult = await recordEvent('scan', codeStr, amount);
    if (!scanResult || (!scanResult.success && !scanResult.alreadyClaimed)) {
      return {
        success: false,
        alreadyScanned: false,
        error: scanResult?.error || 'Não foi possível registrar a leitura do código.',
        code: scanResult?.code || null
      };
    }

    scannedCodesRef.current.add(codeStr);

    if (scanResult.alreadyClaimed) {
      return {
        success: true,
        points: 0,
        alreadyScanned: true,
        unlockedChallenges: [],
        isProfile: !!scannedProfile,
        scannedProfile
      };
    }

    const unlockedChallenges = [];

    // Networking missions automated validation
    if (scannedProfile) {
      const targetMeta = {
        targetUid: scannedProfile.uid || scannedProfile.participantUid || null,
        targetUsername: scannedProfile.username || null,
        scannedProfile: {
          username: scannedProfile.username,
          course: scannedProfile.course,
          participantType: scannedProfile.participantType || scannedProfile.participant_type,
          period: scannedProfile.period
        }
      };

      if (!hasCompletedChallenge('network_first')) {
        const evRes = await recordEvent('challenge', 'network_first', 10, targetMeta);
        if (evRes && (evRes.success || evRes.alreadyClaimed)) {
          unlockedChallenges.push('network_first');
        }
      }

      if (profile) {
        if (profile.course && scannedProfile.course && profile.course.toLowerCase() !== scannedProfile.course.toLowerCase()) {
          if (!hasCompletedChallenge('network_course')) {
            const evRes = await recordEvent('challenge', 'network_course', 15, targetMeta);
            if (evRes && (evRes.success || evRes.alreadyClaimed)) {
              unlockedChallenges.push('network_course');
            }
          }
        }

        if (scannedProfile.participantType && scannedProfile.participantType !== 'Aluno da UFU' && scannedProfile.participantType !== 'Aluno UFU Graduação') {
          if (!hasCompletedChallenge('network_type')) {
            const evRes = await recordEvent('challenge', 'network_type', 15, targetMeta);
            if (evRes && (evRes.success || evRes.alreadyClaimed)) {
              unlockedChallenges.push('network_type');
            }
          }
        }

        if (scannedProfile.period === 1) {
          if (!hasCompletedChallenge('network_period')) {
            const evRes = await recordEvent('challenge', 'network_period', 15, targetMeta);
            if (evRes && (evRes.success || evRes.alreadyClaimed)) {
              unlockedChallenges.push('network_period');
            }
          }
        }
      }
    }

    // Check for specific hardcoded mission QR codes
    const normalizedData = typeof data === 'string' ? data.trim() : '';
    if (normalizedData === 'kanastra_code' || normalizedData === 'sponsor_visit' || normalizedData === 'Kanastra') {
      if (!hasCompletedChallenge('sponsor_visit')) {
        const evRes = await recordEvent('challenge', 'sponsor_visit', 15, { scannedCode: normalizedData });
        if (evRes && (evRes.success || evRes.alreadyClaimed)) {
          unlockedChallenges.push('sponsor_visit');
        }
      }
    }

    if (normalizedData === 'secret_qr_code' || normalizedData === 'QR_HUNT_MASTER') {
      if (!hasCompletedChallenge('secret_qr')) {
        const evRes = await recordEvent('challenge', 'secret_qr', 40, { scannedCode: normalizedData });
        if (evRes && (evRes.success || evRes.alreadyClaimed)) {
          unlockedChallenges.push('secret_qr');
        }
      }
    }

    return {
      success: true,
      points: amount,
      alreadyScanned: false,
      unlockedChallenges,
      isProfile: !!scannedProfile,
      scannedProfile
    };
  };

  const completeChallenge = async (challengeId, amount, metadata = null) => {
    if (!hasSymplaTicket) {
      return {
        success: false,
        error: 'É necessário possuir um ingresso oficial do Sympla vinculado à conta para realizar missões.',
        code: 'SYMPLA_TICKET_REQUIRED'
      };
    }

    if (hasCompletedChallenge(challengeId)) {
      return { success: false, alreadyCompleted: true };
    }
    const eventType = metadata ? 'manual_challenge' : 'challenge';
    const result = await addPointEvent({ eventType, referenceId: challengeId, points: amount, metadata });

    if (result && (result.success || result.alreadyClaimed)) {
      const awardedPoints = typeof result.points === 'number' ? result.points : amount;
      setPointEvents(prev => {
        const exists = prev.some(
          e => (e.reference_id || e.referenceId) === challengeId || (e.id && e.id.includes(challengeId))
        );
        if (exists) return prev;
        return [
          ...prev,
          {
            event_type: eventType,
            reference_id: challengeId,
            points: awardedPoints,
            metadata
          }
        ];
      });

      if (result.success) {
        addNotification({
          title: 'Missão Concluída!',
          message: `Você ganhou +${awardedPoints} pontos por completar a missão.`,
          type: 'points',
          actionUrl: '/ranking',
          actionLabel: 'Ver Ranking'
        });
        return { success: true, points: awardedPoints };
      } else {
        // alreadyClaimed: true
        return { success: false, alreadyCompleted: true };
      }
    }

    return {
      success: false,
      alreadyCompleted: false,
      error: result?.error || 'Não foi possível registrar a missão.',
      code: result?.code || null
    };
  };

  const isUserAdmin = Boolean(
    (profile?.email && isAdminEmail(profile.email)) ||
    (profile?.role === 'ADMIN')
  );
  const effectiveRole = isUserAdmin ? 'ADMIN' : (profile?.role || 'PARTICIPANT');

  const hasSymplaTicket = Boolean(
    profile?.hasSymplaTicket ||
    profile?.symplaTicket ||
    profile?.sympla_ticket ||
    effectiveRole === 'ADMIN'
  );
  const symplaTicket = profile?.symplaTicket || profile?.sympla_ticket || null;

  return {
    profile: profile ? {
      ...profile,
      role: effectiveRole,
      participantType: isUserAdmin ? 'Organizador' : (profile?.participantType || 'Aluno da UFU'),
      participant_type: isUserAdmin ? 'Organizador' : (profile?.participant_type || 'Aluno da UFU')
    } : null,
    role: effectiveRole,
    profileReady,
    participantType: isUserAdmin ? 'Organizador' : (profile?.participantType || profile?.participant_type || 'Aluno da UFU'),
    hasSymplaTicket,
    symplaTicket,
    ticketLoading,
    refreshProfile: load,
    loading,
    points,
    level: userLevel.level,
    userLevel,
    scannedCodes,
    completedChallenges,
    mascot,
    setMascot: changeMascot,
    avatarUrl,
    setAvatar: changeAvatar,
    registerCodeScan,
    completeChallenge,
    hasScannedCode,
    hasCompletedChallenge
  };
}
