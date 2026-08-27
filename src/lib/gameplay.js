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
