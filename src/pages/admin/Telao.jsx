import { useEffect, useState } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { Maximize2, Minimize2, X } from 'lucide-react';
import logoTw from '../../assets/logo-tw.png';
import { typeColor, typeLabel, startTime, sessionsOf } from './ui';

/* 2.07 Telão: um QR fixo por atividade (sem rotação). Tela cheia opcional; Esc fecha. */
export default function Telao({ activity, qrValue, onClose }) {
  const [full, setFull] = useState(false);
  const color = typeColor(activity.type);
  const s = sessionsOf(activity)[0] || {};
  const end = s.endTime || activity.endTime;
  const place = s.location || activity.location || 'Anfiteatro FACOM';

  useEffect(() => {
    const onKey = (e) => e.key === 'Escape' && onClose();
    const onFs = () => setFull(!!document.fullscreenElement);
    document.addEventListener('keydown', onKey);
    document.addEventListener('fullscreenchange', onFs);
    return () => { document.removeEventListener('keydown', onKey); document.removeEventListener('fullscreenchange', onFs); };
  }, [onClose]);

  const toggleFull = () => (document.fullscreenElement ? document.exitFullscreen() : document.documentElement.requestFullscreen()).catch(() => {});

  return (
    <div role="dialog" aria-modal="true" aria-label="Telão de presença" className="fixed inset-0 z-[9999] overflow-auto bg-bg text-text" style={{ background: 'radial-gradient(circle at 20% 0%, #1A1F5C 0%, var(--bg) 60%)' }}>
      <div className="absolute right-4 top-4 z-10 flex gap-2">
        <button type="button" onClick={toggleFull} className="press inline-flex h-11 items-center gap-2 rounded-xl bg-surface-selected px-4 text-[14px] font-bold">
          {full ? <Minimize2 size={16} aria-hidden="true" /> : <Maximize2 size={16} aria-hidden="true" />} {full ? 'Sair da tela cheia' : 'Tela cheia'}
        </button>
        <button type="button" onClick={onClose} className="press inline-flex h-11 items-center gap-2 rounded-xl bg-surface-selected px-4 text-[14px] font-bold">
          <X size={16} aria-hidden="true" /> Fechar
        </button>
      </div>

      <div className="mx-auto grid min-h-full max-w-[1500px] items-center gap-12 px-8 py-16 lg:grid-cols-[minmax(0,1fr)_minmax(320px,560px)] lg:gap-24 lg:px-20">
        <div>
          <img src={logoTw} alt="FACOM Tech Week" className="h-16 w-60 object-contain object-left" />
          <div className="mt-10 flex flex-wrap items-center gap-3.5 text-[22px] font-extrabold lg:text-[26px]">
            <span aria-hidden="true" className="h-3.5 w-3.5 rounded-full bg-ok" style={{ boxShadow: '0 0 0 6px rgba(111,216,166,0.25)' }} />
            <span className="text-ok">{place}</span>
            <span style={{ color }}>· {typeLabel(activity.type)}</span>
          </div>
          <h1 className="m-0 mt-5 text-[40px] font-black leading-[1.05] tracking-[-0.02em] lg:text-[72px]">{activity.title}</h1>
          <div className="mt-8 flex flex-wrap items-center gap-5 text-[20px] text-text-2 lg:text-[26px]">
            <span>{startTime(activity)}{end ? ` – ${end}` : ''}</span>
            <span className="rounded-[18px] bg-[rgba(124,58,237,0.3)] px-[18px] py-2 font-extrabold text-white">+{activity.points || 50} pts</span>
          </div>
          <ol className="m-0 mt-14 flex list-none flex-wrap gap-7 p-0">
            {['Abra o app', 'Toque em Crachá', 'Escanear'].map((t, i) => (
              <li key={t} className="flex items-center gap-3.5 text-[20px] font-bold lg:text-[24px]">
                <span aria-hidden="true" className="flex h-12 w-12 items-center justify-center rounded-full text-[22px] font-black" style={{ background: 'var(--brand-gradient)' }}>{i + 1}</span>
                {t}
              </li>
            ))}
          </ol>
        </div>
        <div className="flex flex-col items-center">
          <div className="rounded-[40px] bg-white p-9" style={{ boxShadow: '0 30px 80px rgba(91,59,224,0.45)' }}>
            <QRCodeSVG value={qrValue} size={420} level="H" includeMargin={false} />
          </div>
          <p className="m-0 mt-7 text-[20px] font-bold text-text-2 lg:text-[22px]">Leia antes de sair da sala</p>
        </div>
      </div>
    </div>
  );
}
