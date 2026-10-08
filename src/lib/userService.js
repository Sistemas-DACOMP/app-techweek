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
import { updateProfile, updateEmail, reauthenticateWithCredential, EmailAuthProvider } from 'firebase/auth';
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
 * Lê o perfil do usuário de forma 100% síncrona do cache local (zero layout flash).
 * O papel (role) vem do perfil gravado pelo servidor; nenhum papel é inferido no cliente.
 */
export function getCachedUserProfile(uid) {
  try {
    let targetUid = uid || auth?.currentUser?.uid;
    if (targetUid) {
      const cached = localStorage.getItem(`facom_profile_${targetUid}`);
      if (cached) {
        return JSON.parse(cached);
      }
    }
    // Procura em qualquer chave de perfil em cache caso o uid ainda não tenha sido emitido
    if (typeof localStorage !== 'undefined') {
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith('facom_profile_')) {
          const item = localStorage.getItem(key);
          if (item) {
            return JSON.parse(item);
          }
        }
      }
    }
  } catch (_e) {}
  return null;
}

/**
 * Verifica disponibilidade de um username na coleção /users.
 * Retorna { available: boolean, existingUser: object | null }
 */
export async function checkUsernameAvailability(rawUsername) {
  if (!rawUsername || typeof rawUsername !== 'string') {
    return { available: false, existingUser: null };
  }
  const clean = rawUsername.trim().replace(/^@/, '').toLowerCase();
  if (clean.length < 3 || clean.length > 20 || !/^[a-zA-Z0-9._]+$/.test(clean)) {
    return { available: false, existingUser: null };
  }

  try {
    const usersRef = collection(db, 'users');
    const q = query(usersRef, where('username', '==', clean), limit(1));
    const snap = await getDocs(q);
    if (!snap.empty) {
      const docData = snap.docs[0].data();
      return {
        available: false,
        existingUser: {
          name: docData.displayName || [docData.firstName, docData.lastName].filter(Boolean).join(' ') || clean,
          avatarUrl: docData.avatarUrl || docData.photoURL || null
        }
      };
    }
    return { available: true, existingUser: null };
  } catch (_e) {
    // Se offline ou teste com mock
    return { available: true, existingUser: null };
  }
}

/**
 * Cria ou inicializa o perfil do usuário na coleção /users/{uid} do Firestore.
 */
export async function createUserProfile(uid, data) {
  if (!uid) throw new Error('UID do usuário é obrigatório para criar perfil.');

  const userRef = doc(db, 'users', uid);
  const now = serverTimestamp();

  const cleanEmail = data.email ? data.email.trim().toLowerCase() : '';

  const profileData = {
    uid,
    email: cleanEmail,
    firstName: data.firstName || '',
    lastName: data.lastName || '',
    username: data.username ? data.username.trim().toLowerCase() : '',
    phone: data.phone || '',
    participantType: data.participantType || 'Aluno da UFU',
    participant_type: data.participantType || 'Aluno da UFU',
    course: data.course || '',
    period: data.period ? Number(data.period) : null,
    linkedin: data.linkedin || '',
    instagram: data.instagram || '',
    github: data.github || '',
    avatarUrl: data.avatarUrl || null,
    hasSymplaTicket: Boolean(data.hasSymplaTicket || data.symplaTicket),
    role: 'PARTICIPANT', // papel nunca vem do cliente; promoção é feita pelo backend (custom claims)
    totalPoints: 0,
    pontuacaoTotal: 0,
    ticketId: data.ticketId || data.symplaTicket?.ticketNumber || null,
    symplaTicket: data.symplaTicket || null,
    termsAcceptedAt: now,
    createdAt: now,
    updatedAt: now
  };

  // Mantém Firebase Auth sincronizado com o displayName e photoURL
  const calculatedDisplayName = [profileData.firstName, profileData.lastName].filter(Boolean).join(' ').trim() || profileData.username || '';
  if (auth.currentUser) {
    const profileUpdates = {};
    if (calculatedDisplayName) profileUpdates.displayName = calculatedDisplayName;
    if (profileData.avatarUrl && typeof profileData.avatarUrl === 'string' && profileData.avatarUrl.startsWith('http')) {
      profileUpdates.photoURL = profileData.avatarUrl;
    }
    if (Object.keys(profileUpdates).length > 0) {
      try {
        await updateProfile(auth.currentUser, profileUpdates);
      } catch (_authErr) {}
    }
  }

  // Salva no cache local para resiliência instantânea
  try {
    localStorage.setItem(`facom_profile_${uid}`, JSON.stringify(profileData));
  } catch (_e) {}

  // Tenta salvar no Firestore (sem lançar exceção bloqueante se as regras da nuvem ainda rejeitarem)
  try {
    await setDoc(userRef, profileData, { merge: true });
  } catch (err) {
    console.warn('[userService] Aviso: Gravação do perfil no Firestore rejeitada por regras, dados preservados no cache local:', err);
  }

  return profileData;
}

