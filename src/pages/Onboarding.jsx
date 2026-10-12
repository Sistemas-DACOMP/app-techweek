import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronLeft, QrCode } from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import Mascot from '../components/Mascot';
import { useAuth } from '../contexts/AuthContext';
import { getUserProfile } from '../lib/userService';
import '../styles/entrada.css';

const STEPS = [
  { title: 'Boas-vindas à ', accent: 'Tech Week', text: 'A gente vai te acompanhar nos 6 dias do evento. São só 3 coisinhas pra você saber.' },
  { title: 'Sua agenda ', accent: 'no bolso', text: 'Veja o que está rolando agora, reserve vagas nos workshops e confirme presença lendo o QR da sala.' },
  { title: 'Cada presença ', accent: 'vira ponto', text: 'Complete missões, carimbe o passaporte nos estandes e suba no ranking. Tem prêmio no fim da semana.' },
  { title: 'Seu crachá ', accent: 'abre portas', text: 'Use seu QR para entrar nas atividades e trocar contato com quem você conhecer no evento.' }
];

// Mascote que sobe e flutua (DESIGN.md §9: onboarding). `flip` espelha sem brigar com a animação.
function RisingMascot({ color, size, delay, flip = false }) {
  return (
    <div className={flip ? '-scale-x-100' : undefined}>
      <div className="ent-mascot" style={{ '--d': `${delay}s` }}>
        <Mascot color={color} isWaving className="ent-still" style={{ width: size, height: size }} />
      </div>
    </div>
  );
}

function Bubble({ className, delay, origin, tail, children }) {
  return (
    <span
      className={`ent-pop absolute rounded-2xl bg-white px-3.5 py-2.5 text-sm font-extrabold text-bg shadow-[0_10px_24px_rgba(0,0,0,0.35)] ${className}`}
      style={{ '--d': `${delay}s`, transformOrigin: origin }}
    >
      {children}
      <span className={`absolute -bottom-1.5 size-3.5 rotate-45 bg-white ${tail}`} aria-hidden="true" />
    </span>
  );
}

function MiniActivity({ type, color, status, statusColor, title, meta }) {
  return (
    <div className="w-[220px] rounded-2xl border-l-4 bg-surface py-3 pr-3 pl-3.5 text-left shadow-[0_14px_30px_rgba(0,0,0,0.4)]" style={{ borderLeftColor: color }}>
      <div className="flex justify-between text-[11px] font-extrabold" style={{ color }}>
        <span>{type}</span><span style={{ color: statusColor }}>{status}</span>
      </div>
      <div className="mt-1 text-[13px] leading-[1.3] font-extrabold text-text">{title}</div>
      <div className="mt-1 text-[11px] text-text-2">{meta}</div>
    </div>
  );
}

function PtsChip({ className, rotate, delay, children }) {
  return (
    <span
      className={`ent-pop absolute rounded-xl bg-[linear-gradient(135deg,#7C3AED,#A855F7)] px-3 py-2 text-sm font-black text-white shadow-[0_10px_24px_rgba(0,0,0,0.35)] ${className}`}
      style={{ '--r': `${rotate}deg`, '--d': `${delay}s` }}
    >
      {children}
    </span>
  );
}

function initialsOf(name) {
  const parts = (name || '').trim().split(/\s+/).filter(Boolean);
  return ((parts[0]?.[0] || '') + (parts.length > 1 ? parts[parts.length - 1][0] : '')).toUpperCase() || 'TW';
}

