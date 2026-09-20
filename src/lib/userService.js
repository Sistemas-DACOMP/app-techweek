import { 
  doc, 
  getDoc, 
  setDoc, 
  updateDoc, 
  collection, 
  getDocs, 
  query, 
  where, 
  orderBy, 
  limit, 
  increment, 
  serverTimestamp 
} from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { updateProfile, updateEmail } from 'firebase/auth';
import { db, storage, auth } from './firebase';
import { validateAvatarFile } from './validators';

function fileToDataUrl(file) {
  return new Promise((resolve) => {
    if (typeof FileReader === 'undefined' || !file) {
      resolve(null);
      return;
    }
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => resolve(null);
    reader.readAsDataURL(file);
  });
}

/**
 * Cria ou inicializa o perfil do usuário na coleção /users/{uid} do Firestore.
 */
export async function createUserProfile(uid, data) {
  if (!uid) throw new Error('UID do usuário é obrigatório para criar perfil.');

  const userRef = doc(db, 'users', uid);
  const now = serverTimestamp();

  const profileData = {
    uid,
    email: data.email ? data.email.trim().toLowerCase() : '',
    firstName: data.firstName || '',
    lastName: data.lastName || '',
    username: data.username ? data.username.trim().toLowerCase() : '',
    phone: data.phone || '',
    participantType: data.participantType || 'Aluno da UFU',
    course: data.course || '',
    period: data.period ? Number(data.period) : null,
    linkedin: data.linkedin || '',
    instagram: data.instagram || '',
    avatarUrl: data.avatarUrl || null,
    role: data.role || 'PARTICIPANT',
    totalPoints: 0,
    ticketId: data.ticketId || null,
    symplaTicket: data.symplaTicket || null,
    termsAcceptedAt: now,
    createdAt: now,
    updatedAt: now
  };

  await setDoc(userRef, profileData, { merge: true });
  return profileData;
}

/**
 * Busca o documento de perfil do usuário no Firestore.
 */
export async function getUserProfile(uid) {
  if (!uid) return null;
  const userRef = doc(db, 'users', uid);
  const snap = await getDoc(userRef);

  if (!snap.exists()) {
    return null;
  }

  return snap.data();
}

/**
 * Atualiza campos parciais do documento de perfil do usuário.
 */
export async function updateUserProfile(uid, updates) {
  if (!uid) throw new Error('UID é obrigatório.');
  const userRef = doc(db, 'users', uid);
  const dataToUpdate = {
    ...updates,
    updatedAt: serverTimestamp()
  };

  await updateDoc(userRef, dataToUpdate);
  return true;
}

/**
 * Atualiza o e-mail do usuário no Firestore e no Firebase Auth.
 */
export async function updateUserEmail(uid, newEmail) {
  if (!uid || !newEmail) throw new Error('UID e novo e-mail são obrigatórios.');
  const trimmedEmail = newEmail.trim().toLowerCase();

  // 1. Atualiza no Firestore
  await updateUserProfile(uid, { email: trimmedEmail });

  // 2. Tenta atualizar no Firebase Auth (se a sessão for recente)
  try {
    if (auth.currentUser && auth.currentUser.uid === uid) {
      await updateEmail(auth.currentUser, trimmedEmail);
    }
  } catch (authErr) {
    console.warn('Aviso: E-mail atualizado no Firestore, mas não no Auth:', authErr);
  }

  return true;
}

/**
 * Faz upload da foto de perfil no Firebase Storage com fallback resiliente para Data URL.
 */