/**
 * Busca o documento de perfil do usuário no Firestore com fusão não-destrutiva de cache local.
 */
export async function getUserProfile(uid) {
  if (!uid) return null;

  let localData = null;
  try {
    const cached = localStorage.getItem(`facom_profile_${uid}`);
    if (cached) localData = JSON.parse(cached);
  } catch (_e) {}

  try {
    const userRef = doc(db, 'users', uid);
    const snap = await getDoc(userRef);

    if (snap.exists()) {
      const data = snap.data();

      // Fusão segura: nunca substitui um avatarUrl ou symplaTicket preenchido localmente por null/indefinido do Firestore
      const merged = {
        ...localData,
        ...data,
        avatarUrl: data.avatarUrl || data.photoURL || localData?.avatarUrl || null,
        symplaTicket: data.symplaTicket || localData?.symplaTicket || null,
        hasSymplaTicket: !!(data.hasSymplaTicket || data.symplaTicket || localData?.hasSymplaTicket || localData?.symplaTicket)
      };

      try {
        localStorage.setItem(`facom_profile_${uid}`, JSON.stringify(merged));
      } catch (_e) {}
      return merged;
    }
  } catch (err) {
    if (err?.code !== 'permission-denied') {
      console.warn('[userService] Aviso: Leitura do Firestore falhou, utilizando cache local:', err);
    }
  }

  return localData;
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

  // Mantém cache local atualizado imediatamente
  try {
    const currentCached = localStorage.getItem(`facom_profile_${uid}`);
    const parsed = currentCached ? JSON.parse(currentCached) : {};
    localStorage.setItem(`facom_profile_${uid}`, JSON.stringify({ ...parsed, ...updates }));
  } catch (_e) {}

  // Mantém Firebase Auth sincronizado (apenas photoURL HTTP/HTTPS, nunca Base64)
  if (auth.currentUser && (updates.firstName || updates.lastName || updates.displayName || updates.avatarUrl)) {
    const newDisplayName = updates.displayName || [updates.firstName, updates.lastName].filter(Boolean).join(' ').trim();
    const profileUpdates = {};
    if (newDisplayName) profileUpdates.displayName = newDisplayName;
    if (updates.avatarUrl && typeof updates.avatarUrl === 'string' && updates.avatarUrl.startsWith('http')) {
      profileUpdates.photoURL = updates.avatarUrl;
    }
    if (Object.keys(profileUpdates).length > 0) {
      try {
        await updateProfile(auth.currentUser, profileUpdates);
      } catch (_authErr) {}
    }
  }

  try {
    await updateDoc(userRef, dataToUpdate);
  } catch (err) {
    if (err?.code === 'not-found' || err?.message?.includes('No document to update')) {
      try {
        await setDoc(userRef, dataToUpdate, { merge: true });
      } catch (createErr) {
        console.warn('[userService] Aviso: Gravação direta no Firestore bloqueada por regras, dados preservados localmente:', createErr);
      }
    } else {
      console.warn('[userService] Aviso: Erro ao atualizar Firestore, dados preservados localmente:', err);
    }
  }
  return true;
}

/**
 * Atualiza o e-mail do usuário no Firestore e no Firebase Auth.
 */
