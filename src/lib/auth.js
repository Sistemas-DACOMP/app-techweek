import {
  signInWithEmailAndPassword,
  sendPasswordResetEmail,
  sendEmailVerification,
  signOut,
  onAuthStateChanged,
  createUserWithEmailAndPassword,
  updateProfile,
  deleteUser,
  reauthenticateWithCredential,
  EmailAuthProvider,
  verifyBeforeUpdateEmail
} from 'firebase/auth';
import { doc, deleteDoc } from 'firebase/firestore';
import { auth, db } from './firebase';
import { normalizeEmail, isValidEmail } from './validators';

export const AUTH_MESSAGES = {
  invalid_credentials: 'E-mail ou senha incorretos. Verifique seus dados e tente novamente.',
  user_not_found: 'Nenhuma conta encontrada com este e-mail.',
  wrong_password: 'Senha incorreta. Tente novamente ou use a recuperação de senha.',
  invalid_email: 'O e-mail informado não possui um formato válido.',
  user_disabled: 'Esta conta foi desativada pela coordenação do evento.',
  too_many_requests: 'Muitas tentativas sem sucesso. Aguarde alguns instantes antes de tentar novamente.',
  network_error: 'Falha de conexão. Verifique sua internet.',
  reset_email_sent: 'E-mail de recuperação enviado com sucesso! Verifique sua caixa de entrada e spam.',
  verification_email_sent: 'E-mail de confirmação enviado com sucesso! Verifique sua caixa de entrada e spam.',
  email_not_verified: 'Seu e-mail ainda não foi verificado. Clique no link enviado para sua caixa de entrada (ou pasta de spam) e tente novamente.',
  requires_recent_login: 'Por segurança, confirme sua senha atual antes de realizar esta operação.',
  generic_error: 'Ocorreu um erro na autenticação. Tente novamente em instantes.'
};

/**
 * Converte códigos de erro do Firebase Auth em mensagens amigáveis em português.
 */
export function mapAuthError(error) {
  if (!error) return null;
  const code = error.code || '';

  switch (code) {
    case 'auth/invalid-credential':
    case 'auth/wrong-password':
      return AUTH_MESSAGES.invalid_credentials;
    case 'auth/user-not-found':
      return AUTH_MESSAGES.user_not_found;
    case 'auth/invalid-email':
      return AUTH_MESSAGES.invalid_email;
    case 'auth/user-disabled':
      return AUTH_MESSAGES.user_disabled;
    case 'auth/too-many-requests':
      return AUTH_MESSAGES.too_many_requests;
    case 'auth/requires-recent-login':
      return AUTH_MESSAGES.requires_recent_login;
    case 'auth/operation-not-allowed':
      return 'O método de login por E-mail/Senha precisa ser ativado no Firebase Console (Authentication > Sign-in method).';
    case 'auth/network-request-failed':
      return AUTH_MESSAGES.network_error;
    default:
      return error.message || AUTH_MESSAGES.generic_error;
  }
}

/**
 * Realiza o login do usuário via Firebase Auth.
 */
export async function loginWithEmailAndPassword(email, password) {
  const cleanEmail = normalizeEmail(email);

  if (!cleanEmail) {
    return {
      success: false,
      user: null,
      error: 'Por favor, informe seu e-mail.'
    };
  }

  if (!password) {
    return {
      success: false,
      user: null,
      error: 'Por favor, informe sua senha.'
    };
  }

  // 1. Tenta autenticação padrão no Firebase Auth
  try {
    const userCredential = await signInWithEmailAndPassword(auth, cleanEmail, password);
    if (typeof window !== 'undefined' && window.localStorage) {
      window.localStorage.setItem('facom_logged_in', 'true');
      window.localStorage.removeItem('facom_test_session');
    }
    return {
      success: true,
      user: userCredential.user,
      error: null
    };
  } catch (err) {
    console.warn('[auth] Erro no signIn normal:', err.code, err.message);

    return {
      success: false,
      user: null,
      error: mapAuthError(err),
      rawError: err
    };
  }
}

/**
 * Dispara o e-mail oficial do Firebase para redefinição de senha.
 */