export async function uploadUserAvatar(uid, file) {
  if (!uid) throw new Error('Usuário não autenticado.');
  if (!file) throw new Error('Nenhum arquivo fornecido.');

  const validation = validateAvatarFile(file);
  if (!validation.valid) {
    if (validation.reason === 'too_large') {
      throw new Error('A imagem precisa ter até 2MB.');
    }
    throw new Error('Formato de imagem inválido. Envie um arquivo PNG, JPEG ou WebP.');
  }

  const ext = (file && typeof file.name === 'string') 
    ? (file.name.split('.').pop() || 'jpg') 
    : (file?.type ? file.type.split('/').pop() : 'jpg');
  const path = `avatars/${uid}/${Date.now()}.${ext}`;
  const storageRef = ref(storage, path);

  let finalUrl = null;

  try {
    const uploadTask = (async () => {
      await uploadBytes(storageRef, file, { contentType: file.type || 'image/jpeg' });
      return await getDownloadURL(storageRef);
    })();

    const timeoutTask = new Promise((_, reject) => {
      setTimeout(() => reject(new Error('Tempo limite excedido ao salvar foto no Storage.')), 4000);
    });

    finalUrl = await Promise.race([uploadTask, timeoutTask]);
  } catch (storageErr) {
    console.warn('Storage indisponível ou lento. Aplicando fallback base64:', storageErr);
    finalUrl = await fileToDataUrl(file);
  }

  if (!finalUrl) {
    throw new Error('Não foi possível processar a imagem do perfil.');
  }

  // 1. Atualiza no Firestore
  await updateUserProfile(uid, { avatarUrl: finalUrl });

  // 2. Sincroniza no Firebase Auth se for o usuário logado
  if (auth.currentUser && auth.currentUser.uid === uid) {
    try {
      await updateProfile(auth.currentUser, { photoURL: finalUrl });
    } catch (authErr) {
      console.warn('Aviso: Falha ao atualizar photoURL no Auth:', authErr);
    }
  }

  return finalUrl;
}

/**
 * Obtém a lista de eventos de pontos do usuário no Firestore.
 */
export async function getUserPointEvents(uid) {
  if (!uid) return [];
  try {
    const eventsRef = collection(db, 'users', uid, 'point_events');
    const snap = await getDocs(eventsRef);
    return snap.docs.map(d => ({ id: d.id, ...d.data() }));
  } catch (err) {
    console.warn('Erro ao buscar point_events:', err);
    return [];
  }
}

/**
 * Adiciona um evento de pontos para o usuário e incrementa totalPoints.
 * Usa um ID de documento determinístico para evitar pontuação duplicada.
 */
export async function addUserPointEvent(uid, { eventType, referenceId, points, metadata = null }) {
  if (!uid) throw new Error('UID é obrigatório para registrar pontos.');
  
  const safeRefId = String(referenceId).replace(/[^a-zA-Z0-9_-]/g, '_');
  const eventDocId = `${eventType}_${safeRefId}`;
  const eventRef = doc(db, 'users', uid, 'point_events', eventDocId);
  const userRef = doc(db, 'users', uid);

  // Verifica se o evento já foi resgatado
  const existingDoc = await getDoc(eventRef);
  if (existingDoc.exists()) {
    return { success: false, alreadyClaimed: true };
  }

  const now = serverTimestamp();
  await setDoc(eventRef, {
    eventType,
    referenceId,
    points: Number(points) || 0,
    metadata,
    createdAt: now
  });

  // Incrementa os pontos no perfil do usuário
  await updateDoc(userRef, {
    totalPoints: increment(Number(points) || 0),
    updatedAt: now
  });

  return { success: true };
}

/**
 * Obtém os líderes do ranking de pontuação.
 */
export async function getLeaderboardUsers(maxLimit = 50) {
  try {
    const usersRef = collection(db, 'users');
    const q = query(usersRef, orderBy('totalPoints', 'desc'), limit(maxLimit));
    const snap = await getDocs(q);

    return snap.docs.map((d, index) => {
      const data = d.data();
      return {
        id: d.id,
        rank: index + 1,
        username: data.username || 'user',
        first_name: data.firstName || 'Participante',
        last_name: data.lastName || '',
        avatar_url: data.avatarUrl || null,
        points: data.totalPoints || 0,
        mascot: data.mascot || 'blue',
        course: data.course || ''
      };
    });
  } catch (err) {
    console.warn('Erro ao carregar ranking:', err);
    return [];
  }
}

/**
 * Busca usuário por username.
 */
export async function findUserByUsername(username) {
  if (!username) return null;
  const cleanUsername = username.trim().toLowerCase();
  const usersRef = collection(db, 'users');
  const q = query(usersRef, where('username', '==', cleanUsername), limit(1));
  const snap = await getDocs(q);
  if (snap.empty) return null;
  return { id: snap.docs[0].id, ...snap.docs[0].data() };
}


