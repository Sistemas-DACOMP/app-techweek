import { supabase } from './supabaseClient';
import { auth } from './firebase';
import { 
  getUserProfile, 
  uploadUserAvatar, 
  updateUserProfile, 
  getUserPointEvents, 
  addUserPointEvent, 
  getLeaderboardUsers 
} from './userService';

const UNIQUE_VIOLATION = '23505';

export async function getMyProfile() {
  // 1. Prioriza Firebase Auth & Firestore
  const firebaseUser = auth.currentUser;
  if (firebaseUser) {
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
    }
  }

  // 2. Fallback Supabase
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return null;

    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single();

    if (error) return null;
    return data;
  } catch (err) {
    return null;
  }
}

export async function uploadAvatar(file) {
  const firebaseUser = auth.currentUser;
  if (firebaseUser) {
    return await uploadUserAvatar(firebaseUser.uid, file);
  }

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Usuário não autenticado');

  const ext = file.name.split('.').pop();
  const path = `${user.id}/${Date.now()}.${ext}`;

  const { error: uploadError } = await supabase.storage
    .from('avatars')
    .upload(path, file, { contentType: file.type });

  if (uploadError) throw uploadError;

  const { data: { publicUrl } } = supabase.storage.from('avatars').getPublicUrl(path);

  const { error: updateError } = await supabase
    .from('profiles')
    .update({ avatar_url: publicUrl })
    .eq('id', user.id);

  if (updateError) throw updateError;

  return publicUrl;
}

export async function updateMascot(mascot) {
  const firebaseUser = auth.currentUser;
  if (firebaseUser) {
    return await updateUserProfile(firebaseUser.uid, { mascot });
  }

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Usuário não autenticado');

  const { error } = await supabase
    .from('profiles')
    .update({ mascot })
    .eq('id', user.id);

  if (error) throw error;
}

export async function getMyPointEvents() {
  const firebaseUser = auth.currentUser;
  if (firebaseUser) {
    const events = await getUserPointEvents(firebaseUser.uid);
    return events.map(e => ({
      event_type: e.eventType || e.event_type,
      reference_id: e.referenceId || e.reference_id,
      points: e.points || 0,
      metadata: e.metadata || null,
      created_at: e.createdAt || e.created_at
    }));
  }

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];

  const { data, error } = await supabase
    .from('point_events')
    .select('*')
    .eq('user_id', user.id);

  if (error) return [];
  return data || [];
}

// Registra um evento de pontos. Retorna { success: true } ou
// { success: false } se a ação já tinha sido feita antes.
export async function addPointEvent({ eventType, referenceId, points, metadata = null }) {
  const firebaseUser = auth.currentUser;
  if (firebaseUser) {
    return await addUserPointEvent(firebaseUser.uid, { eventType, referenceId, points, metadata });
  }

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Usuário não autenticado');

  const { error } = await supabase.from('point_events').insert({
    user_id: user.id,
    event_type: eventType,
    reference_id: referenceId,
    points,
    metadata,
  });

  if (error) {
    if (error.code === UNIQUE_VIOLATION) {
      return { success: false };
    }
    throw error;
  }

  return { success: true };
}

export async function getRanking() {
  try {
    const list = await getLeaderboardUsers(50);
    if (list && list.length > 0) {
      return list;
    }
  } catch (e) {
    console.warn('[gameplay] Erro ao buscar ranking no Firestore:', e);
  }

  try {
    const { data, error } = await supabase
      .from('ranking')
      .select('*');

    if (error) return [];
    return data || [];
  } catch (err) {
    return [];
  }
}
