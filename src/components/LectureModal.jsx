import { Clock, MapPin, QrCode, X } from 'lucide-react';

export default function LectureModal({
  lecture,
  onClose,
  onValidate
}) {
  if (!lecture) {
    return null;
  }

  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed',
        inset: 0,

        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',

        zIndex: 1000,
        padding: '20px',

        background: 'rgba(5, 15, 35, 0.18)',

        backdropFilter: 'blur(14px)',
        WebkitBackdropFilter: 'blur(14px)',

        animation: 'lectureOverlayIn 0.25s ease-out'
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: '100%',
          maxWidth: '470px',

          padding: '30px',

          position: 'relative',

          /* Liquid Glass azul */
          background:
            'linear-gradient(145deg, rgba(25, 105, 180, 0.38), rgba(8, 35, 75, 0.48))',

          backdropFilter: 'blur(30px) saturate(140%)',
          WebkitBackdropFilter: 'blur(30px) saturate(140%)',

          /* Borda de vidro */
          border: '1px solid rgba(180, 225, 255, 0.25)',

          borderRadius: '30px',

          /* Profundidade + glow */
          boxShadow:
            '0 30px 80px rgba(0, 10, 30, 0.45), 0 0 45px rgba(30, 140, 255, 0.12)',

          color: 'white',

          animation: 'lectureModalIn 0.35s cubic-bezier(0.16, 1, 0.3, 1)'
        }}
      >

        {/* brilho superior */}
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

        {/* Fechar */}
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
            WebkitBackdropFilter: 'blur(10px)',

            transition: 'all 0.2s ease'
          }}
        >
          <X size={19} />
        </button>


        {/* Cabeçalho */}
        <div style={{ paddingRight: '50px' }}>

          <span
            style={{
              display: 'inline-block',

              fontSize: '11px',
              fontWeight: '700',

              letterSpacing: '1.5px',
              textTransform: 'uppercase',

              color: 'rgba(170,220,255,0.8)'
            }}
          >
            Palestra
          </span>

          <h2
            style={{
              margin: '8px 0 0',

              fontSize: '27px',
              lineHeight: '1.18',
              fontWeight: '700',

              letterSpacing: '-0.5px'
            }}
          >
            {lecture.title}
          </h2>

        </div>


        {/* Informações */}
        <div
          style={{
            marginTop: '28px',

            display: 'flex',
            flexDirection: 'column',

            gap: '10px'
          }}
        >

          <div
            style={{
              display: 'flex',
              alignItems: 'center',

              gap: '14px',

              padding: '14px 16px',

              borderRadius: '17px',

              background: 'rgba(4, 25, 55, 0.28)',

              border: '1px solid rgba(170,220,255,0.10)'
            }}
          >
            <Clock
              size={19}
              strokeWidth={1.8}
              style={{
                color: 'rgba(170,220,255,0.9)'
              }}
            />

            <div>
              <span
                style={{
                  display: 'block',

                  fontSize: '10px',
                  fontWeight: '600',

                  textTransform: 'uppercase',
                  letterSpacing: '1px',

                  color: 'rgba(255,255,255,0.5)',

                  marginBottom: '3px'
                }}
              >
                Horário
              </span>

              <strong
                style={{
                  fontSize: '15px',
                  fontWeight: '600'
                }}
              >
                {lecture.time}
              </strong>
            </div>
          </div>


          <div
            style={{
              display: 'flex',
              alignItems: 'center',

              gap: '14px',

              padding: '14px 16px',

              borderRadius: '17px',

              background: 'rgba(4, 25, 55, 0.28)',

              border: '1px solid rgba(170,220,255,0.10)'
            }}
          >
            <MapPin
              size={19}
              strokeWidth={1.8}
              style={{
                color: 'rgba(170,220,255,0.9)'
              }}
            />

            <div>
              <span
                style={{
                  display: 'block',

                  fontSize: '10px',
                  fontWeight: '600',

                  textTransform: 'uppercase',
                  letterSpacing: '1px',

                  color: 'rgba(255,255,255,0.5)',

                  marginBottom: '3px'
                }}
              >
                Local
              </span>

              <strong
                style={{
                  fontSize: '15px',
                  fontWeight: '600'
                }}
              >
                {lecture.location}
              </strong>
            </div>
          </div>

        </div>


        {/* Ação principal */}
        <button
          className="btn-primary"
          onClick={onValidate}
          style={{
            width: '100%',
            height: '52px',

            marginTop: '26px',

            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',

            gap: '9px',

            borderRadius: '16px',

            fontSize: '14px',
            fontWeight: '700',

            letterSpacing: '0.1px',

            cursor: 'pointer',

            boxShadow:
              '0 10px 30px rgba(20, 120, 255, 0.25)'
          }}
        >
          <QrCode size={19} />
          Validar presença
        </button>

      </div>
    </div>
  );
}

<style>
  {`
    @keyframes lectureOverlayIn {
      from {
        opacity: 0;
        backdrop-filter: blur(0);
      }

      to {
        opacity: 1;
        backdrop-filter: blur(14px);
      }
    }

    @keyframes lectureModalIn {
      from {
        opacity: 0;
        transform: translateY(18px) scale(0.94);
        filter: blur(4px);
      }

      to {
        opacity: 1;
        transform: translateY(0) scale(1);
        filter: blur(0);
      }
    }
  `}
</style>

