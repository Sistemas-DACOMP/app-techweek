import { useState, useEffect, useRef } from 'react';
import { useUser } from '../hooks/useUser';
import { getMyProfile, uploadAvatar } from '../lib/gameplay';
import { logoutUser, onAuthChange } from '../lib/auth';
import { auth } from '../lib/firebase';
import { validateAvatarFile, isValidEmail } from '../lib/validators';
import AvatarCropperModal from '../components/AvatarCropperModal';
import MascotDuo from '../components/MascotDuo';
import { QRCodeSVG } from 'qrcode.react';
import { SYMPLA_EVENT_URL, verifySymplaTicket, getBadgeQrValue } from '../lib/sympla';
import { getUserProfile, uploadUserAvatar, updateUserEmail, updateUserProfile } from '../lib/userService';
import { 
  LogOut, Camera, Edit2, Edit3, Loader2, X, RefreshCw, Lock, 
  User, Mail, Phone, BookOpen, GraduationCap, Ticket, Check, AlertCircle, Sparkles, ExternalLink, Building2 
} from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom';

const UFU_COURSES = [
  'Sistemas de Informação',
  'Ciência da Computação',
  'Inteligência Artificial',
  'Engenharia de Computação',
  'Engenharia Elétrica',
  'Engenharia Biomédica',
  'Engenharia Mecatrônica',
  'Ciência de Dados',
  'Cibersegurança',
  'Design',
  'Outro (especificar)'
];

const PARTICIPANT_TYPES = [
  'Aluno da UFU',
  'Aluno de outra instituição',
  'Servidor / Professor',
  'Comunidade Externa'
];