export async function sendPasswordReset(email) {
  const cleanEmail = normalizeEmail(email);

  if (!cleanEmail) {
    return {
      success: false,
      message: 'Informe o e-mail cadastrado para recuperar a senha.'
    };
  }

  try {
    await sendPasswordResetEmail(auth, cleanEmail);
    return {
      success: true,
      message: AUTH_MESSAGES.reset_email_sent
    };
  } catch (err) {
    return {
      success: false,
      message: mapAuthError(err),
      rawError: err
    };
  }
}

/**
 * Cria uma nova conta no Firebase Auth.
 */
export async function signUpWithEmail({ email, password, metadata }) {
  const cleanEmail = normalizeEmail(email);

  if (!cleanEmail) {
    return {
      status: 'error',
      message: 'Por favor, informe um e-mail válido.',
      data: null,
      error: new Error('Empty email')
    };
  }

  if (!password) {
    return {
      status: 'error',
      message: 'Por favor, informe uma senha.',
      data: null,
      error: new Error('Empty password')
    };
  }

  try {
    const userCredential = await createUserWithEmailAndPassword(auth, cleanEmail, password);
    const firstName = metadata?.first_name || '';
    const lastName = metadata?.last_name || '';
    const displayName = [firstName, lastName].filter(Boolean).join(' ').trim() || metadata?.username || '';
    if (displayName) {
      try {
        await updateProfile(userCredential.user, { displayName });
      } catch (profileErr) {
        console.warn('Aviso: Falha ao gravar displayName no Firebase Auth:', profileErr);
      }
    }

    // Dispara automaticamente o e-mail oficial de confirmação do Firebase Auth
    let verificationEmailSent = false;
    let verificationEmailError = null;
    try {
      const actionCodeSettings = getActionCodeSettings();
      if (actionCodeSettings) {
        try {
          await sendEmailVerification(userCredential.user, actionCodeSettings);
          verificationEmailSent = true;
        } catch (settingsErr) {
          console.warn('Aviso: Falha ao enviar e-mail com actionCodeSettings, tentando envio padrão:', settingsErr);
          await sendEmailVerification(userCredential.user);
          verificationEmailSent = true;
        }
      } else {
        await sendEmailVerification(userCredential.user);
        verificationEmailSent = true;
      }
    } catch (verifErr) {
      console.warn('Aviso: Falha ao enviar e-mail de verificação inicial:', verifErr);
      verificationEmailSent = false;
      verificationEmailError = mapAuthError(verifErr) || verifErr.message || 'Falha ao enviar e-mail de verificação inicial.';
    }

    return {
      status: 'signed_in',
      message: null,
      data: {
        user: userCredential.user,
        metadata,
        verificationEmailSent,
        verificationEmailError
      },
      error: null
    };
  } catch (err) {
    const isRateLimited = err.code === 'auth/too-many-requests';
    return {
      status: isRateLimited ? 'rate_limited' : 'error',
      message: mapAuthError(err),
      data: null,
      error: err
    };
  }
}

/**
 * Retorna as configurações de redirecionamento para o e-mail do Firebase Auth.
 * Prioriza a variável de ambiente VITE_APP_URL sobre window.location.origin.
 */
export function getActionCodeSettings() {
  const baseUrl =
    (typeof process !== 'undefined' && process.env?.VITE_APP_URL) ||
    (typeof import.meta !== 'undefined' && import.meta.env?.VITE_APP_URL) ||
    (typeof window !== 'undefined' && window.location?.origin) ||
    null;

  if (baseUrl) {
    const cleanBaseUrl = baseUrl.replace(/\/+$/, '');
    return {
      url: `${cleanBaseUrl}/#/login`,
      handleCodeInApp: false
    };
  }
  return undefined;
}

/**
 * Higieniza chaves de sessão e dados de usuário no localStorage ao deslogar.
 */
