import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  signInWithEmailAndPassword,
  sendPasswordResetEmail,
  sendEmailVerification,
  createUserWithEmailAndPassword,
  updateProfile,
  signOut,
  onAuthStateChanged,
  deleteUser,
  reauthenticateWithCredential,
  EmailAuthProvider
} from 'firebase/auth';
import { deleteDoc, doc } from 'firebase/firestore';

// Mock das funções do Firebase Auth
vi.mock('firebase/auth', () => ({
  signInWithEmailAndPassword: vi.fn(),
  sendPasswordResetEmail: vi.fn(),
  sendEmailVerification: vi.fn(),
  createUserWithEmailAndPassword: vi.fn(),
  updateProfile: vi.fn(),
  signOut: vi.fn(),
  onAuthStateChanged: vi.fn(),
  deleteUser: vi.fn(),
  reauthenticateWithCredential: vi.fn(),
  getAuth: vi.fn(() => ({ currentUser: null })),
  connectAuthEmulator: vi.fn(),
  EmailAuthProvider: {
    credential: vi.fn((email, password) => ({ email, password, providerId: 'password' }))
  }
}));

vi.mock('firebase/firestore', () => ({
  doc: vi.fn((_db, coll, id) => ({ path: `${coll}/${id}`, id })),
  deleteDoc: vi.fn(),
  getFirestore: vi.fn(),
  connectFirestoreEmulator: vi.fn()
}));


const { mockCurrentUser } = vi.hoisted(() => ({
  mockCurrentUser: {
    uid: 'mock-user-123',
    email: 'teste@ufu.br',
    emailVerified: false,
    reload: vi.fn().mockResolvedValue()
  }
}));

vi.mock('./firebase', () => ({
  auth: { currentUser: mockCurrentUser },
  db: {}
}));

import {
  loginWithEmailAndPassword,
  sendPasswordReset,
  logoutUser,
  mapAuthError,
  AUTH_MESSAGES,
  onAuthChange,
  getCurrentAuthUser,
  sendVerificationEmail,
  reloadCurrentUser,
  signUpWithEmail,
  getActionCodeSettings,
  clearAuthLocalCaches,
  deleteCurrentUserAccount
} from './auth';

