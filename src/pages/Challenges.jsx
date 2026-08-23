import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useUser } from '../hooks/useUser';
import { CheckCircle, MapPin, Camera, Users, MessageCircle, X, Search, Lock } from 'lucide-react';

export default function Challenges() {
  const { completedChallenges, completeChallenge } = useUser();
  const navigate = useNavigate();
  const [activeManualChallenge, setActiveManualChallenge] = useState(null);
  const [manualForm, setManualForm] = useState({});

  const challengesList = [
    { id: 'instagram_story', name: 'Post no Stories', description: 'Tire uma foto com nossa moldura e compartilhe!', points: 50, icon: Camera, isAction: true },
    { id: 'sponsor_visit', name: 'Conheça Kanastra', description: 'Visite o stand e escaneie o QR Code oficial.', points: 15, icon: MapPin, type: 'auto' },
    { id: 'sponsor_vaga', name: 'De Olho na Vaga', description: 'Converse com alguém sobre oportunidades para estudantes.', points: 20, icon: MessageCircle, type: 'manual', fields: [
      { id: 'company', type: 'select', label: 'Qual empresa foi?', options: ['Levty', 'Kanastra', 'Sankhya', 'Neospace', 'Sebrae', 'Outra'] }
    ]},
    { id: 'sponsor_tecnologia', name: 'Descubra a Tecnologia', description: 'Pergunte qual tecnologia está transformando o trabalho da empresa.', points: 20, icon: MessageCircle, type: 'manual', fields: [
      { id: 'company', type: 'select', label: 'Qual empresa foi?', options: ['Levty', 'Kanastra', 'Sankhya', 'Neospace', 'Sebrae', 'Outra'] },
      { id: 'response', type: 'textarea', label: 'Qual tecnologia eles usam?' }
    ]},
    { id: 'sponsor_colecao', name: 'Colecione Patrocinadores', description: 'Complete seu passaporte visitando todos os stands.', points: 50, icon: Camera, type: 'manual', fields: [
      { id: 'photo', type: 'photo', label: 'Tire uma foto do cartão completo' }
    ]},
    { id: 'secret_password', name: 'Missão Secreta', description: 'Descubra a palavra-chave escondida no stand da Kanastra.', points: 30, icon: Lock, type: 'manual', isSecret: true, fields: [
      { id: 'password', type: 'password', label: 'Qual a palavra-chave?' }
    ]},
    { id: 'secret_qr', name: 'Caça ao QR Code', description: 'Encontre o QR Code escondido antes que termine.', points: 40, icon: Search, type: 'auto', isSecret: true },
    
    { id: 'network_course', name: 'Outro Curso', description: 'Conecte-se com alguém de um curso diferente.', points: 15, icon: Users, type: 'auto' },
    { id: 'network_type', name: 'Fora da UFU', description: 'Encontre alguém de outra instituição ou empresa.', points: 15, icon: Users, type: 'auto' },
    { id: 'network_first', name: 'Primeira Conexão', description: 'Faça sua primeira conexão na TechWeek.', points: 10, icon: Users, type: 'auto' },
    { id: 'network_period', name: 'Calouro na Área', description: 'Conecte-se com alguém do primeiro período.', points: 15, icon: Users, type: 'auto' },
    { id: 'network_career', name: 'Sua Área', description: 'Encontre alguém da área que quer seguir.', points: 20, icon: MessageCircle, type: 'manual', fields: [
      { id: 'prompt1', type: 'text', label: 'Qual o @/user da pessoa?' },
      { id: 'prompt2', type: 'textarea', label: 'Qual foi o 1º passo dela na carreira?' }
    ]},
    { id: 'network_connect_two', name: 'Conector', description: 'Apresente duas pessoas que devem se conhecer.', points: 20, icon: MessageCircle, type: 'manual', fields: [
      { id: 'prompt1', type: 'text', label: 'Qual o @/user da 1ª pessoa?' },
      { id: 'prompt2', type: 'text', label: 'Qual o @/user da 2ª pessoa?' }
    ]},
    { id: 'network_past_edition', name: 'Veterano', description: 'Encontre alguém de edições passadas.', points: 15, icon: MessageCircle, type: 'manual', fields: [
      { id: 'prompt1', type: 'text', label: 'Qual o @/user da pessoa?' },
      { id: 'prompt2', type: 'textarea', label: 'Qual foi a melhor experiência dela?' }
    ]},
    { id: 'network_first_edition', name: 'Novato', description: 'Encontre alguém novato e mostre o app.', points: 15, icon: MessageCircle, type: 'manual', fields: [
      { id: 'prompt1', type: 'text', label: 'Qual o @/user da pessoa?' },
      { id: 'prompt2', type: 'textarea', label: 'O que você mostrou para ela?' }
    ]}
  ];

  const handleSimulateChallenge = async (challenge) => {
    if (challenge.isAction) {
      if (challenge.id === 'instagram_story') navigate('/instagram-mission');
      return;
    }

    if (challenge.type === 'auto') {
      navigate('/scanner');
      return;
    }

    if (challenge.type === 'manual') {
      setActiveManualChallenge(challenge);
      setManualForm({});
      return;
    }

    const success = await completeChallenge(challenge.id, challenge.points);
    if (success) {
      alert(`Parabéns! Você completou o desafio e ganhou ${challenge.points} pontos.`);
    }
  };

  const handleManualSubmit = async (e) => {
    e.preventDefault();
    if (activeManualChallenge) {
      if (activeManualChallenge.id === 'secret_password') {
        const pass = manualForm['password'];
        if (!pass || pass.trim().toUpperCase() !== 'OPORTUNIDADES') {
          alert('Palavra-chave incorreta! Continue procurando.');
          return;
        }
      }

      // Respostas da missão manual vão como metadata do evento de pontos
      // (Supabase), em vez de localStorage.facom_manual_missions.
      const success = await completeChallenge(activeManualChallenge.id, activeManualChallenge.points, manualForm);
      if (success) {
        alert(`Missão concluída! Você ganhou ${activeManualChallenge.points} pontos.`);
      }
      setActiveManualChallenge(null);
    }
  };

  return (
    <div className="page-container animate-fade-in" style={{ paddingBottom: '120px' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '32px' }}>
        <div style={{ width: '40px' }}></div>
        <h1 className="font-lastica" style={{ fontSize: '1.2rem', fontWeight: '500' }}>Missões</h1>
        <div style={{ width: '40px', height: '40px', borderRadius: '50%', background: 'rgba(255,255,255,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold', fontSize: '1.2rem' }}>
          M
        </div>
      </div>
      
      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        {challengesList.map((challenge, index) => {
          const isCompleted = completedChallenges.includes(challenge.id);
          const isHighlighted = challenge.id === 'instagram_story' && !isCompleted;
          const isSecret = challenge.isSecret && !isCompleted;
          const IconComponent = challenge.icon || MapPin;
          
          return (
            <div key={challenge.id} className={`card ${isHighlighted ? 'card-highlight' : isSecret ? 'card-highlight-secondary' : ''}`} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', opacity: isCompleted ? 0.7 : 1, background: isSecret ? 'rgba(168, 85, 247, 0.15)' : '', borderColor: isSecret ? 'rgba(168, 85, 247, 0.3)' : '' }}>
              <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
                <div style={{ background: isHighlighted || isSecret ? 'rgba(255,255,255,0.2)' : 'rgba(255,255,255,0.05)', padding: '12px', borderRadius: '50%', color: isHighlighted || isSecret ? 'white' : 'var(--primary)' }}>
                  <IconComponent size={24} />
                </div>
                <div>
                  <h3 style={{ fontSize: '1rem', marginBottom: '4px', display: 'flex', alignItems: 'center', gap: '8px', color: 'white' }}>
                    {challenge.name}
                    {isCompleted && <CheckCircle size={16} color="#10b981" />}
                  </h3>
                  <p style={{ fontSize: '0.75rem', color: isHighlighted || isSecret ? 'rgba(255,255,255,0.8)' : 'var(--text-secondary)' }}>{challenge.description}</p>
                  <div style={{ marginTop: '4px', fontSize: '0.75rem', fontWeight: 'bold', color: isHighlighted || isSecret ? 'white' : 'var(--primary)' }}>
                    +{challenge.points} pts
                  </div>
                </div>
              </div>
              
              {!isCompleted && (
                <button 
                  style={{ 
                    padding: '8px 12px', 
                    fontSize: '0.75rem', 
                    background: isHighlighted || isSecret ? 'white' : 'var(--primary)',
                    color: isHighlighted ? 'var(--primary)' : isSecret ? '#a855f7' : 'white',
                    border: 'none',
                    borderRadius: '8px',
                    fontWeight: 'bold',
                    cursor: 'pointer',
                    whiteSpace: 'nowrap'
                  }}
                  onClick={() => handleSimulateChallenge(challenge)}
                >
                  {challenge.isAction ? 'Começar' : challenge.type === 'auto' ? 'Escanear' : challenge.type === 'manual' ? 'Responder' : 'Check-in'}
                </button>
              )}
            </div>
          );
        })}
      </div>

      {activeManualChallenge && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(10px)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px' }}>
          <div className="card" style={{ width: '100%', maxWidth: '400px', background: 'var(--card-bg)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h3 style={{ fontSize: '1.2rem', color: 'white' }}>{activeManualChallenge.name}</h3>
              <button onClick={() => setActiveManualChallenge(null)} style={{ background: 'none', border: 'none', color: 'white', cursor: 'pointer' }}>
                <X size={24} />
              </button>
            </div>
            
            <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', marginBottom: '24px' }}>
              {activeManualChallenge.description}
            </p>

            <form onSubmit={handleManualSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {activeManualChallenge.fields.map(field => (
                <div key={field.id}>
                  <label style={{ display: 'block', fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '8px' }}>
                    {field.label}
                  </label>
                  {field.type === 'select' && (
                    <select
                      value={manualForm[field.id] || ''}
                      onChange={(e) => setManualForm({...manualForm, [field.id]: e.target.value})}
                      className="login-input"
                      required
                    >
                      <option value="" disabled>Selecione...</option>
                      {field.options.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                    </select>
                  )}
                  {field.type === 'text' && (
                    <input 
                      type="text" 
                      value={manualForm[field.id] || ''} 
                      onChange={(e) => setManualForm({...manualForm, [field.id]: e.target.value})}
                      className="login-input" 
                      required 
                    />
                  )}
                  {field.type === 'password' && (
                    <input 
                      type="text" 
                      value={manualForm[field.id] || ''} 
                      onChange={(e) => setManualForm({...manualForm, [field.id]: e.target.value})}
                      className="login-input" 
                      required 
                      placeholder="Palavra-chave"
                    />
                  )}
                  {field.type === 'textarea' && (
                    <textarea 
                      value={manualForm[field.id] || ''} 
                      onChange={(e) => setManualForm({...manualForm, [field.id]: e.target.value})}
                      className="login-input" 
                      rows="3"
                      style={{ resize: 'none', fontFamily: 'Montserrat, sans-serif' }}
                      required 
                    />
                  )}
                  {field.type === 'photo' && (
                    <input 
                      type="file" 
                      accept="image/*" 
                      capture="environment"
                      onChange={(e) => {
                        setManualForm({...manualForm, [field.id]: e.target.files[0] ? 'photo_captured' : ''})
                      }}
                      className="login-input" 
                      style={{ padding: '8px' }}
                      required 
                    />
                  )}
                </div>
              ))}

              <button type="submit" className="login-btn" style={{ marginTop: '8px' }}>
                Completar Missão
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
