import { auth, db, storage } from './firebase';
import { doc, updateDoc } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { apiRequest } from './api';
import {
  getUserProfile,
  uploadUserAvatar,
  updateUserProfile,
  getUserPointEvents,
  getLeaderboardUsers
} from './userService';

export async function getMyProfile() {
  const firebaseUser = auth?.currentUser;
  if (!firebaseUser) return null;

  try {
    const fsProfile = await getUserProfile(firebaseUser.uid);
    if (fsProfile) {
      return {
        ...fsProfile,
        id: firebaseUser.uid,
        first_name: fsProfile.firstName || fsProfile.displayName?.split(' ')[0] || fsProfile.username || 'Visitante',
        last_name: fsProfile.lastName || '',
        username: fsProfile.username || fsProfile.email?.split('@')[0] || '',
        avatar_url: fsProfile.avatarUrl || fsProfile.photoURL || firebaseUser.photoURL || null,
        mascot: fsProfile.mascot || 'blue'
      };
    }
    return {
      id: firebaseUser.uid,
      first_name: firebaseUser.displayName?.split(' ')[0] || 'Visitante',
      last_name: '',
      username: firebaseUser.email?.split('@')[0] || '',
      avatar_url: firebaseUser.photoURL || null,
      mascot: 'blue'
    };
  } catch (e) {
    console.warn('[gameplay] Erro ao buscar perfil no Firestore:', e);
    return {
      id: firebaseUser.uid,
      first_name: firebaseUser.displayName?.split(' ')[0] || 'Visitante',
      last_name: '',
      username: firebaseUser.email?.split('@')[0] || '',
      avatar_url: firebaseUser.photoURL || null,
      mascot: 'blue'
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
  if (import.meta.env.VITE_USE_FIREBASE_EMULATORS === 'true') {
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

function saveLocalPointEvent(userId, event) {
  if (typeof window === 'undefined' || !window.localStorage) return;
  try {
    const events = getLocalPointEvents(userId);
    const refId = event.reference_id || event.referenceId;
    const exists = events.some(e => (e.reference_id || e.referenceId) === refId);
    if (!exists) {
      events.push(event);
      window.localStorage.setItem(`facom_point_events_${userId}`, JSON.stringify(events));
    }
  } catch (_e) {}
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

  try {
    const { collection, getDocs, query, where } = await import('firebase/firestore');
    const q = query(collection(db, 'pointEvents'), where('userId', '==', user.uid));
    const snapshot = await getDocs(q);
    firestoreEvents.push(...snapshot.docs.map(d => ({
      id: d.id,
      event_type: d.data().eventType || d.data().event_type,
      reference_id: d.data().referenceId || d.data().reference_id,
      points: d.data().points || 0,
      metadata: d.data().metadata || null,
      ...d.data(),
    })));
  } catch (_e) {}

  // Une os eventos do Firestore e do localStorage sem duplicar por reference_id
  const merged = [...firestoreEvents];
  const seenRefs = new Set(firestoreEvents.map(e => e.reference_id || e.referenceId));

  for (const le of localEvents) {
    const refId = le.reference_id || le.referenceId;
    if (!seenRefs.has(refId)) {
      merged.push(le);
      seenRefs.add(refId);
    }
  }

  return merged;
}

// Registra um evento de pontos via backend (KAN-79). O client não pode mais
// gravar totalPoints direto no Firestore (bloqueado desde o fix do SEC-003,
// KAN-69) — a escrita direta falhava em silêncio e mentia sucesso. O backend
// (POST /api/points/claim) credita totalPoints com FieldValue.increment numa
// transação, com o mesmo dedup por doc id determinístico que o client já usava.
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
    if (data && (data.success || data.alreadyClaimed)) {
      saveLocalPointEvent(user.uid, localEvent);
    }
    return data;
  } catch (err) {
    if (err.status === 409 || err.data?.alreadyClaimed) {
      saveLocalPointEvent(user.uid, localEvent);
      return { success: false, alreadyClaimed: true };
    }
    // Falha real (rede indisponível, backend fora do ar) precisa aparecer
    // como falha real — nunca mais mascarar como sucesso aqui nem salvar estado local falso.
    return { success: false, error: err.message || 'Não foi possível registrar os pontos.' };
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
