import { useState, useEffect, useRef } from 'react';
import { useUser } from '../hooks/useUser';
import { getMyProfile, uploadAvatar } from '../lib/gameplay';
import { logoutUser } from '../lib/auth';
import { validateAvatarFile, isValidEmail } from '../lib/validators';
import AvatarCropperModal from '../components/AvatarCropperModal';
import { SYMPLA_EVENT_URL, verifySymplaTicket } from '../lib/sympla';
import { updateUserEmail, updateUserProfile } from '../lib/userService';
import { LogOut, Camera, Edit2, Loader2, X, RefreshCw } from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom';

export default function Profile() {
  const { points } = useUser();
  const navigate = useNavigate();
  const location = useLocation();
  const fileInputRef = useRef(null);
  const [profile, setProfile] = useState({
    id: '',
    email: '',
    firstName: '',
    lastName: '',
    username: '',
    course: '',
    participantType: '',
    period: null,
    avatarUrl: '',
    symplaTicket: null
  });
  const [avatarError, setAvatarError] = useState('');
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [rawImageForCrop, setRawImageForCrop] = useState(null);

  // Estados para troca de e-mail e verificação de ingresso
  const [isEmailModalOpen, setIsEmailModalOpen] = useState(false);
  const [newEmailInput, setNewEmailInput] = useState('');
  const [savingEmail, setSavingEmail] = useState(false);
  const [emailChangeMessage, setEmailChangeMessage] = useState(null);
  const [recheckingTicket, setRecheckingTicket] = useState(false);
  const [ticketNotice, setTicketNotice] = useState('');

  useEffect(() => {
    getMyProfile()
      .then((data) => {
        if (!data) return;
        setProfile({
          id: data.id || '',
          email: data.email || '',
          username: data.username || '',
          firstName: data.first_name || '',
          lastName: data.last_name || '',
          course: data.course || '',
          participantType: data.participant_type || '',
          period: data.period || null,
          avatarUrl: data.avatar_url || '',
          symplaTicket: data.sympla_ticket || null,
          linkedin: data.linkedin || '',
          instagram: data.instagram || ''
        });
      })
      .catch((err) => {
        console.warn('Erro ao carregar perfil:', err);
      });
  }, []);

  // Abre o modal de alteração de e-mail automaticamente se vier com ?changeEmail=true
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    if (params.get('changeEmail') === 'true') {
      setIsEmailModalOpen(true);
      setNewEmailInput(profile.email || '');
    }
  }, [location.search, profile.email]);

  const handleSaveEmail = async (e) => {
    e?.preventDefault?.();
    const cleanEmail = newEmailInput.trim().toLowerCase();
    if (!cleanEmail || !isValidEmail(cleanEmail)) {
      setEmailChangeMessage({ type: 'error', text: 'Informe um endereço de e-mail válido.' });
      return;
    }

    setSavingEmail(true);
    setEmailChangeMessage(null);

    try {
      // 1. Atualiza no Firestore e no Auth
      await updateUserEmail(profile.id, cleanEmail);
      setProfile(prev => ({ ...prev, email: cleanEmail }));

      // 2. Consulta imediatamente o Sympla com o novo e-mail
      try {
        const symplaRes = await verifySymplaTicket({ email: cleanEmail });
        const p = symplaRes?.participant || symplaRes?.ticket;
        if (symplaRes && symplaRes.verified && p) {
          const ticketObj = {
            ticketNumber: p.ticketNumber,
            ticketName: p.ticketName,
            qrCodeData: p.qrCodeData || p.ticketNumber,
            orderId: p.orderId
          };
          await updateUserProfile(profile.id, { symplaTicket: ticketObj });
          setProfile(prev => ({ ...prev, symplaTicket: ticketObj }));
          setEmailChangeMessage({ 
            type: 'success', 
            text: `E-mail alterado e ingresso vinculado com sucesso: ${p.ticketName}! 🎉` 
          });
        } else {
          setEmailChangeMessage({ 
            type: 'warning', 
            text: 'E-mail atualizado com sucesso! Porém, ainda não encontramos ingresso no Sympla para este e-mail. Garanta seu ingresso se ainda não o fez.' 
          });
        }
      } catch (symplaErr) {
        console.warn('Erro ao consultar Sympla após troca de e-mail:', symplaErr);
        setEmailChangeMessage({ 
          type: 'warning', 
          text: 'E-mail atualizado com sucesso! Não foi possível consultar o Sympla no momento.' 
        });
      }
    } catch (err) {
      console.error('Erro ao trocar e-mail:', err);
      setEmailChangeMessage({ 
        type: 'error', 
        text: err.message || 'Erro ao atualizar e-mail. Tente novamente.' 
      });
    } finally {
      setSavingEmail(false);
    }
  };

  const handleRecheckTicket = async () => {
    if (!profile.email || !profile.id) return;
    setRecheckingTicket(true);
    setTicketNotice('');
    try {
      const res = await verifySymplaTicket({ email: profile.email });
      const p = res?.participant || res?.ticket;
      if (res && res.verified && p) {
        const ticketObj = {
          ticketNumber: p.ticketNumber,
          ticketName: p.ticketName,
          qrCodeData: p.qrCodeData || p.ticketNumber,
          orderId: p.orderId
        };
        await updateUserProfile(profile.id, { symplaTicket: ticketObj });
        setProfile(prev => ({ ...prev, symplaTicket: ticketObj }));
        setTicketNotice('Ingresso localizado e vinculado com sucesso! 🎉');
      } else {
        setTicketNotice('Ingresso ainda não encontrado no Sympla para este e-mail.');
      }
    } catch {
      setTicketNotice('Erro ao consultar o Sympla no momento.');
    } finally {
      setRecheckingTicket(false);
    }
  };


  const handleAvatarClick = () => {
    fileInputRef.current?.click();
  };

  const handleAvatarChange = (event) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;

    const validation = validateAvatarFile(file);
    if (!validation.valid) {
      setAvatarError(
        validation.reason === 'too_large'
          ? 'A imagem precisa ter até 2MB.'
          : 'Escolha um arquivo de imagem.'
      );
      return;
    }

    setAvatarError('');
    setRawImageForCrop(URL.createObjectURL(file));
  };

  const handleCropComplete = async (croppedFile) => {
    setRawImageForCrop(null);
    setUploadingAvatar(true);
    try {
      const publicUrl = await uploadAvatar(croppedFile);
      setProfile(prev => ({ ...prev, avatarUrl: publicUrl }));
    } catch {
      setAvatarError('Não foi possível enviar a foto. Tente novamente.');
    } finally {
      setUploadingAvatar(false);
    }
  };

  const handleLogout = async () => {
    const confirmed = window.confirm('Tem certeza que deseja sair da conta?');
    if (!confirmed) return;
    await logoutUser();
    navigate('/login');
  };

  const qrData = encodeURIComponent(
    profile.symplaTicket?.qrCodeData ||
    profile.symplaTicket?.ticketNumber ||
    JSON.stringify({
      username: (profile.username || 'user').replace(/^@/, ''),
      participantType: profile.participantType || 'Participante',
      course: profile.course || '',
      period: profile.period || null
    })
  );
  const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${qrData}&bgcolor=ffffff&color=000000`;

  const formatUrl = (url, prefix = '') => {
    if (!url) return null;
    if (url.startsWith('http')) return url;
    if (url.startsWith('@')) url = url.substring(1);
    return prefix ? `${prefix}${url}` : `https://${url}`;
  };

  const linkedinUrl = formatUrl(profile.linkedin, 'https://linkedin.com/in/');
  const instagramUrl = formatUrl(profile.instagram, 'https://instagram.com/');

  const cleanFirstName = (profile.firstName || '').replace(/^@/, '');
  const cleanLastName = profile.lastName || '';
  const fullName = [cleanFirstName, cleanLastName].filter(Boolean).join(' ').trim();
  const cleanUsername = (profile.username || '').replace(/^@/, '');

  return (
    <div className="page-container animate-fade-in" style={{ paddingBottom: '120px' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '32px' }}>
        <button onClick={() => navigate(-1)} style={{ width: '40px', height: '40px', borderRadius: '50%', background: 'rgba(255,255,255,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', border: 'none', color: 'white', cursor: 'pointer' }}>
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 12H5" /><path d="M12 19l-7-7 7-7" /></svg>
        </button>
        <h1 className="font-lastica" style={{ fontSize: '1.2rem', fontWeight: '500' }}>Perfil</h1>
        <div style={{ width: '40px' }}></div>
      </div>


      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: '32px' }}>
        <div
          onClick={handleAvatarClick}
          style={{ position: 'relative', width: '120px', height: '120px', borderRadius: '50%', background: 'var(--primary-gradient)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '3.5rem', fontWeight: 'bold', color: 'white', border: '3px solid var(--primary)', marginBottom: '16px', boxShadow: '0 10px 25px rgba(59, 130, 246, 0.5)', overflow: 'hidden', cursor: 'pointer' }}
        >
          {profile.avatarUrl
            ? <img src={profile.avatarUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            : (cleanFirstName ? cleanFirstName.charAt(0).toUpperCase() : (cleanUsername ? cleanUsername.charAt(0).toUpperCase() : 'U'))}
          <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, background: 'rgba(0,0,0,0.55)', padding: '6px 0', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Camera size={18} />
          </div>
        </div>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          onChange={handleAvatarChange}
          style={{ display: 'none' }}
        />
        {uploadingAvatar && (
          <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginBottom: '8px' }}>Enviando foto...</p>
        )}
        {avatarError && (
          <p style={{ fontSize: '0.8rem', color: '#ef4444', marginBottom: '8px' }}>{avatarError}</p>
        )}
        {/* Nome Grande em Cima */}
        <h2 style={{ fontSize: '1.6rem', fontWeight: '800', marginBottom: '4px', textAlign: 'center', color: 'white' }}>
          {fullName || (cleanUsername ? `@${cleanUsername}` : 'Participante')}
        </h2>
        {/* Username em Baixo */}
        {cleanUsername && (
          <p style={{ color: 'var(--primary-color, #00d2ff)', fontSize: '1rem', fontWeight: '600', marginBottom: '8px', textAlign: 'center' }}>
            @{cleanUsername}
          </p>
        )}
        <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginBottom: '6px', textAlign: 'center' }}>
          {profile.course ? `${profile.course} - ${profile.participantType}` : profile.participantType || 'Participante'}
        </p>

        {profile.email && (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', marginBottom: '16px' }}>
            <span style={{ fontSize: '0.82rem', color: 'rgba(255, 255, 255, 0.7)' }}>{profile.email}</span>
            <button
              onClick={() => {
                setNewEmailInput(profile.email);
                setEmailChangeMessage(null);
                setIsEmailModalOpen(true);
              }}
              style={{
                background: 'rgba(255, 255, 255, 0.08)',
                border: '1px solid rgba(255, 255, 255, 0.15)',
                borderRadius: '6px',
                padding: '2px 8px',
                fontSize: '0.72rem',
                color: 'var(--primary-color, #00d2ff)',
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '4px'
              }}
              title="Trocar e-mail da conta"
            >
              <Edit2 size={11} />
              Trocar
            </button>
          </div>
        )}

        <div style={{ display: 'flex', gap: '16px', justifyContent: 'center' }}>
          {linkedinUrl && (
            <a href={linkedinUrl} target="_blank" rel="noopener noreferrer" className="card-highlight" style={{ width: '44px', height: '44px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', textDecoration: 'none', color: 'white' }}>
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-2-2 2 2 0 0 0-2 2v7h-4v-7a6 6 0 0 1 6-6z"></path>
                <rect x="2" width="4" height="12" y="9"></rect>
                <circle cx="4" cy="4" r="2"></circle>
              </svg>
            </a>
          )}
          {instagramUrl && (
            <a href={instagramUrl} target="_blank" rel="noopener noreferrer" className="card-highlight-secondary" style={{ width: '44px', height: '44px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', textDecoration: 'none', color: 'white' }}>
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="2" y="2" width="20" height="20" rx="5" ry="5"></rect>
                <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"></path>
                <line x1="17.5" y1="6.5" x2="17.51" y2="6.5"></line>
              </svg>
            </a>
          )}
        </div>
      </div>

      <div className="card" style={{ marginBottom: '24px', textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
        <h3 style={{ fontSize: '1.1rem', fontWeight: '700', color: 'white', marginBottom: '10px' }}>Meu Crachá & QR Code</h3>
        {profile.symplaTicket?.ticketName ? (
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '6px 14px', background: 'rgba(16, 185, 129, 0.12)', border: '1px solid rgba(16, 185, 129, 0.3)', borderRadius: '20px', color: '#10b981', fontSize: '0.8rem', fontWeight: '600', marginBottom: '16px' }}>
            🎟️ {profile.symplaTicket.ticketName} • Confirmado
          </div>
        ) : (
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '6px 14px', background: 'rgba(245, 158, 11, 0.12)', border: '1px solid rgba(245, 158, 11, 0.3)', borderRadius: '20px', color: '#fbbf24', fontSize: '0.8rem', fontWeight: '600', marginBottom: '16px' }}>
            ⚠️ Ingresso Sympla Pendente
          </div>
        )}
        <div style={{ background: 'white', padding: '16px', borderRadius: '20px', display: 'inline-block', marginBottom: '14px', boxShadow: '0 8px 24px rgba(0, 0, 0, 0.35)' }}>
          <img
            src={qrUrl}
            alt="Meu QR Code"
            style={{ width: '160px', height: '160px', display: 'block' }}
          />
        </div>
        <p style={{ fontSize: '0.85rem', color: profile.symplaTicket ? '#10b981' : 'var(--text-secondary)', fontWeight: profile.symplaTicket ? '600' : 'normal' }}>
          {profile.symplaTicket ? '✓ Ingresso oficial Sympla vinculado!' : 'Peça para outros participantes escanearem para networking!'}
        </p>
        {!profile.symplaTicket && (
          <div style={{ marginTop: '14px', display: 'flex', flexDirection: 'column', gap: '8px', alignItems: 'center' }}>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', justifyContent: 'center' }}>
              <a
                href={SYMPLA_EVENT_URL}
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  padding: '6px 12px',
                  borderRadius: '8px',
                  background: '#f59e0b',
                  color: '#000',
                  fontSize: '0.75rem',
                  fontWeight: 'bold',
                  textDecoration: 'none'
                }}
              >
                Garantir no Sympla &rarr;
              </a>
              <button
                onClick={handleRecheckTicket}
                disabled={recheckingTicket}
                style={{
                  padding: '6px 12px',
                  borderRadius: '8px',
                  background: 'rgba(255, 255, 255, 0.1)',
                  border: '1px solid rgba(255, 255, 255, 0.2)',
                  color: 'white',
                  fontSize: '0.75rem',
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '4px'
                }}
              >
                {recheckingTicket ? <Loader2 size={12} className="animate-spin" /> : <RefreshCw size={12} />}
                {recheckingTicket ? 'Verificando...' : 'Verificar agora'}
              </button>
            </div>

            <button
              onClick={() => {
                setNewEmailInput(profile.email);
                setEmailChangeMessage(null);
                setIsEmailModalOpen(true);
              }}
              style={{
                background: 'none',
                border: 'none',
                fontSize: '0.75rem',
                color: '#fbbf24',
                textDecoration: 'underline',
                cursor: 'pointer',
                marginTop: '4px'
              }}
            >
              Usou outro e-mail no Sympla? Alterar e-mail
            </button>

            {ticketNotice && (
              <p style={{ margin: '4px 0 0 0', fontSize: '0.75rem', color: ticketNotice.includes('sucesso') ? '#10b981' : '#fbbf24' }}>
                {ticketNotice}
              </p>
            )}
          </div>
        )}
      </div>

      <div className="card" style={{ marginBottom: '24px', textAlign: 'center' }}>
        <h3 style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', marginBottom: '8px' }}>Meus Pontos</h3>
        <div style={{ fontSize: '2.5rem', fontWeight: '700', color: 'white' }}>{points}</div>
        <p style={{ fontSize: '0.8rem', color: 'var(--primary)', marginTop: '8px' }}>Nível 5 - Expert</p>
      </div>



      <button
        onClick={handleLogout}
        className="card"
        style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '12px', color: '#ef4444', border: '1px solid rgba(239, 68, 68, 0.2)', cursor: 'pointer' }}
      >
        <LogOut size={20} />
        Sair da Conta
      </button>

      {/* Modal Interativo de Corte de Foto */}
      {rawImageForCrop && (
        <AvatarCropperModal
          imageSrc={rawImageForCrop}
          onCropComplete={handleCropComplete}
          onClose={() => setRawImageForCrop(null)}
        />
      )}

      {/* Modal de Alteração de E-mail para Vínculo com Sympla */}
      {isEmailModalOpen && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0, 0, 0, 0.82)',
            backdropFilter: 'blur(8px)',
            zIndex: 1000,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '16px'
          }}
        >
          <div
            className="login-glass-card animate-scale-up"
            style={{
              width: '100%',
              maxWidth: '420px',
              padding: '24px',
              position: 'relative'
            }}
          >
            <button
              onClick={() => {
                setIsEmailModalOpen(false);
                setEmailChangeMessage(null);
              }}
              style={{
                position: 'absolute',
                top: '16px',
                right: '16px',
                background: 'none',
                border: 'none',
                color: 'var(--text-secondary)',
                cursor: 'pointer'
              }}
            >
              <X size={20} />
            </button>

            <h3 style={{ fontSize: '1.2rem', color: 'white', marginBottom: '8px', fontWeight: 'bold' }}>
              Alterar E-mail da Conta
            </h3>
            <p style={{ fontSize: '0.82rem', color: 'var(--text-secondary)', marginBottom: '16px', lineHeight: '1.45' }}>
              Cadastrou com um e-mail diferente do que usou no Sympla? Informe o e-mail correto abaixo para atualizarmos seu perfil e sincronizarmos seu ingresso oficial.
            </p>

            <form onSubmit={handleSaveEmail}>
              <div style={{ marginBottom: '16px' }}>
                <label style={{ display: 'block', fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: '6px' }}>
                  Novo E-mail (o mesmo do Sympla)
                </label>
                <input
                  type="email"
                  value={newEmailInput}
                  onChange={(e) => setNewEmailInput(e.target.value)}
                  placeholder="exemplo@email.com"
                  className="login-input"
                  style={{ width: '100%' }}
                  required
                  autoFocus
                />
              </div>

              {emailChangeMessage && (
                <div
                  style={{
                    padding: '10px 12px',
                    borderRadius: '8px',
                    fontSize: '0.78rem',
                    marginBottom: '16px',
                    lineHeight: '1.45',
                    background:
                      emailChangeMessage.type === 'success'
                        ? 'rgba(16, 185, 129, 0.15)'
                        : emailChangeMessage.type === 'warning'
                        ? 'rgba(245, 158, 11, 0.15)'
                        : 'rgba(239, 68, 68, 0.15)',
                    border: `1px solid ${
                      emailChangeMessage.type === 'success'
                        ? 'rgba(16, 185, 129, 0.3)'
                        : emailChangeMessage.type === 'warning'
                        ? 'rgba(245, 158, 11, 0.3)'
                        : 'rgba(239, 68, 68, 0.3)'
                    }`,
                    color:
                      emailChangeMessage.type === 'success'
                        ? '#10b981'
                        : emailChangeMessage.type === 'warning'
                        ? '#fbbf24'
                        : '#ef4444'
                  }}
                >
                  {emailChangeMessage.text}
                </div>
              )}

              <div style={{ display: 'flex', gap: '10px' }}>
                <button
                  type="button"
                  onClick={() => {
                    setIsEmailModalOpen(false);
                    setEmailChangeMessage(null);
                  }}
                  className="btn btn-secondary"
                  style={{
                    flex: 1,
                    padding: '12px',
                    borderRadius: '8px',
                    background: 'rgba(255, 255, 255, 0.08)',
                    border: '1px solid rgba(255, 255, 255, 0.15)',
                    color: 'white',
                    cursor: 'pointer'
                  }}
                >
                  Fechar
                </button>
                <button
                  type="submit"
                  disabled={savingEmail}
                  className="login-btn"
                  style={{
                    flex: 2,
                    padding: '12px',
                    borderRadius: '8px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '8px'
                  }}
                >
                  {savingEmail ? <Loader2 size={16} className="animate-spin" /> : null}
                  {savingEmail ? 'Salvando...' : 'Salvar e Verificar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}