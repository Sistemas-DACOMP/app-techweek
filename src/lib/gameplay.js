import { onAuthStateChanged } from 'firebase/auth';
import { auth } from './firebase';
import { 
  getUserProfile, 
  uploadUserAvatar, 
  updateUserProfile,
  getUserPointEvents,
  addUserPointEvent,
  getLeaderboardUsers
} from './userService';

/**
 * Retorna o usuário autenticado do Firebase, aguardando a restauração do estado inicial.
 */
export function getCurrentAuthUser() {
  return new Promise((resolve) => {
    if (auth.currentUser) {
      resolve(auth.currentUser);
      return;
    }
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      unsubscribe();
      resolve(user);
    });
  });
}

/**
 * Busca o perfil completo do usuário logado no Firestore.
 */
export async function getMyProfile() {
  const user = await getCurrentAuthUser();
  if (!user) return null;

  const profile = await getUserProfile(user.uid);
  if (!profile) {
    const fallbackName = user.displayName || user.email?.split('@')[0] || 'Participante';
    return {
      id: user.uid,
      email: user.email || '',
      username: user.email?.split('@')[0] || 'user',
      first_name: fallbackName,
      last_name: '',
      course: '',
      participant_type: 'Participante',
      period: null,
      avatar_url: user.photoURL || null,
      mascot: 'blue',
      sympla_ticket: null,
      total_points: 0
    };
  }

  return {
    id: user.uid,
    email: profile.email || user.email || '',
    username: profile.username || user.email?.split('@')[0] || 'user',
    first_name: profile.firstName || user.displayName || 'Participante',
    last_name: profile.lastName || '',
    course: profile.course || '',
    participant_type: profile.participantType || 'Participante',
    period: profile.period || null,
    avatar_url: profile.avatarUrl || user.photoURL || null,
    mascot: profile.mascot || 'blue',
    sympla_ticket: profile.symplaTicket || null,
    total_points: profile.totalPoints || 0
  };
}

export async function uploadAvatar(file) {
  const user = await getCurrentAuthUser();
  if (!user) throw new Error('Usuário não autenticado');

  const publicUrl = await uploadUserAvatar(user.uid, file);
  return publicUrl;
}

export async function updateMascot(mascot) {
  const user = await getCurrentAuthUser();
  if (!user) throw new Error('Usuário não autenticado');

  await updateUserProfile(user.uid, { mascot });
}

export async function getMyPointEvents() {
  const user = await getCurrentAuthUser();
  if (!user) return [];

  const events = await getUserPointEvents(user.uid);
  return events.map(ev => ({
    event_type: ev.eventType,
    reference_id: ev.referenceId,
    points: ev.points,
    metadata: ev.metadata,
    created_at: ev.createdAt
  }));
}

// Registra um evento de pontos no Firestore com prevenção contra duplicidade
export async function addPointEvent({ eventType, referenceId, points, metadata = null }) {
  const user = await getCurrentAuthUser();
  if (!user) throw new Error('Usuário não autenticado');

  return await addUserPointEvent(user.uid, { eventType, referenceId, points, metadata });
}

// Obtém o ranking oficial de pontuação
export async function getRanking() {
  return await getLeaderboardUsers(50);
}
