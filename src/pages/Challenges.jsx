import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import { useUser } from '../hooks/useUser';
import { CheckCircle, MapPin, Camera, Users, MessageCircle, X, Search, Lock, ArrowLeft, Loader2, Trash2 } from 'lucide-react';
import { getMyProfile, uploadMissionPhoto } from '../lib/gameplay';
import { onAuthChange } from '../lib/auth';
import { getUserProfile } from '../lib/userService';
import { validateMissionPhoto } from '../lib/validators';
import FeedbackModal from '../components/FeedbackModal';
import { useScrollLock } from '../hooks/useScrollLock';

export default function Challenges() {
  const { completedChallenges, completeChallenge, hasCompletedChallenge } = useUser();
  const navigate = useNavigate();
  const [activeManualChallenge, setActiveManualChallenge] = useState(null);
  useScrollLock(!!activeManualChallenge);
  const [manualForm, setManualForm] = useState({});
  const [photoFiles, setPhotoFiles] = useState({});
  const [photoPreviews, setPhotoPreviews] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [feedback, setFeedback] = useState(null);

  const [profile, setProfile] = useState({ firstName: 'Visitante', avatarUrl: '' });

  useEffect(() => {
    const unsubscribe = onAuthChange(async (user) => {
      if (!user) {
        setProfile({ firstName: 'Visitante', avatarUrl: '' });
        return;
      }
      try {
        const p = await getUserProfile(user.uid);
        if (p) {
          setProfile({
            firstName: p.firstName || p.displayName?.split(' ')[0] || p.username || 'Visitante',
            avatarUrl: p.avatarUrl || p.photoURL || user.photoURL || ''
          });
        } else {
          setProfile({
            firstName: user.displayName?.split(' ')[0] || 'Visitante',
            avatarUrl: user.photoURL || ''
          });
        }
      } catch (e) {
        setProfile({
          firstName: user.displayName?.split(' ')[0] || 'Visitante',
          avatarUrl: user.photoURL || ''
        });
      }
    });

    return () => unsubscribe();
  }, []);

  const challengesList = [
    { id: 'instagram_story', name: 'Post no Stories', description: 'Tire uma foto com nossa moldura e compartilhe!', points: 50, icon: Camera, isAction: true },
    { id: 'sponsor_visit', name: 'Conheça Kanastra', description: 'Visite o stand e escaneie o QR Code oficial.', points: 15, icon: MapPin, type: 'auto' },
    {
      id: 'sponsor_vaga', name: 'De Olho na Vaga', description: 'Converse com alguém sobre oportunidades para estudantes.', points: 20, icon: MessageCircle, type: 'manual', fields: [
        { id: 'company', type: 'select', label: 'Qual empresa foi?', options: ['Levty', 'Kanastra', 'Sankhya', 'Neospace', 'Sebrae', 'Outra'] }
      ]
    },
    {
      id: 'sponsor_tecnologia', name: 'Descubra a Tecnologia', description: 'Pergunte qual tecnologia está transformando o trabalho da empresa.', points: 20, icon: MessageCircle, type: 'manual', fields: [
        { id: 'company', type: 'select', label: 'Qual empresa foi?', options: ['Levty', 'Kanastra', 'Sankhya', 'Neospace', 'Sebrae', 'Outra'] },
        { id: 'response', type: 'textarea', label: 'Qual tecnologia eles usam?' }
      ]
    },
    {
      id: 'sponsor_colecao', name: 'Colecione Patrocinadores', description: 'Complete seu passaporte visitando todos os stands.', points: 50, icon: Camera, type: 'manual', fields: [
        { id: 'photo', type: 'photo', label: 'Tire uma foto do cartão completo' }
      ]
    },
    {
      id: 'secret_password', name: 'Missão Secreta', description: 'Descubra a palavra-chave escondida no stand da Kanastra.', points: 30, icon: Lock, type: 'manual', isSecret: true, fields: [
        { id: 'password', type: 'password', label: 'Qual a palavra-chave?' }
      ]
    },
    { id: 'secret_qr', name: 'Caça ao QR Code', description: 'Encontre o QR Code escondido antes que termine.', points: 40, icon: Search, type: 'auto', isSecret: true },

    { id: 'network_course', name: 'Outro Curso', description: 'Conecte-se com alguém de um curso diferente.', points: 15, icon: Users, type: 'auto' },
    { id: 'network_type', name: 'Fora da UFU', description: 'Encontre alguém de outra instituição ou empresa.', points: 15, icon: Users, type: 'auto' },
    { id: 'network_first', name: 'Primeira Conexão', description: 'Faça sua primeira conexão na TechWeek.', points: 10, icon: Users, type: 'auto' },
    { id: 'network_period', name: 'Calouro na Área', description: 'Conecte-se com alguém do primeiro período.', points: 15, icon: Users, type: 'auto' },
    {
      id: 'network_career', name: 'Sua Área', description: 'Encontre alguém da área que quer seguir.', points: 20, icon: MessageCircle, type: 'manual', fields: [
        { id: 'prompt1', type: 'text', label: 'Qual o @/user da pessoa?' },
        { id: 'prompt2', type: 'textarea', label: 'Qual foi o 1º passo dela na carreira?' }
      ]
    },
    {
      id: 'network_connect_two', name: 'Conector', description: 'Apresente duas pessoas que devem se conhecer.', points: 20, icon: MessageCircle, type: 'manual', fields: [
        { id: 'prompt1', type: 'text', label: 'Qual o @/user da 1ª pessoa?' },
        { id: 'prompt2', type: 'text', label: 'Qual o @/user da 2ª pessoa?' }
      ]
    },
    {
      id: 'network_past_edition', name: 'Veterano', description: 'Encontre alguém de edições passadas.', points: 15, icon: MessageCircle, type: 'manual', fields: [
        { id: 'prompt1', type: 'text', label: 'Qual o @/user da pessoa?' },
        { id: 'prompt2', type: 'textarea', label: 'Qual foi a melhor experiência dela?' }
      ]
    },
    {
      id: 'network_first_edition', name: 'Novato', description: 'Encontre alguém novato e mostre o app.', points: 15, icon: MessageCircle, type: 'manual', fields: [
        { id: 'prompt1', type: 'text', label: 'Qual o @/user da pessoa?' },
        { id: 'prompt2', type: 'textarea', label: 'O que você mostrou para ela?' }
      ]
    }
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
      setPhotoFiles({});
      setPhotoPreviews({});
      return;
    }

    const success = await completeChallenge(challenge.id, challenge.points);
    if (success) {
      setFeedback({
        type: 'success',
        title: 'Desafio Concluído! 🎉',
        message: `Parabéns! Você completou "${challenge.name}" e pontuou com sucesso.`,
        points: challenge.points
      });
    } else {
      setFeedback({
        type: 'warning',
        title: 'Desafio Já Concluído',
        message: 'Você já completou este desafio anteriormente!'
      });
    }
  };

  const handleManualSubmit = async (e) => {
    e.preventDefault();
    if (!activeManualChallenge || isSubmitting) return;

    if (activeManualChallenge.id === 'secret_password') {
      const pass = manualForm['password'];
      if (!pass || pass.trim().toUpperCase() !== 'OPORTUNIDADES') {
        setFeedback({
          type: 'warning',
          title: 'Palavra-chave Incorreta',
          message: 'A palavra-chave inserida não está certa. Continue procurando pelos stands!'
        });
        return;
      }
    }

    setIsSubmitting(true);
    try {
      const finalMetadata = { ...manualForm, submitted_at: new Date().toISOString() };

      // Se a missão possuir campo de foto, faz o upload real antes de concluir
      const photoField = activeManualChallenge.fields?.find(f => f.type === 'photo');
      if (photoField) {
        const file = photoFiles[photoField.id];
        if (!file) {
          setFeedback({
            type: 'warning',
            title: 'Foto Obrigatória',
            message: 'Por favor, tire ou anexe uma foto comprovando a missão.'
          });
          setIsSubmitting(false);
          return;
        }

        const publicUrl = await uploadMissionPhoto(file, activeManualChallenge.id);
        finalMetadata[photoField.id] = publicUrl;
        finalMetadata.photo_url = publicUrl;
      }

      if (hasCompletedChallenge && hasCompletedChallenge(activeManualChallenge.id)) {
        setFeedback({
          type: 'warning',
          title: 'Missão Já Concluída',
          message: 'Esta missão já foi concluída anteriormente!'
        });
        setActiveManualChallenge(null);
        return;
      }

      // Respostas da missão manual vão como metadata do evento de pontos
      // (REG-MISSION-001) em vez de apenas no estado da página
      const success = await completeChallenge(activeManualChallenge.id, activeManualChallenge.points, finalMetadata);
      if (success) {
        setFeedback({
          type: 'success',
          title: 'Missão Concluída! 🎉',
          message: `Você cumpriu a missão "${activeManualChallenge.name}" com sucesso!`,
          points: activeManualChallenge.points
        });
        setActiveManualChallenge(null);
        setManualForm({});
        setPhotoFiles({});
        setPhotoPreviews({});
      } else {
        setFeedback({
          type: 'warning',
          title: 'Missão Já Concluída',
          message: 'Esta missão já foi concluída anteriormente!'
        });
        setActiveManualChallenge(null);
      }
    } catch (err) {
      console.error('Erro ao enviar missão:', err);
      setFeedback({
        type: 'error',
        title: 'Erro ao Concluir Missão',
        message: 'Não foi possível registrar sua comprovação no momento. Verifique sua conexão e tente novamente.'
      });
    } finally {
      setIsSubmitting(false);
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
          const isHighlighted = challenge.id === 'instagram_story' && !isCompleted;
          const isSecret = challenge.isSecret && !isCompleted;
          const IconComponent = challenge.icon || MapPin;

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

      {activeManualChallenge && typeof document !== 'undefined' && createPortal(
        <div 
          className="modal-overlay-fixed"
          onClick={() => {
            setActiveManualChallenge(null);
            setManualForm({});
            setPhotoFiles({});
            setPhotoPreviews({});
          }}
          style={{ 
            background: 'rgba(0,0,0,0.82)', 
            backdropFilter: 'blur(12px)',
            WebkitBackdropFilter: 'blur(12px)',
            padding: '20px'
          }}
        >
          <div 
            className="card modal-card-fixed" 
            onClick={(e) => e.stopPropagation()}
            style={{ width: '100%', maxWidth: '420px', background: 'var(--card-bg)' }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h3 style={{ fontSize: '1.2rem', color: 'white' }}>{activeManualChallenge.name}</h3>
              <button
                type="button"
                onClick={() => {
                  setActiveManualChallenge(null);
                  setManualForm({});
                  setPhotoFiles({});
                  setPhotoPreviews({});
                }}
                style={{ background: 'none', border: 'none', color: 'white', cursor: 'pointer' }}
              >
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
                    <div>
                      {!photoPreviews[field.id] ? (
                        <input
                          type="file"
                          accept="image/png,image/jpeg,image/webp,image/gif"
                          capture="environment"
                          onChange={(e) => {
                            const file = e.target.files[0];
                            if (!file) return;
                            const validation = validateMissionPhoto(file);
                            if (!validation.valid) {
                              if (validation.reason === 'too_large') {
                                setFeedback({
                                  type: 'warning',
                                  title: 'Foto Muito Grande',
                                  message: 'A foto deve ter no máximo 5MB para otimizar o envio.'
                                });
                              } else if (validation.reason === 'invalid_type') {
                                setFeedback({
                                  type: 'warning',
                                  title: 'Formato Inválido',
                                  message: 'Formato de imagem inválido. Use PNG, JPEG, WebP ou GIF.'
                                });
                              } else {
                                setFeedback({
                                  type: 'error',
                                  title: 'Arquivo Inválido',
                                  message: 'Não foi possível ler este arquivo. Selecione uma foto válida.'
                                });
                              }
                              e.target.value = '';
                              return;
                            }
                            setPhotoFiles(prev => ({ ...prev, [field.id]: file }));
                            setPhotoPreviews(prev => ({ ...prev, [field.id]: URL.createObjectURL(file) }));
                          }}
                          className="login-input"
                          style={{ padding: '8px' }}
                          required
                        />
                      ) : (
                        <div style={{ position: 'relative', marginTop: '8px', borderRadius: '8px', overflow: 'hidden', border: '1px solid rgba(255,255,255,0.2)' }}>
                          <img
                            src={photoPreviews[field.id]}
                            alt="Pré-visualização da missão"
                            style={{ width: '100%', maxHeight: '200px', objectFit: 'cover', display: 'block' }}
                          />
                          <button
                            type="button"
                            onClick={() => {
                              setPhotoFiles(prev => {
                                const copy = { ...prev };
                                delete copy[field.id];
                                return copy;
                              });
                              setPhotoPreviews(prev => {
                                const copy = { ...prev };
                                delete copy[field.id];
                                return copy;
                              });
                            }}
                            style={{
                              position: 'absolute',
                              top: '8px',
                              right: '8px',
                              background: 'rgba(0,0,0,0.7)',
                              border: 'none',
                              color: '#ef4444',
                              borderRadius: '50%',
                              width: '32px',
                              height: '32px',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              cursor: 'pointer'
                            }}
                            title="Remover foto"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ))}

              <button
                type="submit"
                className="login-btn"
                disabled={isSubmitting}
                style={{
                  marginTop: '16px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                  opacity: isSubmitting ? 0.7 : 1,
                  cursor: isSubmitting ? 'not-allowed' : 'pointer'
                }}
              >
                {isSubmitting && <Loader2 size={18} className="animate-spin" />}
                {isSubmitting ? 'Enviando comprovação...' : 'Completar Missão'}
              </button>
            </form>
          </div>
        </div>,
        document.body
      )}

      {/* Card Modal Estilizado de Feedback (Sucesso / Erro / Atenção) */}
      <FeedbackModal
        isOpen={!!feedback}
        type={feedback?.type}
        title={feedback?.title}
        message={feedback?.message}
        points={feedback?.points}
        onClose={() => setFeedback(null)}
      />
    </div>
  );
}
