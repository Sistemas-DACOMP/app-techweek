import { useState, useEffect, useCallback } from 'react';
import { getMyProfile, updateMascot, uploadAvatar, getMyPointEvents, addPointEvent } from '../lib/gameplay';
import { onAuthChange } from '../lib/auth';
import { getCachedUserProfile } from '../lib/userService';
import { calculateLevel } from '../lib/level';
import { useNotifications } from './useNotifications';

export function useUser() {
  const [profile, setProfile] = useState(() => getCachedUserProfile());
  const [pointEvents, setPointEvents] = useState([]);
  const [loading, setLoading] = useState(false);
  const { addNotification } = useNotifications();

  const load = useCallback(async () => {
    try {
      const [profileData, events] = await Promise.all([getMyProfile(), getMyPointEvents()]);
      setProfile(prev => {
        if (!prev) return profileData;
        return {
          ...prev,
          ...profileData,
          avatarUrl: profileData?.avatarUrl || profileData?.avatar_url || prev.avatarUrl || prev.avatar_url,
          symplaTicket: profileData?.symplaTicket || profileData?.sympla_ticket || prev.symplaTicket || prev.sympla_ticket,
          hasSymplaTicket: !!(profileData?.hasSymplaTicket || profileData?.symplaTicket || prev.hasSymplaTicket || prev.symplaTicket)
        };
      });
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
      }
    };

    if (typeof window !== 'undefined') {
      window.addEventListener('facom_points_updated', handlePointsUpdated);
    }

    return () => {
      unsubscribe();
      if (typeof window !== 'undefined') {
        window.removeEventListener('facom_points_updated', handlePointsUpdated);
      }
    };
  }, [load]);

  const eventPoints = pointEvents.reduce((sum, event) => sum + (event.points || 0), 0);
  const profilePoints = profile?.totalPoints || profile?.pontuacaoTotal || profile?.total_points || 0;
  const points = Math.max(eventPoints, profilePoints);
  const userLevel = calculateLevel(points);

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

  const hasScannedCode = (code) => scannedCodes.includes(code);
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
    if (result.success || result.alreadyClaimed) {
      setPointEvents(prev => {
        const exists = prev.some(e => (e.reference_id || e.referenceId) === referenceId);
        if (exists) return prev;
        return [...prev, { event_type: eventType, reference_id: referenceId, points: amount, metadata }];
      });
    }
    return result.success || result.alreadyClaimed;
  };

  const registerCodeScan = async (data, amount = 5) => {
    let codeStr = data;
    let scannedProfile = null;

    // Check if it's JSON from a user profile
    try {
      const decoded = decodeURIComponent(data);
      if (decoded.startsWith('{') && decoded.endsWith('}')) {
        const parsed = JSON.parse(decoded);
        if (parsed.username) {
          scannedProfile = parsed;
          codeStr = `user_${parsed.username}`;
        }
      }
    } catch (e) {
      try {
        if (data.startsWith('{') && data.endsWith('}')) {
          const parsed = JSON.parse(data);
          if (parsed.username) {
            scannedProfile = parsed;
            codeStr = `user_${parsed.username}`;
          }
        }
      } catch (e2) {}
    }

    if (hasScannedCode(codeStr)) {
      return { success: false };
    }

    const scanOk = await recordEvent('scan', codeStr, amount);
    if (!scanOk) {
      return { success: false };
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
        if (await recordEvent('challenge', 'network_first', 10, targetMeta)) {
          unlockedChallenges.push('network_first');
        }
      }

      if (profile) {
        if (profile.course && scannedProfile.course && profile.course.toLowerCase() !== scannedProfile.course.toLowerCase()) {
          if (!hasCompletedChallenge('network_course')) {
            if (await recordEvent('challenge', 'network_course', 15, targetMeta)) {
              unlockedChallenges.push('network_course');
            }
          }
        }

        if (scannedProfile.participantType && scannedProfile.participantType !== 'Aluno da UFU') {
          if (!hasCompletedChallenge('network_type')) {
            if (await recordEvent('challenge', 'network_type', 15, targetMeta)) {
              unlockedChallenges.push('network_type');
            }
          }
        }

        if (scannedProfile.period === 1) {
          if (!hasCompletedChallenge('network_period')) {
            if (await recordEvent('challenge', 'network_period', 15, targetMeta)) {
              unlockedChallenges.push('network_period');
            }
          }
        }
      }
    }

    // Check for specific hardcoded mission QR codes
    if (data === 'kanastra_code' || data === 'sponsor_visit') {
      if (!hasCompletedChallenge('sponsor_visit')) {
        if (await recordEvent('challenge', 'sponsor_visit', 15, { scannedCode: data })) {
          unlockedChallenges.push('sponsor_visit');
        }
      }
    }

    if (data === 'secret_qr_code') {
      if (!hasCompletedChallenge('secret_qr')) {
        if (await recordEvent('challenge', 'secret_qr', 40, { scannedCode: data })) {
          unlockedChallenges.push('secret_qr');
        }
      }
    }

    return { success: true, unlockedChallenges, isProfile: !!scannedProfile, scannedProfile };
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

  const hasSymplaTicket = Boolean(
    profile?.hasSymplaTicket ||
    profile?.symplaTicket ||
    profile?.sympla_ticket ||
    profile?.role === 'ADMIN'
  );
  const symplaTicket = profile?.symplaTicket || profile?.sympla_ticket || null;

  return {
    profile,
    role: profile?.role || 'PARTICIPANT',
    participantType: profile?.participantType || profile?.participant_type || 'Aluno da UFU',
    hasSymplaTicket,
    symplaTicket,
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