// Ilustrações (decorativas, aria-hidden): o texto de cada etapa carrega a informação.
function Illustration({ step, name }) {
  if (step === 0) {
    return (
      <>
        <div className="absolute inset-x-0 bottom-[30px] flex items-end justify-center">
          <RisingMascot color="blue" size={150} delay={0.05} />
          <RisingMascot color="purple" size={140} delay={0.2} flip />
        </div>
        <Bubble className="top-10 left-[30px]" delay={0.75} origin="20% 100%" tail="left-7">Oi! Eu sou o Alan</Bubble>
        <Bubble className="top-24 right-[30px]" delay={1.05} origin="80% 100%" tail="right-7">E eu sou a Ada!</Bubble>
      </>
    );
  }
  if (step === 1) {
    return (
      <>
        <div className="ent-from-l absolute top-10 left-6" style={{ '--r': '-6deg', '--d': '.05s' }}>
          <MiniActivity type="Workshop" color="var(--cat-workshop)" status="● Agora" statusColor="var(--ok)" title="Arquitetura Serverless" meta="Qui 22 · 14:00 · Lab 1" />
        </div>
        <div className="ent-from-r absolute top-[130px] right-5" style={{ '--r': '5deg', '--d': '.2s' }}>
          <MiniActivity type="Minicurso" color="var(--cat-minicurso)" status="Reservado" statusColor="#B4C0FF" title="Agentes Autônomos" meta="Sex 23 · 15:30" />
        </div>
        <div className="absolute bottom-1.5 left-[30px]">
          <RisingMascot color="blue" size={140} delay={0.3} />
        </div>
        <span className="ent-pop ent-glow absolute right-[54px] bottom-[50px] inline-flex items-center gap-2 rounded-[14px] bg-action px-3.5 py-2.5 text-[13px] font-extrabold text-white shadow-[0_10px_24px_rgba(61,80,230,0.45)]" style={{ '--d': '.8s' }}>
          <QrCode size={18} strokeWidth={1.9} /> Presença com QR
        </span>
      </>
    );
  }
  if (step === 2) {
    return (
      <>
        <div className="absolute right-10 bottom-1.5">
          <RisingMascot color="purple" size={150} delay={0.1} />
        </div>
        <PtsChip className="top-[50px] left-10" rotate={-8} delay={0.75}>+35 pts</PtsChip>
        <PtsChip className="top-[18px] left-[150px]" rotate={6} delay={0.9}>+50 pts</PtsChip>
        <div className="ent-in absolute top-[130px] left-[34px] w-[170px] rounded-2xl bg-surface p-3 shadow-[0_14px_30px_rgba(0,0,0,0.4)]" style={{ '--d': '.05s' }}>
          {/* Pódio cresce na ordem 3º, 2º, 1º */}
          <div className="flex h-20 items-end gap-1.5">
            <span className="ent-grow h-[54px] flex-1 rounded-t-lg rounded-b-sm bg-[linear-gradient(180deg,#94A3B855,#94A3B810)] pt-1.5 text-center text-base font-black text-[var(--podium-2)]" style={{ '--d': '.45s' }}>2</span>
            <span className="ent-grow h-[78px] flex-1 rounded-t-lg rounded-b-sm bg-[linear-gradient(180deg,#FBBF2466,#FBBF2410)] pt-1.5 text-center text-lg font-black text-[var(--podium-1)]" style={{ '--d': '.6s' }}>1</span>
            <span className="ent-grow h-10 flex-1 rounded-t-lg rounded-b-sm bg-[linear-gradient(180deg,#B4530955,#B4530910)] pt-1 text-center text-[15px] font-black text-[var(--podium-3-text)]" style={{ '--d': '.3s' }}>3</span>
          </div>
          <div className="mt-2 text-[11px] font-extrabold text-text-2">Ranking ao vivo</div>
        </div>
        <svg className="ent-stamp absolute top-[150px] left-[220px]" width="64" height="64" viewBox="0 0 74 74" style={{ '--r': '-14deg', '--d': '1.1s' }}>
          <circle cx="37" cy="37" r="33" fill="none" stroke="#B794FF" strokeWidth="3" />
          <circle cx="37" cy="37" r="27" fill="none" stroke="#B794FF" strokeWidth="1.4" strokeDasharray="3 3" />
          <text x="37" y="41" textAnchor="middle" fontFamily="Montserrat" fontSize="10" fontWeight="900" fill="#B794FF">CARIMBO</text>
        </svg>
      </>
    );
  }
  return (
    <>
      <div
        className="ent-drop absolute top-5 left-1/2 -ml-[100px] w-[200px] rounded-[22px] border border-[#2A3460] bg-[linear-gradient(180deg,#151D3E,#0F1530)] p-3.5 text-center shadow-[0_20px_44px_rgba(0,0,0,0.5)]"
        style={{ '--r': '-3deg', '--d': '.05s' }}
      >
        <span className="mx-auto block h-[5px] w-10 rounded-[3px] bg-bg" />
        <span className="mx-auto mt-2.5 block size-[52px] rounded-2xl bg-[linear-gradient(135deg,#2563EB,#7C3AED)] p-[3px]">
          <span className="flex size-full items-center justify-center rounded-[13px] bg-bg text-lg font-black">{initialsOf(name)}</span>
        </span>
        <div className="mt-1.5 truncate text-sm font-black">{name || 'Seu nome aqui'}</div>
        <span className="relative mt-2 inline-block overflow-hidden rounded-xl bg-[#F4F5FA] p-1.5 leading-[0]">
          {/* Linha de leitura passando no QR (só transform) */}
          <span className="ent-scanline absolute inset-x-1 top-1.5 h-[3px] rounded-sm bg-[linear-gradient(90deg,transparent,#7C3AED,transparent)] shadow-[0_0_10px_#7C3AED]" style={{ '--scan': '88px' }} />
          <QRCodeSVG value="FACOM Tech Week 2026" size={96} bgColor="#F4F5FA" fgColor="#0A0F24" />
        </span>
      </div>
      <div className="absolute bottom-0 left-0">
        <RisingMascot color="blue" size={120} delay={0.45} />
      </div>
      <div className="absolute right-0 bottom-0">
        <RisingMascot color="purple" size={112} delay={0.6} flip />
      </div>
    </>
  );
}

