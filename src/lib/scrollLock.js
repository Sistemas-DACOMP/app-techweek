/**
 * Gerenciador de bloqueio de rolagem e touch para modais e pop-ups.
 * Suporta contagem de referências para múltiplos modais abertos simultaneamente.
 */
let activeLocks = 0;
let originalBodyOverflow = '';
let originalBodyTouchAction = '';

export function lockScroll() {
  if (typeof document === 'undefined') return;

  if (activeLocks === 0) {
    originalBodyOverflow = document.body.style.overflow;
    originalBodyTouchAction = document.body.style.touchAction;

    document.body.classList.add('modal-open');
    document.body.style.overflow = 'hidden';
    document.body.style.touchAction = 'none';

    const containers = document.querySelectorAll('.page-container, .login-container');
    containers.forEach(el => {
      el.dataset.prevOverflow = el.style.overflow || '';
      el.dataset.prevTouchAction = el.style.touchAction || '';
      el.style.overflow = 'hidden';
      el.style.touchAction = 'none';
    });
  }

  activeLocks += 1;
}

export function unlockScroll() {
  if (typeof document === 'undefined') return;

  activeLocks = Math.max(0, activeLocks - 1);

  if (activeLocks === 0) {
    document.body.classList.remove('modal-open');
    document.body.style.overflow = originalBodyOverflow;
    document.body.style.touchAction = originalBodyTouchAction;

    const containers = document.querySelectorAll('.page-container, .login-container');
    containers.forEach(el => {
      el.style.overflow = el.dataset.prevOverflow || '';
      el.style.touchAction = el.dataset.prevTouchAction || '';
      delete el.dataset.prevOverflow;
      delete el.dataset.prevTouchAction;
    });
  }
}

export function resetScrollLock() {
  activeLocks = 0;
  if (typeof document !== 'undefined') {
    document.body.classList.remove('modal-open');
    document.body.style.overflow = '';
    document.body.style.touchAction = '';
  }
}

export function isScrollLocked() {
  return activeLocks > 0;
}

