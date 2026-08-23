import { useState, useEffect, useCallback } from 'react';
import { getMyProfile, updateMascot, getMyPointEvents, addPointEvent } from '../lib/gameplay';

export function useUser() {
  const [profile, setProfile] = useState(null);
  const [pointEvents, setPointEvents] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    const [profileData, events] = await Promise.all([getMyProfile(), getMyPointEvents()]);
    setProfile(profileData);
    setPointEvents(events);
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const points = pointEvents.reduce((sum, event) => sum + event.points, 0);

  const scannedCodes = pointEvents
    .filter(event => event.event_type === 'scan')
    .map(event => event.reference_id);

  const completedChallenges = pointEvents
    .filter(event => event.event_type === 'challenge' || event.event_type === 'manual_challenge')
    .map(event => event.reference_id);

  const mascot = profile?.mascot || 'blue';

  const hasScannedCode = (code) => scannedCodes.includes(code);
  const hasCompletedChallenge = (challengeId) => completedChallenges.includes(challengeId);

  const changeMascot = async (color) => {
    await updateMascot(color);
    setProfile(prev => (prev ? { ...prev, mascot: color } : prev));
  };

  // Grava o evento no Supabase; a constraint UNIQUE(user_id, event_type, reference_id)
  // do banco garante que a mesma ação nunca rende pontos duas vezes.
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
    return recordEvent(eventType, challengeId, amount, metadata);
  };

  return {
    loading,
    points,
    scannedCodes,
    completedChallenges,
    mascot,
    setMascot: changeMascot,
    registerCodeScan,
    completeChallenge,
    hasScannedCode,
    hasCompletedChallenge
  };
}
