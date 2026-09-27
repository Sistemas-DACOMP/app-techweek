/**
 * Utilitário de segurança para garantir o encerramento completo e seguro
 * de todas as transmissões de mídia/câmeras abertas no navegador.
 */
export function stopAllMediaTracks() {
  if (typeof window === 'undefined' || typeof document === 'undefined') return;

  try {
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
  } catch (_err) {
    // Falha silenciosa para nao interromper a experiencia do usuario
  }
}

