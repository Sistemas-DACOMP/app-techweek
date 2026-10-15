// @vitest-environment happy-dom
import { describe, it, expect, afterEach } from 'vitest';
import React from 'react';
import { render, screen, cleanup } from '@testing-library/react';
import Mascot from '../../src/components/Mascot';

describe('Mascot Component (DESIGN.md §8 Specs)', () => {
  afterEach(() => {
    cleanup();
  });

  it('renderiza Alan por padrão com gradiente azul, olhos abertos e acessibilidade adequada', () => {
    const { container } = render(
      React.createElement(Mascot, { size: 44, mood: 'happy' })
    );

    const img = screen.getByRole('img', { name: 'Mascote Alan (happy)' });
    expect(img).toBeTruthy();
    expect(img.style.width).toBe('44px');
    expect(img.style.height).toBe('44px');

    const stops = container.querySelectorAll('linearGradient stop');
    const stopColors = Array.from(stops).map((s) => s.getAttribute('stop-color'));
    expect(stopColors).toContain('#2563eb');
    expect(stopColors).toContain('#1e3a8a');
  });

  it('renderiza Ada com name="ada" ou color="purple" e gradiente roxo oficial', () => {
    const { container, rerender } = render(
      React.createElement(Mascot, { name: 'ada', size: 52, mood: 'waving' })
    );

    const img = screen.getByRole('img', { name: 'Mascote Ada (waving)' });
    expect(img.style.width).toBe('52px');
    expect(img.style.height).toBe('52px');

    const stops = container.querySelectorAll('linearGradient stop');
    const stopColors = Array.from(stops).map((s) => s.getAttribute('stop-color'));
    expect(stopColors).toContain('#9333ea');
    expect(stopColors).toContain('#4c1d95');

    rerender(React.createElement(Mascot, { color: 'purple' }));
    expect(screen.getByRole('img', { name: 'Mascote Ada' })).toBeTruthy();
  });

  it('aplica classes de mood, nome e classes extras, além de tamanhos numéricos e em string', () => {
    const { rerender } = render(
      React.createElement(Mascot, { mood: 'waving', className: 'custom-sponsor-mascot', size: '4rem' })
    );

    const img = screen.getByRole('img', { name: 'Mascote Alan (waving)' });
    expect(img.className).toContain('custom-sponsor-mascot');
    expect(img.className).toContain('mascot-mood-waving');
    expect(img.className).toContain('mascot-name-alan');
    expect(img.style.width).toBe('4rem');
    expect(img.style.height).toBe('4rem');

    [28, 44, 52, 56, 112, 150].forEach((size) => {
      rerender(React.createElement(Mascot, { size }));
      const el = screen.getByRole('img', { name: 'Mascote Alan' });
      expect(el.style.width).toBe(`${size}px`);
      expect(el.style.height).toBe(`${size}px`);
    });
  });

  it('controla a animação do braço direito em estado neutro vs acenando (isWaving / mood="waving" / mood="happy")', () => {
    const { container, rerender } = render(React.createElement(Mascot, {}));

    // Estado neutro: braço direito abaixado (M 160 100 L 185 130 L 170 180)
    expect(container.querySelector('.mascot-arm-waving')).toBeNull();
    const rightArmGroup = container.querySelector('.mascot-arm-right');
    expect(rightArmGroup).not.toBeNull();
    expect(rightArmGroup.querySelector('path').getAttribute('d')).toBe('M 160 100 L 185 130 L 170 180');
    expect(rightArmGroup.querySelector('rect').getAttribute('y')).toBe('170');

    // Estado acenando via prop isWaving
    rerender(React.createElement(Mascot, { isWaving: true }));
    const wavingGroup = container.querySelector('.mascot-arm-waving');
    expect(wavingGroup).not.toBeNull();
    expect(wavingGroup.querySelector('path').getAttribute('d')).toBe('M 160 100 L 185 70 L 170 30');
    expect(wavingGroup.querySelector('rect').getAttribute('y')).toBe('20');
  });

  it('cobre ambos os olhos e fecha as pálpebras quando isCoveringEyes=true ou mood é coveringEyes, sad ou error', () => {
    const moods = [
      { isCoveringEyes: true },
      { mood: 'coveringEyes' },
      { mood: 'sad' },
      { mood: 'error' },
    ];

    const { container, rerender } = render(React.createElement(Mascot, moods[0]));

    for (const props of moods) {
      rerender(React.createElement(Mascot, props));

      // Nenhum olho aberto (.mascot-eye) e nenhuma pupila (#0f172a) deve estar visível
      expect(container.querySelector('.mascot-eye-left')).toBeNull();
      expect(container.querySelector('.mascot-eye-right')).toBeNull();
      expect(container.querySelectorAll('rect[fill="#0f172a"]').length).toBe(0);

      // Caminhos das pálpebras fechadas e braços erguidos cobrindo os olhos
      const paths = Array.from(container.querySelectorAll('path')).map((p) => p.getAttribute('d'));
      expect(paths).toContain('M 40 100 L 25 70 L 75 85'); // Braço esquerdo cobrindo
      expect(paths).toContain('M 160 100 L 175 70 L 125 85'); // Braço direito cobrindo
      expect(paths).toContain('M 55 85 L 75 75 L 95 85'); // Olho esquerdo fechado
      expect(paths).toContain('M 105 85 L 125 75 L 145 85'); // Olho direito fechado
    }
  });

  it('abre apenas o olho direito e abaixa levemente o braço direito ao espiar (isCoveringEyes + isPeeking / mood="peeking")', () => {
    const { container } = render(
      React.createElement(Mascot, { isCoveringEyes: true, isPeeking: true })
    );

    // Olho esquerdo permanece fechado, mas o olho direito abre para espiar
    expect(container.querySelector('.mascot-eye-left')).toBeNull();
    expect(container.querySelector('.mascot-eye-right')).not.toBeNull();

    const pupils = container.querySelectorAll('rect[fill="#0f172a"]');
    expect(pupils.length).toBe(1);
    expect(pupils[0].getAttribute('x')).toBe('113');

    const paths = Array.from(container.querySelectorAll('path')).map((p) => p.getAttribute('d'));
    expect(paths).toContain('M 40 100 L 25 70 L 75 85'); // Braço esquerdo ainda cobre
    expect(paths).toContain('M 160 100 L 175 90 L 125 105'); // Braço direito abaixado para espiar
    expect(paths).toContain('M 55 85 L 75 75 L 95 85'); // Olho esquerdo fechado
    expect(paths).not.toContain('M 105 85 L 125 75 L 145 85'); // Olho direito não está fechado
  });

  it('desloca as pupilas e brilhos com lookOffset e lookOffsetY limitando (clamping) entre -8 e +8', () => {
    const { container, rerender } = render(
      React.createElement(Mascot, { lookOffset: 5, lookOffsetY: -4 })
    );

    // Base: pupila esq (63, 73), pupila dir (113, 73); brilho esq (77, 77), brilho dir (127, 77)
    let pupils = container.querySelectorAll('rect[fill="#0f172a"]');
    let glints = container.querySelectorAll('rect[fill="#fff"]');
    expect(pupils[0].getAttribute('x')).toBe('68'); // 63 + 5
    expect(pupils[0].getAttribute('y')).toBe('69'); // 73 - 4
    expect(pupils[1].getAttribute('x')).toBe('118'); // 113 + 5
    expect(pupils[1].getAttribute('y')).toBe('69'); // 73 - 4
    expect(glints[0].getAttribute('x')).toBe('82'); // 77 + 5
    expect(glints[0].getAttribute('y')).toBe('73'); // 77 - 4

    // Valores extremos positivos (> 8 devem ser limitados a +8)
    rerender(React.createElement(Mascot, { lookOffset: 50, lookOffsetY: 30 }));
    pupils = container.querySelectorAll('rect[fill="#0f172a"]');
    expect(pupils[0].getAttribute('x')).toBe('71'); // 63 + 8
    expect(pupils[0].getAttribute('y')).toBe('81'); // 73 + 8
    expect(pupils[1].getAttribute('x')).toBe('121'); // 113 + 8
    expect(pupils[1].getAttribute('y')).toBe('81'); // 73 + 8

    // Valores extremos negativos (< -8 devem ser limitados a -8)
    rerender(React.createElement(Mascot, { lookOffset: -40, lookOffsetY: -99 }));
    pupils = container.querySelectorAll('rect[fill="#0f172a"]');
    expect(pupils[0].getAttribute('x')).toBe('55'); // 63 - 8
    expect(pupils[0].getAttribute('y')).toBe('65'); // 73 - 8
    expect(pupils[1].getAttribute('x')).toBe('105'); // 113 - 8
    expect(pupils[1].getAttribute('y')).toBe('65'); // 73 - 8
  });
});
