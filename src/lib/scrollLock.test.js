import { describe, it, expect, beforeEach } from 'vitest';
import { lockScroll, unlockScroll, isScrollLocked, resetScrollLock } from './scrollLock';

describe('scrollLock module (KAN-77)', () => {
  let mockBody;
  let mockContainers;

  beforeEach(() => {
    mockContainers = [];
    mockBody = {
      classList: {
        classes: new Set(),
        add(c) { this.classes.add(c); },
        remove(c) { this.classes.delete(c); },
        contains(c) { return this.classes.has(c); }
      },
      style: {
        overflow: '',
        touchAction: ''
      }
    };

    globalThis.document = {
      body: mockBody,
      querySelectorAll: (selector) => {
        if (selector.includes('page-container')) {
          return mockContainers;
        }
        return [];
      }
    };

    resetScrollLock();
  });

  it('deve bloquear a rolagem do body ao chamar lockScroll', () => {
    expect(isScrollLocked()).toBe(false);

    lockScroll();
    expect(isScrollLocked()).toBe(true);
    expect(mockBody.classList.contains('modal-open')).toBe(true);
    expect(mockBody.style.overflow).toBe('hidden');
    expect(mockBody.style.touchAction).toBe('none');

    unlockScroll();
    expect(isScrollLocked()).toBe(false);
    expect(mockBody.classList.contains('modal-open')).toBe(false);
    expect(mockBody.style.overflow).toBe('');
    expect(mockBody.style.touchAction).toBe('');
  });

  it('deve gerenciar múltiplos modais com contador de referências', () => {
    // Abre modal 1 (ex: Challenge form)
    lockScroll();
    expect(isScrollLocked()).toBe(true);

    // Abre modal 2 sobreposto (ex: FeedbackModal de erro/sucesso)
    lockScroll();
    expect(isScrollLocked()).toBe(true);

    // Fecha modal 2
    unlockScroll();
    // Rolagem ainda deve continuar bloqueada porque modal 1 ainda está aberto
    expect(isScrollLocked()).toBe(true);
    expect(mockBody.style.overflow).toBe('hidden');

    // Fecha modal 1
    unlockScroll();
    expect(isScrollLocked()).toBe(false);
    expect(mockBody.style.overflow).toBe('');
  });

  it('deve travar e destravar containers com classe .page-container', () => {
    const pageContainer = {
      dataset: {},
      style: {
        overflow: 'auto',
        touchAction: 'pan-y'
      }
    };
    mockContainers.push(pageContainer);

    lockScroll();
    expect(pageContainer.style.overflow).toBe('hidden');
    expect(pageContainer.style.touchAction).toBe('none');

    unlockScroll();
    expect(pageContainer.style.overflow).toBe('auto');
    expect(pageContainer.style.touchAction).toBe('pan-y');
  });
});

