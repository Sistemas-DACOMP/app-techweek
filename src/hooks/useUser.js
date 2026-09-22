import { useState, useEffect, useCallback } from 'react';
import { getMyProfile, updateMascot, uploadAvatar, getMyPointEvents, addPointEvent } from '../lib/gameplay';
import { onAuthChange } from '../lib/auth';
import { calculateLevel } from '../lib/level';
import { useNotifications } from './useNotifications';

export function useUser() {
  const [profile, setProfile] = useState(null);
  const [pointEvents, setPointEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const { addNotification } = useNotifications();

  const load = useCallback(async () => {
    try {
      const [profileData, events] = await Promise.all([getMyProfile(), getMyPointEvents()]);
      setProfile(profileData);
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
    return () => unsubscribe();
  }, [load]);

  const points = pointEvents.reduce((sum, event) => sum + (event.points || 0), 0);
  const userLevel = calculateLevel(points);

  const scannedCodes = pointEvents
    .filter(event => (event.event_type || event.eventType) === 'scan')
    .map(event => event.reference_id || event.referenceId);

  const completedChallenges = pointEvents
    .filter(event => {
      const type = event.event_type || event.eventType;
      return type === 'challenge' || type === 'manual_challenge';
    })
    .map(event => event.reference_id || event.referenceId);

  const mascot = profile?.mascot || 'blue';
  const avatarUrl = profile?.avatar_url || profile?.avatarUrl || profile?.photoURL || null;

  const hasScannedCode = (code) => scannedCodes.includes(code);
  const hasCompletedChallenge = (challengeId) => completedChallenges.includes(challengeId);

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
    if (result.success) {
      setPointEvents(prev => [...prev, { event_type: eventType, reference_id: referenceId, points: amount, metadata }]);
    }
    return result.success;
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
      if (!hasCompletedChallenge('network_first')) {
        if (await recordEvent('challenge', 'network_first', 10)) {
          unlockedChallenges.push('network_first');
        }
      }

      if (profile) {
        if (profile.course && scannedProfile.course && profile.course.toLowerCase() !== scannedProfile.course.toLowerCase()) {
          if (!hasCompletedChallenge('network_course')) {
            if (await recordEvent('challenge', 'network_course', 15)) {
              unlockedChallenges.push('network_course');
            }
          }
        }

        if (scannedProfile.participantType && scannedProfile.participantType !== 'Aluno da UFU') {
          if (!hasCompletedChallenge('network_type')) {
            if (await recordEvent('challenge', 'network_type', 15)) {
              unlockedChallenges.push('network_type');
            }
          }
        }

        if (scannedProfile.period === 1) {
          if (!hasCompletedChallenge('network_period')) {
            if (await recordEvent('challenge', 'network_period', 15)) {
              unlockedChallenges.push('network_period');
            }
          }
        }
      }
    }

    // Check for specific hardcoded mission QR codes
    if (data === 'kanastra_code' || data === 'sponsor_visit') {
      if (!hasCompletedChallenge('sponsor_visit')) {
        if (await recordEvent('challenge', 'sponsor_visit', 15)) {
          unlockedChallenges.push('sponsor_visit');
        }
      }
    }

    if (data === 'secret_qr_code') {
      if (!hasCompletedChallenge('secret_qr')) {
        if (await recordEvent('challenge', 'secret_qr', 40)) {
          unlockedChallenges.push('secret_qr');
        }
      }
    }

    return { success: true, unlockedChallenges, isProfile: !!scannedProfile, scannedProfile };
  };

  const completeChallenge = async (challengeId, amount, metadata = null) => {
    if (hasCompletedChallenge(challengeId)) return false;
    const eventType = metadata ? 'manual_challenge' : 'challenge';
    const ok = await recordEvent(eventType, challengeId, amount, metadata);
    if (ok) {
      addNotification({
        title: 'Missão Concluída! 🎉',
        message: `Você ganhou +${amount} pontos por completar a missão.`,
        type: 'points',
        actionUrl: '/ranking',
        actionLabel: 'Ver Ranking'
      });
    }
    return ok;
  };

  return {
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