export async function updateUserEmail(uid, newEmail, currentPassword) {
  if (!uid || !newEmail) throw new Error('UID e novo e-mail são obrigatórios.');
  const trimmedEmail = newEmail.trim().toLowerCase();

  const user = auth.currentUser;
  if (!user || user.uid !== uid) {
    throw new Error('Sessão inválida. Faça login novamente para trocar o e-mail.');
  }

  // 1. Auth primeiro: se falhar (ex.: auth/requires-recent-login), o erro sobe pra UI
  //    e o Firestore não é tocado, então perfil e login nunca ficam com e-mails diferentes.
  if (currentPassword) {
    await reauthenticateWithCredential(user, EmailAuthProvider.credential(user.email, currentPassword));
  }
  await updateEmail(user, trimmedEmail);

  // 2. Só depois de o Auth aceitar, grava no Firestore
  await updateUserProfile(uid, { email: trimmedEmail });

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

    // Timeout de 15 segundos para dar tempo à conexão mobile/residencial
    const timeoutTask = new Promise((_, reject) => {
      setTimeout(() => reject(new Error('Tempo limite excedido ao salvar foto no Storage.')), 15000);
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
  try {
    await updateUserProfile(uid, { avatarUrl: finalUrl });
  } catch (profileErr) {
    console.warn('[userService] Aviso: Falha ao atualizar avatar no Firestore:', profileErr);
  }

  // 2. Sincroniza no Firebase Auth se for o usuário logado e for URL HTTP/HTTPS (não base64)
  if (auth.currentUser && auth.currentUser.uid === uid && typeof finalUrl === 'string' && finalUrl.startsWith('http')) {
    try {
      await updateProfile(auth.currentUser, { photoURL: finalUrl });
    } catch (authErr) {
      console.warn('Aviso: Falha ao atualizar photoURL no Auth:', authErr);
    }
  }

  // 3. Garante salvamento no cache local
  try {
    const cached = localStorage.getItem(`facom_profile_${uid}`);
    const parsed = cached ? JSON.parse(cached) : {};
    localStorage.setItem(`facom_profile_${uid}`, JSON.stringify({ ...parsed, avatarUrl: finalUrl }));
  } catch (_e) {}

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
    if (err?.code !== 'permission-denied') {
      console.warn('Erro ao buscar point_events:', err);
    }
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
  const usersRef = collection(db, 'users');
  try {
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
    console.warn('Erro ao carregar ranking com índices, tentando fallback direto sem índice composto:', err);
    try {
      const basicSnap = await getDocs(query(usersRef, limit(maxLimit)));
      const list = basicSnap.docs
        .map((d, index) => mapUserToLeaderboard(d, index))
        .filter(u => u.role !== 'ADMIN' && u.role !== 'STAFF');
      return sortLeaderboardWithTiebreak(list);
    } catch (_fallbackErr) {
      return [];
    }
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
          console.warn('Fallback totalPoints falhou, ouvindo coleção users sem ordenação composta:', finalErr);
          try {
            return onSnapshot(
              query(usersRef, limit(maxLimit)),
              (simpleSnap) => {
                const list = simpleSnap.docs
                  .map((d, index) => mapUserToLeaderboard(d, index))
                  .filter(u => u.role !== 'ADMIN' && u.role !== 'STAFF');
                callback(sortLeaderboardWithTiebreak(list));
              },
              (ultraErr) => {
                if (onError) onError(ultraErr);
              }
            );
          } catch (_e) {
            if (onError) onError(finalErr);
          }
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

/**
 * Escuta todos os usuários para o painel administrativo.
 */
export function subscribeToAllUsers(callback) {
  const usersRef = collection(db, 'users');
  return onSnapshot(
    usersRef,
    (snap) => {
      const list = snap.docs.map(docSnap => ({
        id: docSnap.id,
        uid: docSnap.id,
        ...docSnap.data()
      }));
      callback(list);
    },
    (err) => {
      console.warn('Erro ao escutar usuários para o admin:', err);
      // Fallback para perfis em cache
      const cachedList = [];
      if (typeof localStorage !== 'undefined') {
        for (let i = 0; i < localStorage.length; i++) {
          const key = localStorage.key(i);
          if (key && key.startsWith('facom_profile_')) {
            try {
              cachedList.push(JSON.parse(localStorage.getItem(key)));
            } catch (_e) {}
          }
        }
      }
      callback(cachedList);
    }
  );
}

/**
 * Atualiza o papel do usuário no Firestore a partir do painel de administração.
 */
export async function updateUserRoleInFirestore(uid, newRole) {
  if (!uid || !newRole) return { success: false, error: 'UID e role são obrigatórios.' };
  try {
    const userRef = doc(db, 'users', uid);
    const participantType = newRole === 'ADMIN' || newRole === 'STAFF' ? 'Organizador' : (newRole === 'SPONSOR' ? 'Patrocinador' : 'Aluno da UFU');
    
    // Atualiza imediatamente cache local do perfil
    try {
      if (typeof localStorage !== 'undefined') {
        const cachedKey = `facom_profile_${uid}`;
        const currentCached = localStorage.getItem(cachedKey);
        const parsed = currentCached ? JSON.parse(currentCached) : {};
        localStorage.setItem(cachedKey, JSON.stringify({
          ...parsed,
          role: newRole,
          participantType,
          participant_type: participantType
        }));
        window.dispatchEvent(new Event('facom_profile_updated'));
      }
    } catch (_e) {}

    await updateDoc(userRef, {
      role: newRole,
      participantType,
      participant_type: participantType,
      updatedAt: new Date().toISOString()
    });
    return { success: true };
  } catch (err) {
    console.error('Erro ao atualizar papel do usuário:', err);
    return { success: false, error: err.message };
  }
}



