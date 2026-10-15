// @vitest-environment happy-dom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import React from 'react';
import { render, screen, fireEvent, cleanup, act } from '@testing-library/react';
import EmailVerificationGate, { validateEmailCorrection } from '../../src/components/EmailVerificationGate';
import { mapUpdateEmailError, requestEmailCorrection } from '../../src/lib/auth';

vi.mock('../../src/lib/firebase', () => ({
  auth: {},
  db: {},
  storage: {}
}));

const mockReloadUser = vi.fn();
const mockResendVerification = vi.fn();
const mockLogout = vi.fn();

const mockUser = {
  uid: 'user-teste-gate',
  email: 'participante.facom@ufu.br',
  emailVerified: false,
  providerData: [{ providerId: 'password' }]
};

vi.mock('../../src/contexts/AuthContext', () => ({
  useAuth: () => ({
    user: mockUser,
    reloadUser: mockReloadUser,
    resendVerification: mockResendVerification,
    logout: mockLogout
  })
}));

vi.mock('../../src/lib/auth', async (importOriginal) => {
  const actual = await importOriginal();
  return {
    ...actual,
    requestEmailCorrection: vi.fn(),
    mapUpdateEmailError: actual.mapUpdateEmailError
  };
});

describe('EmailVerificationGate (KAN-116)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    cleanup();
    vi.useRealTimers();
  });

  describe('1. Renderização e Ações Principais do Gate', () => {
    it('renderiza o e-mail do participante, botões de ação e mantém modal fechado por padrão', () => {
      render(React.createElement(EmailVerificationGate, { onVerified: vi.fn() }));

      expect(screen.getByText('participante.facom@ufu.br')).toBeTruthy();
      expect(screen.getByText(/Enviamos um link de confirmação oficial para:/i)).toBeTruthy();
      expect(screen.getByRole('button', { name: /Digitou o e-mail errado\?/i })).toBeTruthy();
      expect(screen.getByRole('button', { name: /Já confirmei meu e-mail/i })).toBeTruthy();
      expect(screen.getByRole('button', { name: /Reenviar e-mail de confirmação/i })).toBeTruthy();
      expect(screen.getByRole('button', { name: /Sair \/ Entrar com outra conta/i })).toBeTruthy();
      expect(screen.queryByRole('dialog')).toBeNull();
    });

    it('exibe alerta informativo quando "Já confirmei meu e-mail" é clicado e o e-mail ainda não foi verificado', async () => {
      mockReloadUser.mockResolvedValueOnce({ ...mockUser, emailVerified: false });
      const onVerified = vi.fn();

      render(React.createElement(EmailVerificationGate, { onVerified }));

      await act(async () => {
        fireEvent.click(screen.getByRole('button', { name: /Já confirmei meu e-mail/i }));
      });

      expect(mockReloadUser).toHaveBeenCalledTimes(1);
      expect(onVerified).not.toHaveBeenCalled();
      expect(screen.getByRole('alert').textContent).toContain('Seu e-mail ainda não consta como verificado.');
    });

    it('exibe sucesso e dispara onVerified após 800ms quando "Já confirmei meu e-mail" confirma verificação', async () => {
      vi.useFakeTimers();
      mockReloadUser.mockResolvedValueOnce({ ...mockUser, emailVerified: true });
      const onVerified = vi.fn();

      render(React.createElement(EmailVerificationGate, { onVerified }));

      await act(async () => {
        fireEvent.click(screen.getByRole('button', { name: /Já confirmei meu e-mail/i }));
      });

      expect(mockReloadUser).toHaveBeenCalledTimes(1);
      expect(screen.getByRole('alert').textContent).toContain('E-mail confirmado com sucesso! Redirecionando...');
      expect(onVerified).not.toHaveBeenCalled();

      act(() => {
        vi.advanceTimersByTime(800);
      });

      expect(onVerified).toHaveBeenCalledTimes(1);
    });

    it('exibe mensagem de erro quando reloadUser falha na verificação manual', async () => {
      mockReloadUser.mockRejectedValueOnce(new Error('Network error'));
      const onVerified = vi.fn();

      render(React.createElement(EmailVerificationGate, { onVerified }));

      await act(async () => {
        fireEvent.click(screen.getByRole('button', { name: /Já confirmei meu e-mail/i }));
      });

      expect(mockReloadUser).toHaveBeenCalledTimes(1);
      expect(onVerified).not.toHaveBeenCalled();
      expect(screen.getByRole('alert').textContent).toContain('Erro ao verificar o status da conta.');
    });

    it('verifica automaticamente ao focar na janela (window.focus) e dispara onVerified se confirmado', async () => {
      vi.useFakeTimers();
      mockReloadUser.mockResolvedValueOnce({ ...mockUser, emailVerified: true });
      const onVerified = vi.fn();

      render(React.createElement(EmailVerificationGate, { onVerified }));

      await act(async () => {
        window.dispatchEvent(new Event('focus'));
      });

      expect(mockReloadUser).toHaveBeenCalledTimes(1);
      expect(screen.getByRole('alert').textContent).toContain('E-mail confirmado com sucesso! Redirecionando...');

      act(() => {
        vi.advanceTimersByTime(800);
      });

      expect(onVerified).toHaveBeenCalledTimes(1);
    });

    it('reenvia e-mail de confirmação, inicia cooldown de 60 segundos e reabilita botão ao final', async () => {
      vi.useFakeTimers();
      mockResendVerification.mockResolvedValueOnce({
        success: true,
        message: 'E-mail de confirmação reenviado com sucesso!'
      });

      render(React.createElement(EmailVerificationGate, { onVerified: vi.fn() }));

      const resendBtn = screen.getByRole('button', { name: /Reenviar e-mail de confirmação/i });
      expect(resendBtn.disabled).toBe(false);

      await act(async () => {
        fireEvent.click(resendBtn);
      });

      expect(mockResendVerification).toHaveBeenCalledTimes(1);
      expect(screen.getByRole('alert').textContent).toContain('E-mail de confirmação reenviado com sucesso!');

      const cooldownBtn = screen.getByRole('button', { name: /Reenviar em 60s/i });
      expect(cooldownBtn.disabled).toBe(true);

      // Avança 1 segundo por vez para verificar a contagem regressiva
      act(() => {
        vi.advanceTimersByTime(1000);
      });
      expect(screen.getByRole('button', { name: /Reenviar em 59s/i }).disabled).toBe(true);

      // Avança os 59 segundos restantes
      for (let i = 0; i < 59; i++) {
        act(() => {
          vi.advanceTimersByTime(1000);
        });
      }

      const enabledAgainBtn = screen.getByRole('button', { name: /Reenviar e-mail de confirmação/i });
      expect(enabledAgainBtn.disabled).toBe(false);
    });

    it('exibe erro sem ativar cooldown quando resendVerification retorna falha', async () => {
      mockResendVerification.mockResolvedValueOnce({
        success: false,
        error: 'Limite de envios excedido.'
      });

      render(React.createElement(EmailVerificationGate, { onVerified: vi.fn() }));

      await act(async () => {
        fireEvent.click(screen.getByRole('button', { name: /Reenviar e-mail de confirmação/i }));
      });

      expect(mockResendVerification).toHaveBeenCalledTimes(1);
      expect(screen.getByRole('alert').textContent).toContain('Limite de envios excedido.');
      expect(screen.getByRole('button', { name: /Reenviar e-mail de confirmação/i }).disabled).toBe(false);
    });

    it('aciona logout ao clicar em "Sair / Entrar com outra conta"', async () => {
      mockLogout.mockResolvedValueOnce(undefined);

      render(React.createElement(EmailVerificationGate, { onVerified: vi.fn() }));

      await act(async () => {
        fireEvent.click(screen.getByRole('button', { name: /Sair \/ Entrar com outra conta/i }));
      });

      expect(mockLogout).toHaveBeenCalledTimes(1);
    });
  });

  describe('2. Modal Interativo de Correção de E-mail', () => {
    it('abre o modal ao clicar em "Alterar e-mail" e fecha ao clicar em "Cancelar" ou pressionar Escape', () => {
      render(React.createElement(EmailVerificationGate, { onVerified: vi.fn() }));

      fireEvent.click(screen.getByRole('button', { name: /Digitou o e-mail errado\?/i }));

      const dialog = screen.getByRole('dialog');
      expect(dialog).toBeTruthy();
      expect(screen.getByText('Corrigir endereço de e-mail')).toBeTruthy();

      // Fecha com Cancelar
      fireEvent.click(screen.getByRole('button', { name: 'Cancelar' }));
      expect(screen.queryByRole('dialog')).toBeNull();

      // Abre novamente e fecha com Escape
      fireEvent.click(screen.getByRole('button', { name: /Digitou o e-mail errado\?/i }));
      expect(screen.getByRole('dialog')).toBeTruthy();
      fireEvent.keyDown(window, { key: 'Escape' });
      expect(screen.queryByRole('dialog')).toBeNull();
    });

    it('valida e barra submissão no modal se o novo e-mail for idêntico ao atual', async () => {
      render(React.createElement(EmailVerificationGate, { onVerified: vi.fn(), initialModalOpen: true }));

      const emailInput = screen.getByLabelText(/Novo e-mail/i);
      fireEvent.change(emailInput, { target: { value: 'participante.facom@ufu.br' } });

      await act(async () => {
        fireEvent.submit(emailInput.closest('form'));
      });

      expect(requestEmailCorrection).not.toHaveBeenCalled();
      expect(screen.getByRole('alert').textContent).toContain('O novo e-mail informado é idêntico ao atual.');
    });

    it('submete novo e-mail válido e senha para requestEmailCorrection, fecha modal e atualiza e-mail exibido', async () => {
      requestEmailCorrection.mockResolvedValueOnce({
        success: true,
        newEmail: 'erick.correto@ufu.br'
      });

      render(React.createElement(EmailVerificationGate, { onVerified: vi.fn() }));

      fireEvent.click(screen.getByRole('button', { name: /Digitou o e-mail errado\?/i }));

      const emailInput = screen.getByLabelText(/Novo e-mail/i);
      const passwordInput = screen.getByLabelText(/Sua senha atual/i);

      fireEvent.change(emailInput, { target: { value: '  Erick.Correto@UFU.BR  ' } });
      fireEvent.change(passwordInput, { target: { value: 'senhaSegura123' } });

      await act(async () => {
        fireEvent.submit(emailInput.closest('form'));
      });

      expect(requestEmailCorrection).toHaveBeenCalledWith(
        mockUser,
        'erick.correto@ufu.br',
        'senhaSegura123'
      );
      expect(screen.queryByRole('dialog')).toBeNull();
      expect(screen.getByText('erick.correto@ufu.br')).toBeTruthy();
      expect(screen.getByRole('alert').textContent).toContain(
        'Enviamos um novo link de confirmação para erick.correto@ufu.br!'
      );
      expect(screen.getByRole('button', { name: /Reenviar em 60s/i }).disabled).toBe(true);
    });
  });

  describe('3. Validação de Dados de Entrada (validateEmailCorrection)', () => {
    it('rejeita e-mail vazio ou com formato inválido', () => {
      const resVazio = validateEmailCorrection('', 'velho@ufu.br');
      expect(resVazio.valid).toBe(false);
      expect(resVazio.error).toBe('Por favor, insira um e-mail válido.');

      const resInvalido = validateEmailCorrection('usuario@invalido', 'velho@ufu.br');
      expect(resInvalido.valid).toBe(false);
      expect(resInvalido.error).toBe('Por favor, insira um e-mail válido.');
    });

    it('rejeita se o novo e-mail for idêntico ao e-mail atual cadastrado', () => {
      const res = validateEmailCorrection('participante.facom@ufu.br', 'participante.facom@ufu.br');
      expect(res.valid).toBe(false);
      expect(res.error).toBe('O novo e-mail informado é idêntico ao atual.');

      const resCase = validateEmailCorrection('  PARTICIPANTE.FACOM@UFU.BR  ', 'participante.facom@ufu.br');
      expect(resCase.valid).toBe(false);
      expect(resCase.error).toBe('O novo e-mail informado é idêntico ao atual.');
    });

    it('aceita e normaliza e-mail válido e diferente do atual', () => {
      const res = validateEmailCorrection('  Erick.Novo@UFU.BR  ', 'participante.facom@ufu.br');
      expect(res.valid).toBe(true);
      expect(res.email).toBe('erick.novo@ufu.br');
    });
  });

  describe('4. Tratamento Amigável de Erros (mapUpdateEmailError)', () => {
    it('traduz códigos de erro do Firebase Auth ao atualizar e-mail', () => {
      expect(mapUpdateEmailError({ code: 'auth/email-already-in-use' }))
        .toBe('Este e-mail já está em uso por outra conta.');
      expect(mapUpdateEmailError({ code: 'auth/invalid-email' }))
        .toBe('Por favor, insira um e-mail válido.');
      expect(mapUpdateEmailError({ code: 'auth/wrong-password' }))
        .toBe('Senha incorreta. Tente novamente.');
      expect(mapUpdateEmailError({ code: 'auth/invalid-credential' }))
        .toBe('Senha incorreta. Tente novamente.');
      expect(mapUpdateEmailError({ code: 'auth/requires-recent-login' }))
        .toBe('Por segurança, informe sua senha para alterar o e-mail.');
      expect(mapUpdateEmailError({ code: 'auth/too-many-requests' }))
        .toBe('Muitas tentativas seguidas. Aguarde alguns instantes.');
      expect(mapUpdateEmailError({ code: 'auth/same-email' }))
        .toBe('O novo e-mail informado é idêntico ao atual.');
    });
  });
});