export function clearAuthLocalCaches() {
  if (typeof window === 'undefined' || !window.localStorage) return;
  try {
    const keysToRemove = [];
    for (let i = 0; i < window.localStorage.length; i++) {
      const key = window.localStorage.key(i);
      if (key && key.startsWith('facom_profile_')) {
        try {
          const raw = window.localStorage.getItem(key);
          if (raw) {
            const parsed = JSON.parse(raw);
            const uid = parsed?.uid || parsed?.id || key.replace('facom_profile_', '');
            if (uid) {
              window.localStorage.setItem(`facom_user_dir_${uid}`, raw);
            }
            const email = (parsed?.email || '').trim().toLowerCase();
            if (email) {
              window.localStorage.setItem(`facom_user_dir_email_${email}`, raw);
            }
          }
        } catch (_e) {}
        keysToRemove.push(key);
      } else if (
        key &&
        (key.startsWith('facom_point_events_') ||
         key === 'facom_logged_in' ||
         key === 'facom_test_session')
      ) {
        keysToRemove.push(key);
      }
    }
    keysToRemove.forEach((k) => window.localStorage.removeItem(k));
  } catch (_err) {
    // Falha silenciosa caso localStorage não esteja acessível
  }
}

/**
 * Dispara o e-mail oficial do Firebase para confirmação de e-mail do usuário autenticado.
 */
export async function sendVerificationEmail(user = auth.currentUser) {
  if (!user) {
    return {
      success: false,
      error: 'Nenhum usuário autenticado para envio do e-mail.'
    };
  }

  try {
    const actionCodeSettings = getActionCodeSettings();
    if (actionCodeSettings) {
      try {
        await sendEmailVerification(user, actionCodeSettings);
      } catch (settingsErr) {
        console.warn('Aviso: Falha ao enviar e-mail com actionCodeSettings no reenvio, tentando envio padrão:', settingsErr);
        await sendEmailVerification(user);
      }
    } else {
      await sendEmailVerification(user);
    }
    return {
      success: true,
      message: AUTH_MESSAGES.verification_email_sent
    };
  } catch (err) {
    return {
      success: false,
      error: mapAuthError(err) || 'Não foi possível reenviar o e-mail no momento.',
      rawError: err
    };
  }
}

/**
 * Traduz erros específicos do fluxo de alteração/correção de e-mail (KAN-116).
 */
export function mapUpdateEmailError(error) {
  if (!error) return null;
  const code = error.code || '';
  switch (code) {
    case 'auth/email-already-in-use':
      return 'Este e-mail já está em uso por outra conta.';
    case 'auth/invalid-email':
      return 'Por favor, insira um e-mail válido.';
    case 'auth/wrong-password':
    case 'auth/invalid-credential':
      return 'Senha incorreta. Tente novamente.';
    case 'auth/requires-recent-login':
      return 'Por segurança, informe sua senha para alterar o e-mail.';
    case 'auth/too-many-requests':
      return 'Muitas tentativas seguidas. Aguarde alguns instantes.';
    case 'auth/same-email':
      return 'O novo e-mail informado é idêntico ao atual.';
    default:
      return mapAuthError(error) || error.message || 'Erro ao alterar o e-mail. Tente novamente em instantes.';
  }
}

/**
 * Solicita a alteração/correção de e-mail do usuário autenticado no Firebase Auth (KAN-116).
 * Se a senha for informada, executa reautenticação prévia para prevenir auth/requires-recent-login.
 * Em seguida, envia o link de confirmação para o novo endereço via verifyBeforeUpdateEmail.
 *
 * @param {import('firebase/auth').User} user
 * @param {string} newEmail
 * @param {string} [currentPassword]
 * @returns {Promise<{ success: boolean, newEmail: string }>}
 */
export async function requestEmailCorrection(user = auth.currentUser, newEmail, currentPassword) {
  if (!user) {
    const error = new Error('Nenhum usuário autenticado.');
    error.code = 'auth/no-current-user';
    throw error;
  }

  const cleanEmail = normalizeEmail(newEmail);
  if (!cleanEmail || !isValidEmail(cleanEmail)) {
    const error = new Error('Por favor, insira um e-mail válido.');
    error.code = 'auth/invalid-email';
    throw error;
  }

  const currentEmail = normalizeEmail(user.email);
  if (cleanEmail === currentEmail) {
    const error = new Error('O novo e-mail informado é idêntico ao atual.');
    error.code = 'auth/same-email';
    throw error;
  }

  // 1. Reautenticação prévia com senha se fornecida
  if (currentPassword && user.email) {
    const credential = EmailAuthProvider.credential(user.email, currentPassword);
    await reauthenticateWithCredential(user, credential);
  }

  // 2. Dispara verifyBeforeUpdateEmail com ActionCodeSettings e fallback resiliente
  const actionCodeSettings = getActionCodeSettings();
  if (actionCodeSettings) {
    try {
      await verifyBeforeUpdateEmail(user, cleanEmail, actionCodeSettings);
    } catch (settingsErr) {
      console.warn('Aviso: Falha ao enviar com actionCodeSettings no verifyBeforeUpdateEmail, tentando sem:', settingsErr);
      await verifyBeforeUpdateEmail(user, cleanEmail);
    }
  } else {
    await verifyBeforeUpdateEmail(user, cleanEmail);
  }

  return {
    success: true,
    newEmail: cleanEmail
  };
}

