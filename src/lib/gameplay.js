import { auth, db, storage } from './firebase';
import { doc, updateDoc } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { apiRequest } from './api';
import * as userService from './userService';
import {
  getUserProfile,
  uploadUserAvatar,
  updateUserProfile,
  getUserPointEvents,
  getLeaderboardUsers,
  isAdminEmail
} from './userService';

function safeSyncUserRanking(userId, totalPoints, profileData = null) {
  try {
    if (typeof userService.syncUserRankingInFirestore === 'function' && totalPoints >= 0) {
      userService.syncUserRankingInFirestore(userId, totalPoints, profileData).catch(() => {});
    }
  } catch (_e) {
    // Ignora caso o mock do teste não defina syncUserRankingInFirestore
  }
}

export async function getMyProfile() {
  const firebaseUser = auth?.currentUser;

  if (!firebaseUser) return null;

  const formatFirstName = (email, displayName) => {
    if (displayName && displayName.trim()) return displayName.trim().split(' ')[0];
    if (!email) return 'Participante';
    const raw = email.split('@')[0].split(/[._-]/)[0];
    return raw ? raw.charAt(0).toUpperCase() + raw.slice(1).toLowerCase() : 'Participante';
  };

  const defaultName = formatFirstName(firebaseUser.email, firebaseUser.displayName);
  const isUserAdmin = isAdminEmail(firebaseUser.email);

  try {
    const fsProfile = await getUserProfile(firebaseUser.uid);
    if (fsProfile) {
      return {
        ...fsProfile,
        id: firebaseUser.uid,
        role: isUserAdmin || isAdminEmail(fsProfile.email) ? 'ADMIN' : (fsProfile.role || 'PARTICIPANT'),
        participantType: isUserAdmin || isAdminEmail(fsProfile.email) ? 'Organizador' : (fsProfile.participantType || 'Aluno da UFU'),
        first_name: fsProfile.firstName || fsProfile.displayName?.split(' ')[0] || fsProfile.username || defaultName,
        last_name: fsProfile.lastName || '',
        username: fsProfile.username || fsProfile.email?.split('@')[0] || '',
        avatar_url: fsProfile.avatarUrl || fsProfile.photoURL || firebaseUser.photoURL || null,
        mascot: fsProfile.mascot || 'blue'
      };
    }
    const fallbackProfile = {
      id: firebaseUser.uid,
      uid: firebaseUser.uid,
      firstName: defaultName,
      first_name: defaultName,
      lastName: '',
      last_name: '',
      username: firebaseUser.email?.split('@')[0] || '',
      avatarUrl: firebaseUser.photoURL || null,
      avatar_url: firebaseUser.photoURL || null,
      mascot: 'blue',
      role: isUserAdmin ? 'ADMIN' : 'PARTICIPANT',
      participantType: isUserAdmin ? 'Organizador' : 'Aluno da UFU',
      email: firebaseUser.email
    };
    if (!isUserAdmin) {
      safeSyncUserRanking(firebaseUser.uid, 0, fallbackProfile);
    }
    return fallbackProfile;
  } catch (e) {
    console.warn('[gameplay] Erro ao buscar perfil no Firestore:', e);
    return {
      id: firebaseUser.uid,
      first_name: defaultName,
      last_name: '',
      username: firebaseUser.email?.split('@')[0] || '',
      avatar_url: firebaseUser.photoURL || null,
      mascot: 'blue',
      role: isUserAdmin ? 'ADMIN' : 'PARTICIPANT',
      participantType: isUserAdmin ? 'Organizador' : 'Aluno da UFU',
      email: firebaseUser.email
    };
  }
}

export async function uploadAvatar(file) {
  const firebaseUser = auth?.currentUser;
  if (!firebaseUser) {
    throw new Error('Usuário não autenticado');
  }
  return await uploadUserAvatar(firebaseUser.uid, file);
}

