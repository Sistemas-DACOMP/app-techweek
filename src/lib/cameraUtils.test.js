import { describe, it, expect, vi } from 'vitest';
import { stopAllMediaTracks, registerMediaStream } from './cameraUtils';

describe('stopAllMediaTracks', () => {
  it('funciona com seguranca quando o DOM nao esta disponivel ou nao ha midia ativa', () => {
    expect(() => stopAllMediaTracks()).not.toThrow();
  });

  it('interrompe e limpa todas as faixas de video e audio ativas conectadas a elementos do DOM', () => {
    const mockTrack1 = { stop: vi.fn() };
    const mockTrack2 = { stop: vi.fn() };

    // Mock do elemento video no document
    const mockVideoEl = {
      srcObject: {
        getTracks: vi.fn(() => [mockTrack1, mockTrack2])
      }
    };

    vi.stubGlobal('document', {
      querySelectorAll: vi.fn().mockReturnValue([mockVideoEl])
    });

    stopAllMediaTracks();

    expect(mockTrack1.stop).toHaveBeenCalled();
    expect(mockTrack2.stop).toHaveBeenCalled();
    expect(mockVideoEl.srcObject).toBeNull();

    vi.unstubAllGlobals();
  });

  it('interrompe streams registradas manualmente via registerMediaStream', () => {
    const mockTrack = { stop: vi.fn() };
    const mockStream = {
      getTracks: vi.fn(() => [mockTrack])
    };

    registerMediaStream(mockStream);
    stopAllMediaTracks();

    expect(mockTrack.stop).toHaveBeenCalled();
  });
});
