import {
  signInWithEmailAndPassword,
  sendPasswordResetEmail,
  signOut,
  onAuthStateChanged,
  createUserWithEmailAndPassword,
  updateProfile
} from 'firebase/auth';
import { auth } from './firebase';
import { normalizeEmail } from './validators';

export const AUTH_MESSAGES = {
  invalid_credentials: 'E-mail ou senha incorretos. Verifique seus dados e tente novamente.',
  user_not_found: 'Nenhuma conta encontrada com este e-mail.',
  wrong_password: 'Senha incorreta. Tente novamente ou use a recuperação de senha.',
  invalid_email: 'O e-mail informado não possui um formato válido.',
  email_already_in_use: 'Este e-mail já está cadastrado. Faça login ou use a recuperação de senha.',
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
    case 'auth/email-already-in-use':
      return AUTH_MESSAGES.email_already_in_use;
    case 'auth/invalid-credential':
    case 'auth/invalid-login-credentials':
      return AUTH_MESSAGES.invalid_credentials;
    case 'auth/user-not-found':
      return AUTH_MESSAGES.user_not_found;
    case 'auth/wrong-password':
      return AUTH_MESSAGES.wrong_password;
    case 'auth/invalid-email':
      return AUTH_MESSAGES.invalid_email;
    case 'auth/email-already-in-use':
      return AUTH_MESSAGES.email_already_in_use;
    case 'auth/user-disabled':
      return AUTH_MESSAGES.user_disabled;
    case 'auth/too-many-requests':
      return AUTH_MESSAGES.too_many_requests;
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
    const rawUsername = metadata?.username || metadata?.first_name || '';
    const atUsername = rawUsername ? (rawUsername.startsWith('@') ? rawUsername : `@${rawUsername}`) : '';
    if (atUsername) {
      try {
        await updateProfile(userCredential.user, { displayName: atUsername });
      } catch (profileErr) {
        console.warn('Aviso: Falha ao definir displayName no Firebase Auth:', profileErr);
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
