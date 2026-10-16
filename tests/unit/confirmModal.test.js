// @vitest-environment happy-dom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import React from 'react';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import ConfirmModal from '../../src/components/ConfirmModal';

describe('ConfirmModal Component (KAN-101)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    cleanup();
    document.body.innerHTML = '';
  });

  describe('Renderização básica e variantes', () => {
    it('não renderiza nada quando isOpen é false', () => {
      const { container } = render(
        React.createElement(ConfirmModal, {
          isOpen: false,
          title: 'Sair da Conta',
          message: 'Tem certeza?',
          onConfirm: () => {},
          onCancel: () => {}
        })
      );
      expect(container.innerHTML).toBe('');
      expect(document.querySelector('.modal-overlay-fixed')).toBeNull();
    });

    it('renderiza título, mensagem e rótulos dos botões quando isOpen é true', () => {
      render(
        React.createElement(ConfirmModal, {
          isOpen: true,
          title: 'Sair da Conta',
          message: 'Tem certeza que deseja sair do app?',
          confirmLabel: 'Sair Agora',
          cancelLabel: 'Cancelar e Ficar',
          onConfirm: () => {},
          onCancel: () => {}
        })
      );

      expect(screen.getByText('Sair da Conta')).toBeTruthy();
      expect(screen.getByText('Tem certeza que deseja sair do app?')).toBeTruthy();
      expect(screen.getByText('Sair Agora')).toBeTruthy();
      expect(screen.getByText('Cancelar e Ficar')).toBeTruthy();
    });

    it('aplica cores da variante danger por padrão', () => {
      render(
        React.createElement(ConfirmModal, {
          isOpen: true,
          title: 'Apagar Perfil',
          message: 'Esta ação é irreversível.',
          variant: 'danger',
          confirmLabel: 'Sim, Apagar',
          onConfirm: () => {},
          onCancel: () => {}
        })
      );

      const confirmBtn = screen.getByRole('button', { name: 'Sim, Apagar' });
      expect(confirmBtn.className).toContain('btn-danger');
    });

    it('aplica cores da variante warning para logout', () => {
      render(
        React.createElement(ConfirmModal, {
          isOpen: true,
          title: 'Sair da Conta',
          message: 'Você precisará fazer login novamente.',
          variant: 'warning',
          confirmLabel: 'Sair da Conta',
          onConfirm: () => {},
          onCancel: () => {}
        })
      );

      const confirmBtn = screen.getByRole('button', { name: 'Sair da Conta' });
      expect(confirmBtn.className).toContain('btn-warn');
    });

    it('aplica cores da variante primary', () => {
      render(
        React.createElement(ConfirmModal, {
          isOpen: true,
          title: 'Ação Normal',
          message: 'Deseja continuar?',
          variant: 'primary',
          confirmLabel: 'Prosseguir',
          onConfirm: () => {},
          onCancel: () => {}
        })
      );

      const confirmBtn = screen.getByRole('button', { name: 'Prosseguir' });
      expect(confirmBtn.className).toContain('btn-action');
    });
  });

  describe('Interações de cliques e teclado', () => {
    it('dispara onConfirm com valores padrão ao clicar no botão de confirmação', () => {
      const handleConfirm = vi.fn();
      render(
        React.createElement(ConfirmModal, {
          isOpen: true,
          title: 'Confirmar',
          message: 'Prosseguir?',
          confirmLabel: 'Confirmar Ação',
          onConfirm: handleConfirm,
          onCancel: () => {}
        })
      );

      fireEvent.click(screen.getByRole('button', { name: 'Confirmar Ação' }));
      expect(handleConfirm).toHaveBeenCalledTimes(1);
      expect(handleConfirm).toHaveBeenCalledWith({
        typedConfirmation: '',
        password: ''
      });
    });

    it('dispara onCancel ao clicar no botão de cancelamento', () => {
      const handleCancel = vi.fn();
      render(
        React.createElement(ConfirmModal, {
          isOpen: true,
          title: 'Confirmar',
          message: 'Prosseguir?',
          cancelLabel: 'Não, Cancelar',
          onConfirm: () => {},
          onCancel: handleCancel
        })
      );

      fireEvent.click(screen.getByRole('button', { name: 'Não, Cancelar' }));
      expect(handleCancel).toHaveBeenCalledTimes(1);
    });

    it('dispara onCancel ao clicar no botão de fechar (X)', () => {
      const handleCancel = vi.fn();
      render(
        React.createElement(ConfirmModal, {
          isOpen: true,
          title: 'Confirmar',
          message: 'Prosseguir?',
          onConfirm: () => {},
          onCancel: handleCancel
        })
      );

      fireEvent.click(screen.getByRole('button', { name: 'Fechar' }));
      expect(handleCancel).toHaveBeenCalledTimes(1);
    });

    it('dispara onCancel ao pressionar tecla Escape', () => {
      const handleCancel = vi.fn();
      render(
        React.createElement(ConfirmModal, {
          isOpen: true,
          title: 'Confirmar',
          message: 'Prosseguir?',
          onConfirm: () => {},
          onCancel: handleCancel
        })
      );

      fireEvent.keyDown(window, { key: 'Escape' });
      expect(handleCancel).toHaveBeenCalledTimes(1);
    });

    it('dispara onCancel ao clicar no overlay de fundo (backdrop)', () => {
      const handleCancel = vi.fn();
      render(
        React.createElement(ConfirmModal, {
          isOpen: true,
          title: 'Confirmar',
          message: 'Prosseguir?',
          onConfirm: () => {},
          onCancel: handleCancel
        })
      );

      const overlay = document.querySelector('.modal-overlay-fixed');
      expect(overlay).toBeTruthy();
      fireEvent.click(overlay);
      expect(handleCancel).toHaveBeenCalledTimes(1);
    });

    it('não dispara onCancel ao clicar no card interno do modal', () => {
      const handleCancel = vi.fn();
      render(
        React.createElement(ConfirmModal, {
          isOpen: true,
          title: 'Confirmar',
          message: 'Prosseguir?',
          onConfirm: () => {},
          onCancel: handleCancel
        })
      );

      const card = screen.getByRole('dialog');
      fireEvent.click(card);
      expect(handleCancel).not.toHaveBeenCalled();
    });
  });

  describe('Interação com requireConfirmationText', () => {
    it('mantém botão desabilitado inicialmente e só habilita ao digitar o texto correto', () => {
      const handleConfirm = vi.fn();
      render(
        React.createElement(ConfirmModal, {
          isOpen: true,
          title: 'Apagar Conta',
          message: 'Ação crítica.',
          confirmLabel: 'Excluir Agora',
          requireConfirmationText: 'EXCLUIR',
          confirmationPrompt: 'Digite EXCLUIR para confirmar:',
          onConfirm: handleConfirm,
          onCancel: () => {}
        })
      );

      const confirmBtn = screen.getByRole('button', { name: 'Excluir Agora' });
      const input = document.getElementById('confirm-input-text');

      expect(input).toBeTruthy();
      expect(confirmBtn.hasAttribute('disabled')).toBe(true);

      // Clicar no botão desabilitado não chama callback
      fireEvent.click(confirmBtn);
      expect(handleConfirm).not.toHaveBeenCalled();

      // Digitando texto incorreto
      fireEvent.change(input, { target: { value: 'NAO_EXCLUIR' } });
      expect(confirmBtn.hasAttribute('disabled')).toBe(true);

      // Digitando texto correto em minúsculas (validação case-insensitive)
      fireEvent.change(input, { target: { value: 'excluir' } });
      expect(confirmBtn.hasAttribute('disabled')).toBe(false);

      fireEvent.click(confirmBtn);
      expect(handleConfirm).toHaveBeenCalledWith({
        typedConfirmation: 'excluir',
        password: ''
      });
    });
  });

  describe('Interação com requirePassword', () => {
    it('mantém botão desabilitado e habilita ao preencher a senha', () => {
      const handleConfirm = vi.fn();
      render(
        React.createElement(ConfirmModal, {
          isOpen: true,
          title: 'Confirmar Ação Crítica',
          message: 'Confirme sua senha.',
          confirmLabel: 'Autorizar',
          requirePassword: true,
          passwordLabel: 'Senha de segurança:',
          passwordPlaceholder: 'Digite sua senha',
          onConfirm: handleConfirm,
          onCancel: () => {}
        })
      );

      const confirmBtn = screen.getByRole('button', { name: 'Autorizar' });
      const passwordInput = document.getElementById('confirm-input-password');

      expect(passwordInput).toBeTruthy();
      expect(confirmBtn.hasAttribute('disabled')).toBe(true);

      // Digitando senha
      fireEvent.change(passwordInput, { target: { value: 'minhasenha123' } });
      expect(confirmBtn.hasAttribute('disabled')).toBe(false);

      fireEvent.click(confirmBtn);
      expect(handleConfirm).toHaveBeenCalledWith({
        typedConfirmation: '',
        password: 'minhasenha123'
      });
    });

    it('exige texto de confirmação E senha quando ambos são solicitados', () => {
      const handleConfirm = vi.fn();
      render(
        React.createElement(ConfirmModal, {
          isOpen: true,
          title: 'Ação Extrema',
          message: 'Confirme ambos.',
          confirmLabel: 'Executar',
          requireConfirmationText: 'DELETAR',
          requirePassword: true,
          onConfirm: handleConfirm,
          onCancel: () => {}
        })
      );

      const confirmBtn = screen.getByRole('button', { name: 'Executar' });
      const textInput = document.getElementById('confirm-input-text');
      const passInput = document.getElementById('confirm-input-password');

      expect(confirmBtn.hasAttribute('disabled')).toBe(true);

      // Apenas texto
      fireEvent.change(textInput, { target: { value: 'DELETAR' } });
      expect(confirmBtn.hasAttribute('disabled')).toBe(true);

      // Agora preenche senha também
      fireEvent.change(passInput, { target: { value: 'senha123' } });
      expect(confirmBtn.hasAttribute('disabled')).toBe(false);

      fireEvent.click(confirmBtn);
      expect(handleConfirm).toHaveBeenCalledWith({
        typedConfirmation: 'DELETAR',
        password: 'senha123'
      });
    });
  });

  describe('Estado isLoading', () => {
    it('desabilita botões e impede fechamento por clique ou Escape durante loading', () => {
      const handleCancel = vi.fn();
      const handleConfirm = vi.fn();

      render(
        React.createElement(ConfirmModal, {
          isOpen: true,
          title: 'Processando Ação',
          message: 'Aguarde...',
          isLoading: true,
          onConfirm: handleConfirm,
          onCancel: handleCancel
        })
      );

      expect(screen.getByText('Processando...')).toBeTruthy();

      const buttons = screen.getAllByRole('button');
      buttons.forEach(btn => {
        expect(btn.hasAttribute('disabled')).toBe(true);
      });

      // Tentar Escape
      fireEvent.keyDown(window, { key: 'Escape' });
      expect(handleCancel).not.toHaveBeenCalled();

      // Tentar clique no backdrop
      const overlay = document.querySelector('.modal-overlay-fixed');
      fireEvent.click(overlay);
      expect(handleCancel).not.toHaveBeenCalled();
    });
  });
});