export default function Profile() {
  const { points, userLevel } = useUser();
  const navigate = useNavigate();
  const location = useLocation();
  const fileInputRef = useRef(null);
  const [profile, setProfile] = useState({
    id: '',
    email: '',
    firstName: '',
    lastName: '',
    username: '',
    phone: '',
    course: '',
    participantType: '',
    period: null,
    avatarUrl: '',
    symplaTicket: null,
    linkedin: '',
    instagram: ''
  });
  const [avatarError, setAvatarError] = useState('');
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [rawImageForCrop, setRawImageForCrop] = useState(null);

  // Estados para Modal Completo de Edição de Perfil & Sympla (KAN-69)
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editForm, setEditForm] = useState({
    firstName: '',
    lastName: '',
    username: '',
    phone: '',
    participantType: 'Aluno da UFU',
    course: 'Sistemas de Informação',
    customCourse: '',
    period: '',
    linkedin: '',
    instagram: '',
    email: '',
    ticketNumber: ''
  });
  const [savingProfile, setSavingProfile] = useState(false);
  const [verifyingTicket, setVerifyingTicket] = useState(false);
  const [editFeedback, setEditFeedback] = useState(null);
  const [activeTab, setActiveTab] = useState('pessoal'); // 'pessoal' | 'academico' | 'contato' | 'sympla'
  const [recheckingTicket, setRecheckingTicket] = useState(false);
  const [ticketNotice, setTicketNotice] = useState('');

  useEffect(() => {
    async function fetchUserData(currentUser) {
      const uid = currentUser?.uid || auth.currentUser?.uid;
      let data = null;
      if (uid) {
        try {
          data = await getUserProfile(uid);
        } catch (e) {
          console.warn('Erro ao carregar perfil do Firestore:', e);
        }
      }

      if (!data) {
        data = await getMyProfile().catch(() => null);
      }

      if (data || currentUser) {
        setProfile({
          id: data?.id || data?.uid || uid || currentUser?.uid || '',
          email: data?.email || currentUser?.email || '',
          username: data?.username || '',
          firstName: data?.firstName || data?.first_name || currentUser?.displayName?.split(' ')[0] || '',
          lastName: data?.lastName || data?.last_name || '',
          phone: data?.phone || '',
          course: data?.course || '',
          participantType: data?.participantType || data?.participant_type || '',
          period: data?.period || null,
          avatarUrl: data?.avatarUrl || data?.avatar_url || data?.photoURL || currentUser?.photoURL || '',
          symplaTicket: data?.symplaTicket || data?.sympla_ticket || null,
          hasSymplaTicket: !!(data?.hasSymplaTicket || data?.symplaTicket || data?.sympla_ticket),
          linkedin: data?.linkedin || '',
          instagram: data?.instagram || ''
        });
      }
    }

    const unsubscribe = onAuthChange((user) => {
      fetchUserData(user);
    });

    return () => unsubscribe();
  }, []);

  // Abre modal se vier com parâmetro ?edit=true ou ?changeEmail=true
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    if (params.get('edit') === 'true' || params.get('changeEmail') === 'true') {
      handleOpenEditModal();
      if (params.get('changeEmail') === 'true') {
        setActiveTab('sympla');
      }
    }
  }, [location.search, profile.id]);

  const handleOpenEditModal = () => {
    const isCustomCourse = profile.course && !UFU_COURSES.slice(0, -1).includes(profile.course);
    setEditForm({
      firstName: (profile.firstName || '').replace(/^@/, ''),
      lastName: profile.lastName || '',
      username: (profile.username || '').replace(/^@/, ''),
      phone: profile.phone || '',
      participantType: profile.participantType || 'Aluno da UFU',
      course: isCustomCourse ? 'Outro (especificar)' : (profile.course || 'Sistemas de Informação'),
      customCourse: isCustomCourse ? profile.course : '',
      period: profile.period ? String(profile.period) : '',
      linkedin: profile.linkedin || '',
      instagram: profile.instagram || '',
      email: profile.email || ''
    });
    setEditFeedback(null);
    setIsEditModalOpen(true);
  };

  const handleSaveProfile = async (e) => {
    e?.preventDefault?.();
    const uid = profile.id || auth.currentUser?.uid;
    if (!uid) {
      setEditFeedback({ type: 'error', text: 'Sessão expirada. Faça login novamente.' });
      return;
    }

    const cleanFirstName = editForm.firstName.trim();
    const cleanLastName = editForm.lastName.trim();
    const cleanUsername = editForm.username.trim().replace(/^@/, '');
    const cleanEmail = editForm.email.trim().toLowerCase();
    const isStudent = editForm.participantType === 'Aluno da UFU' || editForm.participantType === 'Aluno de outra instituição';
    const finalCourse = isStudent 
      ? (editForm.course === 'Outro (especificar)' ? editForm.customCourse.trim() : editForm.course) 
      : '';
    const cleanPhone = editForm.phone.trim();
    const cleanLinkedin = editForm.linkedin.trim();
    const cleanInstagram = editForm.instagram.trim();

    if (!cleanFirstName) {
      setEditFeedback({ type: 'error', text: 'Primeiro nome é obrigatório.' });
      setActiveTab('pessoal');
      return;
    }
    if (!cleanUsername) {
      setEditFeedback({ type: 'error', text: 'Nome de usuário (@username) é obrigatório.' });
      setActiveTab('pessoal');
      return;
    }
    if (cleanEmail && !isValidEmail(cleanEmail)) {
      setEditFeedback({ type: 'error', text: 'Informe um endereço de e-mail válido.' });
      setActiveTab('sympla');
      return;
    }
    if (isStudent && editForm.course === 'Outro (especificar)' && !editForm.customCourse.trim()) {
      setEditFeedback({ type: 'error', text: 'Por favor, informe o nome do seu curso.' });
      setActiveTab('academico');
      return;
    }

    setSavingProfile(true);
    setEditFeedback(null);

    try {
      const updates = {
        firstName: cleanFirstName,
        lastName: cleanLastName,
        displayName: `${cleanFirstName} ${cleanLastName}`.trim(),
        username: cleanUsername,
        phone: cleanPhone,
        participantType: editForm.participantType,
        course: finalCourse,
        period: isStudent && editForm.period ? Number(editForm.period) : null,
        linkedin: cleanLinkedin,
        instagram: cleanInstagram,
        email: cleanEmail
      };

      // 1. Atualiza documento no Firestore
      await updateUserProfile(uid, updates);

      // 2. Se e-mail foi alterado, tenta atualizar no Firebase Auth
      if (cleanEmail && auth.currentUser && auth.currentUser.email !== cleanEmail) {
        try {
          await updateUserEmail(uid, cleanEmail);
        } catch (authErr) {
          console.warn('Aviso: E-mail atualizado no Firestore mas precisa de re-login no Auth:', authErr);
        }
      }

      // 3. Logística Sympla: se informado e-mail, verifica automaticamente
      let symplaMessage = '';
      if (cleanEmail) {
        try {
          const symplaRes = await verifySymplaTicket({ email: cleanEmail });
          const p = symplaRes?.participant || symplaRes?.ticket;
          if (symplaRes && symplaRes.verified && (symplaRes.symplaTicket || p)) {
            const ticketObj = symplaRes.symplaTicket || {
              ticketNumber: p.ticketNumber,
              ticketName: p.ticketName,
              qrCodeData: p.qrCodeData || p.ticketNumber,
              orderId: p.orderId
            };
            updates.symplaTicket = ticketObj;
            updates.hasSymplaTicket = true;
            try {
              await updateUserProfile(uid, { symplaTicket: ticketObj, hasSymplaTicket: true });
            } catch (updateErr) {
              console.warn('[Profile] Atualização client-side secundária (já salvo pelo backend):', updateErr);
            }
            symplaMessage = ` Ingresso Sympla vinculado: ${ticketObj.ticketName || p?.ticketName || 'Oficial'}! 🎟️`;
          } else if (cleanEmail !== profile.email) {
            symplaMessage = ' (Ingresso não localizado com este e-mail).';
          }
        } catch (symplaErr) {
          console.warn('Aviso ao consultar Sympla no salvamento do perfil:', symplaErr);
        }
      }

      // 4. Atualiza estado local do componente
      setProfile(prev => ({
        ...prev,
        ...updates
      }));

      setEditFeedback({
        type: 'success',
        text: `Perfil atualizado com sucesso!${symplaMessage}`
      });

      // Fecha o modal após 1.2s se sucesso
      setTimeout(() => {
        setIsEditModalOpen(false);
      }, 1200);

    } catch (err) {
      console.error('Erro ao salvar perfil:', err);
      setEditFeedback({
        type: 'error',
        text: err.message || 'Erro ao salvar alterações do perfil.'
      });
    } finally {
      setSavingProfile(false);
    }
  };

  const handleVerifyTicketInModal = async () => {
    const cleanEmail = editForm.email.trim().toLowerCase();
    if (!cleanEmail) {
      setEditFeedback({ type: 'error', text: 'Informe um e-mail para consultar o Sympla.' });
      return;
    }

    setVerifyingTicket(true);
    setEditFeedback(null);
    try {
      const res = await verifySymplaTicket({ email: cleanEmail });
      const p = res?.participant || res?.ticket;
      if (res && res.verified && (res.symplaTicket || p)) {
        const ticketObj = res.symplaTicket || {
          ticketNumber: p.ticketNumber,
          ticketName: p.ticketName,
          qrCodeData: p.qrCodeData || p.ticketNumber,
          orderId: p.orderId
        };
        // Atualiza imediatamente o estado do componente com o ingresso oficial
        setProfile(prev => ({ ...prev, symplaTicket: ticketObj, hasSymplaTicket: true }));

        const uid = profile.id || auth.currentUser?.uid;
        if (uid) {
          try {
            await updateUserProfile(uid, { symplaTicket: ticketObj, hasSymplaTicket: true });
          } catch (updateErr) {
            console.warn('[Profile] Atualização client-side secundária (já salvo pelo backend):', updateErr);
          }
        }
        setEditFeedback({ type: 'success', text: `Ingresso confirmado com sucesso: ${ticketObj.ticketName || p?.ticketName || 'Oficial'}! 🎟️` });
      } else {
        setEditFeedback({ type: 'warning', text: res?.message || 'Ingresso não encontrado no Sympla. Verifique se o e-mail cadastrado é o mesmo da compra do ingresso.' });
      }
    } catch (err) {
      console.error('[Profile] Erro ao verificar ingresso no modal:', err);
      setEditFeedback({ type: 'error', text: 'Não foi possível conectar com o Sympla no momento. Tente novamente.' });
    } finally {
      setVerifyingTicket(false);
    }
  };

  const handleRecheckTicket = async () => {
    const emailToVerify = profile.email || auth.currentUser?.email;
    if (!emailToVerify) return;
    setRecheckingTicket(true);
    setTicketNotice('');
    try {
      const res = await verifySymplaTicket({ email: emailToVerify });
      const p = res?.participant || res?.ticket;
      if (res && res.verified && (res.symplaTicket || p)) {
        const ticketObj = res.symplaTicket || {
          ticketNumber: p.ticketNumber,
          ticketName: p.ticketName,
          qrCodeData: p.qrCodeData || p.ticketNumber,
          orderId: p.orderId
        };
        // Atualiza imediatamente o estado do componente com o ingresso oficial
        setProfile(prev => ({ ...prev, symplaTicket: ticketObj, hasSymplaTicket: true }));

        const uid = profile.id || auth.currentUser?.uid;
        if (uid) {
          try {
            await updateUserProfile(uid, { symplaTicket: ticketObj, hasSymplaTicket: true });
          } catch (updateErr) {
            console.warn('[Profile] Atualização client-side secundária (já salvo pelo backend):', updateErr);
          }
        }
        setTicketNotice('Ingresso localizado e vinculado com sucesso! 🎉');
      } else {
        setTicketNotice(res?.message || 'Ingresso ainda não encontrado no Sympla para este e-mail.');
      }
    } catch (err) {
      console.error('[Profile] Erro ao rechecar ingresso:', err);
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
      const uid = profile.id || auth.currentUser?.uid;
      const publicUrl = uid ? await uploadUserAvatar(uid, croppedFile) : await uploadAvatar(croppedFile);
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

  // Renderizado client-side (qrcode.react, KAN-47) em vez de imagem de serviço externo: funciona
  // offline, o crachá continua visível sem rede depois do primeiro carregamento do perfil.
  const qrValue = getBadgeQrValue(profile);

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
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', marginBottom: '8px' }}>
            <span style={{ fontSize: '0.82rem', color: 'rgba(255, 255, 255, 0.7)' }}>{profile.email}</span>
            <button
              onClick={() => {
                handleOpenEditModal();
                setActiveTab('sympla');
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
              title="Trocar e-mail ou vincular ingresso"
            >
              <Edit2 size={11} />
              Trocar
            </button>
          </div>
        )}

        {/* Botão de Destaque: Editar Perfil Completo (KAN-69) */}
        <button
          onClick={handleOpenEditModal}
          style={{
            marginTop: '8px',
            marginBottom: '16px',
            padding: '8px 20px',
            borderRadius: '12px',
            background: 'rgba(0, 210, 255, 0.12)',
            border: '1px solid rgba(0, 210, 255, 0.35)',
            color: 'var(--primary-color, #00d2ff)',
            fontSize: '0.85rem',
            fontWeight: '600',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '8px',
            cursor: 'pointer',
            transition: 'all 0.2s ease',
            boxShadow: '0 4px 12px rgba(0, 210, 255, 0.12)'
          }}
        >
          <Edit3 size={15} />
          Editar Perfil Completo
        </button>

        <button
          type="button"
          onClick={() => navigate('/sponsor')}
          style={{
            marginTop: '8px',
            marginBottom: '16px',
            marginLeft: '8px',
            padding: '8px 16px',
            borderRadius: '12px',
            background: 'rgba(37, 211, 102, 0.12)',
            border: '1px solid rgba(37, 211, 102, 0.35)',
            color: '#25D366',
            fontSize: '0.85rem',
            fontWeight: '600',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
            cursor: 'pointer',
            transition: 'all 0.2s ease',
            boxShadow: '0 4px 12px rgba(37, 211, 102, 0.12)'
          }}
        >
          <Building2 size={15} />
          Modo Patrocinador
        </button>

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
        <div style={{ transform: 'scale(0.7)', margin: '-16px 0' }}>
          <MascotDuo />
        </div>
        <div style={{ fontSize: '1.4rem', fontWeight: '800', color: 'white', marginBottom: '14px' }}>
          {points} pts
        </div>
        {profile.symplaTicket?.ticketName ? (
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '6px 14px', background: 'rgba(16, 185, 129, 0.12)', border: '1px solid rgba(16, 185, 129, 0.3)', borderRadius: '20px', color: '#10b981', fontSize: '0.8rem', fontWeight: '600', marginBottom: '16px' }}>
            🎟️ {profile.symplaTicket.ticketName} • Confirmado
          </div>
        ) : (
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '6px 14px', background: 'rgba(245, 158, 11, 0.12)', border: '1px solid rgba(245, 158, 11, 0.3)', borderRadius: '20px', color: '#fbbf24', fontSize: '0.8rem', fontWeight: '600', marginBottom: '16px' }}>
            ⚠️ Ingresso Sympla Pendente
          </div>
        )}
        <div style={{
          position: 'relative',
          background: 'white',
          padding: '16px',
          borderRadius: '20px',
          display: 'inline-block',
          marginBottom: '14px',
          boxShadow: '0 8px 24px rgba(0, 0, 0, 0.35)',
          overflow: 'hidden'
        }}>
          <div
            style={{
              filter: profile.symplaTicket ? 'none' : 'blur(9px) grayscale(50%)',
              transition: 'filter 0.3s ease',
              userSelect: 'none',
              pointerEvents: 'none'
            }}
          >
            <QRCodeSVG value={qrValue} size={160} bgColor="#ffffff" fgColor="#000000" />
          </div>
          {!profile.symplaTicket && (
            <div
              style={{
                position: 'absolute',
                inset: 0,
                background: 'rgba(15, 23, 42, 0.65)',
                backdropFilter: 'blur(3px)',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'white',
                gap: '8px',
                padding: '12px'
              }}
            >
              <div
                style={{
                  background: 'rgba(239, 68, 68, 0.9)',
                  borderRadius: '50%',
                  padding: '10px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  boxShadow: '0 4px 14px rgba(239, 68, 68, 0.45)'
                }}
              >
                <Lock size={22} color="white" />
              </div>
              <span
                style={{
                  fontSize: '0.75rem',
                  fontWeight: '800',
                  color: '#ffffff',
                  letterSpacing: '1px',
                  textTransform: 'uppercase'
                }}
              >
                QR Bloqueado
              </span>
            </div>
          )}
        </div>
        <p style={{ fontSize: '0.85rem', color: profile.symplaTicket ? '#10b981' : '#fbbf24', fontWeight: '600' }}>
          {profile.symplaTicket ? '✓ Ingresso oficial Sympla vinculado!' : '🔒 Vincule seu ingresso Sympla para desbloquear o QR Code'}
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
                handleOpenEditModal();
                setActiveTab('sympla');
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
              Usou outro e-mail ou tem código do ingresso? Vincular ingresso Sympla
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
        <p style={{ fontSize: '0.85rem', fontWeight: '600', color: 'var(--primary)', marginTop: '8px' }}>
          {userLevel?.label || 'Nível 1 - Novato'}
        </p>

        {userLevel && !userLevel.isMaxLevel && (
          <div style={{ marginTop: '14px', textAlign: 'left' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: '6px' }}>
              <span>Progresso para Nível {userLevel.level + 1}</span>
              <span>{userLevel.points} / {userLevel.nextLevelPoints} pts</span>
            </div>
            <div style={{ width: '100%', height: '6px', background: 'rgba(255, 255, 255, 0.1)', borderRadius: '999px', overflow: 'hidden' }}>
              <div
                style={{
                  width: `${userLevel.progress}%`,
                  height: '100%',
                  background: 'var(--primary-gradient)',
                  borderRadius: '999px',
                  transition: 'width 0.4s ease'
                }}
              />
            </div>
          </div>
        )}
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

      {/* Modal Completo de Edição de Perfil & Conexão Sympla (KAN-69) */}
      {isEditModalOpen && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0, 0, 0, 0.85)',
            backdropFilter: 'blur(10px)',
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
              maxWidth: '520px',
              maxHeight: '90vh',
              display: 'flex',
              flexDirection: 'column',
              borderRadius: '20px',
              position: 'relative',
              overflow: 'hidden',
              boxShadow: '0 20px 50px rgba(0, 0, 0, 0.6), 0 0 30px rgba(0, 210, 255, 0.15)'
            }}
          >
            {/* Cabeçalho do Modal */}
            <div style={{ padding: '20px 24px 16px', borderBottom: '1px solid rgba(255, 255, 255, 0.08)', position: 'relative' }}>
              <button
                onClick={() => {
                  setIsEditModalOpen(false);
                  setEditFeedback(null);
                }}
                style={{
                  position: 'absolute',
                  top: '18px',
                  right: '18px',
                  background: 'rgba(255, 255, 255, 0.08)',
                  border: 'none',
                  borderRadius: '50%',
                  width: '32px',
                  height: '32px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: 'var(--text-secondary)',
                  cursor: 'pointer',
                  transition: 'background 0.2s'
                }}
              >
                <X size={18} />
              </button>

              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                <Edit3 size={18} color="var(--primary-color, #00d2ff)" />
                <h3 style={{ fontSize: '1.25rem', color: 'white', fontWeight: 'bold', margin: 0 }}>
                  Editar Perfil
                </h3>
              </div>
              <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', margin: 0 }}>
                Atualize seus dados do evento e conecte seu ingresso oficial do Sympla.
              </p>

              {/* Seletor de Abas Responsivo */}
              <div 
                className="no-scrollbar" 
                style={{ 
                  display: 'flex', 
                  gap: '6px', 
                  marginTop: '16px', 
                  overflowX: 'auto', 
                  paddingBottom: '2px',
                  scrollbarWidth: 'none',
                  msOverflowStyle: 'none' 
                }}
              >
                {[
                  { id: 'pessoal', label: 'Pessoal', icon: User },
                  { id: 'academico', label: 'Acadêmico', icon: GraduationCap },
                  { id: 'contato', label: 'Redes', icon: Phone },
                  { id: 'sympla', label: 'Sympla', icon: Ticket }
                ].map(tab => {
                  const Icon = tab.icon;
                  const isActive = activeTab === tab.id;
                  return (
                    <button
                      key={tab.id}
                      type="button"
                      onClick={() => setActiveTab(tab.id)}
                      style={{
                        flex: 1,
                        padding: '8px 10px',
                        borderRadius: '10px',
                        fontSize: '0.78rem',
                        fontWeight: '600',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '6px',
                        cursor: 'pointer',
                        border: isActive ? '1px solid var(--primary-color, #00d2ff)' : '1px solid rgba(255, 255, 255, 0.08)',
                        background: isActive ? 'rgba(0, 210, 255, 0.16)' : 'rgba(255, 255, 255, 0.04)',
                        color: isActive ? 'var(--primary-color, #00d2ff)' : 'var(--text-secondary)',
                        transition: 'all 0.2s'
                      }}
                    >
                      <Icon size={14} />
                      {tab.label}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Conteúdo do Formulário */}
            <form onSubmit={handleSaveProfile} style={{ display: 'flex', flexDirection: 'column', flex: 1, overflow: 'hidden' }}>
              <div style={{ padding: '20px 24px', overflowY: 'auto', flex: 1 }}>
                
                {/* ABA 1: DADOS PESSOAIS */}
                {activeTab === 'pessoal' && (
                  <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                    <div style={{ display: 'flex', gap: '12px' }}>
                      <div style={{ flex: 1 }}>
                        <label style={{ display: 'block', fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: '4px' }}>
                          Primeiro Nome *
                        </label>
                        <input
                          type="text"
                          value={editForm.firstName}
                          onChange={(e) => setEditForm({ ...editForm, firstName: e.target.value })}
                          placeholder="Ex: Ana"
                          className="login-input"
                          required
                        />
                      </div>
                      <div style={{ flex: 1 }}>
                        <label style={{ display: 'block', fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: '4px' }}>
                          Sobrenome
                        </label>
                        <input
                          type="text"
                          value={editForm.lastName}
                          onChange={(e) => setEditForm({ ...editForm, lastName: e.target.value })}
                          placeholder="Ex: Silva"
                          className="login-input"
                        />
                      </div>
                    </div>

                    <div>
                      <label style={{ display: 'block', fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: '4px' }}>
                        Nome de Usuário (@username) *
                      </label>
                      <div style={{ position: 'relative' }}>
                        <span style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-secondary)', fontSize: '0.9rem' }}>@</span>
                        <input
                          type="text"
                          value={editForm.username}
                          onChange={(e) => setEditForm({ ...editForm, username: e.target.value.replace(/^@/, '').replace(/\s+/g, '') })}
                          placeholder="anasilva"
                          className="login-input"
                          style={{ paddingLeft: '30px' }}
                          required
                        />
                      </div>
                      <p style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', margin: '4px 0 0 2px' }}>
                        Usado no ranking de pontuação e identificação no evento.
                      </p>
                    </div>
                  </div>
                )}

                {/* ABA 2: PERFIL ACADÊMICO */}
                {activeTab === 'academico' && (
                  <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                    <div>
                      <label style={{ display: 'block', fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: '4px' }}>
                        Perfil no Evento
                      </label>
                      <select
                        value={editForm.participantType}
                        onChange={(e) => setEditForm({ ...editForm, participantType: e.target.value })}
                        className="login-input"
                        style={{ width: '100%' }}
                      >
                        {PARTICIPANT_TYPES.map(type => (
                          <option key={type} value={type}>{type}</option>
                        ))}
                      </select>
                    </div>

                    {(editForm.participantType === 'Aluno da UFU' || editForm.participantType === 'Aluno de outra instituição') ? (
                      <>
                        <div style={{ display: 'flex', gap: '12px' }}>
                          <div style={{ flex: 2 }}>
                            <label style={{ display: 'block', fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: '4px' }}>
                              Curso
                            </label>
                            <select
                              value={editForm.course}
                              onChange={(e) => setEditForm({ ...editForm, course: e.target.value })}
                              className="login-input"
                              style={{ width: '100%' }}
                            >
                              <option value="" disabled>Selecione seu curso</option>
                              {UFU_COURSES.map(courseName => (
                                <option key={courseName} value={courseName}>{courseName}</option>
                              ))}
                            </select>
                          </div>

                          <div style={{ flex: 1 }}>
                            <label style={{ display: 'block', fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: '4px' }}>
                              Período
                            </label>
                            <input
                              type="number"
                              min="1"
                              max="20"
                              value={editForm.period}
                              onChange={(e) => setEditForm({ ...editForm, period: e.target.value })}
                              placeholder="Ex: 4"
                              className="login-input"
                            />
                          </div>
                        </div>

                        {editForm.course === 'Outro (especificar)' && (
                          <div className="animate-fade-in">
                            <label style={{ display: 'block', fontSize: '0.75rem', color: 'var(--primary-color, #00d2ff)', marginBottom: '4px', fontWeight: '500' }}>
                              Qual é o seu curso?
                            </label>
                            <input
                              type="text"
                              value={editForm.customCourse}
                              onChange={(e) => setEditForm({ ...editForm, customCourse: e.target.value })}
                              placeholder="Digite o nome completo do seu curso..."
                              className="login-input"
                              required
                            />
                          </div>
                        )}
                      </>
                    ) : (
                      <div style={{ padding: '12px', background: 'rgba(255, 255, 255, 0.04)', borderRadius: '10px', fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
                        ℹ️ Informações de curso e período acadêmico são exibidas apenas para participantes cadastrados como estudantes.
                      </div>
                    )}
                  </div>
                )}

                {/* ABA 3: CONTATO E REDES SOCIAIS */}
                {activeTab === 'contato' && (
                  <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                    <div>
                      <label style={{ display: 'block', fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: '4px' }}>
                        WhatsApp / Telefone
                      </label>
                      <input
                        type="text"
                        value={editForm.phone}
                        onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })}
                        placeholder="(34) 99999-9999"
                        className="login-input"
                      />
                    </div>

                    <div style={{ display: 'flex', gap: '12px' }}>
                      <div style={{ flex: 1 }}>
                        <label style={{ display: 'block', fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: '4px' }}>
                          LinkedIn (Opcional)
                        </label>
                        <input
                          type="text"
                          value={editForm.linkedin}
                          onChange={(e) => setEditForm({ ...editForm, linkedin: e.target.value })}
                          placeholder="linkedin.com/in/seu-perfil"
                          className="login-input"
                        />
                      </div>

                      <div style={{ flex: 1 }}>
                        <label style={{ display: 'block', fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: '4px' }}>
                          Instagram (Opcional)
                        </label>
                        <input
                          type="text"
                          value={editForm.instagram}
                          onChange={(e) => setEditForm({ ...editForm, instagram: e.target.value })}
                          placeholder="@seu_perfil"
                          className="login-input"
                        />
                      </div>
                    </div>
                    <p style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', margin: '2px 0 0' }}>
                      Facilite o networking com outros participantes e patrocinadores da TechWeek!
                    </p>
                  </div>
                )}

                {/* ABA 4: LOGÍSTICA DE INGRESSO SYMPLA */}
                {activeTab === 'sympla' && (
                  <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                    {/* Status Atual do Ingresso */}
                    {profile.symplaTicket?.ticketName ? (
                      <div style={{ padding: '12px 14px', background: 'rgba(16, 185, 129, 0.12)', border: '1px solid rgba(16, 185, 129, 0.3)', borderRadius: '12px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <Ticket size={20} color="#10b981" />
                        <div>
                          <div style={{ fontSize: '0.82rem', fontWeight: 'bold', color: '#10b981' }}>
                            Ingresso Confirmado: {profile.symplaTicket.ticketName}
                          </div>
                          <div style={{ fontSize: '0.72rem', color: 'rgba(255, 255, 255, 0.7)' }}>
                            Vinculado ao Sympla • QR Code ativo
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div style={{ padding: '12px 14px', background: 'rgba(245, 158, 11, 0.12)', border: '1px solid rgba(245, 158, 11, 0.3)', borderRadius: '12px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <AlertCircle size={20} color="#fbbf24" />
                        <div>
                          <div style={{ fontSize: '0.82rem', fontWeight: 'bold', color: '#fbbf24' }}>
                            Ingresso Sympla Pendente
                          </div>
                          <div style={{ fontSize: '0.72rem', color: 'rgba(255, 255, 255, 0.7)' }}>
                            Informe seu e-mail cadastrado no Sympla para vincular seu crachá.
                          </div>
                        </div>
                      </div>
                    )}

                    <div>
                      <label style={{ display: 'block', fontSize: '0.75rem', color: 'var(--text-secondary)', marginBottom: '4px' }}>
                        E-mail da Conta / Compra no Sympla *
                      </label>
                      <input
                        type="email"
                        value={editForm.email}
                        onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
                        placeholder="exemplo@email.com"
                        className="login-input"
                        required
                      />
                      <p style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', margin: '4px 0 0 2px' }}>
                        Basta manter o e-mail igual ao da compra no Sympla para localizar seu ingresso automaticamente.
                      </p>
                    </div>

                    {/* Botão de Verificação Imediata do Sympla */}
                    <button
                      type="button"
                      onClick={handleVerifyTicketInModal}
                      disabled={verifyingTicket}
                      style={{
                        padding: '10px 14px',
                        borderRadius: '10px',
                        background: 'rgba(255, 255, 255, 0.08)',
                        border: '1px solid rgba(255, 255, 255, 0.2)',
                        color: 'white',
                        fontSize: '0.8rem',
                        fontWeight: '600',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '8px',
                        transition: 'all 0.2s'
                      }}
                    >
                      {verifyingTicket ? <Loader2 size={15} className="animate-spin" /> : <RefreshCw size={15} />}
                      {verifyingTicket ? 'Consultando Sympla...' : 'Verificar Ingresso no Sympla'}
                    </button>

                    <div style={{ textAlign: 'center', marginTop: '4px' }}>
                      <a
                        href={SYMPLA_EVENT_URL}
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{ fontSize: '0.75rem', color: 'var(--primary-color, #00d2ff)', textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                      >
                        Ainda não garantiu sua vaga? Inscreva-se no Sympla <ExternalLink size={12} />
                      </a>
                    </div>
                  </div>
                )}

                {/* Box de Feedback / Mensagens */}
                {editFeedback && (
                  <div
                    style={{
                      marginTop: '16px',
                      padding: '10px 14px',
                      borderRadius: '10px',
                      fontSize: '0.78rem',
                      lineHeight: '1.45',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      background:
                        editFeedback.type === 'success'
                          ? 'rgba(16, 185, 129, 0.15)'
                          : editFeedback.type === 'warning'
                          ? 'rgba(245, 158, 11, 0.15)'
                          : 'rgba(239, 68, 68, 0.15)',
                      border: `1px solid ${
                        editFeedback.type === 'success'
                          ? 'rgba(16, 185, 129, 0.3)'
                          : editFeedback.type === 'warning'
                          ? 'rgba(245, 158, 11, 0.3)'
                          : 'rgba(239, 68, 68, 0.3)'
                      }`,
                      color:
                        editFeedback.type === 'success'
                          ? '#10b981'
                          : editFeedback.type === 'warning'
                          ? '#fbbf24'
                          : '#ef4444'
                    }}
                  >
                    {editFeedback.type === 'success' ? <Check size={16} /> : <AlertCircle size={16} />}
                    <span>{editFeedback.text}</span>
                  </div>
                )}
              </div>

              {/* Rodapé do Modal com Ações */}
              <div style={{ padding: '16px 24px', borderTop: '1px solid rgba(255, 255, 255, 0.08)', display: 'flex', gap: '12px', background: 'rgba(0,0,0,0.2)' }}>
                <button
                  type="button"
                  onClick={() => {
                    setIsEditModalOpen(false);
                    setEditFeedback(null);
                  }}
                  className="btn btn-secondary"
                  style={{
                    flex: 1,
                    padding: '12px',
                    borderRadius: '10px',
                    background: 'rgba(255, 255, 255, 0.08)',
                    border: '1px solid rgba(255, 255, 255, 0.15)',
                    color: 'white',
                    cursor: 'pointer',
                    fontSize: '0.85rem'
                  }}
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={savingProfile}
                  className="login-btn"
                  style={{
                    flex: 2,
                    padding: '12px',
                    borderRadius: '10px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '8px',
                    fontSize: '0.85rem',
                    fontWeight: 'bold',
                    cursor: savingProfile ? 'not-allowed' : 'pointer'
                  }}
                >
                  {savingProfile ? <Loader2 size={16} className="animate-spin" /> : <Sparkles size={16} />}
                  {savingProfile ? 'Salvando Alterações...' : 'Salvar Alterações'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}