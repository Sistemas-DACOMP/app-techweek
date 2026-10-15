// @vitest-environment happy-dom
import { describe, it, expect, vi, afterEach } from 'vitest';
import React from 'react';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';

vi.mock('../../src/lib/firebase', () => ({
  auth: { currentUser: null },
  db: {},
  storage: {},
}));

import { RegisterAvatarSection } from '../../src/pages/Register';

/**
 * Teste unitário para a estrutura real do avatar de perfil e ícone de câmera (KAN-103).
 * Garante que o ícone flutuante da câmera não fique dentro do container com overflow-hidden
 * e valida as interações de adicionar, trocar e remover foto no componente real.
 */
describe('Register Avatar Camera Icon Layout & Actions (KAN-103)', () => {
  afterEach(() => {
    cleanup();
  });

  it('renderiza placeholder sem foto e mantém o badge da câmera fora do container com overflow-hidden', () => {
    const onPickAvatar = vi.fn();
    const onRemoveAvatar = vi.fn();

    render(
      React.createElement(RegisterAvatarSection, {
        avatarPreview: null,
        onPickAvatar,
        onRemoveAvatar,
      })
    );

    const frame = screen.getByTestId('avatar-circle-frame');
    const badge = screen.getByTestId('avatar-camera-badge');

    expect(frame.className).toContain('overflow-hidden');
    expect(frame.querySelector('img')).toBeNull();

    // O selo da câmera é irmão (sibling) e nunca filho do container com overflow-hidden (KAN-103)
    expect(frame.contains(badge)).toBe(false);
    expect(badge.className).toContain('absolute');

    const buttons = screen.getAllByRole('button', { name: /adicionar foto de perfil/i });
    expect(buttons).toHaveLength(2);
    expect(screen.queryByRole('button', { name: /remover/i })).toBeNull();

    fireEvent.click(buttons[0]);
    expect(onPickAvatar).toHaveBeenCalledTimes(1);
  });

  it('renderiza imagem de preview dentro da moldura, preserva o badge fora do overflow-hidden e permite trocar ou remover foto', () => {
    const previewUrl = 'data:image/jpeg;base64,/9j/4AAQSkZJRg==';
    const onPickAvatar = vi.fn();
    const onRemoveAvatar = vi.fn();

    render(
      React.createElement(RegisterAvatarSection, {
        avatarPreview: previewUrl,
        onPickAvatar,
        onRemoveAvatar,
      })
    );

    const frame = screen.getByTestId('avatar-circle-frame');
    const badge = screen.getByTestId('avatar-camera-badge');

    const img = frame.querySelector('img');
    expect(img).not.toBeNull();
    expect(img.getAttribute('src')).toBe(previewUrl);

    // Garante que o badge da câmera permanece fora do elemento com overflow-hidden
    expect(frame.contains(badge)).toBe(false);
    expect(frame.parentElement.contains(badge)).toBe(true);

    const changeBtn = screen.getByRole('button', { name: /^trocar foto$/i });
    const removeBtn = screen.getByRole('button', { name: /remover/i });

    fireEvent.click(changeBtn);
    expect(onPickAvatar).toHaveBeenCalledTimes(1);

    fireEvent.click(removeBtn);
    expect(onRemoveAvatar).toHaveBeenCalledTimes(1);
  });
});

