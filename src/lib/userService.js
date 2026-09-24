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
  serverTimestamp,
  onSnapshot
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
    pontuacaoTotal: 0,
    ticketId: data.ticketId || null,
    symplaTicket: data.symplaTicket || null,
    termsAcceptedAt: now,
    createdAt: now,
    updatedAt: now
  };

  // Se estiver em ambiente de browser com fetch disponível e usuário autenticado,
  // chama o endpoint do backend com Admin SDK para respeitar LGPD (KAN-72).
  if (typeof window !== 'undefined' && window.fetch && auth.currentUser?.getIdToken) {
    try {
      const token = await auth.currentUser.getIdToken();
      if (token) {
        const res = await fetch('/api/auth/register', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({
            termsAccepted: true,
            firstName: profileData.firstName,
            lastName: profileData.lastName,
            username: profileData.username,
            phone: profileData.phone,
            participantType: profileData.participantType,
            course: profileData.course,
            period: profileData.period ? String(profileData.period) : null,
            linkedin: profileData.linkedin,
            instagram: profileData.instagram,
            photoURL: profileData.avatarUrl
          })
        });

        if (res.ok || res.status === 409) {
          return profileData;
        }
      }
    } catch (err) {
      console.warn('[userService] Aviso: chamada ao backend falhou, tentando fallback direto:', err);
    }
  }

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

  try {
    await updateDoc(userRef, dataToUpdate);
  } catch (err) {
    if (err?.code === 'not-found' || err?.message?.includes('No document to update')) {
      await setDoc(userRef, dataToUpdate, { merge: true });
    } else {
      throw err;
    }
  }
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

function mapUserToLeaderboard(d, index) {
  const data = typeof d.data === 'function' ? d.data() : d;
  const points = Number(data.pontuacaoTotal ?? data.totalPoints ?? 0);
  return {
    id: d.id || data.id || data.uid,
    rank: index + 1,
    username: data.username || data.firstName || 'user',
    first_name: data.firstName || 'Participante',
    last_name: data.lastName || '',
    avatar_url: data.avatarUrl || data.photoURL || null,
    points,
    mascot: data.mascot || 'blue',
    course: data.course || '',
    createdAt: data.createdAt || null
  };
}

function sortLeaderboardWithTiebreak(list) {
  // Critério de tie-break (REG-RANK-001): se houver empate em pontos,
  // desempata por data de criação mais antiga ou ordem alfabética de username.
  list.sort((a, b) => {
    if (b.points !== a.points) return b.points - a.points;
    const timeA = a.createdAt?.toMillis ? a.createdAt.toMillis() : (a.createdAt?.seconds ? a.createdAt.seconds * 1000 : 0);
    const timeB = b.createdAt?.toMillis ? b.createdAt.toMillis() : (b.createdAt?.seconds ? b.createdAt.seconds * 1000 : 0);
    if (timeA && timeB && timeA !== timeB) return timeA - timeB;
    return (a.username || '').localeCompare(b.username || '');
  });
  return list.map((item, idx) => ({ ...item, rank: idx + 1 }));
}

/**
 * Obtém os líderes do ranking de pontuação filtrando apenas participantes
 * e ordenando por pontuacaoTotal desc com limite configurável (padrão 50).
 */
export async function getLeaderboardUsers(maxLimit = 50) {
  try {
    const usersRef = collection(db, 'users');
    let snap;
    try {
      const q = query(
        usersRef,
        where('role', '==', 'PARTICIPANT'),
        orderBy('pontuacaoTotal', 'desc'),
        limit(maxLimit)
      );
      snap = await getDocs(q);
    } catch (primaryErr) {
      console.warn('Query com pontuacaoTotal falhou, tentando fallback com totalPoints:', primaryErr);
      const fallbackQuery = query(
        usersRef,
        where('role', '==', 'PARTICIPANT'),
        orderBy('totalPoints', 'desc'),
        limit(maxLimit)
      );
      snap = await getDocs(fallbackQuery);
    }

    const list = snap.docs.map((d, index) => mapUserToLeaderboard(d, index));
    return sortLeaderboardWithTiebreak(list);
  } catch (err) {
    console.warn('Erro ao carregar ranking:', err);
    return [];
  }
}

/**
 * Escuta atualizações do ranking em tempo real via onSnapshot do Firestore (KAN-55).
 */
export function subscribeToLeaderboardUsers(callback, onError, maxLimit = 50) {
  const usersRef = collection(db, 'users');
  const q = query(
    usersRef,
    where('role', '==', 'PARTICIPANT'),
    orderBy('pontuacaoTotal', 'desc'),
    limit(maxLimit)
  );

  return onSnapshot(
    q,
    (snap) => {
      const list = snap.docs.map((d, index) => mapUserToLeaderboard(d, index));
      callback(sortLeaderboardWithTiebreak(list));
    },
    (err) => {
      console.warn('Erro no listener em tempo real do ranking (pontuacaoTotal), tentando fallback com totalPoints:', err);
      const fallbackQuery = query(
        usersRef,
        where('role', '==', 'PARTICIPANT'),
        orderBy('totalPoints', 'desc'),
        limit(maxLimit)
      );
      return onSnapshot(
        fallbackQuery,
        (fallbackSnap) => {
          const list = fallbackSnap.docs.map((d, index) => mapUserToLeaderboard(d, index));
          callback(sortLeaderboardWithTiebreak(list));
        },
        (finalErr) => {
          if (onError) onError(finalErr);
        }
      );
    }
  );
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