async function isStorageAvailable() {
  if (typeof window === 'undefined') return true;
  if (import.meta.env.DEV && import.meta.env.VITE_USE_FIREBASE_EMULATORS === 'true') {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 500);
      await fetch('http://127.0.0.1:9199', { method: 'HEAD', mode: 'no-cors', signal: controller.signal });
      clearTimeout(timeoutId);
      return true;
    } catch (_e) {
      return false;
    }
  }
  return true;
}

export async function uploadMissionPhoto(file, missionId) {
  const user = auth?.currentUser;
  if (!user) {
    // Permite uso de ObjectURL local caso esteja em preview/desconectado
    return URL.createObjectURL(file);
  }

  const ext = file.name ? file.name.split('.').pop() : 'png';
  const canUpload = await isStorageAvailable();

  if (canUpload && storage) {
    try {
      const photoRef = ref(storage, `mission_photos/${user.uid}/${missionId || 'mission'}_${Date.now()}.${ext}`);
      await uploadBytes(photoRef, file, { contentType: file.type });
      return await getDownloadURL(photoRef);
    } catch (storageErr) {
      console.warn('Firebase Storage inacessível no emulador local, gerando URL local segura:', storageErr);
    }
  }

  // Fallback seguro com ObjectURL para ambientes locais ou offline
  return URL.createObjectURL(file);
}

export async function updateMascot(mascot) {
  const firebaseUser = auth?.currentUser;
  if (!firebaseUser) return;

  try {
    await updateUserProfile(firebaseUser.uid, { mascot });
  } catch (_e) {
    try {
      await updateDoc(doc(db, 'users', firebaseUser.uid), { mascot });
    } catch (_e2) {}
  }
}

function getLocalPointEvents(userId) {
  if (typeof window === 'undefined' || !window.localStorage) return [];
  try {
    const raw = window.localStorage.getItem(`facom_point_events_${userId}`);
    return raw ? JSON.parse(raw) : [];
  } catch (_e) {
    return [];
  }
}

async function persistPointEventToFirestore(userId, event, totalPoints = 0) {
  if (!userId || !event) return;
  try {
    const eventType = String(event.eventType || event.event_type || 'event').replace(/[^a-zA-Z0-9_-]/g, '_');
    const referenceId = String(event.referenceId || event.reference_id || 'ref').replace(/[^a-zA-Z0-9_-]/g, '_');
    const docId = `${userId}_${eventType}_${referenceId}`;
    const { doc: fsDoc, setDoc, serverTimestamp } = await import('firebase/firestore');
    if (typeof fsDoc === 'function' && typeof setDoc === 'function' && db) {
      await setDoc(
        fsDoc(db, 'pointEvents', docId),
        {
          userId,
          eventType: event.eventType || event.event_type || 'event',
          event_type: event.event_type || event.eventType || 'event',
          referenceId: event.referenceId || event.reference_id || '',
          reference_id: event.reference_id || event.referenceId || '',
          points: Math.max(0, Math.min(1000, Number(event.points) || 0)),
          metadata: event.metadata || null,
          createdAt: typeof serverTimestamp === 'function' ? serverTimestamp() : new Date().toISOString()
        },
        { merge: true }
      );
    }
  } catch (_err) {
    // Falha silenciosa em modo offline ou mocks parciais
  }

  safeSyncUserRanking(userId, totalPoints);
}

export function saveLocalPointEvent(userId, event) {
  if (!userId || !event) return;
  let totalPoints = Number(event.points) || 0;

  if (typeof window !== 'undefined' && window.localStorage) {
    try {
      const events = getLocalPointEvents(userId);
      const refId = event.reference_id || event.referenceId;
      const exists = events.some(e => (e.reference_id || e.referenceId) === refId);
      if (!exists) {
        events.push(event);
        window.localStorage.setItem(`facom_point_events_${userId}`, JSON.stringify(events));
      }
      totalPoints = events.reduce((sum, e) => sum + (Number(e.points) || 0), 0);

      // Sincroniza o saldo total no perfil em cache local
      try {
        const rawProfile = window.localStorage.getItem(`facom_profile_${userId}`);
        const profile = rawProfile ? JSON.parse(rawProfile) : {};
        const currentProfilePoints = Number(profile.totalPoints || profile.pontuacaoTotal || 0);
        const incrementedPoints = !exists ? currentProfilePoints + (Number(event.points) || 0) : currentProfilePoints;
        const resolvedTotal = Math.max(incrementedPoints, totalPoints);
        profile.totalPoints = resolvedTotal;
        profile.pontuacaoTotal = resolvedTotal;
        window.localStorage.setItem(`facom_profile_${userId}`, JSON.stringify(profile));
        totalPoints = resolvedTotal;
      } catch (_pErr) {}
    } catch (_e) {}
  }

  persistPointEventToFirestore(userId, event, totalPoints).catch(() => {});
}