/**
 * Recarrega os dados do usuário autenticado no Firebase Auth para sincronizar emailVerified.
 */
export async function reloadCurrentUser() {
  if (!auth.currentUser) return null;
  await auth.currentUser.reload();
  return auth.currentUser;
}

/**
 * Encerra a sessão do usuário e higieniza caches locais.
 */
export async function logoutUser() {
  try {
    await signOut(auth);
    clearAuthLocalCaches();
    if (typeof window !== 'undefined' && typeof window.dispatchEvent === 'function' && typeof CustomEvent !== 'undefined') {
      window.dispatchEvent(new CustomEvent('facom_auth_state_changed', { detail: { user: null } }));
    }
    return { success: true };
  } catch (err) {
    clearAuthLocalCaches();
    if (typeof window !== 'undefined' && typeof window.dispatchEvent === 'function' && typeof CustomEvent !== 'undefined') {
      window.dispatchEvent(new CustomEvent('facom_auth_state_changed', { detail: { user: null } }));
    }
    return { success: false, error: mapAuthError(err) };
  }
}

/**
 * Escuta mudanças de estado na autenticação global do PWA.
 */
export function onAuthChange(callback) {
  const unsubFirebase = onAuthStateChanged(auth, callback);

  const handleCustomAuth = (e) => {
    callback(e.detail?.user || null);
  };

  if (typeof window !== 'undefined' && typeof window.addEventListener === 'function') {
    window.addEventListener('facom_auth_state_changed', handleCustomAuth);
  }

  return () => {
    if (typeof unsubFirebase === 'function') unsubFirebase();
    if (typeof window !== 'undefined' && typeof window.removeEventListener === 'function') {
      window.removeEventListener('facom_auth_state_changed', handleCustomAuth);
    }
  };
}

/**
 * Retorna o usuário atualmente autenticado.
 */
export function getCurrentAuthUser() {
  if (auth.currentUser) return auth.currentUser;
  return null;
}

/**
 * Exclui a conta e o perfil do usuário logado (Auth + Firestore + localStorage).
 * Suporta reautenticação prévia com senha para prevenir falhas por auth/requires-recent-login.
 *
 * @param {string} [currentPassword] - Senha atual do usuário para reautenticação prévia.
 * @returns {Promise<{ success: boolean, error?: string }>}
 */
export async function deleteCurrentUserAccount(currentPassword) {
  const user = auth.currentUser;
  if (!user) return { success: false, error: 'Nenhum usuário autenticado.' };

  const uid = user.uid;

  try {
    // 1. Reautenticação Prévia com senha (se fornecida e usuário possui e-mail cadastrado)
    if (currentPassword && user.email) {
      const credential = EmailAuthProvider.credential(user.email, currentPassword);
      await reauthenticateWithCredential(user, credential);
    }

    // 2. Remove documento do Firestore antes de apagar o usuário no Auth
    // (Pois após deleteUser, o token é revogado e request.auth vira null nas regras de segurança)
    try {
      await deleteDoc(doc(db, 'users', uid));
    } catch (_dbErr) {
      console.warn('Erro ao remover documento do Firestore:', _dbErr);
    }

    // 3. Remove a conta do Firebase Authentication
    await deleteUser(user);

    // 4. Higienização completa de caches locais e notificação de logout global
    clearAuthLocalCaches();
    if (typeof window !== 'undefined' && typeof window.dispatchEvent === 'function' && typeof CustomEvent !== 'undefined') {
      window.dispatchEvent(new CustomEvent('facom_auth_state_changed', { detail: { user: null } }));
    }

    return { success: true };
  } catch (err) {
    console.error('Erro ao excluir conta:', err);
    return { success: false, error: mapAuthError(err) || err.message };
  }
}
