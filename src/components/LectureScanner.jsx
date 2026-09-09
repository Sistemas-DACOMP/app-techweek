import { useEffect, useState } from 'react';
import { ArrowLeft, QrCode, X } from 'lucide-react';
import { Html5Qrcode } from 'html5-qrcode';
export default function LectureScanner({
  onClose,
  onBack
}) {
  const [scanResult, setScanResult] = useState(null);
  const [rating, setRating] = useState(0);

  const scannerStyles = `
    #lecture-reader {
      width: 100% !important;
      height: 100% !important;
    }

    #lecture-reader > div {
      width: 100% !important;
      height: 100% !important;
    }

    #lecture-reader video {
      width: 100% !important;
      height: 100% !important;
      object-fit: cover !important;
      border-radius: 24px !important;
    }

    #lecture-reader img {
      display: none !important;
    }
`;

  useEffect(() => {
    if (scanResult) return;

    let isMounted = true;
    let scannerStarted = false;

    const scanner = new Html5Qrcode('lecture-reader');

    scanner
      .start(
        { facingMode: 'environment' },
        {
          fps: 10,
          aspectRatio: 1
        },
        (result) => {
          if (!isMounted) return;

          if (scannerStarted) {
            scanner.stop().catch(() => { });
            scannerStarted = false;
          }

          console.log('QR Code Lido:', result);
          setScanResult(result);
        },
        () => { }
      )
      .then(() => {
        if (!isMounted) {
          scanner.stop().catch(() => { });
          return;
        }

        scannerStarted = true;
      })
      .catch(() => { });

    return () => {
      isMounted = false;

      if (scannerStarted) {
        scanner.stop().catch(() => { });
        scannerStarted = false;
      }
    };
  }, [scanResult]);

  console.log('MOSTRANDO FORMULÁRIO', scanResult);

  if (scanResult) {
    return (
      <>
        <style>{scannerStyles}</style>

        <div
          onClick={onClose}
          style={{
            position: 'fixed',
            inset: 0,
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            zIndex: 1100,
            padding: '20px',
            background: 'rgba(5, 15, 35, 0.18)',
            backdropFilter: 'blur(14px)',
            WebkitBackdropFilter: 'blur(14px)'
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              width: '100%',
              maxWidth: '470px',
              padding: '30px',
              position: 'relative',
              background:
                'linear-gradient(145deg, rgba(25, 105, 180, 0.38), rgba(8, 35, 75, 0.48))',
              backdropFilter: 'blur(30px) saturate(140%)',
              WebkitBackdropFilter: 'blur(30px) saturate(140%)',
              border: '1px solid rgba(180, 225, 255, 0.25)',
              borderRadius: '30px',
              boxShadow:
                '0 30px 80px rgba(0, 10, 30, 0.45), 0 0 45px rgba(30, 140, 255, 0.12)',
              color: 'white'
            }}
          >
            <h2
              style={{
                margin: 0,
                textAlign: 'center'
              }}
            >
              Avalie a palestra
            </h2>

            <p
              style={{
                textAlign: 'center',
                color: 'rgba(255,255,255,0.6)',
                marginTop: '10px'
              }}
            >
              Dê uma nota de 1 a 5 para esta palestra.
            </p>

            <div
              style={{
                display: 'flex',
                justifyContent: 'center',
                gap: '10px',
                marginTop: '25px'
              }}
            >
              {[1, 2, 3, 4, 5].map((value) => (
                <button
                  key={value}
                  onClick={() => setRating(value)}
                  style={{
                    width: '48px',
                    height: '48px',
                    borderRadius: '14px',
                    border: '1px solid rgba(255,255,255,0.15)',
                    background:
                      rating >= value
                        ? 'rgba(100, 200, 255, 0.35)'
                        : 'rgba(255,255,255,0.08)',
                    color: 'white',
                    cursor: 'pointer',
                    fontSize: '16px'
                  }}
                >
                  {value}
                </button>
              ))}
            </div>

            <button
              disabled={rating === 0}
              style={{
                width: '100%',
                marginTop: '30px',
                padding: '14px',
                border: 'none',
                borderRadius: '14px',
                background:
                  rating === 0
                    ? 'rgba(255,255,255,0.1)'
                    : 'rgba(50, 160, 255, 0.8)',
                color: 'white',
                fontWeight: '700',
                cursor: rating === 0 ? 'not-allowed' : 'pointer'
              }}
            >
              CONFIRMAR PRESENÇA
            </button>
          </div>
        </div>
      </>
    );
  }

  return (
    <>

      <style>{scannerStyles}</style>
      <div
        onClick={onClose}
        style={{
          position: 'fixed',
          inset: 0,

          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',

          zIndex: 1100,
          padding: '20px',

          background: 'rgba(5, 15, 35, 0.18)',

          backdropFilter: 'blur(14px)',
          WebkitBackdropFilter: 'blur(14px)'
        }}
      >
        <div
          onClick={(e) => e.stopPropagation()}
          style={{
            width: '100%',
            maxWidth: '470px',

            padding: '30px',

            position: 'relative',

            background:
              'linear-gradient(145deg, rgba(25, 105, 180, 0.38), rgba(8, 35, 75, 0.48))',

            backdropFilter: 'blur(30px) saturate(140%)',
            WebkitBackdropFilter: 'blur(30px) saturate(140%)',

            border: '1px solid rgba(180, 225, 255, 0.25)',

            borderRadius: '30px',

            boxShadow:
              '0 30px 80px rgba(0, 10, 30, 0.45), 0 0 45px rgba(30, 140, 255, 0.12)',

            color: 'white'
          }}
        >

          {/* Brilho superior */}
          <div
            style={{
              position: 'absolute',
              top: 0,
              left: '12%',
              right: '12%',
              height: '1px',

              background:
                'linear-gradient(90deg, transparent, rgba(180,230,255,0.6), transparent)',

              opacity: 0.7
            }}
          />

          {/* Botão voltar */}
          <button
            onClick={onBack}
            aria-label="Voltar"
            style={{
              position: 'absolute',
              top: '18px',
              left: '18px',

              width: '38px',
              height: '38px',

              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',

              borderRadius: '50%',

              border: '1px solid rgba(255,255,255,0.15)',

              background: 'rgba(255,255,255,0.08)',

              color: 'rgba(255,255,255,0.8)',

              cursor: 'pointer',

              backdropFilter: 'blur(10px)',
              WebkitBackdropFilter: 'blur(10px)'
            }}
          >
            <ArrowLeft size={19} />
          </button>


          {/* Botão fechar */}
          <button
            onClick={onClose}
            aria-label="Fechar"
            style={{
              position: 'absolute',
              top: '18px',
              right: '18px',

              width: '38px',
              height: '38px',

              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',

              borderRadius: '50%',

              border: '1px solid rgba(255,255,255,0.15)',

              background: 'rgba(255,255,255,0.08)',

              color: 'rgba(255,255,255,0.8)',

              cursor: 'pointer',

              backdropFilter: 'blur(10px)',
              WebkitBackdropFilter: 'blur(10px)'
            }}
          >
            <X size={19} />
          </button>


          {/* Cabeçalho */}
          <div
            style={{
              textAlign: 'center',
              paddingTop: '18px'
            }}
          >

            <div
              style={{
                width: '58px',
                height: '58px',

                margin: '0 auto 16px',

                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',

                borderRadius: '18px',

                background:
                  'rgba(100, 190, 255, 0.12)',

                border:
                  '1px solid rgba(170, 220, 255, 0.18)',

                boxShadow:
                  '0 8px 25px rgba(30, 140, 255, 0.12)'
              }}
            >
              <QrCode
                size={30}
                strokeWidth={1.7}
                style={{
                  color: 'rgba(180, 230, 255, 0.95)'
                }}
              />
            </div>


            <span
              style={{
                display: 'block',

                fontSize: '11px',
                fontWeight: '700',

                letterSpacing: '1.5px',
                textTransform: 'uppercase',

                color: 'rgba(170, 220, 255, 0.8)'
              }}
            >
              Presença
            </span>


            <h2
              style={{
                margin: '7px 0 0',

                fontSize: '26px',
                lineHeight: '1.2',
                fontWeight: '700',

                letterSpacing: '-0.4px'
              }}
            >
              Escaneie o QR Code
            </h2>


            <p
              style={{
                marginTop: '10px',
                marginBottom: 0,

                fontSize: '14px',
                lineHeight: '1.5',

                color: 'rgba(255,255,255,0.58)'
              }}
            >
              Aponte a câmera para o QR Code
              exibido durante a palestra.
            </p>

          </div>


          {/* Área do scanner */}
          <div
            id="lecture-reader"
            style={{
              margin: '28px auto 0',

              width: '100%',
              maxWidth: '290px',
              aspectRatio: '1 / 1',

              position: 'relative',

              borderRadius: '24px',

              background:
                'rgba(3, 18, 45, 0.42)',

              border:
                '1px solid rgba(170, 220, 255, 0.16)',

              boxShadow:
                'inset 0 0 35px rgba(30, 140, 255, 0.08), 0 15px 35px rgba(0, 10, 30, 0.18)',

              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',

              overflow: 'hidden'
            }}
          >

          </div>

          {/* Instrução */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',

              gap: '8px',

              marginTop: '18px'
            }}
          >

            <span
              style={{
                width: '6px',
                height: '6px',

                borderRadius: '50%',

                background: 'rgba(100, 200, 255, 0.8)',

                boxShadow:
                  '0 0 10px rgba(80, 190, 255, 0.7)'
              }}
            />

            <span
              style={{
                fontSize: '12px',
                color: 'rgba(255,255,255,0.5)'
              }}
            >
              Câmera pronta para leitura
            </span>

          </div>

        </div>
      </div>
    </>
  );
}