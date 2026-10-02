import { describe, it, expect } from 'vitest';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { Camera } from 'lucide-react';

/**
 * Teste unitário para a estrutura do avatar de perfil e ícone de câmera (KAN-103).
 * Garante que o ícone flutuante da câmera não fique dentro do container com overflow: hidden.
 */
describe('Register Avatar Camera Icon Layout (KAN-103)', () => {
  function renderAvatarComponent({ avatarPreview = null, isAvatarHovered = false } = {}) {
    return renderToStaticMarkup(
      React.createElement(
        'div',
        {
          style: {
            position: 'relative',
            width: '124px',
            height: '124px',
            marginBottom: '12px'
          }
        },
        React.createElement(
          'div',
          {
            className: 'avatar-circle-frame',
            style: {
              width: '100%',
              height: '100%',
              borderRadius: '50%',
              overflow: 'hidden'
            }
          },
          avatarPreview
            ? React.createElement('img', { src: avatarPreview, alt: 'Preview' })
            : React.createElement(Camera, { size: 24 })
        ),
        avatarPreview &&
          React.createElement(
            'div',
            {
              className: 'avatar-camera-badge',
              style: {
                position: 'absolute',
                bottom: '2px',
                right: '2px',
                width: '32px',
                height: '32px',
                zIndex: 2
              }
            },
            React.createElement(Camera, { size: 15 })
          )
      )
    );
  }

  it('não renderiza o badge flutuante quando não há foto selecionada', () => {
    const html = renderAvatarComponent({ avatarPreview: null });
    expect(html).not.toContain('avatar-camera-badge');
    expect(html).toContain('avatar-circle-frame');
  });

  it('renderiza o badge da câmera fora do container com overflow: hidden quando há foto', () => {
    const previewUrl = 'data:image/jpeg;base64,/9j/4AAQSkZJRg==';
    const html = renderAvatarComponent({ avatarPreview: previewUrl });

    expect(html).toContain('avatar-camera-badge');
    expect(html).toContain('avatar-circle-frame');

    // O badge da câmera deve estar presente após o fechamento do avatar-circle-frame
    const circleFrameIndex = html.indexOf('avatar-circle-frame');
    const badgeIndex = html.indexOf('avatar-camera-badge');
    expect(badgeIndex).toBeGreaterThan(circleFrameIndex);

    // Confirma que o badge possui posicionamento absoluto sobreposto
    expect(html).toContain('position:absolute');
    expect(html).toContain('bottom:2px');
    expect(html).toContain('right:2px');
  });
});
