import { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useUser } from '../hooks/useUser';
import { CheckCircle, MapPin, Camera, Users, MessageCircle, X, Search, Lock, ArrowLeft, Zap, Sparkles, Target, UploadCloud, Image as ImageIcon } from 'lucide-react';
import { getMyProfile } from '../lib/gameplay';
import { getActiveMissions, MISSIONS_EVENT_NAME } from '../lib/missionsManager';

function getChallengeIcon(challenge) {
  if (challenge.icon) return challenge.icon;
  if (challenge.isFlash) return Zap;
  switch (challenge.iconName) {
    case 'Camera': return Camera;
    case 'MapPin': return MapPin;
    case 'MessageCircle': return MessageCircle;
    case 'Lock': return Lock;
    case 'Search': return Search;
    case 'Users': return Users;
    case 'Zap': return Zap;
    case 'Sparkles': return Sparkles;
    case 'Target':
    default:
      return Target;
  }
}

export default function Challenges() {
  const { completedChallenges, completeChallenge } = useUser();
  const navigate = useNavigate();
  const location = useLocation();
  const [activeManualChallenge, setActiveManualChallenge] = useState(null);
  const [manualForm, setManualForm] = useState({});
  const [photoPreview, setPhotoPreview] = useState(null);
  const [challengesList, setChallengesList] = useState(() => getActiveMissions());
  const [profile, setProfile] = useState({ firstName: 'Visitante', avatarUrl: '' });
  const fileInputRef = useRef(null);

  useEffect(() => {
    getMyProfile()
      .then(p => {
        if (!p) return;
        setProfile({ firstName: p.first_name || p.username || 'Visitante', avatarUrl: p.avatar_url || '' });
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    const handleUpdate = () => {
      setChallengesList(getActiveMissions());
    };
    window.addEventListener(MISSIONS_EVENT_NAME, handleUpdate);
    window.addEventListener('storage', handleUpdate);
    return () => {
      window.removeEventListener(MISSIONS_EVENT_NAME, handleUpdate);
      window.removeEventListener('storage', handleUpdate);
    };
  }, []);

  // Auto-abre a missão se foi redirecionado a partir do alerta de missão relâmpago
  useEffect(() => {
    if (location.state?.autoOpenMissionId) {
      const target = challengesList.find(c => c.id === location.state.autoOpenMissionId);
      if (target && !completedChallenges.includes(target.id)) {
        handleSimulateChallenge(target);
      }
    }
  }, [location.state, challengesList, completedChallenges]);

  const handleSimulateChallenge = async (challenge) => {
    if (challenge.isAction) {
      if (challenge.id === 'instagram_story') navigate('/instagram-mission');
      return;
    }

    if (challenge.type === 'auto') {
      navigate('/scanner');
      return;
    }

    if (challenge.type === 'manual' || challenge.type === 'photo' || challenge.isFlash) {
      const fields = challenge.fields && challenge.fields.length > 0
        ? challenge.fields
        : [{ id: 'photo', type: 'photo', label: 'Tire uma foto ou anexe da galeria para comprovar a missão' }];
      setActiveManualChallenge({ ...challenge, fields });
      setManualForm({});
      setPhotoPreview(null);
      return;
    }

    const success = await completeChallenge(challenge.id, challenge.points);
    if (success) {
      alert(`Parabéns! Você completou o desafio e ganhou ${challenge.points} pontos.`);
    }
  };

  const handlePhotoSelect = (e, fieldId) => {
    const file = e.target.files?.[0];
    if (file) {
      setManualForm(prev => ({ ...prev, [fieldId]: file.name || 'photo_attached' }));
      const reader = new FileReader();
      reader.onload = (event) => {
        setPhotoPreview(event.target.result);
      };
      reader.readAsDataURL(file);
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
        <button onClick={() => navigate(-1)} style={{ width: '40px', height: '40px', borderRadius: '50%', background: 'rgba(255,255,255,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', border: 'none', color: 'white', cursor: 'pointer' }}>
          <ArrowLeft size={20} />
        </button>
        <h1 className="font-lastica" style={{ fontSize: '1.2rem', fontWeight: '500' }}>Missões</h1>
        <div
          style={{
            width: '40px',
            height: '40px',
            borderRadius: '50%',
            background: 'rgba(255,255,255,0.1)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontWeight: 'bold',
            fontSize: '1.2rem',
            overflow: 'hidden',
            position: 'relative'
          }}
        >
          {profile.avatarUrl ? (
            <img
              src={profile.avatarUrl}
              alt="Avatar"
              style={{ width: '100%', height: '100%', objectFit: 'cover' }}
            />
          ) : (
            profile.firstName
              ? profile.firstName.charAt(0).toUpperCase()
              : 'V'
          )}
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        {challengesList.map((challenge, index) => {
          const isCompleted = completedChallenges.includes(challenge.id);
          const isHighlighted = (challenge.id === 'instagram_story' || challenge.isFlash) && !isCompleted;
          const isSecret = challenge.isSecret && !isCompleted;
          const IconComponent = getChallengeIcon(challenge);

          return (
            <div 
              key={challenge.id} 
              className={`card ${isHighlighted ? 'card-highlight' : isSecret ? 'card-highlight-secondary' : ''}`} 
              onClick={() => !isCompleted && handleSimulateChallenge(challenge)}
              style={{ 
                display: 'flex', justifyContent: 'space-between', alignItems: 'center', 
                opacity: isCompleted ? 0.7 : 1, 
                background: isSecret ? 'rgba(168, 85, 247, 0.15)' : '', 
                borderColor: isSecret ? 'rgba(168, 85, 247, 0.3)' : '',
                cursor: isCompleted ? 'default' : 'pointer'
              }}
            >
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
        <div style={{ 
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, 
          background: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(10px)', 
          zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', 
          padding: '24px', overflowY: 'auto', minHeight: '100dvh'
        }}>
          <div className="card" style={{ width: '100%', maxWidth: '400px', background: 'var(--card-bg)', maxHeight: '90vh', overflowY: 'auto' }}>
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
                      onChange={(e) => setManualForm({ ...manualForm, [field.id]: e.target.value })}
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
                      onChange={(e) => setManualForm({ ...manualForm, [field.id]: e.target.value })}
                      className="login-input"
                      required
                    />
                  )}
                  {field.type === 'password' && (
                    <input
                      type="text"
                      value={manualForm[field.id] || ''}
                      onChange={(e) => setManualForm({ ...manualForm, [field.id]: e.target.value })}
                      className="login-input"
                      required
                      placeholder="Palavra-chave"
                    />
                  )}
                  {field.type === 'textarea' && (
                    <textarea
                      value={manualForm[field.id] || ''}
                      onChange={(e) => setManualForm({ ...manualForm, [field.id]: e.target.value })}
                      className="login-input"
                      rows="3"
                      style={{ resize: 'none', fontFamily: 'Montserrat, sans-serif' }}
                      required
                      minLength={activeManualChallenge.id === 'sponsor_tecnologia' ? 15 : undefined}
                    />
                  )}
                  {field.type === 'photo' && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept="image/*"
                        capture="environment"
                        onChange={(e) => handlePhotoSelect(e, field.id)}
                        style={{ display: 'none' }}
                        required={!manualForm[field.id]}
                      />

                      {photoPreview ? (
                        <div style={{ position: 'relative', borderRadius: '16px', overflow: 'hidden', border: '2px solid #3b82f6', maxHeight: '200px' }}>
                          <img
                            src={photoPreview}
                            alt="Pré-visualização"
                            style={{ width: '100%', height: '200px', objectFit: 'cover', display: 'block' }}
                          />
                          <button
                            type="button"
                            onClick={() => fileInputRef.current?.click()}
                            style={{ position: 'absolute', bottom: '10px', right: '10px', background: 'rgba(0,0,0,0.7)', border: '1px solid rgba(255,255,255,0.3)', color: '#ffffff', padding: '6px 12px', borderRadius: '8px', fontSize: '0.75rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }}
                          >
                            <Camera size={14} />
                            <span>Trocar Foto</span>
                          </button>
                        </div>
                      ) : (
                        <div
                          onClick={() => fileInputRef.current?.click()}
                          style={{
                            border: '2px dashed rgba(59, 130, 246, 0.4)',
                            background: 'rgba(59, 130, 246, 0.06)',
                            borderRadius: '16px',
                            padding: '24px 16px',
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            justifyContent: 'center',
                            cursor: 'pointer',
                            transition: 'all 0.2s'
                          }}
                        >
                          <div style={{ width: '48px', height: '48px', borderRadius: '50%', background: 'rgba(59, 130, 246, 0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '8px', color: '#38bdf8' }}>
                            <Camera size={24} />
                          </div>
                          <p style={{ fontSize: '0.85rem', fontWeight: '700', color: '#ffffff', marginBottom: '2px' }}>
                            Tirar Foto ou Escolher da Galeria
                          </p>
                          <span style={{ fontSize: '0.72rem', color: 'var(--text-secondary)' }}>
                            Toque para anexar a foto comprobatória
                          </span>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ))}

              <button type="submit" className="login-btn" style={{ marginTop: '16px', display: 'flex', justifyContent: 'center' }}>
                Completar Missão
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