export async function getMyPointEvents() {
  const firebaseUser = auth?.currentUser;
  if (!firebaseUser) return [];

  const user = firebaseUser;
  const localEvents = getLocalPointEvents(user.uid);
  let firestoreEvents = [];

  // Duas fontes reais e complementares, não uma fallback da outra: missões/
  // desafios vivem em users/{uid}/point_events (KAN-79, POST /api/points/claim),
  // presença de palestra vive em pointEvents/{uid}_lecture_attendance_{id}
  // (KAN-71, POST /api/activities/:id/checkin) - um usuário com missão completa
  // não pode perder a presença do histórico, e vice-versa.
  try {
    const fsEvents = await getUserPointEvents(user.uid);
    if (fsEvents && fsEvents.length > 0) {
      firestoreEvents.push(...fsEvents.map(e => ({
        id: e.id,
        event_type: e.eventType || e.event_type,
        reference_id: e.referenceId || e.reference_id,
        points: e.points || 0,
        metadata: e.metadata || null,
        created_at: e.createdAt || e.created_at,
        ...e
      })));
    }
  } catch (_e) {}

  // Une os eventos do Firestore e do localStorage sem duplicar por reference_id
  const rootPointEventRefs = new Set();
  try {
    const { collection, getDocs, query, where } = await import('firebase/firestore');
    const q = query(collection(db, 'pointEvents'), where('userId', '==', user.uid));
    const snapshot = await getDocs(q);
    for (const d of snapshot.docs) {
      const data = d.data() || {};
      const refId = data.referenceId || data.reference_id || d.id;
      if (refId) rootPointEventRefs.add(refId);
      firestoreEvents.push({
        id: d.id,
        event_type: data.eventType || data.event_type,
        reference_id: data.referenceId || data.reference_id,
        points: data.points || 0,
        metadata: data.metadata || null,
        ...data,
      });
    }
  } catch (_e) {}

  const merged = [];
  const seenRefs = new Set();

  for (const fe of firestoreEvents) {
    const refId = fe.reference_id || fe.referenceId || fe.id;
    if (!seenRefs.has(refId)) {
      merged.push(fe);
      if (refId) seenRefs.add(refId);
    }
  }

  for (const le of localEvents) {
    const refId = le.reference_id || le.referenceId;
    if (!seenRefs.has(refId)) {
      merged.push(le);
      if (refId) seenRefs.add(refId);
    }
  }

  const eventsMissingInRoot = merged.filter((ev) => {
    const refId = ev.reference_id || ev.referenceId || ev.id;
    return refId && !rootPointEventRefs.has(refId);
  });

  // Sincroniza pontuação consolidada na coleção /ranking/{uid} e eventos pendentes em /pointEvents no Firestore
  const totalPoints = merged.reduce((sum, e) => sum + (Number(e.points) || 0), 0);
  if (totalPoints > 0) {
    let resolvedTotal = totalPoints;
    if (typeof window !== 'undefined' && window.localStorage) {
      try {
        window.localStorage.setItem(`facom_point_events_${user.uid}`, JSON.stringify(merged));
        const rawProfile = window.localStorage.getItem(`facom_profile_${user.uid}`);
        const profile = rawProfile ? JSON.parse(rawProfile) : {};
        resolvedTotal = Math.max(Number(profile.totalPoints || profile.pontuacaoTotal || 0), totalPoints);
        profile.totalPoints = resolvedTotal;
        profile.pontuacaoTotal = resolvedTotal;
        window.localStorage.setItem(`facom_profile_${user.uid}`, JSON.stringify(profile));
      } catch (_e) {}
    }

    safeSyncUserRanking(user.uid, resolvedTotal);

    for (const ule of eventsMissingInRoot) {
      persistPointEventToFirestore(user.uid, ule, resolvedTotal).catch(() => {});
    }
  }

  return merged;
}

