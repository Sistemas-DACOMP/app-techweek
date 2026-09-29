/**
 * Utilitário de segurança para garantir o encerramento completo e seguro
 * de todas as transmissões de mídia/câmeras abertas no navegador.
 */

const activeStreams = new Set();

// Intercepta e rastreia todas as streams abertas via getUserMedia para desligamento forçado
if (
  typeof window !== 'undefined' &&
  typeof navigator !== 'undefined' &&
  navigator.mediaDevices &&
  typeof navigator.mediaDevices.getUserMedia === 'function'
) {
  try {
    const origGetUserMedia = navigator.mediaDevices.getUserMedia.bind(navigator.mediaDevices);
    navigator.mediaDevices.getUserMedia = async function (...args) {
      const stream = await origGetUserMedia(...args);
      if (stream) {
        activeStreams.add(stream);
        if (typeof stream.getTracks === 'function') {
          stream.getTracks().forEach((track) => {
            track.addEventListener('ended', () => {
              const allEnded = stream.getTracks().every((t) => t.readyState === 'ended');
              if (allEnded) {
                activeStreams.delete(stream);
              }
            });
          });
        }
      }
      return stream;
    };
  } catch (_e) {
    // Falha silenciosa caso o ambiente restrinja monkey-patching
  }
}

/**
 * Registra manualmente uma stream de mídia para garantia de encerramento
 */
export function registerMediaStream(stream) {
  if (stream && typeof stream.getTracks === 'function') {
    activeStreams.add(stream);
  }
}

/**
 * Interrompe imediatamente todas as câmeras e faixas de mídia abertas
 * em qualquer parte da aplicação.
 */
export function stopAllMediaTracks() {
  try {
    // 1. Interrompe todas as streams capturadas globalmente
    activeStreams.forEach((stream) => {
      try {
        if (stream && typeof stream.getTracks === 'function') {
          stream.getTracks().forEach((track) => {
            try {
              track.stop();
            } catch (_e) {}
          });
        }
      } catch (_e) {}
    });
    activeStreams.clear();

    // 2. Interrompe faixas conectadas a elementos de vídeo no DOM
    if (typeof document !== 'undefined' && typeof document.querySelectorAll === 'function') {
      const videoElements = document.querySelectorAll('video');
      videoElements.forEach((video) => {
        if (video.srcObject && typeof video.srcObject.getTracks === 'function') {
          const tracks = video.srcObject.getTracks();
          tracks.forEach((track) => {
            try {
              track.stop();
            } catch (_e) {}
          });
          video.srcObject = null;
        }
      });
    }
  } catch (_err) {
    // Falha silenciosa para não interromper a experiência do usuário
  }
}
