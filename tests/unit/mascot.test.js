import { describe, it, expect } from 'vitest';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import Mascot from '../../src/components/Mascot';

describe('Mascot Component (DESIGN.md §8 Specs)', () => {
  it('renderiza Alan por padrão com gradiente azul e acessibilidade adequada', () => {
    const html = renderToStaticMarkup(
      React.createElement(Mascot, { size: 44, mood: 'happy' })
    );

    // SVG container e acessibilidade
    expect(html).toContain('role="img"');
    expect(html).toContain('aria-label="Mascote Alan (happy)"');
    // SVG width & height inline ou style
    expect(html).toContain('width:44px');
    expect(html).toContain('height:44px');
    // Gradiente azul oficial Alan (DESIGN.md §8: #2563EB -> #1E3A8A)
    expect(html).toContain('#2563eb');
    expect(html).toContain('#1e3a8a');
  });

  it('renderiza Ada com nome="ada" e gradiente roxo oficial', () => {
    const html = renderToStaticMarkup(
      React.createElement(Mascot, { name: 'ada', size: 52, mood: 'waving' })
    );

    // Acessibilidade
    expect(html).toContain('aria-label="Mascote Ada (waving)"');
    // Tamanho customizado
    expect(html).toContain('width:52px');
    expect(html).toContain('height:52px');
    // Gradiente roxo oficial Ada (DESIGN.md §8: #9333EA -> #4C1D95)
    expect(html).toContain('#9333ea');
    expect(html).toContain('#4c1d95');
  });

  it('aplica classes de mood e classes extras', () => {
    const html = renderToStaticMarkup(
      React.createElement(Mascot, { mood: 'waving', className: 'custom-sponsor-mascot' })
    );

    expect(html).toContain('custom-sponsor-mascot');
    expect(html).toContain('mascot-mood-waving');
    expect(html).toContain('mascot-name-alan');
  });

  it('preserva tamanhos de design tokens (28, 44, 52, 56, 112, 150)', () => {
    [28, 44, 52, 56, 112, 150].forEach((size) => {
      const html = renderToStaticMarkup(
        React.createElement(Mascot, { size })
      );
      expect(html).toContain(`width:${size}px`);
      expect(html).toContain(`height:${size}px`);
    });
  });
});
