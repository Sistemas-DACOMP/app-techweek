import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  signInWithEmailAndPassword,
  sendPasswordResetEmail,
  signOut,
  onAuthStateChanged
} from 'firebase/auth';

// Mock das funções do Firebase Auth
vi.mock('firebase/auth', () => ({
  signInWithEmailAndPassword: vi.fn(),
  sendPasswordResetEmail: vi.fn(),
  signOut: vi.fn(),
  onAuthStateChanged: vi.fn()
}));

vi.mock('./firebase', () => ({
  auth: { currentUser: { uid: 'mock-user-123', email: 'teste@ufu.br' } }
}));

import {
  loginWithEmailAndPassword,
  sendPasswordReset,
  logoutUser,
  mapAuthError,
  AUTH_MESSAGES,
  onAuthChange,
  getCurrentAuthUser
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

    it('deve traduzir auth/email-already-in-use para mensagem amigável', () => {
      const msg = mapAuthError({ code: 'auth/email-already-in-use' });
      expect(msg).toBe(AUTH_MESSAGES.email_already_in_use);
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

  describe('logoutUser', () => {
    it('deve encerrar a sessão e limpar flag local', async () => {
      signOut.mockResolvedValue();
      const mockStorage = {
        removeItem: vi.fn()
      };
      vi.stubGlobal('localStorage', mockStorage);
      vi.stubGlobal('window', { localStorage: mockStorage });

      const res = await logoutUser();

      expect(res.success).toBe(true);
      expect(signOut).toHaveBeenCalled();
      expect(mockStorage.removeItem).toHaveBeenCalledWith('facom_logged_in');

      vi.unstubAllGlobals();
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
});
