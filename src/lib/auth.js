import {
  signInWithEmailAndPassword,
  sendPasswordResetEmail,
  signOut,
  onAuthStateChanged,
  createUserWithEmailAndPassword,
  updateProfile,
  deleteUser
} from 'firebase/auth';
import { doc, deleteDoc } from 'firebase/firestore';
import { auth, db } from './firebase';
import { normalizeEmail } from './validators';

export const AUTH_MESSAGES = {
  invalid_credentials: 'E-mail ou senha incorretos. Verifique seus dados e tente novamente.',
  user_not_found: 'Nenhuma conta encontrada com este e-mail.',
  wrong_password: 'Senha incorreta. Tente novamente ou use a recuperação de senha.',
  invalid_email: 'O e-mail informado não possui um formato válido.',
  user_disabled: 'Esta conta foi desativada pela coordenação do evento.',
  too_many_requests: 'Muitas tentativas sem sucesso. Aguarde alguns instantes antes de tentar novamente.',
  network_error: 'Falha de conexão. Verifique sua internet.',
  reset_email_sent: 'E-mail de recuperação enviado com sucesso! Verifique sua caixa de entrada e spam.',
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

  try {
    const userCredential = await signInWithEmailAndPassword(auth, cleanEmail, password);
    return {
      success: true,
      user: userCredential.user,
      error: null
    };
  } catch (err) {
    console.error('[auth] Erro no login:', err.code, err.message);
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

    return {
      status: 'signed_in',
      message: null,
      data: { user: userCredential.user, metadata },
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
 * Encerra a sessão do usuário.
 */
export async function logoutUser() {
  try {
    await signOut(auth);
    if (typeof window !== 'undefined' && window.localStorage) {
      window.localStorage.removeItem('facom_logged_in');
    }
    return { success: true };
  } catch (err) {
    return { success: false, error: mapAuthError(err) };
  }
}

/**
 * Escuta mudanças de estado na autenticação global do PWA.
 */
export function onAuthChange(callback) {
  return onAuthStateChanged(auth, callback);
}

/**
 * Retorna o usuário atualmente autenticado.
 */
export function getCurrentAuthUser() {
  return auth.currentUser;
}

/**
 * Exclui a conta e o perfil do usuário logado (Auth + Firestore + localStorage).
 */
export async function deleteCurrentUserAccount() {
  const user = auth.currentUser;
  if (!user) return { success: false, error: 'Nenhum usuário autenticado.' };

  const uid = user.uid;

  try {
    // 1. Remove documento do Firestore
    try {
      await deleteDoc(doc(db, 'users', uid));
    } catch (_dbErr) {
      console.warn('Erro ao remover documento do Firestore:', _dbErr);
    }

    // 2. Limpa dados de cache no localStorage
    if (typeof window !== 'undefined' && window.localStorage) {
      window.localStorage.removeItem(`facom_profile_${uid}`);
      window.localStorage.removeItem('facom_logged_in');
      window.localStorage.removeItem('facom_onboarding_completed');
    }

    // 3. Remove a conta do Firebase Authentication
    await deleteUser(user);

    return { success: true };
  } catch (err) {
    console.error('Erro ao excluir conta:', err);
    return { success: false, error: mapAuthError(err) || err.message };
  }
}
