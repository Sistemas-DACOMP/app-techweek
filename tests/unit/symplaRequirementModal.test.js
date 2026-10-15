// @vitest-environment happy-dom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import React from 'react';
import fs from 'fs';
import path from 'path';
import { render, screen, fireEvent, waitFor, cleanup } from '@testing-library/react';

vi.mock('../../src/lib/firebase', () => ({
  auth: {
    currentUser: {
      uid: 'uid-sympla-1',
      email: 'aluno@ufu.br',
    },
  },
}));

vi.mock('../../src/lib/sympla', () => ({
  SYMPLA_EVENT_URL: 'https://www.sympla.com.br/evento/test-techweek',
  verifySymplaTicket: vi.fn(),
}));

vi.mock('../../src/lib/userService', () => ({
  updateUserProfile: vi.fn().mockResolvedValue(true),
}));

import SymplaRequirementModal, { SYMPLA_SHEET_Z } from '../../src/components/SymplaRequirementModal';
import { verifySymplaTicket } from '../../src/lib/sympla';
import { updateUserProfile } from '../../src/lib/userService';

describe('SymplaRequirementModal (KAN-112)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    cleanup();
  });

  it('fica acima do painel da atividade (z-index 2001) para o aviso aparecer na frente', () => {
    expect(SYMPLA_SHEET_Z).toBeGreaterThan(2001);
  });

  it('retorna null quando isOpen=false e renderiza o modal com e-mail pré-preenchido quando isOpen=true', () => {
    const { container, rerender } = render(
      React.createElement(SymplaRequirementModal, {
        isOpen: false,
        onClose: vi.fn(),
      })
    );
    expect(container.innerHTML).toBe('');
    expect(screen.queryByRole('dialog')).toBeNull();

    rerender(
      React.createElement(SymplaRequirementModal, {
        isOpen: true,
        onClose: vi.fn(),
      })
    );

    const dialog = screen.getByRole('dialog');
    expect(dialog).toBeDefined();
    expect(screen.getByText('Vincule seu ingresso')).toBeDefined();
    expect(screen.getByText('Reservar vagas')).toBeDefined();
    expect(screen.getByText('QR do crachá')).toBeDefined();
    expect(screen.getByText('Pontos e ranking')).toBeDefined();

    const emailInput = screen.getByLabelText(/e-mail usado na compra do ingresso/i);
    expect(emailInput.value).toBe('aluno@ufu.br');
  });

  it('vincula ingresso com sucesso via verifySymplaTicket, atualiza perfil com updateUserProfile e chama onLinked', async () => {
    const onClose = vi.fn();
    const onLinked = vi.fn();

    verifySymplaTicket.mockResolvedValueOnce({
      verified: true,
      symplaTicket: {
        ticketNumber: 'SYM-9988',
        ticketName: 'Ingresso Geral',
        qrCodeData: 'SYM-9988',
        orderId: 'ORD-11',
      },
    });

    render(
      React.createElement(SymplaRequirementModal, {
        isOpen: true,
        onClose,
        onLinked,
      })
    );

    const submitBtn = screen.getByRole('button', { name: /vincular ingresso/i });
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(verifySymplaTicket).toHaveBeenCalledWith({ email: 'aluno@ufu.br' });
    });

    expect(updateUserProfile).toHaveBeenCalledWith('uid-sympla-1', {
      symplaTicket: {
        ticketNumber: 'SYM-9988',
        ticketName: 'Ingresso Geral',
        qrCodeData: 'SYM-9988',
        orderId: 'ORD-11',
      },
      hasSymplaTicket: true,
    });

    expect(await screen.findByText('Ingresso vinculado')).toBeDefined();

    const continueBtn = screen.getByRole('button', { name: /continuar/i });
    fireEvent.click(continueBtn);

    expect(onClose).toHaveBeenCalledTimes(1);
    expect(onLinked).toHaveBeenCalledTimes(1);
  });

  it('exibe erro quando o campo de e-mail está vazio ou quando verifySymplaTicket não encontra ingresso', async () => {
    verifySymplaTicket.mockResolvedValueOnce({
      verified: false,
      message: 'Nenhum ingresso localizado para este endereço.',
    });

    render(
      React.createElement(SymplaRequirementModal, {
        isOpen: true,
        onClose: vi.fn(),
      })
    );

    const emailInput = screen.getByLabelText(/e-mail usado na compra do ingresso/i);
    fireEvent.change(emailInput, { target: { value: '   ' } });

    const submitBtn = screen.getByRole('button', { name: /vincular ingresso/i });
    fireEvent.click(submitBtn);

    expect(screen.getByRole('alert').textContent).toContain(
      'Digite o e-mail que você usou para comprar o ingresso.'
    );
    expect(verifySymplaTicket).not.toHaveBeenCalled();

    // Agora informa um e-mail sem ingresso
    fireEvent.change(emailInput, { target: { value: 'outro@ufu.br' } });
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(verifySymplaTicket).toHaveBeenCalledWith({ email: 'outro@ufu.br' });
    });

    expect((await screen.findByRole('alert')).textContent).toContain(
      'Nenhum ingresso localizado para este endereço.'
    );
  });

  it('fecha o modal ao pressionar Escape ou clicar no backdrop (.ds-scrim)', () => {
    const onClose = vi.fn();
    render(
      React.createElement(SymplaRequirementModal, {
        isOpen: true,
        onClose,
      })
    );

    fireEvent.keyDown(window, { key: 'Escape' });
    expect(onClose).toHaveBeenCalledTimes(1);

    const scrim = document.body.querySelector('.ds-scrim');
    fireEvent.click(scrim);
    expect(onClose).toHaveBeenCalledTimes(2);
  });

  it('não abre o teclado virtual automaticamente ao montar e ajusta posição com visualViewport quando o teclado abre', () => {
    const filePath = path.resolve(process.cwd(), 'src/components/SymplaRequirementModal.jsx');
    const source = fs.readFileSync(filePath, 'utf-8');

    expect(source).not.toContain('inputRef.current?.focus');
    expect(source).not.toContain('autoFocus');
    expect(source).toContain('visualViewport');
    expect(source).toContain('scrollIntoView');
  });
});

