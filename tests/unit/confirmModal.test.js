import { describe, it, expect, vi } from 'vitest';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import ConfirmModal from '../../src/components/ConfirmModal';

describe('ConfirmModal Component (KAN-101)', () => {
  it('não renderiza nada quando isOpen é false', () => {
    const html = renderToStaticMarkup(
      React.createElement(ConfirmModal, {
        isOpen: false,
        title: 'Sair da Conta',
        message: 'Tem certeza?',
        onConfirm: () => {},
        onCancel: () => {}
      })
    );
    expect(html).toBe('');
  });

  it('renderiza título, mensagem e rótulos dos botões quando isOpen é true', () => {
    const html = renderToStaticMarkup(
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

    expect(html).toContain('Sair da Conta');
    expect(html).toContain('Tem certeza que deseja sair do app?');
    expect(html).toContain('Sair Agora');
    expect(html).toContain('Cancelar e Ficar');
    expect(html).toContain('modal-overlay-fixed');
    expect(html).toContain('modal-card-fixed');
  });

  it('aplica cores da variante danger por padrão', () => {
    const html = renderToStaticMarkup(
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

    expect(html).toContain('background:#dc2626');
  });

  it('aplica cores da variante warning para logout', () => {
    const html = renderToStaticMarkup(
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

    expect(html).toContain('background:#d97706');
  });

  it('exibe estado de carregamento quando isLoading é true', () => {
    const html = renderToStaticMarkup(
      React.createElement(ConfirmModal, {
        isOpen: true,
        title: 'Processando',
        message: 'Aguarde um instante...',
        isLoading: true,
        onConfirm: () => {},
        onCancel: () => {}
      })
    );

    expect(html).toContain('Processando...');
    expect(html).toContain('disabled=""');
  });
});
