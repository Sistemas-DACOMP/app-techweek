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
  onSnapshot,
  deleteField
} from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { updateProfile, updateEmail, verifyBeforeUpdateEmail, reauthenticateWithCredential, EmailAuthProvider } from 'firebase/auth';
import { db, storage, auth } from './firebase';
import { validateAvatarFile } from './validators';
import { apiRequest } from './api';
import { sendVerificationEmail, getActionCodeSettings } from './auth';
import { getCachedSymplaTicket, setCachedSymplaTicket } from './sympla';

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

export const ADMIN_EMAILS = ['sam03amorim@gmail.com'];

export function isAdminEmail(email) {
  if (!email || typeof email !== 'string') return false;
  return ADMIN_EMAILS.includes(email.trim().toLowerCase());
}

function hydrateProfileWithCachedTicket(profile, uidFallback = null) {
  if (!profile) return null;
  const targetUid = profile.uid || profile.id || uidFallback || auth?.currentUser?.uid || null;
  const targetEmail = profile.email || auth?.currentUser?.email || null;
  const cachedTicket = profile.symplaTicket || profile.sympla_ticket || getCachedSymplaTicket(targetEmail, targetUid);
  if (cachedTicket) {
    profile.symplaTicket = cachedTicket;
    profile.hasSymplaTicket = true;
    profile.ticketId = profile.ticketId || cachedTicket.ticketNumber || null;
  }
  if (isAdminEmail(profile?.email) || isAdminEmail(auth?.currentUser?.email)) {
    profile.role = 'ADMIN';
    profile.participantType = profile.participantType || 'Organizador';
    profile.participant_type = profile.participant_type || 'Organizador';
  }
  return profile;
}

/**
 * Lê o perfil do usuário de forma 100% síncrona do cache local (zero layout flash).
 * O papel (role) vem do perfil gravado pelo servidor; nenhum papel é inferido no cliente,
 * exceto para contas administrativas autorizadas.
 */
