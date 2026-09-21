import { supabase } from './supabaseClient';

const UNIQUE_VIOLATION = '23505';

export async function getMyProfile() {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single();

  if (error) throw error;
  return data;
}

export async function uploadAvatar(file) {
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

export async function uploadMissionPhoto(file, missionId) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Usuário não autenticado');

  const ext = file.name ? file.name.split('.').pop() : 'png';
  const path = `${user.id}/${missionId || 'mission'}_${Date.now()}.${ext}`;

  // Envia para o bucket 'missions' ou fallback para 'avatars' caso o bucket 'missions' não esteja criado
  let publicUrl = '';
  const { error: uploadError } = await supabase.storage
    .from('missions')
    .upload(path, file, { contentType: file.type });

  if (uploadError) {
    const { error: fallbackError } = await supabase.storage
      .from('avatars')
      .upload(`missions/${path}`, file, { contentType: file.type });

    if (fallbackError) {
      throw uploadError;
    }
    const { data } = supabase.storage.from('avatars').getPublicUrl(`missions/${path}`);
    publicUrl = data.publicUrl;
  } else {
    const { data } = supabase.storage.from('missions').getPublicUrl(path);
    publicUrl = data.publicUrl;
  }

  return publicUrl;
}

export async function updateMascot(mascot) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Usuário não autenticado');

  const { error } = await supabase
    .from('profiles')
    .update({ mascot })
    .eq('id', user.id);

  if (error) throw error;
}

export async function getMyPointEvents() {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return [];

  const { data, error } = await supabase
    .from('point_events')
    .select('*')
    .eq('user_id', user.id);

  if (error) throw error;
  return data;
}

// Registra um evento de pontos. Retorna { success: true } ou
// { success: false } se a ação já tinha sido feita antes (dedup no banco).
export async function addPointEvent({ eventType, referenceId, points, metadata = null }) {
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
  const { data, error } = await supabase
    .from('ranking')
    .select('*');

  if (error) throw error;
  return data;
}
