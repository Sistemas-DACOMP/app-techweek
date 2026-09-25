import { useEffect } from 'react';
import { lockScroll, unlockScroll } from '../lib/scrollLock';

/**
 * Hook para travar a rolagem de fundo enquanto um modal/pop-up estiver ativo.
 *
 * @param {boolean} isLocked - Se true, bloqueia a rolagem; ao desmontar ou receber false, restaura.
 */
export function useScrollLock(isLocked = false) {
  useEffect(() => {
    if (!isLocked) return;

    lockScroll();

    return () => {
      unlockScroll();
    };
  }, [isLocked]);
}