export default function Onboarding() {
  const [step, setStep] = useState(0);
  const navigate = useNavigate();
  const { user } = useAuth();
  const [name, setName] = useState('');

  useEffect(() => {
    if (!user) return;
    setName(user.displayName || '');
    getUserProfile(user.uid)
      .then((p) => {
        const full = p?.displayName || [p?.firstName, p?.lastName].filter(Boolean).join(' ');
        if (full) setName(full);
      })
      .catch(() => {});
  }, [user]);

  const lastStep = STEPS.length - 1;

  const finish = () => {
    try {
      localStorage.setItem('facom_onboarding_completed', 'true');
    } catch (_e) {}
    navigate('/', { replace: true });
  };

  const handleNext = () => {
    if (step < lastStep) {
      setStep(step + 1);
    } else {
      finish();
    }
  };

  const current = STEPS[step];

  return (
    <div className="ent-bg-onb relative flex h-full w-full flex-col overflow-x-hidden overflow-y-auto text-text">
      <header className="flex shrink-0 items-center justify-between pt-3.5 pr-4 pl-3">
        {step > 0 ? (
          <button type="button" onClick={() => setStep(step - 1)} aria-label="Voltar" className="flex size-11 cursor-pointer items-center justify-center border-0 bg-transparent text-text">
            <ChevronLeft size={22} aria-hidden="true" />
          </button>
        ) : <span className="w-11" />}
        <button type="button" onClick={finish} className="flex h-11 cursor-pointer items-center border-0 bg-transparent px-2 text-sm font-bold text-link">
          Pular
        </button>
      </header>

      {/* key={step}: a cena remonta e as animações de entrada rodam de novo a cada etapa */}
      <div key={`art-${step}`} className="relative mx-auto mt-2 h-[380px] w-full max-w-[390px] shrink-0" aria-hidden="true">
        <Illustration step={step} name={name} />
      </div>

      <div key={`txt-${step}`} className="relative shrink-0 px-7 text-center" aria-live="polite">
        <h1 className="ent-in text-[28px] leading-[1.15] font-black tracking-[-0.01em]" style={{ '--d': '.25s' }}>
          {current.title}<span className="ent-grad-text">{current.accent}</span>
        </h1>
        <p className="ent-in mt-3 text-base leading-[1.55] text-[#C3C9DE]" style={{ '--d': '.35s' }}>{current.text}</p>
      </div>

      <div className="mt-auto flex shrink-0 flex-col items-center gap-[22px] px-6 pt-6 pb-[30px]">
        <div className="flex gap-1.5" role="img" aria-label={`Etapa ${step + 1} de ${STEPS.length}`}>
          {STEPS.map((_, i) => (
            i === step
              ? <span key={`on-${step}`} className="ent-pill h-2 w-[26px] rounded bg-[linear-gradient(90deg,#2563EB,#9B7BFF)]" />
              : <span key={i} className="h-2 w-2 rounded bg-[#2A3460]" />
          ))}
        </div>
        <button type="button" onClick={handleNext} className="btn btn-primary btn-block ent-btn-lg">
          {step === lastStep ? 'Começar' : 'Continuar'}
        </button>
      </div>
    </div>
  );
}
