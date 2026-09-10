import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Mascot from '../components/Mascot';
import logoTw from '../assets/logo-tw.png';
import { Rocket, Target, Users, Hand, Heart, ArrowLeft } from 'lucide-react';

// Typewriter Speech Bubble Component
function TypewriterBubble({ text, delay, icon: Icon, color, position = 'left' }) {
  const [displayedText, setDisplayedText] = useState('');
  const [hasStarted, setHasStarted] = useState(false);

  useEffect(() => {
    let startTimeout;
    let typeInterval;
    
    // reset state when step changes (though this component only mounts once per step)
    setDisplayedText('');
    setHasStarted(false);

    startTimeout = setTimeout(() => {
      setHasStarted(true);
      let currentIndex = 0;
      typeInterval = setInterval(() => {
        if (currentIndex < text.length) {
          setDisplayedText(text.slice(0, currentIndex + 1));
          currentIndex++;
        } else {
          clearInterval(typeInterval);
        }
      }, 70); // 70ms per letter typing speed
    }, delay);

    return () => {
      clearTimeout(startTimeout);
      clearInterval(typeInterval);
    };
  }, [text, delay]);

  if (!hasStarted) return null;

  return (
    <div style={{
      backgroundColor: 'rgba(255, 255, 255, 0.15)',
      backdropFilter: 'blur(12px)',
      border: `1px solid ${color}`,
      padding: '12px 16px',
      borderRadius: '16px',
      borderBottomLeftRadius: position === 'left' ? '0px' : '16px',
      borderBottomRightRadius: position === 'right' ? '0px' : '16px',
      position: 'absolute',
      top: '-80px',
      [position === 'left' ? 'left' : 'right']: '-10px',
      maxWidth: '140px',
      whiteSpace: 'normal',
      wordWrap: 'break-word',
      fontSize: '0.85rem',
      color: '#fff',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      gap: '8px',
      boxShadow: '0 8px 16px rgba(0,0,0,0.2)',
      zIndex: 10
    }}>
      {displayedText}
      {displayedText.length === text.length && Icon && (
        <Icon size={16} style={{ color: color, flexShrink: 0 }} />
      )}
    </div>
  );
}

