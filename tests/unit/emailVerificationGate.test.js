import { describe, it, expect, vi } from 'vitest';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import EmailVerificationGate from '../../src/components/EmailVerificationGate';

const mockReloadUser = vi.fn();
const mockResendVerification = vi.fn();
const mockLogout = vi.fn();

vi.mock('../../src/contexts/AuthContext', () => ({
  useAuth: () => ({
    user: {
      uid: 'user-teste-gate',
      email: 'participante.facom@ufu.br',
      emailVerified: false
    },
    reloadUser: mockReloadUser,
    resendVerification: mockResendVerification,
    logout: mockLogout
  })
}));

describe('EmailVerificationGate (KAN-116)', () => {
  it('renderiza o e-mail do participante, ações manuais, botão de reenvio e logout', () => {
    const html = renderToStaticMarkup(
      React.createElement(EmailVerificationGate, { onVerified: vi.fn() })
    );

    // E-mail do participante autenticado
    expect(html).toContain('participante.facom@ufu.br');

    // Título e mensagens instrucionais
    expect(html).toContain('Confirme seu');
    expect(html).toContain('e-mail');
    expect(html).toContain('Enviamos um link de confirmação oficial para:');

    // Botões de ação
    expect(html).toContain('Já confirmei meu e-mail');
    expect(html).toContain('Reenviar e-mail de confirmação');
    expect(html).toContain('Sair / Entrar com outra conta');
  });
});

