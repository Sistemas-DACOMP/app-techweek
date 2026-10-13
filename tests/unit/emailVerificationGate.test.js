import { describe, it, expect, vi, beforeEach } from 'vitest';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import EmailVerificationGate, { validateEmailCorrection } from '../../src/components/EmailVerificationGate';
import { mapUpdateEmailError, requestEmailCorrection } from '../../src/lib/auth';

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

  describe('1. Renderização da Tela Principal', () => {
    it('renderiza o e-mail do participante, ações manuais, botão de reenvio, logout e botão de correção de e-mail', () => {
      const html = renderToStaticMarkup(
        React.createElement(EmailVerificationGate, { onVerified: vi.fn() })
      );

      // E-mail do participante autenticado
      expect(html).toContain('participante.facom@ufu.br');

      // Título e mensagens instrucionais
      expect(html).toContain('Confirme seu');
      expect(html).toContain('e-mail');
      expect(html).toContain('Enviamos um link de confirmação oficial para:');

      // Ponto de Ação Visual (KAN-116 UX): Botão Alterar e-mail
      expect(html).toContain('Digitou o e-mail errado?');
      expect(html).toContain('Alterar e-mail');

      // Botões de ação
      expect(html).toContain('Já confirmei meu e-mail');
      expect(html).toContain('Reenviar e-mail de confirmação');
      expect(html).toContain('Sair / Entrar com outra conta');

      // Modal fechado por padrão
      expect(html).not.toContain('Corrigir endereço de e-mail');
    });
  });

  describe('2. Modal de Correção de E-mail', () => {
    it('renderiza o modal completo quando aberto (acessibilidade, campos e botões)', () => {
      const html = renderToStaticMarkup(
        React.createElement(EmailVerificationGate, {
          onVerified: vi.fn(),
          initialModalOpen: true
        })
      );

      // Acessibilidade do Modal
      expect(html).toContain('role="dialog"');
      expect(html).toContain('aria-modal="true"');
      expect(html).toContain('modal-edit-email-title');

      // Conteúdo e Instruções
      expect(html).toContain('Corrigir endereço de e-mail');
      expect(html).toContain('Informe o e-mail correto para onde devemos enviar o link de confirmação.');

      // Campos de Entrada
      expect(html).toContain('Novo e-mail');
      expect(html).toContain('type="email"');
      expect(html).toContain('Sua senha atual');
      expect(html).toContain('type="password"');

      // Botões de Ação
      expect(html).toContain('Enviar confirmação para o novo e-mail');
      expect(html).toContain('Cancelar');
    });

    it('reflete o novo e-mail e exibe alerta de sucesso quando o e-mail pendente é atualizado', () => {
      const novoEmail = 'erick.correto@ufu.br';
      const html = renderToStaticMarkup(
        React.createElement(EmailVerificationGate, {
          onVerified: vi.fn(),
          initialPendingEmail: novoEmail,
          initialFeedback: {
            type: 'success',
            message: `Enviamos um novo link de confirmação para ${novoEmail}! Verifique sua caixa de entrada e spam.`
          }
        })
      );

      // Caixa de exibição reflete o novo e-mail pendente
      expect(html).toContain(novoEmail);
      // Alerta de sucesso visível com o e-mail corrigido
      expect(html).toContain(`Enviamos um novo link de confirmação para ${novoEmail}! Verifique sua caixa de entrada e spam.`);
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

      // Testa indiferença a maiúsculas e espaços
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
    it('traduz auth/email-already-in-use', () => {
      expect(mapUpdateEmailError({ code: 'auth/email-already-in-use' }))
        .toBe('Este e-mail já está em uso por outra conta.');
    });

    it('traduz auth/invalid-email', () => {
      expect(mapUpdateEmailError({ code: 'auth/invalid-email' }))
        .toBe('Por favor, insira um e-mail válido.');
    });

    it('traduz auth/wrong-password e auth/invalid-credential', () => {
      expect(mapUpdateEmailError({ code: 'auth/wrong-password' }))
        .toBe('Senha incorreta. Tente novamente.');
      expect(mapUpdateEmailError({ code: 'auth/invalid-credential' }))
        .toBe('Senha incorreta. Tente novamente.');
    });

    it('traduz auth/requires-recent-login', () => {
      expect(mapUpdateEmailError({ code: 'auth/requires-recent-login' }))
        .toBe('Por segurança, informe sua senha para alterar o e-mail.');
    });

    it('traduz auth/too-many-requests', () => {
      expect(mapUpdateEmailError({ code: 'auth/too-many-requests' }))
        .toBe('Muitas tentativas seguidas. Aguarde alguns instantes.');
    });

    it('traduz auth/same-email', () => {
      expect(mapUpdateEmailError({ code: 'auth/same-email' }))
        .toBe('O novo e-mail informado é idêntico ao atual.');
    });
  });

  describe('5. Simulação de Chamada de requestEmailCorrection', () => {
    it('chama requestEmailCorrection com o usuário, novo e-mail e senha', async () => {
      requestEmailCorrection.mockResolvedValueOnce({
        success: true,
        newEmail: 'correto@ufu.br'
      });

      const res = await requestEmailCorrection(mockUser, 'correto@ufu.br', 'senha123');

      expect(res.success).toBe(true);
      expect(res.newEmail).toBe('correto@ufu.br');
      expect(requestEmailCorrection).toHaveBeenCalledWith(mockUser, 'correto@ufu.br', 'senha123');
    });
  });
});