export default function Onboarding() {
  const [step, setStep] = useState(0);
  const navigate = useNavigate();

  const handleNext = () => {
    if (step < 4) {
      setStep(step + 1);
    } else {
      navigate('/');
    }
  };

  const screens = [
    {
      content: (
        <>
          <div style={{ display: 'flex', justifyContent: 'center', gap: '20px', marginBottom: '40px', marginTop: '60px' }}>
            <div style={{ position: 'relative', transform: 'scale(0.8)' }}>
              {step === 0 && (
                <TypewriterBubble 
                  text="Oi! Eu sou o Teko" 
                  delay={500} 
                  icon={Hand} 
                  color="#3b82f6" 
                  position="left"
                />
              )}
              <Mascot color="blue" isWaving={true} />
            </div>
            <div style={{ position: 'relative', transform: 'scale(0.8)' }}>
              {step === 0 && (
                <TypewriterBubble 
                  text="E eu sou a Weeka!" 
                  delay={5000} // Waits 5 seconds to start typing
                  icon={Heart} 
                  color="#a855f7" 
                  position="right"
                />
              )}
              <Mascot color="purple" isWaving={true} />
            </div>
          </div>
          <p style={{ fontSize: '1.1rem', color: 'var(--text-secondary)', lineHeight: '1.6', textAlign: 'justify' }}>
            Nós vamos acompanhar você durante a FACOM TechWeek.
          </p>
        </>
      )
    },
    {
      content: (
        <>
          <h2 style={{ fontSize: '1.5rem', marginBottom: '24px', color: 'var(--primary-color)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '12px' }}>
            O propósito <Rocket size={24} />
          </h2>
          <p style={{ fontSize: '1.1rem', color: 'var(--text-secondary)', lineHeight: '1.6', marginBottom: '16px', textAlign: 'justify' }}>
            Teko e Weeka querem conhecer a TechWeek inteira, e precisam de você para isso!
          </p>
          <p style={{ fontSize: '1.1rem', color: 'var(--text-secondary)', lineHeight: '1.6', textAlign: 'justify' }}>
            Aqui, você vai explorar o evento, descobrir novas tecnologias, conhecer empresas e, principalmente, conectar-se com pessoas incríveis.
          </p>
        </>
      )
    },
    {
      content: (
        <>
          <h2 style={{ fontSize: '1.5rem', marginBottom: '24px', color: 'var(--primary-color)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '12px' }}>
            Como funciona <Target size={24} />
          </h2>
          <p style={{ fontSize: '1.1rem', color: 'var(--text-secondary)', lineHeight: '1.6', marginBottom: '16px', textAlign: 'justify' }}>
            Sua missão é explorar.<br/>
            Complete missões, participe das atividades, visite os patrocinadores, conheça pessoas e registre suas conexões.
          </p>
          <p style={{ fontSize: '1.1rem', color: 'var(--text-secondary)', lineHeight: '1.6', marginBottom: '16px', textAlign: 'justify' }}>
            Cada experiência desbloqueia XP, conquistas e recompensas.
          </p>
          <p style={{ fontSize: '1.1rem', color: 'var(--text-secondary)', lineHeight: '1.6', textAlign: 'justify' }}>
            Quanto mais você participa, mais da TechWeek você desbloqueia.
          </p>
        </>
      )
    },
    {
      content: (
        <>
          <h2 style={{ fontSize: '1.5rem', marginBottom: '24px', color: 'var(--primary-color)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '12px' }}>
            Networking <Users size={24} />
          </h2>
          <p style={{ fontSize: '1.1rem', color: 'var(--text-secondary)', lineHeight: '1.6', marginBottom: '16px', textAlign: 'justify' }}>
            A melhor parte da TechWeek são as pessoas.
          </p>
          <p style={{ fontSize: '1.1rem', color: 'var(--text-secondary)', lineHeight: '1.6', marginBottom: '16px', textAlign: 'justify' }}>
            Encontre outros estudantes, profissionais e pesquisadores que compartilham os mesmos interesses que você.
          </p>
          <p style={{ fontSize: '1.1rem', color: 'var(--text-secondary)', lineHeight: '1.6', textAlign: 'justify' }}>
            Uma conversa pode virar uma conexão.<br/>
            Uma conexão pode virar uma oportunidade.
          </p>
        </>
      )
    },
    {
      content: (
        <>
          <div style={{ display: 'flex', justifyContent: 'center', gap: '20px', marginBottom: '40px', marginTop: '20px' }}>
            <div style={{ transform: 'scale(0.8)' }}>
              <Mascot color="blue" isWaving={true} />
            </div>
            <div style={{ transform: 'scale(0.8)' }}>
              <Mascot color="purple" isWaving={true} />
            </div>
          </div>
          <h2 style={{ fontSize: '1.5rem', marginBottom: '24px', color: 'var(--primary-color)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '12px' }}>
            Começo <Rocket size={24} />
          </h2>
          <p style={{ fontSize: '1.1rem', color: 'var(--text-secondary)', lineHeight: '1.6', marginBottom: '32px', textAlign: 'justify' }}>
            Pronto para começar sua jornada?<br/>
            Teko e Weeka já estão esperando.
          </p>
        </>
      )
    }
  ];

  return (
    <div className="login-container animate-fade-in" style={{ position: 'relative', overflow: 'hidden', minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '24px' }}>
      
      <div className="login-glow"></div>
      
      <div className="login-glass-card" style={{ zIndex: 2, position: 'relative', width: '100%', maxWidth: '500px', display: 'flex', flexDirection: 'column', minHeight: '400px' }}>
        
        {/* Back Button */}
        <button 
          onClick={() => step > 0 ? setStep(step - 1) : navigate(-1)} 
          style={{ position: 'absolute', top: '16px', left: '16px', background: 'rgba(255,255,255,0.1)', border: 'none', borderRadius: '50%', width: '40px', height: '40px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', cursor: 'pointer', zIndex: 10 }}
        >
          <ArrowLeft size={20} />
        </button>

        <div style={{ textAlign: 'center', marginBottom: '40px', marginTop: '16px' }}>
          <img src={logoTw} alt="FACOM Tech Week" style={{ height: '60px' }} />
        </div>

        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', textAlign: 'center', padding: '0 16px' }} className="animate-fade-in" key={step}>
          {screens[step].content}
        </div>

        <div style={{ marginTop: 'auto', paddingTop: '32px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px' }}>
          <button onClick={handleNext} className="login-btn" style={{ padding: '16px', fontSize: '1.1rem' }}>
            {step === 4 ? 'COMEÇAR A EXPLORAR' : 'Continuar'}
          </button>
          
          {/* Progress dots */}
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            {[0, 1, 2, 3, 4].map((index) => (
              <div 
                key={index} 
                style={{
                  width: step === index ? '24px' : '8px', 
                  height: '8px', 
                  borderRadius: '4px', 
                  backgroundColor: step === index ? 'var(--primary-color)' : 'rgba(255, 255, 255, 0.2)',
                  transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)'
                }} 
              />
            ))}
          </div>
        </div>

      </div>
    </div>
  );
}