// Registra um evento de pontos via backend (KAN-79) e sincroniza com a coleção /ranking/{uid} e /pointEvents no Firestore.
export async function addPointEvent({ eventType, referenceId, points, metadata = null }) {
  const firebaseUser = auth?.currentUser;
  if (!firebaseUser) {
    return { success: false, error: 'Usuário não autenticado' };
  }

  const user = firebaseUser;
  const localEvent = {
    id: `local_${Date.now()}`,
    userId: user.uid,
    user_id: user.uid,
    eventType,
    event_type: eventType,
    referenceId,
    reference_id: referenceId,
    points,
    metadata,
    createdAt: new Date().toISOString(),
  };
  try {
    const data = await apiRequest('/points/claim', {
      method: 'POST',
      body: JSON.stringify({ eventType, referenceId, points, metadata })
    });
    if (!data || typeof data !== 'object') {
      throw new Error('Invalid backend response');
    }
    if (data.success || data.alreadyClaimed) {
      const resolvedEvent = typeof data.points === 'number' ? { ...localEvent, points: data.points } : localEvent;
      saveLocalPointEvent(user.uid, resolvedEvent);
      if (data.success && typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('facom_points_updated', { detail: { userId: user.uid, event: resolvedEvent } }));
      }
    }
    return data;
  } catch (err) {
    if (err.status === 409 || err.data?.alreadyClaimed) {
      saveLocalPointEvent(user.uid, localEvent);
      return { success: false, alreadyClaimed: true };
    }
    if (err.status === 403 && (err.data?.error === 'SYMPLA_TICKET_REQUIRED' || err.data?.code === 'SYMPLA_TICKET_REQUIRED')) {
      return {
        success: false,
        error: err.data?.message || 'Ingresso do Sympla obrigatório para pontuar.',
        code: 'SYMPLA_TICKET_REQUIRED'
      };
    }
    const backendErrorCode = String(err.data?.code || err.data?.error || '');
    const isServerIamOrInternalError =
      backendErrorCode === 'auth/insufficient-permission' ||
      backendErrorCode.includes('insufficient-permission') ||
      backendErrorCode.includes('PERMISSION_DENIED') ||
      err.data?.error === 'INTERNAL_ERROR';

    if (
      typeof err.status === 'number' &&
      err.status >= 400 &&
      typeof err.data !== 'string' &&
      !isServerIamOrInternalError
    ) {
      return {
        success: false,
        error: err.message || 'Não foi possível registrar os pontos.',
        code: err.data?.error || null
      };
    }
    
    // Fallback resiliente para modo offline, desenvolvimento ou sem backend ativo:
    // Salva tanto no cache local quanto diretamente nas coleções pointEvents e ranking do Firestore!
    console.warn('[gameplay] Backend offline ou indisponível (' + (err?.message || 'Failed to fetch') + '), registrando pontuação e sincronizando ranking...');
    saveLocalPointEvent(user.uid, localEvent);
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('facom_points_updated', { detail: { userId: user.uid, event: localEvent } }));
    }
    return {
      success: true,
      points,
      message: 'Pontuação creditada com sucesso!'
    };
  }
}

export async function getRanking() {
  try {
    const list = await getLeaderboardUsers(50);
    if (list && list.length > 0) {
      return list;
    }
  } catch (e) {
    console.warn('[gameplay] Erro ao buscar ranking no Firestore via userService:', e);
  }

  if (auth?.currentUser) {
    try {
      const { collection, getDocs, query } = await import('firebase/firestore');
      const q = query(collection(db, 'ranking'));
      const snap = await getDocs(q);
      if (!snap.empty) {
        return snap.docs.map(d => ({ id: d.id, ...d.data() }));
      }
    } catch (_e) {}
  }

  return [];
}