describe('Módulo de Autenticação Firebase (auth.js)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('mapAuthError', () => {
    it('deve traduzir auth/invalid-credential para mensagem amigável', () => {
      const msg = mapAuthError({ code: 'auth/invalid-credential' });
      expect(msg).toBe(AUTH_MESSAGES.invalid_credentials);
    });

    it('deve traduzir auth/user-not-found para mensagem amigável', () => {
      const msg = mapAuthError({ code: 'auth/user-not-found' });
      expect(msg).toBe(AUTH_MESSAGES.user_not_found);
    });

    it('deve traduzir auth/too-many-requests para aviso de rate limit', () => {
      const msg = mapAuthError({ code: 'auth/too-many-requests' });
      expect(msg).toBe(AUTH_MESSAGES.too_many_requests);
    });

    it('deve retornar mensagem padrão quando o erro for desconhecido', () => {
      const msg = mapAuthError({});
      expect(msg).toBe(AUTH_MESSAGES.generic_error);
    });
  });

  describe('loginWithEmailAndPassword', () => {
    it('deve autenticar com sucesso quando as credenciais forem válidas', async () => {
      signInWithEmailAndPassword.mockResolvedValue({
        user: { uid: 'u123', email: 'aluno@ufu.br' }
      });

      const res = await loginWithEmailAndPassword('aluno@ufu.br', 'senha123');

      expect(res.success).toBe(true);
      expect(res.user.uid).toBe('u123');
      expect(res.error).toBeNull();
    });

    it('deve normalizar e-mail com espaços ou maiúsculas antes do login', async () => {
      signInWithEmailAndPassword.mockResolvedValue({
        user: { uid: 'u123', email: 'aluno@ufu.br' }
      });

      await loginWithEmailAndPassword('  Aluno@UFU.br  ', 'senha123');

      expect(signInWithEmailAndPassword).toHaveBeenCalledWith(
        expect.anything(),
        'aluno@ufu.br',
        'senha123'
      );
    });

    it('deve falhar se e-mail ou senha não forem informados', async () => {
      const resSemEmail = await loginWithEmailAndPassword('', 'senha123');
      expect(resSemEmail.success).toBe(false);

      const resSemSenha = await loginWithEmailAndPassword('aluno@ufu.br', '');
      expect(resSemSenha.success).toBe(false);
    });

    it('deve capturar e traduzir erros de credenciais inválidas', async () => {
      signInWithEmailAndPassword.mockRejectedValue({ code: 'auth/invalid-credential' });

      const res = await loginWithEmailAndPassword('aluno@ufu.br', 'senha-errada');

      expect(res.success).toBe(false);
      expect(res.error).toBe(AUTH_MESSAGES.invalid_credentials);
    });
  });

  describe('sendPasswordReset', () => {
    it('deve disparar e-mail de redefinição de senha com sucesso', async () => {
      sendPasswordResetEmail.mockResolvedValue();

      const res = await sendPasswordReset('aluno@ufu.br');

      expect(res.success).toBe(true);
      expect(res.message).toBe(AUTH_MESSAGES.reset_email_sent);
      expect(sendPasswordResetEmail).toHaveBeenCalledWith(expect.anything(), 'aluno@ufu.br');
    });

    it('deve retornar erro se o e-mail estiver vazio', async () => {
      const res = await sendPasswordReset('');

      expect(res.success).toBe(false);
      expect(sendPasswordResetEmail).not.toHaveBeenCalled();
    });

    it('deve tratar e traduzir erro caso o Firebase falhe no envio', async () => {
      sendPasswordResetEmail.mockRejectedValue({ code: 'auth/too-many-requests' });

      const res = await sendPasswordReset('aluno@ufu.br');

      expect(res.success).toBe(false);
      expect(res.message).toBe(AUTH_MESSAGES.too_many_requests);
    });
  });

  describe('logoutUser e higienização de cache local', () => {
    it('deve encerrar a sessão e remover facom_logged_in, facom_test_session, perfis e pontos do localStorage', async () => {
      signOut.mockResolvedValue();
      const storageState = {
        'facom_logged_in': 'true',
        'facom_test_session': 'true',
        'facom_profile_user123': '{"name":"Alan"}',
        'facom_point_events_user123': '[{"id":"e1"}]',
        'theme': 'dark'
      };

      const mockStorage = {
        getItem: vi.fn((k) => storageState[k] || null),
        setItem: vi.fn((k, v) => { storageState[k] = v; }),
        removeItem: vi.fn((k) => { delete storageState[k]; }),
        key: vi.fn((i) => Object.keys(storageState)[i]),
        get length() {
          return Object.keys(storageState).length;
        }
      };

      vi.stubGlobal('localStorage', mockStorage);
      vi.stubGlobal('window', { localStorage: mockStorage });

      const res = await logoutUser();

      expect(res.success).toBe(true);
      expect(signOut).toHaveBeenCalled();
      expect(storageState['facom_logged_in']).toBeUndefined();
      expect(storageState['facom_test_session']).toBeUndefined();
      expect(storageState['facom_profile_user123']).toBeUndefined();
      expect(storageState['facom_point_events_user123']).toBeUndefined();
      expect(storageState['theme']).toBe('dark');

      vi.unstubAllGlobals();
    });

    it('clearAuthLocalCaches remove todas as chaves facom_profile_* e facom_point_events_*', () => {
      const storageState = {
        'facom_logged_in': 'true',
        'facom_test_session': 'true',
        'facom_profile_u1': '{}',
        'facom_profile_u2': '{}',
        'facom_point_events_u1': '[]',
        'outra_chave': 'manter'
      };

      const mockStorage = {
        removeItem: vi.fn((k) => { delete storageState[k]; }),
        key: vi.fn((i) => Object.keys(storageState)[i]),
        get length() {
          return Object.keys(storageState).length;
        }
      };

      vi.stubGlobal('window', { localStorage: mockStorage });

      clearAuthLocalCaches();

      expect(storageState['facom_logged_in']).toBeUndefined();
      expect(storageState['facom_test_session']).toBeUndefined();
      expect(storageState['facom_profile_u1']).toBeUndefined();
      expect(storageState['facom_profile_u2']).toBeUndefined();
      expect(storageState['facom_point_events_u1']).toBeUndefined();
      expect(storageState['outra_chave']).toBe('manter');

      vi.unstubAllGlobals();
    });
  });

  describe('Sem fallback de conta de teste (KAN-114)', () => {
    it('não cria sessão fake para credenciais de teste nem em DEV', async () => {
      vi.resetModules();
      vi.stubEnv('DEV', true);
      vi.stubGlobal('window', { location: { search: '' } });

      const { signInWithEmailAndPassword: signInMock } = await import('firebase/auth');
      signInMock.mockRejectedValue({ code: 'auth/invalid-credential' });

      const { loginWithEmailAndPassword: loginProd } = await import('./auth');
      const res = await loginProd('conta.teste@exemplo.com', 'SenhaQualquer1!');

      expect(res.success).toBe(false);

      vi.unstubAllEnvs();
      vi.unstubAllGlobals();
      vi.resetModules();
    });
  });

  describe('Sessão Global', () => {
    it('deve registrar callback no onAuthStateChanged', () => {
      const mockCb = vi.fn();
      onAuthChange(mockCb);
      expect(onAuthStateChanged).toHaveBeenCalledWith(expect.anything(), mockCb);
    });

    it('deve retornar o currentUser', () => {
      const user = getCurrentAuthUser();
      expect(user.uid).toBe('mock-user-123');
    });
  });

  describe('Verificação de E-mail (KAN-116)', () => {
    describe('getActionCodeSettings', () => {
      it('deve retornar a URL base com /#/login quando window.location estiver disponível', () => {
        vi.stubGlobal('window', { location: { origin: 'https://techweek.facom.ufu.br' } });
        expect(getActionCodeSettings()).toEqual({
          url: 'https://techweek.facom.ufu.br/#/login',
          handleCodeInApp: false
        });
        vi.unstubAllGlobals();
      });

      it('deve priorizar VITE_APP_URL sobre window.location.origin quando definida', () => {
        vi.stubEnv('VITE_APP_URL', 'https://evento.ufu.br');
        vi.stubGlobal('window', { location: { origin: 'https://localhost:5173' } });

        expect(getActionCodeSettings()).toEqual({
          url: 'https://evento.ufu.br/#/login',
          handleCodeInApp: false
        });

        vi.unstubAllEnvs();
        vi.unstubAllGlobals();
      });

      it('deve retornar undefined se window ou window.location for ausente', () => {
        vi.stubGlobal('window', undefined);
        expect(getActionCodeSettings()).toBeUndefined();
        vi.unstubAllGlobals();
      });
    });

    describe('sendVerificationEmail', () => {
      it('deve enviar e-mail de confirmação com sucesso para o usuário autenticado', async () => {
        vi.stubGlobal('window', { location: { origin: 'https://techweek.facom.ufu.br' } });
        sendEmailVerification.mockResolvedValue();

        const res = await sendVerificationEmail(mockCurrentUser);

        expect(res.success).toBe(true);
        expect(res.message).toBe(AUTH_MESSAGES.verification_email_sent);
        expect(sendEmailVerification).toHaveBeenCalledWith(mockCurrentUser, {
          url: 'https://techweek.facom.ufu.br/#/login',
          handleCodeInApp: false
        });
        vi.unstubAllGlobals();
      });

      it('deve falhar se nenhum usuário for informado e auth.currentUser for nulo', async () => {
        const res = await sendVerificationEmail(null);

        expect(res.success).toBe(false);
        expect(res.error).toBe('Nenhum usuário autenticado para envio do e-mail.');
      });

      it('deve utilizar fallback sem actionCodeSettings caso o envio com URL continue falhe', async () => {
        vi.stubGlobal('window', { location: { origin: 'https://techweek.facom.ufu.br' } });
        sendEmailVerification
          .mockRejectedValueOnce(new Error('auth/unauthorized-continue-uri'))
          .mockResolvedValueOnce();

        const res = await sendVerificationEmail(mockCurrentUser);

        expect(res.success).toBe(true);
        expect(sendEmailVerification).toHaveBeenCalledTimes(2);
        expect(sendEmailVerification).toHaveBeenNthCalledWith(1, mockCurrentUser, {
          url: 'https://techweek.facom.ufu.br/#/login',
          handleCodeInApp: false
        });
        expect(sendEmailVerification).toHaveBeenNthCalledWith(2, mockCurrentUser);
        vi.unstubAllGlobals();
      });

      it('deve capturar erro do Firebase no envio e traduzir com mapAuthError', async () => {
        sendEmailVerification.mockRejectedValue({ code: 'auth/too-many-requests' });

        const res = await sendVerificationEmail(mockCurrentUser);

        expect(res.success).toBe(false);
        expect(res.error).toBe(AUTH_MESSAGES.too_many_requests);
      });
    });

    describe('reloadCurrentUser', () => {
      it('deve invocar reload() no usuário atual e retorná-lo', async () => {
        const res = await reloadCurrentUser();

        expect(mockCurrentUser.reload).toHaveBeenCalled();
        expect(res).toBe(mockCurrentUser);
      });
    });

    describe('signUpWithEmail', () => {
      it('deve invocar sendEmailVerification automaticamente após criar conta com sucesso', async () => {
        vi.stubGlobal('window', { location: { origin: 'https://techweek.facom.ufu.br' } });
        const mockNewUser = {
          uid: 'new-user-456',
          email: 'novo@ufu.br',
          emailVerified: false
        };
        createUserWithEmailAndPassword.mockResolvedValue({ user: mockNewUser });
        sendEmailVerification.mockResolvedValue();

        const res = await signUpWithEmail({
          email: 'novo@ufu.br',
          password: 'senhaSegura123!',
          metadata: { firstName: 'Alan', lastName: 'Turing', username: 'alanturing' }
        });

        expect(res.status).toBe('signed_in');
        expect(createUserWithEmailAndPassword).toHaveBeenCalledWith(expect.anything(), 'novo@ufu.br', 'senhaSegura123!');
        expect(sendEmailVerification).toHaveBeenCalledWith(mockNewUser, {
          url: 'https://techweek.facom.ufu.br/#/login',
          handleCodeInApp: false
        });
        vi.unstubAllGlobals();
      });

      it('retorna verificationEmailSent: true e verificationEmailError: null quando o envio tem sucesso', async () => {
        vi.stubGlobal('window', { location: { origin: 'https://techweek.facom.ufu.br' } });
        const mockNewUser = {
          uid: 'new-user-789',
          email: 'sucesso@ufu.br',
          emailVerified: false
        };
        createUserWithEmailAndPassword.mockResolvedValue({ user: mockNewUser });
        sendEmailVerification.mockResolvedValue();

        const res = await signUpWithEmail({
          email: 'sucesso@ufu.br',
          password: 'senhaSegura123!',
          metadata: { firstName: 'Ada' }
        });

        expect(res.status).toBe('signed_in');
        expect(res.data.verificationEmailSent).toBe(true);
        expect(res.data.verificationEmailError).toBeNull();

        vi.unstubAllGlobals();
      });

      it('retorna verificationEmailSent: false e verificationEmailError quando sendEmailVerification falha', async () => {
        vi.stubGlobal('window', { location: { origin: 'https://techweek.facom.ufu.br' } });
        const mockNewUser = {
          uid: 'new-user-101',
          email: 'ratelimit@ufu.br',
          emailVerified: false
        };
        createUserWithEmailAndPassword.mockResolvedValue({ user: mockNewUser });
        sendEmailVerification.mockRejectedValue({ code: 'auth/too-many-requests' });

        const res = await signUpWithEmail({
          email: 'ratelimit@ufu.br',
          password: 'senhaSegura123!',
          metadata: { firstName: 'Grace' }
        });

        expect(res.status).toBe('signed_in');
        expect(res.data.verificationEmailSent).toBe(false);
        expect(res.data.verificationEmailError).toBe(AUTH_MESSAGES.too_many_requests);

        vi.unstubAllGlobals();
      });
    });
  });

  describe('deleteCurrentUserAccount (KAN-116 / SEC)', () => {
    let consoleErrorSpy;

    beforeEach(() => {
      vi.clearAllMocks();
      consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    });

    afterEach(() => {
      consoleErrorSpy?.mockRestore();
    });

    it('retorna erro se nenhum usuário estiver autenticado', async () => {
      const { auth } = await import('./firebase');
      const originalUser = auth.currentUser;
      auth.currentUser = null;

      const res = await deleteCurrentUserAccount('qualquerSenha');
      expect(res.success).toBe(false);
      expect(res.error).toBe('Nenhum usuário autenticado.');
      expect(deleteDoc).not.toHaveBeenCalled();
      expect(deleteUser).not.toHaveBeenCalled();

      auth.currentUser = originalUser;
    });

    it('reautentica com sucesso quando a senha é fornecida e conclui a deleção do Firestore e Auth', async () => {
      const { auth } = await import('./firebase');
      auth.currentUser = mockCurrentUser;

      reauthenticateWithCredential.mockResolvedValue();
      deleteDoc.mockResolvedValue();
      deleteUser.mockResolvedValue();

      const dispatchSpy = vi.fn();
      vi.stubGlobal('window', {
        dispatchEvent: dispatchSpy,
        localStorage: {
          length: 2,
          key: (i) => (i === 0 ? 'facom_profile_mock-user-123' : 'facom_logged_in'),
          removeItem: vi.fn()
        }
      });

      const res = await deleteCurrentUserAccount('minhaSenhaCorreta123');

      expect(res.success).toBe(true);
      expect(EmailAuthProvider.credential).toHaveBeenCalledWith('teste@ufu.br', 'minhaSenhaCorreta123');
      expect(reauthenticateWithCredential).toHaveBeenCalledWith(mockCurrentUser, expect.anything());
      expect(deleteDoc).toHaveBeenCalledWith(expect.objectContaining({ path: 'users/mock-user-123' }));
      expect(deleteUser).toHaveBeenCalledWith(mockCurrentUser);
      expect(dispatchSpy).toHaveBeenCalledWith(expect.objectContaining({
        type: 'facom_auth_state_changed'
      }));

      vi.unstubAllGlobals();
    });

    it('aborta imediatamente sem tocar no Firestore ou Auth se a senha for incorreta', async () => {
      const { auth } = await import('./firebase');
      auth.currentUser = mockCurrentUser;

      reauthenticateWithCredential.mockRejectedValue({ code: 'auth/wrong-password' });

      const res = await deleteCurrentUserAccount('senhaErrada');

      expect(res.success).toBe(false);
      expect(res.error).toBe(AUTH_MESSAGES.invalid_credentials);
      expect(reauthenticateWithCredential).toHaveBeenCalled();
      expect(deleteDoc).not.toHaveBeenCalled();
      expect(deleteUser).not.toHaveBeenCalled();
    });

    it('trata adequadamente erro auth/requires-recent-login se deleteUser falhar por sessão antiga', async () => {
      const { auth } = await import('./firebase');
      auth.currentUser = mockCurrentUser;

      deleteDoc.mockResolvedValue();
      deleteUser.mockRejectedValue({ code: 'auth/requires-recent-login' });

      const res = await deleteCurrentUserAccount();

      expect(res.success).toBe(false);
      expect(res.error).toMatch(/segurança|login novamente|senha/i);
    });

    it('exclui conta com sucesso mesmo sem senha caso o usuário não forneça (ex: provedor externo)', async () => {
      const { auth } = await import('./firebase');
      auth.currentUser = mockCurrentUser;

      deleteDoc.mockResolvedValue();
      deleteUser.mockResolvedValue();

      const res = await deleteCurrentUserAccount();

      expect(res.success).toBe(true);
      expect(reauthenticateWithCredential).not.toHaveBeenCalled();
      expect(deleteDoc).toHaveBeenCalled();
      expect(deleteUser).toHaveBeenCalled();
    });
  });
});

