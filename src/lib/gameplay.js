import { supabase } from './supabaseClient';
import { auth, db, storage } from './firebase';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';

const UNIQUE_VIOLATION = '23505';

export async function getMyProfile() {
  if (auth?.currentUser) {
    const user = auth.currentUser;
    try {
      const snap = await getDoc(doc(db, 'users', user.uid));
      if (snap.exists()) {
        return { id: user.uid, ...snap.data() };
      }
    } catch (_e) {}

    return {
      id: user.uid,
      email: user.email,
      first_name: user.displayName?.split(' ')[0] || 'Participante',
      last_name: user.displayName?.split(' ').slice(1).join(' ') || '',
      avatar_url: user.photoURL || '',
    };
  }

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
  } catch (_e) {
    return null;
  }
}

export async function uploadAvatar(file) {
  if (auth?.currentUser) {
    const user = auth.currentUser;
    const ext = file.name ? file.name.split('.').pop() : 'png';

    if (storage) {
      try {
        const avatarRef = ref(storage, `avatars/${user.uid}/${Date.now()}.${ext}`);
        await uploadBytes(avatarRef, file, { contentType: file.type });
        const publicUrl = await getDownloadURL(avatarRef);

        try {
          await updateDoc(doc(db, 'users', user.uid), { avatar_url: publicUrl });
        } catch (_e) {}

        return publicUrl;
      } catch (storageErr) {
        console.warn('Firebase Storage offline, gerando URL local:', storageErr);
      }
    }

    return URL.createObjectURL(file);
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
  // 1. Suporte a Firebase Auth / Storage (Emuladores ou Nuvem)
  if (auth?.currentUser) {
    const user = auth.currentUser;
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

    // Se o emulador de Storage (9199) estiver offline, gera ObjectURL para permitir teste local sem travamento
    return URL.createObjectURL(file);
  }

  // 2. Suporte a Supabase (legado / fallback)
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Usuário não autenticado');

  const ext = file.name ? file.name.split('.').pop() : 'png';
  const path = `${user.id}/${missionId || 'mission'}_${Date.now()}.${ext}`;

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
  if (auth?.currentUser) {
    try {
      await updateDoc(doc(db, 'users', auth.currentUser.uid), { mascot });
    } catch (_e) {}
    return;
  }

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Usuário não autenticado');

  const { error } = await supabase
    .from('profiles')
    .update({ mascot })
    .eq('id', user.id);

  if (error) throw error;
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
  if (auth?.currentUser) {
    const user = auth.currentUser;
    const localEvents = getLocalPointEvents(user.uid);
    let firestoreEvents = [];

    try {
      const { collection, getDocs, query, where } = await import('firebase/firestore');
      const q = query(collection(db, 'pointEvents'), where('userId', '==', user.uid));
      const snapshot = await getDocs(q);
      firestoreEvents = snapshot.docs.map(d => ({
        id: d.id,
        event_type: d.data().eventType || d.data().event_type,
        reference_id: d.data().referenceId || d.data().reference_id,
        points: d.data().points || 0,
        metadata: d.data().metadata || null,
        ...d.data(),
      }));
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

  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return [];

    const { data, error } = await supabase
      .from('point_events')
      .select('*')
      .eq('user_id', user.id);

    if (error) return [];
    return data || [];
  } catch (_e) {
    return [];
  }
}

// Registra um evento de pontos. Retorna { success: true } ou
// { success: false } se a ação já tinha sido feita antes (dedup no banco).
export async function addPointEvent({ eventType, referenceId, points, metadata = null }) {
  if (auth?.currentUser) {
    const user = auth.currentUser;
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
    saveLocalPointEvent(user.uid, localEvent);

    try {
      const { collection, addDoc, getDocs, query, where, serverTimestamp } = await import('firebase/firestore');
      const q = query(
        collection(db, 'pointEvents'),
        where('userId', '==', user.uid),
        where('eventType', '==', eventType),
        where('referenceId', '==', referenceId)
      );
      const existing = await getDocs(q);
      if (!existing.empty) {
        return { success: false };
      }

      await addDoc(collection(db, 'pointEvents'), {
        userId: user.uid,
        user_id: user.uid,
        eventType,
        event_type: eventType,
        referenceId,
        reference_id: referenceId,
        points,
        metadata,
        createdAt: serverTimestamp(),
      });
      return { success: true };
    } catch (_err) {
      return { success: true };
    }
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
  if (auth?.currentUser) {
    try {
      const { collection, getDocs, query } = await import('firebase/firestore');
      const q = query(collection(db, 'ranking'));
      const snap = await getDocs(q);
      return snap.docs.map(d => ({ id: d.id, ...d.data() }));
    } catch (_e) {
      return [];
    }
  }

  try {
    const { data, error } = await supabase
      .from('ranking')
      .select('*');

    if (error) return [];
    return data;
  } catch (_e) {
    return [];
  }
}