export function getCachedUserProfile(uid) {
  try {
    let targetUid = uid || auth?.currentUser?.uid;
    if (targetUid) {
      const cached = localStorage.getItem(`facom_profile_${targetUid}`);
      if (cached) {
        const parsed = JSON.parse(cached);
        return hydrateProfileWithCachedTicket(parsed, targetUid);
      }
    }
    // Procura em qualquer chave de perfil em cache caso o uid ainda não tenha sido emitido
    if (typeof localStorage !== 'undefined') {
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith('facom_profile_')) {
          const item = localStorage.getItem(key);
          if (item) {
            const parsed = JSON.parse(item);
            return hydrateProfileWithCachedTicket(parsed, targetUid);
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

function persistDirectoryProfile(uid, profileObj) {
  if (!profileObj || typeof localStorage === 'undefined') return;
  try {
    const targetUid = uid || profileObj.uid || profileObj.id;
    const serialized = JSON.stringify(profileObj);
    if (targetUid) {
      localStorage.setItem(`facom_user_dir_${targetUid}`, serialized);
    }
    const cleanEmail = (profileObj.email || '').trim().toLowerCase();
    if (cleanEmail) {
      localStorage.setItem(`facom_user_dir_email_${cleanEmail}`, serialized);
    }
  } catch (_e) {}
}

const USER_ALLOWED_CREATE_KEYS = new Set([
  'uid', 'email', 'firstName', 'lastName', 'displayName',
  'username', 'phone', 'participantType', 'participant_type',
  'course', 'period', 'institution', 'linkedin', 'instagram',
  'github', 'avatarUrl', 'photoURL', 'mascot', 'role',
  'totalPoints', 'pontuacaoTotal', 'termsAcceptedAt',
  'createdAt', 'updatedAt', 'pendingEmailChange'
]);

const VALID_PARTICIPANT_TYPES = new Set([
  'Aluno UFU Graduação', 'Aluno UFU Pós-graduação', 'Aluno de outra instituição',
  'Servidor / Professor', 'Professor / Servidor UFU', 'Comunidade Externa',
  'Outro', 'Aluno da UFU', 'Pós-graduação', 'Aluno UFU Pos graduação', 'Organizador'
]);

function sanitizeUsernameForRules(rawUsername) {
  if (!rawUsername || typeof rawUsername !== 'string') return '';
  const cleaned = rawUsername.trim().replace(/^@/, '').toLowerCase().replace(/[^a-z0-9._]/g, '');
  if (cleaned.length >= 3 && cleaned.length <= 30 && /^[a-zA-Z0-9._]+$/.test(cleaned)) {
    return cleaned;
  }
  return '';
}

function sanitizePeriodForRules(rawPeriod) {
  if (rawPeriod === null || rawPeriod === undefined || rawPeriod === '') return null;
  const num = Math.round(Number(rawPeriod));
  if (Number.isInteger(num) && num >= 1 && num <= 20) return num;
  return null;
}

function sanitizeParticipantTypeForRules(rawType) {
  if (typeof rawType === 'string' && VALID_PARTICIPANT_TYPES.has(rawType)) {
    return rawType;
  }
  return 'Aluno da UFU';
}

function sanitizeUserCreatePayload(rawPayload, uid) {
  const sanitized = {};
  for (const [key, val] of Object.entries(rawPayload || {})) {
    if (USER_ALLOWED_CREATE_KEYS.has(key) && val !== undefined) {
      sanitized[key] = val;
    }
  }
  sanitized.uid = uid;
  sanitized.role = 'PARTICIPANT';
  sanitized.totalPoints = 0;
  sanitized.pontuacaoTotal = 0;
  sanitized.username = sanitizeUsernameForRules(sanitized.username);
  sanitized.period = sanitizePeriodForRules(sanitized.period);
  sanitized.participantType = sanitizeParticipantTypeForRules(sanitized.participantType);
  sanitized.participant_type = sanitizeParticipantTypeForRules(sanitized.participant_type || sanitized.participantType);
  if (typeof sanitized.avatarUrl === 'string' && sanitized.avatarUrl.length > 500) {
    sanitized.avatarUrl = null;
  }
  if (typeof sanitized.photoURL === 'string' && sanitized.photoURL.length > 500) {
    sanitized.photoURL = null;
  }
  return sanitized;
}

/**
 * Cria ou inicializa o perfil do usuário na coleção /users/{uid} do Firestore.
 */
export async function createUserProfile(uid, data) {
  if (!uid) throw new Error('UID do usuário é obrigatório para criar perfil.');

  const userRef = doc(db, 'users', uid);
  const now = serverTimestamp();

  const cleanEmail = data.email ? data.email.trim().toLowerCase() : '';
  const isTargetAdmin = isAdminEmail(cleanEmail);
  const resolvedTicket = data.symplaTicket || getCachedSymplaTicket(cleanEmail, uid) || null;
  const firstName = data.firstName || '';
  const lastName = data.lastName || '';
  const cleanUsername = data.username ? data.username.trim().toLowerCase() : '';
  const calculatedDisplayName = data.displayName || [firstName, lastName].filter(Boolean).join(' ').trim() || cleanUsername || '';

  const profileData = {
    uid,
    email: cleanEmail,
    firstName,
    lastName,
    displayName: calculatedDisplayName,
    username: cleanUsername,
    phone: data.phone || '',
    participantType: isTargetAdmin ? 'Organizador' : (data.participantType || 'Aluno da UFU'),
    participant_type: isTargetAdmin ? 'Organizador' : (data.participantType || 'Aluno da UFU'),
    course: data.course || '',
    period: sanitizePeriodForRules(data.period),
    institution: data.institution || '',
    linkedin: data.linkedin || '',
    instagram: data.instagram || '',
    github: data.github || '',
    avatarUrl: data.avatarUrl || null,
    hasSymplaTicket: isTargetAdmin ? true : Boolean(data.hasSymplaTicket || resolvedTicket),
    role: isTargetAdmin ? 'ADMIN' : 'PARTICIPANT', // papel nunca vem do cliente; promoção é feita pelo backend (custom claims) exceto admins declarados
    totalPoints: 0,
    pontuacaoTotal: 0,
    ticketId: data.ticketId || resolvedTicket?.ticketNumber || null,
    symplaTicket: resolvedTicket,
    termsAcceptedAt: now,
    createdAt: now,
    updatedAt: now
  };

  if (resolvedTicket) {
    setCachedSymplaTicket(cleanEmail, uid, resolvedTicket, profileData);
  }

  // Mantém Firebase Auth sincronizado com o displayName e photoURL
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
    persistDirectoryProfile(uid, profileData);
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('facom_profile_updated', { detail: profileData }));
    }
  } catch (_e) {}

  // Tenta salvar no Firestore (sem lançar exceção bloqueante se as regras da nuvem ainda rejeitarem)
  try {
    // Campos de ingresso Sympla são do backend (firestore.rules os bloqueia no cliente, KAN-108):
    // ficam só no cache local, nunca no payload do Firestore.
    // Além disso, firestore.rules exige role == 'PARTICIPANT' no allow create e avatarUrl <= 500 chars.
    const firestoreData = sanitizeUserCreatePayload(profileData, uid);
    await setDoc(userRef, firestoreData, { merge: true });
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
    const cached = localStorage.getItem(`facom_profile_${uid}`) || localStorage.getItem(`facom_user_dir_${uid}`);
    if (cached) localData = JSON.parse(cached);
  } catch (_e) {}

  try {
    const userRef = doc(db, 'users', uid);
    const snap = await getDoc(userRef);

    if (snap.exists()) {
      const data = snap.data();
      const targetEmail = data.email || localData?.email || auth?.currentUser?.email || '';
      const resolvedTicket =
        data.symplaTicket ||
        localData?.symplaTicket ||
        getCachedSymplaTicket(targetEmail, uid) ||
        null;

      const remotePoints = Number(data.totalPoints ?? data.pontuacaoTotal ?? 0) || 0;
      const localPoints = Number(localData?.totalPoints ?? localData?.pontuacaoTotal ?? 0) || 0;
      const resolvedPoints = Math.max(remotePoints, localPoints);

      // Fusão segura: nunca substitui um avatarUrl, symplaTicket ou pontos acumulados localmente por zero/nulo
      const merged = {
        ...localData,
        ...data,
        uid: data.uid || localData?.uid || uid,
        email: data.email || localData?.email || (auth?.currentUser?.uid === uid ? auth?.currentUser?.email : '') || '',
        avatarUrl: data.avatarUrl || data.photoURL || localData?.avatarUrl || null,
        symplaTicket: resolvedTicket,
        ticketId: data.ticketId || resolvedTicket?.ticketNumber || localData?.ticketId || null,
        hasSymplaTicket: !!(data.hasSymplaTicket || resolvedTicket || localData?.hasSymplaTicket),
        totalPoints: resolvedPoints,
        pontuacaoTotal: resolvedPoints
      };

      if (resolvedTicket) {
        setCachedSymplaTicket(targetEmail, uid, resolvedTicket, merged);
      }

      if (isAdminEmail(merged.email) || isAdminEmail(auth?.currentUser?.email)) {
        merged.role = 'ADMIN';
        merged.participantType = merged.participantType || 'Organizador';
        merged.participant_type = merged.participant_type || 'Organizador';
      }

      const canSyncRanking = merged.role !== 'STAFF' && merged.role !== 'SPONSOR';
      if (resolvedPoints >= 0 && canSyncRanking && auth?.currentUser?.uid === uid) {
        syncUserRankingInFirestore(uid, resolvedPoints, merged).catch(() => {});
      }

      try {
        localStorage.setItem(`facom_profile_${uid}`, JSON.stringify(merged));
        persistDirectoryProfile(uid, merged);
      } catch (_e) {}
      return merged;
    }
  } catch (err) {
    if (err?.code !== 'permission-denied') {
      console.warn('[userService] Aviso: Leitura do Firestore falhou, utilizando cache local:', err);
    }
  }

  return hydrateProfileWithCachedTicket(localData, uid);
}

/**
 * Atualiza campos parciais do documento de perfil do usuário.
 */
export async function updateUserProfile(uid, updates) {
  if (!uid) throw new Error('UID é obrigatório.');
  const userRef = doc(db, 'users', uid);

  let merged = { ...(updates || {}), uid };
  // Mantém cache local atualizado imediatamente e persiste ingresso Sympla no cache dedicado
  try {
    const currentCached = localStorage.getItem(`facom_profile_${uid}`) || localStorage.getItem(`facom_user_dir_${uid}`);
    const parsed = currentCached ? JSON.parse(currentCached) : {};
    merged = { ...parsed, ...updates, uid: parsed.uid || uid };
    const resolvedTicket = updates?.symplaTicket || merged.symplaTicket;
    if (resolvedTicket) {
      setCachedSymplaTicket(merged.email || auth?.currentUser?.email, uid, resolvedTicket, merged);
      merged.ticketId = merged.ticketId || resolvedTicket.ticketNumber || null;
      merged.hasSymplaTicket = true;
    }
    localStorage.setItem(`facom_profile_${uid}`, JSON.stringify(merged));
    persistDirectoryProfile(uid, merged);
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('facom_profile_updated', { detail: merged }));
    }
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

  // Remove campos de ingresso que são protegidos pelas firestore.rules no cliente (KAN-108)
  // eslint-disable-next-line no-unused-vars
  const { hasSymplaTicket, symplaTicket, ticketId, ...firestoreUpdates } = updates || {};
  if (typeof firestoreUpdates.avatarUrl === 'string' && firestoreUpdates.avatarUrl.length > 500) {
    delete firestoreUpdates.avatarUrl;
  }
  if ('period' in firestoreUpdates) {
    firestoreUpdates.period = sanitizePeriodForRules(firestoreUpdates.period);
  }
  if (Object.keys(firestoreUpdates).length === 0) {
    return true;
  }

  const dataToUpdate = {
    ...firestoreUpdates,
    updatedAt: serverTimestamp()
  };

  try {
    await updateDoc(userRef, dataToUpdate);
  } catch (err) {
    if (err?.code === 'not-found' || err?.message?.includes('No document to update')) {
      try {
        const now = serverTimestamp();
        const fallbackEmail = (merged.email || auth?.currentUser?.email || '').trim().toLowerCase();
        const rawCreatePayload = {
          uid,
          email: fallbackEmail,
          firstName: merged.firstName || merged.first_name || '',
          lastName: merged.lastName || merged.last_name || '',
          displayName: merged.displayName || [merged.firstName || merged.first_name, merged.lastName || merged.last_name].filter(Boolean).join(' ').trim() || '',
          username: merged.username ? String(merged.username).trim().toLowerCase() : '',
          phone: merged.phone || '',
          participantType: merged.participantType || 'Aluno da UFU',
          participant_type: merged.participant_type || merged.participantType || 'Aluno da UFU',
          course: merged.course || '',
          period: merged.period,
          institution: merged.institution || '',
          linkedin: merged.linkedin || '',
          instagram: merged.instagram || '',
          github: merged.github || '',
          avatarUrl: typeof merged.avatarUrl === 'string' && merged.avatarUrl.length <= 500 ? merged.avatarUrl : null,
          role: 'PARTICIPANT',
          totalPoints: 0,
          pontuacaoTotal: 0,
          termsAcceptedAt: now,
          createdAt: now,
          updatedAt: now,
          ...firestoreUpdates
        };
        const createPayload = sanitizeUserCreatePayload(rawCreatePayload, uid);
        await setDoc(userRef, createPayload, { merge: true });
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
 * Inicia a troca de e-mail enviando e-mail de confirmação via verifyBeforeUpdateEmail
 * e grava pendingEmailChange no Firestore sem alterar o e-mail principal prematuramente (KAN-116).
 */
export async function updateUserEmail(uid, newEmail, currentPassword) {
  if (!uid || !newEmail) throw new Error('UID e novo e-mail são obrigatórios.');
  const trimmedEmail = newEmail.trim().toLowerCase();

  const user = auth.currentUser;
  if (!user || user.uid !== uid) {
    throw new Error('Sessão inválida. Faça login novamente para trocar o e-mail.');
  }

  // 1. Reautenticação opcional / necessária se currentPassword for fornecido
  if (currentPassword) {
    await reauthenticateWithCredential(user, EmailAuthProvider.credential(user.email, currentPassword));
  }

  // 2. Auth: dispara verifyBeforeUpdateEmail para o novo endereço com ActionCodeSettings
  const actionCodeSettings = getActionCodeSettings();
  if (actionCodeSettings) {
    await verifyBeforeUpdateEmail(user, trimmedEmail, actionCodeSettings);
  } else {
    await verifyBeforeUpdateEmail(user, trimmedEmail);
  }

  // 3. Registra a intenção de troca no Firestore com ciclo de vida (expiração em 24h)
  // O campo `email` principal NÃO é alterado agora: ele só muda após a confirmação no link e novo token JWT.
  const pendingEmailChange = {
    newEmail: trimmedEmail,
    requestedAt: Date.now(),
    expiresAt: Date.now() + 24 * 60 * 60 * 1000 // 24 horas
  };

  await updateUserProfile(uid, { pendingEmailChange });

  return { success: true, verificationEmailSent: true };
}

/**
 * Cancela uma solicitação de troca de e-mail pendente, removendo o campo pendingEmailChange (KAN-116).
 */
export async function cancelPendingEmailChange(uid) {
  if (!uid) throw new Error('UID é obrigatório.');
  const userRef = doc(db, 'users', uid);
  await updateDoc(userRef, {
    pendingEmailChange: deleteField(),
    updatedAt: serverTimestamp()
  });

  try {
    const cached = localStorage.getItem(`facom_profile_${uid}`);
    if (cached) {
      const parsed = JSON.parse(cached);
      delete parsed.pendingEmailChange;
      localStorage.setItem(`facom_profile_${uid}`, JSON.stringify(parsed));
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('facom_profile_updated', { detail: parsed }));
      }
    }
  } catch (_) {}

  return { success: true };
}

/**
 * Sincroniza o e-mail do perfil do Firestore com o Firebase Auth após confirmação do link pelo usuário (KAN-116).
 * Também higieniza solicitações pendentes expiradas.
 */
export async function syncUserEmailWithAuth(uid, userParam) {
  const user = userParam || auth.currentUser;
  if (!uid || !user || user.uid !== uid) {
    return { synced: false, reason: 'no_user' };
  }

  try {
    await user.reload();
    await user.getIdToken(true);

    const userRef = doc(db, 'users', uid);
    const snap = await getDoc(userRef);
    if (!snap.exists()) return { synced: false, reason: 'not_found' };

    const data = snap.data();
    const currentFirestoreEmail = (data.email || '').trim().toLowerCase();
    const currentAuthEmail = (user.email || '').trim().toLowerCase();
    const pending = data.pendingEmailChange;

    // Se o Firebase Auth já tiver o novo e-mail confirmado
    if (currentAuthEmail && (currentAuthEmail !== currentFirestoreEmail || (pending?.newEmail && currentAuthEmail === pending.newEmail.toLowerCase()))) {
      await updateDoc(userRef, {
        email: currentAuthEmail,
        pendingEmailChange: deleteField(),
        updatedAt: serverTimestamp()
      });

      try {
        const cached = localStorage.getItem(`facom_profile_${uid}`);
        if (cached) {
          const parsed = JSON.parse(cached);
          parsed.email = currentAuthEmail;
          delete parsed.pendingEmailChange;
          localStorage.setItem(`facom_profile_${uid}`, JSON.stringify(parsed));
          if (typeof window !== 'undefined') {
            window.dispatchEvent(new CustomEvent('facom_profile_updated', { detail: parsed }));
          }
        }
      } catch (_) {}

      return { synced: true, newEmail: currentAuthEmail };
    }

    // Se o pedido pendente expirou (mais de 24 horas)
    if (pending?.expiresAt && Date.now() > pending.expiresAt) {
      await updateDoc(userRef, {
        pendingEmailChange: deleteField(),
        updatedAt: serverTimestamp()
      });

      try {
        const cached = localStorage.getItem(`facom_profile_${uid}`);
        if (cached) {
          const parsed = JSON.parse(cached);
          delete parsed.pendingEmailChange;
          localStorage.setItem(`facom_profile_${uid}`, JSON.stringify(parsed));
          if (typeof window !== 'undefined') {
            window.dispatchEvent(new CustomEvent('facom_profile_updated', { detail: parsed }));
          }
        }
      } catch (_) {}

      return { synced: false, expired: true };
    }

    return { synced: false };
  } catch (err) {
    console.warn('[userService] Erro ao sincronizar e-mail com Auth:', err);
    return { synced: false, error: err };
  }
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

function cleanUsernameValue(val) {
  const s = String(val || '').trim().replace(/^@/, '');
  if (!s || s === 'user' || s === 'Participante' || s === 'Você') return '';
  return s;
}

function cleanNameValue(val) {
  const s = String(val || '').trim();
  if (!s || s === 'Participante' || s === 'user' || s === 'Você') return '';
  return s;
}

/**
 * Sincroniza o documento do usuário na coleção consolidada `/ranking/{uid}` do Firestore.
 * Permite que todos os dispositivos vejam os pontos em tempo real na coleção `/ranking`.
 */
export async function syncUserRankingInFirestore(uid, points, profileData = null) {
  if (!uid) return false;
  const numericPoints = Math.max(0, Math.min(100000, Math.round(Number(points) || 0)));

  let source = profileData ? { ...profileData } : {};
  let cachedLocalPoints = 0;

  try {
    if (typeof localStorage !== 'undefined') {
      const cached = localStorage.getItem(`facom_profile_${uid}`) || localStorage.getItem(`facom_user_dir_${uid}`);
      if (cached) {
        const parsedCached = JSON.parse(cached);
        cachedLocalPoints = Math.max(
          0,
          Number(parsedCached.totalPoints ?? parsedCached.pontuacaoTotal ?? parsedCached.total_points ?? 0) || 0
        );
        source = { ...parsedCached, ...source };
      }
      const cachedKey = `facom_profile_${uid}`;
      const existingRaw = localStorage.getItem(cachedKey);
      if (existingRaw) {
        const existing = JSON.parse(existingRaw);
        const maxPts = Math.max(
          numericPoints,
          cachedLocalPoints,
          Number(existing.totalPoints ?? existing.pontuacaoTotal ?? 0) || 0
        );
        if (maxPts !== existing.totalPoints || maxPts !== existing.pontuacaoTotal) {
          localStorage.setItem(cachedKey, JSON.stringify({
            ...existing,
            totalPoints: maxPts,
            pontuacaoTotal: maxPts
          }));
        }
      }
    }
  } catch (_e) {}

  const effectiveRole = source.role || 'PARTICIPANT';
  if (effectiveRole === 'STAFF' || effectiveRole === 'SPONSOR') {
    return false;
  }

  const effectivePoints = Math.max(
    0,
    Math.min(
      100000,
      Math.max(
        numericPoints,
        cachedLocalPoints,
        Math.round(Number(source.totalPoints ?? source.pontuacaoTotal ?? source.total_points ?? source.points ?? 0) || 0)
      )
    )
  );

  try {
    if (typeof setDoc !== 'function' || typeof doc !== 'function') return false;
    const rankingRef = doc(db, 'ranking', uid);
    if (!rankingRef) return false;

    const authUser = auth?.currentUser?.uid === uid ? auth.currentUser : null;
    const rawFirstName =
      cleanNameValue(source.firstName || source.first_name) ||
      cleanNameValue(source.displayName ? String(source.displayName).trim().split(' ')[0] : '') ||
      cleanNameValue(authUser?.displayName ? String(authUser.displayName).trim().split(' ')[0] : '') ||
      cleanNameValue(source.email ? String(source.email).split('@')[0].split(/[._-]/)[0] : '') ||
      cleanNameValue(authUser?.email ? String(authUser.email).split('@')[0].split(/[._-]/)[0] : '');
    const rawLastName =
      source.lastName ||
      source.last_name ||
      (source.displayName ? String(source.displayName).trim().split(' ').slice(1).join(' ') : '') ||
      (authUser?.displayName ? String(authUser.displayName).trim().split(' ').slice(1).join(' ') : '') ||
      '';
    const rawUsername =
      cleanUsernameValue(source.username) ||
      cleanUsernameValue(source.email ? String(source.email).split('@')[0] : '') ||
      cleanUsernameValue(authUser?.email ? String(authUser.email).split('@')[0] : '') ||
      cleanUsernameValue(rawFirstName ? rawFirstName.toLowerCase() : '');
    const hasExplicitIdentity = Boolean(
      profileData ||
      rawFirstName ||
      rawUsername ||
      cleanNameValue(source.displayName) ||
      cleanNameValue(authUser?.displayName) ||
      source.avatarUrl ||
      source.avatar_url ||
      source.photoURL ||
      authUser?.photoURL
    );

    const payload = {
      uid,
      role: 'PARTICIPANT',
      totalPoints: effectivePoints,
      pontuacaoTotal: effectivePoints,
      updatedAt: typeof serverTimestamp === 'function' ? serverTimestamp() : new Date().toISOString()
    };

    if (hasExplicitIdentity) {
      const firstName = rawFirstName || 'Participante';
      const lastName = rawLastName || '';
      payload.username = rawUsername || cleanUsernameValue(firstName) || 'user';
      payload.firstName = firstName;
      payload.lastName = lastName;
      payload.displayName = cleanNameValue(source.displayName) || [firstName, lastName].filter(Boolean).join(' ') || firstName || 'Participante';
      payload.avatarUrl = source.avatarUrl || source.avatar_url || source.photoURL || authUser?.photoURL || null;
      payload.course = source.course || '';
      payload.mascot = source.mascot || 'blue';
    }

    await setDoc(rankingRef, payload, { merge: true });
    return true;
  } catch (_err) {
    return false;
  }
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
  const docId = d.id || data.id || data.uid;
  const authUser = docId && auth?.currentUser?.uid === docId ? auth.currentUser : null;
  const points = Math.max(
    0,
    Number(data.pontuacaoTotal ?? data.totalPoints ?? data.total_points ?? data.points ?? 0) || 0
  );
  const derivedFirstName =
    cleanNameValue(data.firstName || data.first_name) ||
    cleanNameValue(data.displayName ? String(data.displayName).trim().split(' ')[0] : '') ||
    cleanNameValue(authUser?.displayName ? String(authUser.displayName).trim().split(' ')[0] : '') ||
    cleanNameValue(data.email ? String(data.email).split('@')[0] : '') ||
    cleanNameValue(authUser?.email ? String(authUser.email).split('@')[0] : '') ||
    cleanUsernameValue(data.username) ||
    'Participante';
  const derivedUsername =
    cleanUsernameValue(data.username) ||
    cleanUsernameValue(data.email ? String(data.email).split('@')[0] : '') ||
    cleanUsernameValue(authUser?.email ? String(authUser.email).split('@')[0] : '') ||
    cleanUsernameValue(data.firstName || data.first_name) ||
    cleanUsernameValue(authUser?.displayName ? String(authUser.displayName).trim().split(' ')[0] : '') ||
    'user';

  return {
    id: docId,
    rank: index + 1,
    username: derivedUsername,
    first_name: derivedFirstName,
    last_name: data.lastName || data.last_name || (authUser?.displayName ? String(authUser.displayName).trim().split(' ').slice(1).join(' ') : '') || '',
    avatar_url: data.avatarUrl || data.avatar_url || data.photoURL || authUser?.photoURL || null,
    points,
    mascot: data.mascot || 'blue',
    course: data.course || '',
    role: data.role || 'PARTICIPANT',
    email: data.email || authUser?.email || '',
    createdAt: data.createdAt || data.updatedAt || null
  };
}

function isNonParticipantEntry(role) {
  if (role === 'ADMIN' || role === 'STAFF' || role === 'SPONSOR') return true;
  return false;
}

function aggregatePointEventsByUid(pointEventDocs = []) {
  const perUserEvents = new Map();
  for (let i = 0; i < pointEventDocs.length; i++) {
    const evDoc = pointEventDocs[i];
    if (!evDoc) continue;
    const data = typeof evDoc.data === 'function' ? evDoc.data() : evDoc;
    if (!data) continue;
    const uid = data.userId || data.user_id || data.uid;
    if (!uid) continue;
    const pts = Math.max(0, Number(data.points) || 0);
    if (pts <= 0) continue;
    const refKey = data.referenceId || data.reference_id || evDoc.id || `evt_${i}`;
    if (!perUserEvents.has(uid)) {
      perUserEvents.set(uid, new Map());
    }
    const userMap = perUserEvents.get(uid);
    userMap.set(refKey, Math.max(userMap.get(refKey) || 0, pts));
  }

  const totalsByUid = new Map();
  for (const [uid, userMap] of perUserEvents.entries()) {
    let sum = 0;
    for (const val of userMap.values()) {
      sum += val;
    }
    totalsByUid.set(uid, sum);
  }
  return totalsByUid;
}

function mergeLeaderboardEntry(existing, incoming) {
  existing.points = Math.max(Number(existing.points || 0), Number(incoming.points || 0));
  if (!cleanNameValue(existing.first_name) && cleanNameValue(incoming.first_name)) {
    existing.first_name = incoming.first_name;
  }
  if (!existing.last_name && incoming.last_name) {
    existing.last_name = incoming.last_name;
  }
  if (!cleanUsernameValue(existing.username) && cleanUsernameValue(incoming.username)) {
    existing.username = incoming.username;
  }
  if (!existing.avatar_url && incoming.avatar_url) {
    existing.avatar_url = incoming.avatar_url;
  }
  if (!existing.course && incoming.course) {
    existing.course = incoming.course;
  }
  if (incoming.mascot && (!existing.mascot || existing.mascot === 'blue')) {
    existing.mascot = incoming.mascot;
  }
  if (!existing.createdAt && incoming.createdAt) {
    existing.createdAt = incoming.createdAt;
  }
}

function mergeUsersAndRankingForLeaderboard(usersList = [], rankingDocs = [], pointEventDocs = [], allUsersLookup = []) {
  const map = new Map();
  const profileById = new Map();

  for (const u of [...usersList, ...allUsersLookup]) {
    if (!u || !u.id) continue;
    if (profileById.has(u.id)) {
      mergeLeaderboardEntry(profileById.get(u.id), u);
    } else {
      profileById.set(u.id, { ...u });
    }
  }

  for (const item of usersList) {
    if (!item || !item.id) continue;
    if (isNonParticipantEntry(item.role)) continue;
    if (map.has(item.id)) {
      mergeLeaderboardEntry(map.get(item.id), item);
    } else {
      map.set(item.id, { ...item });
    }
  }

  for (let i = 0; i < rankingDocs.length; i++) {
    const rDoc = rankingDocs[i];
    if (!rDoc) continue;
    const rData = typeof rDoc.data === 'function' ? rDoc.data() : rDoc;
    if (!rData) continue;
    const uid = rDoc.id || rData.uid || rData.id;
    if (!uid) continue;

    const rRole = rData.role || 'PARTICIPANT';
    if (isNonParticipantEntry(rRole)) {
      continue;
    }

    const mappedRankingItem = mapUserToLeaderboard(rDoc, map.size);
    const knownProfile = profileById.get(uid);
    if (knownProfile) {
      mergeLeaderboardEntry(mappedRankingItem, knownProfile);
    }

    if (map.has(uid)) {
      mergeLeaderboardEntry(map.get(uid), mappedRankingItem);
    } else {
      map.set(uid, mappedRankingItem);
    }
  }

  const eventTotals = aggregatePointEventsByUid(pointEventDocs);
  for (const [uid, eventSum] of eventTotals.entries()) {
    if (map.has(uid)) {
      const existing = map.get(uid);
      existing.points = Math.max(Number(existing.points || 0), eventSum);
    }
  }

  return Array.from(map.values());
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
 * e ordenando por pontuacaoTotal desc com limite configurável (padrão 50),
 * consolidando dados das coleções `/users`, `/ranking` e `/pointEvents` (incluindo participantes
 * com 0 pontos ou sem campo pontuacaoTotal indexado).
 */
export async function getLeaderboardUsers(maxLimit = 50) {
  const usersRef = collection(db, 'users');
  const broadLimit = Math.max(maxLimit * 4, 200);
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

    const list = (snap?.docs || []).map((d, index) => mapUserToLeaderboard(d, index));
    let rankingDocs = [];
    let pointEventDocs = [];
    try {
      const rankSnap = await getDocs(collection(db, 'ranking'));
      if (rankSnap && Array.isArray(rankSnap.docs)) {
        rankingDocs = rankSnap.docs;
      }
    } catch (_rankErr) {}

    // Busca complementar sem orderBy composto para incluir todos os participantes de /users
    // mesmo que não possuam pontuacaoTotal indexado ou tenham 0 pontos.
    try {
      const broadSnap = await getDocs(query(usersRef, limit(broadLimit)));
      if (broadSnap && Array.isArray(broadSnap.docs)) {
        for (let i = 0; i < broadSnap.docs.length; i++) {
          list.push(mapUserToLeaderboard(broadSnap.docs[i], list.length));
        }
      }
    } catch (_broadErr) {}

    try {
      const eventsSnap = await getDocs(collection(db, 'pointEvents'));
      if (eventsSnap && Array.isArray(eventsSnap.docs)) {
        pointEventDocs = eventsSnap.docs;
      }
    } catch (_eventsErr) {}

    const merged = mergeUsersAndRankingForLeaderboard(list, rankingDocs, pointEventDocs);
    return sortLeaderboardWithTiebreak(merged).slice(0, maxLimit);
  } catch (err) {
    console.warn('Erro ao carregar ranking com índices, tentando fallback direto sem índice composto:', err);
    try {
      const basicSnap = await getDocs(query(usersRef, limit(broadLimit)));
      const list = (basicSnap?.docs || [])
        .map((d, index) => mapUserToLeaderboard(d, index));
      let rankingDocs = [];
      let pointEventDocs = [];
      try {
        const rankSnap = await getDocs(collection(db, 'ranking'));
        if (rankSnap && Array.isArray(rankSnap.docs)) {
          rankingDocs = rankSnap.docs;
        }
      } catch (_rankErr) {}
      try {
        const eventsSnap = await getDocs(collection(db, 'pointEvents'));
        if (eventsSnap && Array.isArray(eventsSnap.docs)) {
          pointEventDocs = eventsSnap.docs;
        }
      } catch (_eventsErr) {}
      const merged = mergeUsersAndRankingForLeaderboard(list, rankingDocs, pointEventDocs);
      return sortLeaderboardWithTiebreak(merged).slice(0, maxLimit);
    } catch (_fallbackErr) {
      return [];
    }
  }
}

/**
 * Escuta atualizações do ranking em tempo real via onSnapshot do Firestore (KAN-55),
 * consolidando em tempo real as coleções `/ranking`, `/pointEvents` e `/users` (tanto via query
 * indexada quanto via varredura inclusiva de `/users`).
 */
export function subscribeToLeaderboardUsers(callback, onError, maxLimit = 50) {
  const usersRef = collection(db, 'users');
  const rankingRef = collection(db, 'ranking');
  const pointEventsRef = collection(db, 'pointEvents');
  const broadLimit = Math.max(maxLimit * 4, 200);
  const q = query(
    usersRef,
    where('role', '==', 'PARTICIPANT'),
    orderBy('pontuacaoTotal', 'desc'),
    limit(maxLimit)
  );

  let indexedUsersList = [];
  let broadUsersList = [];
  let rankingDocs = [];
  let pointEventDocs = [];
  let hasUsersEmitted = false;
  let activeUsersUnsub = null;
  let broadUsersUnsub = null;
  let rankingUnsub = null;
  let pointEventsUnsub = null;

  const emitConsolidated = () => {
    const combinedUsers = [...indexedUsersList, ...broadUsersList];
    const merged = mergeUsersAndRankingForLeaderboard(combinedUsers, rankingDocs, pointEventDocs);
    callback(sortLeaderboardWithTiebreak(merged).slice(0, maxLimit));
  };

  try {
    rankingUnsub = onSnapshot(
      rankingRef,
      (rankSnap) => {
        rankingDocs = rankSnap?.docs || [];
        if (hasUsersEmitted || rankingDocs.length > 0) {
          emitConsolidated();
        }
      },
      () => {}
    );
  } catch (_e) {}

  try {
    pointEventsUnsub = onSnapshot(
      pointEventsRef,
      (evSnap) => {
        pointEventDocs = evSnap?.docs || [];
        if (hasUsersEmitted || rankingDocs.length > 0) {
          emitConsolidated();
        }
      },
      () => {}
    );
  } catch (_e) {}

  try {
    broadUsersUnsub = onSnapshot(
      query(usersRef, limit(broadLimit)),
      (broadSnap) => {
        hasUsersEmitted = true;
        broadUsersList = (broadSnap?.docs || [])
          .map((d, index) => mapUserToLeaderboard(d, index));
        emitConsolidated();
      },
      () => {}
    );
  } catch (_e) {}

  activeUsersUnsub = onSnapshot(
    q,
    (snap) => {
      hasUsersEmitted = true;
      indexedUsersList = (snap?.docs || []).map((d, index) => mapUserToLeaderboard(d, index));
      emitConsolidated();
    },
    (err) => {
      console.warn('Erro no listener em tempo real do ranking (pontuacaoTotal), tentando fallback com totalPoints:', err);
      const fallbackQuery = query(
        usersRef,
        where('role', '==', 'PARTICIPANT'),
        orderBy('totalPoints', 'desc'),
        limit(maxLimit)
      );
      activeUsersUnsub = onSnapshot(
        fallbackQuery,
        (fallbackSnap) => {
          hasUsersEmitted = true;
          indexedUsersList = (fallbackSnap?.docs || []).map((d, index) => mapUserToLeaderboard(d, index));
          emitConsolidated();
        },
        (finalErr) => {
          console.warn('Fallback totalPoints falhou, ouvindo coleção users sem ordenação composta:', finalErr);
          try {
            activeUsersUnsub = onSnapshot(
              query(usersRef, limit(broadLimit)),
              (simpleSnap) => {
                hasUsersEmitted = true;
                indexedUsersList = (simpleSnap?.docs || [])
                  .map((d, index) => mapUserToLeaderboard(d, index));
                emitConsolidated();
              },
              (ultraErr) => {
                if (rankingDocs.length > 0 || broadUsersList.length > 0) {
                  emitConsolidated();
                } else if (onError) {
                  onError(ultraErr);
                }
              }
            );
          } catch (_e) {
            if (onError) onError(finalErr);
          }
        }
      );
    }
  );

  return () => {
    if (typeof activeUsersUnsub === 'function') activeUsersUnsub();
    if (typeof broadUsersUnsub === 'function') broadUsersUnsub();
    if (typeof rankingUnsub === 'function') rankingUnsub();
    if (typeof pointEventsUnsub === 'function') pointEventsUnsub();
  };
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
 * Escuta todos os usuários para o painel administrativo, consolidando pontos de `/ranking`.
 */
export function subscribeToAllUsers(callback) {
  const usersRef = collection(db, 'users');
  const rankingRef = collection(db, 'ranking');
  const pointEventsRef = collection(db, 'pointEvents');
  let rawUsers = [];
  let rankingMap = new Map();
  let pointEventsMap = new Map();
  let hasUsersEmitted = false;
  let rankingUnsub = null;
  let pointEventsUnsub = null;

  const emitMergedUsers = () => {
    const merged = rawUsers.map(u => {
      const uid = u.uid || u.id;
      const rData = uid ? rankingMap.get(uid) : null;
      const evSum = uid ? (pointEventsMap.get(uid) || 0) : 0;
      if (!rData && evSum <= 0) return u;
      const maxPoints = Math.max(
        Number(u.totalPoints ?? u.pontuacaoTotal ?? 0) || 0,
        Number(rData?.totalPoints ?? rData?.pontuacaoTotal ?? rData?.points ?? 0) || 0,
        evSum
      );
      return {
        ...u,
        totalPoints: maxPoints,
        pontuacaoTotal: maxPoints
      };
    });
    callback(merged);
  };

  try {
    rankingUnsub = onSnapshot(
      rankingRef,
      (rankSnap) => {
        const nextMap = new Map();
        (rankSnap?.docs || []).forEach(docSnap => {
          const data = typeof docSnap.data === 'function' ? docSnap.data() : docSnap;
          nextMap.set(docSnap.id || data?.uid, data);
        });
        rankingMap = nextMap;
        if (hasUsersEmitted) {
          emitMergedUsers();
        }
      },
      () => {}
    );
  } catch (_e) {}

  try {
    pointEventsUnsub = onSnapshot(
      pointEventsRef,
      (evSnap) => {
        pointEventsMap = aggregatePointEventsByUid(evSnap?.docs || []);
        if (hasUsersEmitted) {
          emitMergedUsers();
        }
      },
      () => {}
    );
  } catch (_e) {}

  const usersUnsub = onSnapshot(
    usersRef,
    (snap) => {
      hasUsersEmitted = true;
      rawUsers = (snap?.docs || []).map(docSnap => ({
        id: docSnap.id,
        uid: docSnap.id,
        ...docSnap.data()
      }));
      emitMergedUsers();
    },
    (err) => {
      console.warn('Erro ao escutar usuários para o admin:', err);
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
      rawUsers = cachedList;
      emitMergedUsers();
    }
  );

  return () => {
    if (typeof usersUnsub === 'function') usersUnsub();
    if (typeof rankingUnsub === 'function') rankingUnsub();
    if (typeof pointEventsUnsub === 'function') pointEventsUnsub();
  };
}

/**
 * Troca o papel do usuário pelo backend (PUT /api/admin/users/:uid/role), que grava
 * o custom claim e o Firestore juntos. As regras do Firestore bloqueiam escrita
 * direta de `role` pelo client (KAN-60), então updateDoc aqui nunca funcionaria.
 */
export async function updateUserRoleInFirestore(uid, newRole) {
  if (!uid || !newRole) return { success: false, error: 'UID e role são obrigatórios.' };
  try {
    await apiRequest(`/api/admin/users/${encodeURIComponent(uid)}/role`, {
      method: 'PUT',
      body: JSON.stringify({ role: newRole })
    });
    const participantType = newRole === 'ADMIN' || newRole === 'STAFF' ? 'Organizador' : (newRole === 'SPONSOR' ? 'Patrocinador' : 'Aluno da UFU');
    try {
      if (typeof localStorage !== 'undefined') {
        const cachedKey = `facom_profile_${uid}`;
        const currentCached = localStorage.getItem(cachedKey);
        const parsed = currentCached ? JSON.parse(currentCached) : {};
        localStorage.setItem(cachedKey, JSON.stringify({ ...parsed, role: newRole, participantType, participant_type: participantType }));
        window.dispatchEvent(new Event('facom_profile_updated'));
      }
    } catch (_e) {}
    return { success: true };
  } catch (err) {
    console.error('Erro ao atualizar papel do usuário:', err);
    return { success: false, error: err.data?.message || err.message };
  }
}



