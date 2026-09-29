import { useState, useEffect, useRef, useMemo } from 'react';
import { useUser } from '../hooks/useUser';
import { getMyProfile, uploadAvatar } from '../lib/gameplay';
import { logoutUser, onAuthChange, deleteCurrentUserAccount } from '../lib/auth';
import { auth } from '../lib/firebase';
import { validateAvatarFile, isValidEmail } from '../lib/validators';
import AvatarCropperModal from '../components/AvatarCropperModal';
import logoTw from '../assets/logo-tw.png';
import { QRCodeSVG } from 'qrcode.react';
import { SYMPLA_EVENT_URL, verifySymplaTicket, getBadgeQrValue } from '../lib/sympla';
import { getUserProfile, uploadUserAvatar, updateUserEmail, updateUserProfile, getCachedUserProfile } from '../lib/userService';
import { 
  LogOut, Camera, Edit2, Edit3, Loader2, X, RefreshCw, Lock, 
  User, Mail, Phone, BookOpen, GraduationCap, Ticket, Check, AlertCircle, ExternalLink, Building2, Trash2,
  ChevronLeft, ShieldCheck, Award
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
  const { points, userLevel, role, participantType } = useUser();
  const navigate = useNavigate();
  const location = useLocation();
  const fileInputRef = useRef(null);
  const initialCached = useMemo(() => getCachedUserProfile(), []);
  const [profile, setProfile] = useState(() => {
    const cached = getCachedUserProfile();
    const user = auth.currentUser;
    const formatName = (str) => {
      if (!str) return '';
      return str.split(/[._-]/).map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join(' ');
    };
    const rawName = cached?.displayName || user?.displayName || formatName(user?.email?.split('@')[0]) || '';
    const nameParts = rawName.split(' ');
    const initialFirstName = cached?.firstName || cached?.first_name || nameParts[0] || 'Participante';
    const initialLastName = cached?.lastName || cached?.last_name || nameParts.slice(1).join(' ') || '';
    const initialUsername = cached?.username || user?.email?.split('@')[0] || '';
    const ticket = cached?.symplaTicket || cached?.sympla_ticket || null;

    return {
      id: cached?.id || cached?.uid || user?.uid || '',
      email: cached?.email || user?.email || '',
      username: initialUsername,
      firstName: initialFirstName,
      lastName: initialLastName,
      phone: cached?.phone || '',
      course: cached?.course || 'Sistemas de Informação',
      participantType: cached?.participantType || cached?.participant_type || 'Aluno da UFU',
      period: cached?.period || null,
      avatarUrl: cached?.avatarUrl || cached?.avatar_url || cached?.photoURL || user?.photoURL || '',
      symplaTicket: ticket,
      hasSymplaTicket: !!(cached?.hasSymplaTicket || ticket),
      linkedin: cached?.linkedin || '',
      instagram: cached?.instagram || '',
      github: cached?.github || ''
    };
  });
  const isTicketConfirmed = !!(profile.hasSymplaTicket || profile.symplaTicket?.ticketName);
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
    github: '',
    email: '',
    ticketNumber: ''
  });
  const [savingProfile, setSavingProfile] = useState(false);
  const [verifyingTicket, setVerifyingTicket] = useState(false);
  const [editFeedback, setEditFeedback] = useState(null);
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
        const formatName = (str) => {
          if (!str) return '';
          return str.split(/[._-]/).map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join(' ');
        };
        const rawName = currentUser?.displayName || formatName(currentUser?.email?.split('@')[0]) || '';
        const nameParts = rawName.split(' ');
        const initialFirstName = data?.firstName || data?.first_name || nameParts[0] || 'Participante';
        const initialLastName = data?.lastName || data?.last_name || nameParts.slice(1).join(' ') || '';
        const initialUsername = data?.username || currentUser?.email?.split('@')[0] || '';

        setProfile(prev => ({
          ...prev,
          id: data?.id || data?.uid || uid || currentUser?.uid || prev.id,
          email: data?.email || currentUser?.email || prev.email,
          username: data?.username || initialUsername || prev.username,
          firstName: data?.firstName || data?.first_name || prev.firstName,
          lastName: data?.lastName || data?.last_name || prev.lastName,
          phone: data?.phone || prev.phone,
          course: data?.course || prev.course,
          participantType: data?.participantType || data?.participant_type || prev.participantType,
          period: data?.period !== undefined && data?.period !== null ? data.period : prev.period,
          avatarUrl: data?.avatarUrl || data?.avatar_url || prev.avatarUrl || data?.photoURL || currentUser?.photoURL || '',
          symplaTicket: data?.symplaTicket || data?.sympla_ticket || prev.symplaTicket,
          hasSymplaTicket: !!(data?.hasSymplaTicket || data?.symplaTicket || data?.sympla_ticket || prev.hasSymplaTicket),
          linkedin: data?.linkedin || prev.linkedin,
          instagram: data?.instagram || prev.instagram,
          github: data?.github || prev.github
        }));

        // Se o ingresso do Sympla ainda não estiver vinculado, tenta auto-sincronizar em background
        const hasTicket = !!(data?.hasSymplaTicket || data?.symplaTicket || data?.sympla_ticket);
        if (!hasTicket && currentUser?.email) {
          verifySymplaTicket({ email: currentUser.email }).then(async (symplaRes) => {
            if (symplaRes?.verified && (symplaRes.symplaTicket || symplaRes.participant)) {
              const p = symplaRes.participant;
              const t = symplaRes.symplaTicket || {
                ticketNumber: p?.ticketNumber,
                ticketName: p?.ticketName,
                qrCodeData: p?.qrCodeData || p?.ticketNumber,
                orderId: p?.orderId
              };
              setProfile(prev => ({
                ...prev,
                hasSymplaTicket: true,
                symplaTicket: t,
                firstName: p?.firstName || prev.firstName,
                lastName: p?.lastName || prev.lastName
              }));
              const targetUid = uid || currentUser?.uid;
              if (targetUid) {
                try {
                  await updateUserProfile(targetUid, {
                    hasSymplaTicket: true,
                    symplaTicket: t,
                    ...(p?.firstName ? { firstName: p.firstName } : {}),
                    ...(p?.lastName ? { lastName: p.lastName } : {})
                  });
                } catch (_e) {}
              }
            }
          }).catch(() => {});
        }
      }
    }

    const unsubscribe = onAuthChange((user) => {
      fetchUserData(user);
    });

    const handleProfileUpdate = () => {
      const cached = getCachedUserProfile();
      if (cached) {
        setProfile(prev => ({
          ...prev,
          ...cached,
          avatarUrl: cached.avatarUrl || cached.avatar_url || cached.photoURL || prev.avatarUrl,
          hasSymplaTicket: !!(cached.hasSymplaTicket || cached.symplaTicket || prev.hasSymplaTicket)
        }));
      }
    };
    window.addEventListener('facom_profile_updated', handleProfileUpdate);

    return () => {
      unsubscribe();
      window.removeEventListener('facom_profile_updated', handleProfileUpdate);
    };
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
      github: profile.github || '',
      email: profile.email || '',
      ticketNumber: profile.symplaTicket?.ticketNumber || ''
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
    const cleanEmail = isTicketConfirmed ? (profile.email || '') : editForm.email.trim().toLowerCase();
    const isStudent = editForm.participantType === 'Aluno da UFU' || editForm.participantType === 'Aluno de outra instituição';
    const finalCourse = isStudent 
      ? (editForm.course === 'Outro (especificar)' ? editForm.customCourse.trim() : editForm.course) 
      : '';
    const cleanPhone = editForm.phone.trim();
    const cleanLinkedin = editForm.linkedin.trim();
    const cleanInstagram = editForm.instagram.trim();
    const cleanGithub = editForm.github.trim();

    if (!cleanFirstName) {
      setEditFeedback({ type: 'error', text: 'Primeiro nome é obrigatório.' });
      return;
    }
    if (!cleanUsername) {
      setEditFeedback({ type: 'error', text: 'Nome de usuário (@username) é obrigatório.' });
      return;
    }
    if (!isTicketConfirmed && cleanEmail && !isValidEmail(cleanEmail)) {
      setEditFeedback({ type: 'error', text: 'Informe um endereço de e-mail válido.' });
      return;
    }
    if (isStudent && editForm.course === 'Outro (especificar)' && !editForm.customCourse.trim()) {
      setEditFeedback({ type: 'error', text: 'Por favor, informe o nome do seu curso.' });
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
        github: cleanGithub
      };

      // Se o ingresso ainda NÃO estava confirmado, permite persistir o novo e-mail
      if (!isTicketConfirmed && cleanEmail) {
        updates.email = cleanEmail;
      }

      // 1. Atualiza documento no Firestore
      await updateUserProfile(uid, updates);

      // 2. Se e-mail foi alterado E o ingresso não estava bloqueado, tenta atualizar no Firebase Auth
      if (!isTicketConfirmed && cleanEmail && auth.currentUser && auth.currentUser.email !== cleanEmail) {
        try {
          await updateUserEmail(uid, cleanEmail);
        } catch (authErr) {
          console.warn('Aviso: E-mail atualizado no Firestore mas precisa de re-login no Auth:', authErr);
        }
      }

      // 3. Logística Sympla: apenas se o ingresso AINDA NÃO foi confirmado
      let symplaMessage = '';
      if (!isTicketConfirmed) {
        const cleanTicketNum = (editForm.ticketNumber || '').trim();
        if (cleanEmail || cleanTicketNum) {
          try {
            const symplaRes = await verifySymplaTicket({ email: cleanEmail, ticketNumber: cleanTicketNum });
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
            } else if (cleanTicketNum && cleanTicketNum.length >= 4) {
              const manualTicket = {
                ticketNumber: cleanTicketNum,
                ticketName: 'Ingresso Oficial Sympla',
                qrCodeData: `SYMPLA:${cleanTicketNum}`,
                orderId: `MANUAL_${Date.now()}`
              };
              updates.symplaTicket = manualTicket;
              updates.hasSymplaTicket = true;
              try {
                await updateUserProfile(uid, { symplaTicket: manualTicket, hasSymplaTicket: true });
              } catch (_e) {}
              symplaMessage = ` Ingresso Sympla vinculado (#${cleanTicketNum})! 🎟️`;
            } else if (cleanEmail !== profile.email) {
              symplaMessage = ' (Ingresso não localizado com este e-mail).';
            }
          } catch (symplaErr) {
            console.warn('Aviso ao consultar Sympla no salvamento do perfil:', symplaErr);
          }
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
    const cleanTicket = (editForm.ticketNumber || '').trim();
    if (!cleanEmail && !cleanTicket) {
      setEditFeedback({ type: 'error', text: 'Informe um e-mail ou número de ingresso para consultar o Sympla.' });
      return;
    }

    setVerifyingTicket(true);
    setEditFeedback(null);
    try {
      const res = await verifySymplaTicket({ email: cleanEmail, ticketNumber: cleanTicket });
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
      } else if (cleanTicket && cleanTicket.length >= 4) {
        const manualTicket = {
          ticketNumber: cleanTicket,
          ticketName: 'Ingresso Oficial Sympla',
          qrCodeData: `SYMPLA:${cleanTicket}`,
          orderId: `MANUAL_${Date.now()}`
        };
        setProfile(prev => ({ ...prev, symplaTicket: manualTicket, hasSymplaTicket: true }));
        const uid = profile.id || auth.currentUser?.uid;
        if (uid) {
          try {
            await updateUserProfile(uid, { symplaTicket: manualTicket, hasSymplaTicket: true });
          } catch (_e) {}
        }
        setEditFeedback({ type: 'success', text: `Ingresso (#${cleanTicket}) vinculado com sucesso! 🎟️` });
      } else {
        setEditFeedback({ type: 'warning', text: res?.message || 'Ingresso não encontrado no Sympla. Verifique se o e-mail cadastrado ou código do ingresso está correto.' });
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
      if (uid) {
        try {
          const cached = localStorage.getItem(`facom_profile_${uid}`);
          const parsed = cached ? JSON.parse(cached) : {};
          localStorage.setItem(`facom_profile_${uid}`, JSON.stringify({ ...parsed, avatarUrl: publicUrl }));
        } catch (_e) {}
      }
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

  const handleDeleteAccount = async () => {
    const confirmed = window.confirm(
      '⚠️ ATENÇÃO: Tem certeza que deseja apagar permanentemente seu perfil e dados de cadastro? Você será desconectado e poderá cadastrar uma nova conta do zero.'
    );
    if (!confirmed) return;

    try {
      const res = await deleteCurrentUserAccount();
      if (res.success) {
        alert('Perfil apagado com sucesso! Redirecionando para o cadastro.');
        navigate('/register');
      } else {
        alert('Não foi possível excluir a conta: ' + (res.error || 'Tente sair e fazer login novamente antes de excluir.'));
      }
    } catch (err) {
      alert('Erro ao excluir conta: ' + err.message);
    }
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
  const githubUrl = formatUrl(profile.github, 'https://github.com/');

  const cleanFirstName = (profile.firstName || '').replace(/^@/, '');
  const cleanLastName = profile.lastName || '';
  const fullName = [cleanFirstName, cleanLastName].filter(Boolean).join(' ').trim();
  const cleanUsername = (profile.username || '').replace(/^@/, '');

  return (
    <div className="page-container animate-fade-in" style={{ paddingBottom: '120px', maxWidth: '430px', margin: '0 auto' }}>
      {/* 1. Header Fixo Superior */}
      <header
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: '20px',
          paddingTop: '8px'
        }}
      >
        <button
          type="button"
          onClick={() => navigate(-1)}
          aria-label="Voltar para a tela anterior"
          style={{
            width: '42px',
            height: '42px',
            borderRadius: '12px',
            backgroundColor: '#0F141F',
            border: '1px solid #1E293B',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#F8FAFC',
            cursor: 'pointer',
            transition: 'border-color 0.15s ease'
          }}
        >
          <ChevronLeft size={20} strokeWidth={1.75} />
        </button>

        <div style={{ textAlign: 'center' }}>
          <h1
            style={{
              fontFamily: "'Space Grotesk', -apple-system, BlinkMacSystemFont, sans-serif",
              fontSize: '1.05rem',
              fontWeight: 800,
              color: '#F8FAFC',
              letterSpacing: '-0.02em',
              margin: 0
            }}
          >
            Meu Crachá Digital
          </h1>
          <span
            style={{
              fontSize: '0.68rem',
              color: '#64748B',
              fontFamily: "'JetBrains Mono', monospace",
              letterSpacing: '0.04em'
            }}
          >
            FACOM TechWeek 2026 • 18°55'S 48°15'W
          </span>
        </div>

        <button
          type="button"
          onClick={handleOpenEditModal}
          aria-label="Editar Dados Cadastrais"
          style={{
            width: '42px',
            height: '42px',
            borderRadius: '12px',
            backgroundColor: '#0F141F',
            border: '1px solid #1E293B',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#3B82F6',
            cursor: 'pointer',
            transition: 'all 0.15s ease'
          }}
        >
          <Edit3 size={18} strokeWidth={1.75} />
        </button>
      </header>

      {/* 2. O CRACHÁ HERÓI (LANYARD BADGE) - PROTAGONISTA VISUAL DA TELA */}
      <section
        className="specular-sweep"
        aria-label="Crachá Oficial do Participante"
        style={{
          position: 'relative',
          backgroundColor: '#0F141F',
          border: '1px solid #1E293B',
          borderRadius: '24px',
          padding: '20px 20px 18px',
          boxShadow: '0 16px 36px -12px rgba(0, 0, 0, 0.75), 0 0 0 1px rgba(126, 34, 206, 0.12)',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          marginBottom: '20px',
          overflow: 'hidden'
        }}
      >
        {/* Fenda Estilizada para Cordão (Lanyard Slot) */}
        <div
          aria-hidden="true"
          style={{
            width: '52px',
            height: '6px',
            borderRadius: '999px',
            backgroundColor: '#07090E',
            border: '1px solid #1E293B',
            marginBottom: '16px',
            boxShadow: 'inset 0 1px 3px rgba(0, 0, 0, 0.8)'
          }}
        />

        {/* Topo do Crachá: Logo Oficial e Credencial */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            width: '100%',
            marginBottom: '16px'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <img
              src={logoTw}
              alt="FACOM TechWeek"
              style={{ height: '24px', width: 'auto', objectFit: 'contain' }}
            />
            <span
              style={{
                fontFamily: "'Space Grotesk', -apple-system, BlinkMacSystemFont, sans-serif",
                fontSize: '0.82rem',
                fontWeight: 900,
                color: '#F8FAFC',
                letterSpacing: '-0.02em',
                background: 'linear-gradient(135deg, #F8FAFC 0%, #94A3B8 100%)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent'
              }}
            >
              TECHWEEK 2026
            </span>
          </div>

          <span
            style={{
              fontFamily: "'Space Grotesk', -apple-system, BlinkMacSystemFont, sans-serif",
              fontSize: '0.62rem',
              fontWeight: 800,
              textTransform: 'uppercase',
              letterSpacing: '0.06em',
              padding: '3px 8px',
              borderRadius: '6px',
              backgroundColor: 'rgba(37, 99, 235, 0.15)',
              color: '#93C5FD',
              border: '1px solid rgba(59, 130, 246, 0.4)'
            }}
          >
            {profile.participantType || 'Participante'}
          </span>
        </div>

        {/* Avatar Squircle Autoral com Botão de Troca */}
        <div style={{ position: 'relative', marginBottom: '12px' }}>
          <div
            onClick={handleAvatarClick}
            className="squircle-brand"
            role="button"
            tabIndex={0}
            aria-label="Alterar foto de perfil"
            onKeyDown={(e) => { if (e.key === 'Enter') handleAvatarClick(); }}
            style={{
              width: '88px',
              height: '88px',
              borderRadius: '20px',
              background: 'linear-gradient(135deg, #1D4ED8 0%, #7E22CE 100%)',
              padding: '2.5px',
              cursor: 'pointer',
              boxShadow: '0 8px 20px rgba(126, 34, 206, 0.35)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'transform 0.15s ease'
            }}
          >
            <div
              style={{
                width: '100%',
                height: '100%',
                borderRadius: '18px',
                overflow: 'hidden',
                backgroundColor: '#07090E',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '2rem',
                fontWeight: 800,
                color: '#F8FAFC',
                fontFamily: "'Space Grotesk', -apple-system, BlinkMacSystemFont, sans-serif"
              }}
            >
              {profile.avatarUrl ? (
                <img
                  src={profile.avatarUrl}
                  alt={fullName || 'Foto de perfil'}
                  style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                />
              ) : (
                cleanFirstName ? cleanFirstName.charAt(0).toUpperCase() : (cleanUsername ? cleanUsername.charAt(0).toUpperCase() : 'U')
              )}
            </div>
          </div>

          <button
            type="button"
            onClick={handleAvatarClick}
            aria-label="Trocar foto do crachá"
            style={{
              position: 'absolute',
              bottom: '-3px',
              right: '-3px',
              width: '28px',
              height: '28px',
              borderRadius: '8px',
              backgroundColor: '#1D4ED8',
              border: '2px solid #0F141F',
              color: '#ffffff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              boxShadow: '0 2px 6px rgba(0, 0, 0, 0.5)'
            }}
          >
            <Camera size={13} strokeWidth={2} />
          </button>
        </div>

        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          onChange={handleAvatarChange}
          style={{ display: 'none' }}
        />

        {uploadingAvatar && (
          <p style={{ fontSize: '0.72rem', color: '#94A3B8', marginBottom: '6px' }}>Enviando foto...</p>
        )}
        {avatarError && (
          <p style={{ fontSize: '0.72rem', color: '#EF4444', marginBottom: '6px' }}>{avatarError}</p>
        )}

        {/* Nome do Participante e Metadados */}
        <h2
          style={{
            fontFamily: "'Space Grotesk', -apple-system, BlinkMacSystemFont, sans-serif",
            fontSize: '1.25rem',
            fontWeight: 800,
            color: '#F8FAFC',
            letterSpacing: '-0.02em',
            textAlign: 'center',
            margin: '0 0 2px'
          }}
        >
          {fullName || (cleanUsername ? `@${cleanUsername}` : 'Participante')}
        </h2>

        {cleanUsername && (
          <p
            style={{
              fontFamily: "'Inter', system-ui, sans-serif",
              fontSize: '0.82rem',
              fontWeight: 600,
              color: '#3B82F6',
              margin: '0 0 6px'
            }}
          >
            @{cleanUsername}
          </p>
        )}

        <p
          style={{
            fontFamily: "'Inter', system-ui, sans-serif",
            fontSize: '0.76rem',
            color: '#94A3B8',
            textAlign: 'center',
            margin: '0 0 10px',
            maxWidth: '280px',
            lineHeight: '1.4'
          }}
        >
          {profile.course
            ? `${profile.course}${profile.period ? ` · ${profile.period}º Período` : ''}`
            : (profile.participantType || 'Estudante')}
        </p>

        {/* Badge Oficial de Papel / Credencial */}
        <div style={{ marginBottom: '14px' }}>
          {(role === 'ADMIN' || profile.role === 'ADMIN' || profile.email === 'admin@admin.com' || profile.email === 'sam03amorim@gmail.com') ? (
            <span
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '5px',
                padding: '4px 10px',
                borderRadius: '8px',
                backgroundColor: 'rgba(56, 189, 248, 0.15)',
                border: '1px solid rgba(56, 189, 248, 0.4)',
                color: '#38BDF8',
                fontSize: '0.72rem',
                fontWeight: 800,
                letterSpacing: '0.04em',
                boxShadow: '0 0 12px rgba(56, 189, 248, 0.25)',
                textTransform: 'uppercase'
              }}
            >
              <ShieldCheck size={13} strokeWidth={2.5} />
              <span>Organizador · Admin</span>
            </span>
          ) : (role === 'STAFF' || profile.role === 'STAFF' || profile.email === 'staff@techweek.com') ? (
            <span
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '5px',
                padding: '4px 10px',
                borderRadius: '8px',
                backgroundColor: 'rgba(251, 191, 36, 0.15)',
                border: '1px solid rgba(251, 191, 36, 0.4)',
                color: '#FBBF24',
                fontSize: '0.72rem',
                fontWeight: 800,
                letterSpacing: '0.04em',
                textTransform: 'uppercase'
              }}
            >
              <Award size={13} strokeWidth={2.5} />
              <span>Equipe Staff · Portaria</span>
            </span>
          ) : (role === 'SPONSOR' || profile.role === 'SPONSOR') ? (
            <span
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '5px',
                padding: '4px 10px',
                borderRadius: '8px',
                backgroundColor: 'rgba(52, 211, 153, 0.15)',
                border: '1px solid rgba(52, 211, 153, 0.4)',
                color: '#34D399',
                fontSize: '0.72rem',
                fontWeight: 800,
                letterSpacing: '0.04em',
                textTransform: 'uppercase'
              }}
            >
              <Building2 size={13} strokeWidth={2.5} />
              <span>Patrocinador Oficial</span>
            </span>
          ) : (
            <span
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '5px',
                padding: '3px 8px',
                borderRadius: '6px',
                backgroundColor: '#1E293B',
                border: '1px solid #334155',
                color: '#94A3B8',
                fontSize: '0.68rem',
                fontWeight: 700,
                textTransform: 'uppercase'
              }}
            >
              <span>Participante</span>
            </span>
          )}
        </div>

        {/* Divisor Circuit-Cut da Marca (inspirado no monograma TW) */}
        <div
          className="circuit-cut"
          style={{
            width: '100%',
            marginBottom: '16px'
          }}
        />

        {/* QR Code de Presença em Canvas Branco Puro */}
        <div
          style={{
            position: 'relative',
            backgroundColor: '#FFFFFF',
            padding: '16px',
            borderRadius: '16px',
            boxShadow: '0 8px 24px rgba(0, 0, 0, 0.45)',
            marginBottom: '14px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            overflow: 'hidden'
          }}
        >
          <div
            style={{
              filter: profile.symplaTicket ? 'none' : 'blur(8px) grayscale(70%)',
              transition: 'filter 0.3s ease',
              userSelect: 'none',
              pointerEvents: 'none'
            }}
          >
            <QRCodeSVG value={qrValue} size={164} bgColor="#FFFFFF" fgColor="#07090E" level="M" />
          </div>

          {!profile.symplaTicket && (
            <div
              style={{
                position: 'absolute',
                inset: 0,
                backgroundColor: 'rgba(7, 9, 14, 0.78)',
                backdropFilter: 'blur(3px)',
                WebkitBackdropFilter: 'blur(3px)',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '14px',
                textAlign: 'center'
              }}
            >
              <div
                style={{
                  width: '38px',
                  height: '38px',
                  borderRadius: '10px',
                  backgroundColor: '#EF4444',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  marginBottom: '6px',
                  boxShadow: '0 4px 12px rgba(239, 68, 68, 0.45)'
                }}
              >
                <Lock size={18} color="#FFFFFF" strokeWidth={2} />
              </div>
              <span
                style={{
                  fontFamily: "'Space Grotesk', -apple-system, BlinkMacSystemFont, sans-serif",
                  fontSize: '0.7rem',
                  fontWeight: 800,
                  color: '#FFFFFF',
                  letterSpacing: '0.05em',
                  textTransform: 'uppercase'
                }}
              >
                QR Bloqueado
              </span>
              <span
                style={{
                  fontFamily: "'Inter', system-ui, sans-serif",
                  fontSize: '0.66rem',
                  color: '#CBD5E1',
                  marginTop: '2px'
                }}
              >
                Conecte seu ingresso Sympla
              </span>
            </div>
          )}
        </div>

        {/* Status de Validação do Ingresso Sympla */}
        {profile.symplaTicket ? (
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              padding: '6px 14px',
              backgroundColor: '#064E3B',
              border: '1px solid #047857',
              borderRadius: '999px',
              color: '#6EE7B7',
              fontSize: '0.74rem',
              fontWeight: 600,
              fontFamily: "'Inter', system-ui, sans-serif"
            }}
          >
            <ShieldCheck size={14} strokeWidth={2} />
            <span>{profile.symplaTicket.ticketName || 'Ingresso Oficial Sympla Confirmado'}</span>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px', width: '100%' }}>
            <div
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                padding: '5px 12px',
                backgroundColor: '#451A03',
                border: '1px solid #B45309',
                borderRadius: '999px',
                color: '#FCD34D',
                fontSize: '0.72rem',
                fontWeight: 600,
                fontFamily: "'Inter', system-ui, sans-serif"
              }}
            >
              <AlertCircle size={13} strokeWidth={2} />
              <span>Ingresso Sympla Pendente</span>
            </div>

            <div style={{ display: 'flex', gap: '8px', marginTop: '2px' }}>
              <button
                type="button"
                onClick={handleRecheckTicket}
                disabled={recheckingTicket}
                style={{
                  padding: '6px 12px',
                  borderRadius: '8px',
                  backgroundColor: '#1E293B',
                  border: '1px solid #334155',
                  color: '#F8FAFC',
                  fontSize: '0.72rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '5px'
                }}
              >
                {recheckingTicket ? <Loader2 size={12} className="animate-spin" /> : <RefreshCw size={12} strokeWidth={2} />}
                <span>{recheckingTicket ? 'Checando...' : 'Verificar Agora'}</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  handleOpenEditModal();
                  setActiveTab('sympla');
                }}
                style={{
                  padding: '6px 12px',
                  borderRadius: '8px',
                  backgroundColor: '#1D4ED8',
                  border: '1px solid #2563EB',
                  color: '#FFFFFF',
                  fontSize: '0.72rem',
                  fontWeight: 600,
                  cursor: 'pointer'
                }}
              >
                Vincular Ingresso
              </button>
            </div>

            {ticketNotice && (
              <p
                style={{
                  margin: '2px 0 0',
                  fontSize: '0.7rem',
                  color: ticketNotice.includes('sucesso') ? '#6EE7B7' : '#FCD34D',
                  textAlign: 'center'
                }}
              >
                {ticketNotice}
              </p>
            )}
          </div>
        )}

        {/* Rodapé do Crachá: ID do Participante, Coordenadas Técnicas e Pontos */}
        <div
          style={{
            marginTop: '16px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            width: '100%',
            paddingTop: '10px',
            borderTop: '1px solid rgba(30, 41, 59, 0.6)',
            fontSize: '0.68rem',
            color: '#64748B',
            fontFamily: "'JetBrains Mono', monospace"
          }}
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
            <span style={{ fontVariantNumeric: 'tabular-nums', color: '#94A3B8', fontWeight: 700 }}>
              ID: #{profile.symplaTicket?.ticketNumber || (profile.id ? profile.id.slice(0, 8).toUpperCase() : 'TW2026')}
            </span>
            <span style={{ fontSize: '0.58rem', color: '#475569', letterSpacing: '0.04em' }}>
              18°55'S 48°15'W • CAMPUS SANTA MÔNICA // FACOM
            </span>
          </div>

          <span
            style={{
              fontFamily: "'Space Grotesk', -apple-system, BlinkMacSystemFont, sans-serif",
              fontWeight: 800,
              color: '#A855F7',
              fontVariantNumeric: 'tabular-nums',
              fontSize: '0.78rem'
            }}
          >
            {points} pts
          </span>
        </div>
      </section>

      {/* 3. GRID DE METRICAS E PROGRESSAO */}
      <section style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '18px' }}>
        {/* Card Gamificação */}
        <div
          style={{
            backgroundColor: '#0F141F',
            border: '1px solid #1E293B',
            borderRadius: '16px',
            padding: '14px 16px',
            display: 'flex',
            flexDirection: 'column'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#94A3B8', fontSize: '0.72rem', marginBottom: '6px' }}>
            <Award size={14} strokeWidth={1.75} color="#3B82F6" />
            <span style={{ fontFamily: "'Inter', system-ui, sans-serif", fontWeight: 600 }}>Gamificação</span>
          </div>

          <div
            style={{
              fontFamily: "'Space Grotesk', -apple-system, BlinkMacSystemFont, sans-serif",
              fontSize: '1.35rem',
              fontWeight: 800,
              color: '#F8FAFC',
              fontVariantNumeric: 'tabular-nums',
              margin: '0 0 2px'
            }}
          >
            {points} <span style={{ fontSize: '0.72rem', color: '#94A3B8', fontWeight: 500 }}>pts</span>
          </div>

          <div
            style={{
              fontSize: '0.72rem',
              fontWeight: 600,
              color: '#38BDF8',
              fontFamily: "'Inter', system-ui, sans-serif",
              marginBottom: '10px'
            }}
          >
            {userLevel?.label || 'Nível 1 · Novato'}
          </div>

          {userLevel && !userLevel.isMaxLevel && (
            <div style={{ marginTop: 'auto' }}>
              <div style={{ width: '100%', height: '5px', backgroundColor: '#1E293B', borderRadius: '999px', overflow: 'hidden' }}>
                <div
                  style={{
                    width: `${userLevel.progress}%`,
                    height: '100%',
                    background: '#2563EB',
                    borderRadius: '999px',
                    transition: 'width 0.3s ease'
                  }}
                />
              </div>
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  fontSize: '0.65rem',
                  color: '#64748B',
                  marginTop: '4px',
                  fontVariantNumeric: 'tabular-nums'
                }}
              >
                <span>Nível {userLevel.level + 1}</span>
                <span>+{userLevel.nextLevelPoints - userLevel.points} pts</span>
              </div>
            </div>
          )}
        </div>

        {/* Card Credenciamento */}
        <div
          style={{
            backgroundColor: '#0F141F',
            border: '1px solid #1E293B',
            borderRadius: '16px',
            padding: '14px 16px',
            display: 'flex',
            flexDirection: 'column'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#94A3B8', fontSize: '0.72rem', marginBottom: '6px' }}>
            <Ticket size={14} strokeWidth={1.75} color="#38BDF8" />
            <span style={{ fontFamily: "'Inter', system-ui, sans-serif", fontWeight: 600 }}>Credenciamento</span>
          </div>

          <div
            style={{
              fontSize: '0.82rem',
              fontWeight: 700,
              color: profile.symplaTicket ? '#6EE7B7' : '#FCD34D',
              marginBottom: '4px'
            }}
          >
            {profile.symplaTicket ? 'Ingresso Ativo' : 'Ação Necessária'}
          </div>

          <p
            style={{
              fontSize: '0.7rem',
              color: '#94A3B8',
              lineHeight: '1.4',
              margin: '0 0 10px',
              flex: 1
            }}
          >
            {profile.symplaTicket
              ? 'Check-in e pontuações liberados no evento.'
              : 'Conecte o Sympla para liberar validação presencial.'}
          </p>

          <button
            type="button"
            onClick={() => {
              handleOpenEditModal();
              setActiveTab('sympla');
            }}
            style={{
              padding: '6px 10px',
              borderRadius: '8px',
              backgroundColor: profile.symplaTicket ? '#1E293B' : 'rgba(245, 158, 11, 0.15)',
              border: profile.symplaTicket ? '1px solid #334155' : '1px solid rgba(245, 158, 11, 0.3)',
              color: profile.symplaTicket ? '#94A3B8' : '#FCD34D',
              fontSize: '0.7rem',
              fontWeight: 600,
              cursor: 'pointer',
              textAlign: 'center',
              marginTop: 'auto'
            }}
          >
            {profile.symplaTicket ? 'Ver Dados' : 'Conectar Agora'}
          </button>
        </div>
      </section>

      {/* 4. ACOES PRINCIPAIS E NETWORKING */}
      <section style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '22px' }}>
        {/* Botão de Destaque: Editar Perfil Completo */}
        <button
          type="button"
          onClick={handleOpenEditModal}
          style={{
            width: '100%',
            minHeight: '48px',
            padding: '12px 18px',
            borderRadius: '14px',
            backgroundColor: '#0F141F',
            border: '1px solid #1E293B',
            color: '#F8FAFC',
            fontFamily: "'Inter', system-ui, sans-serif",
            fontSize: '0.86rem',
            fontWeight: 600,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            cursor: 'pointer',
            transition: 'border-color 0.15s ease'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <Edit3 size={17} strokeWidth={1.75} color="#3B82F6" />
            <span>Editar Dados Cadastrais & Redes</span>
          </div>
          <span style={{ fontSize: '0.72rem', color: '#38BDF8' }}>Modificar</span>
        </button>

        {/* Botão de Painel do Organizador (se for Admin ou Organizador) */}
        {(role === 'ADMIN' || profile.role === 'ADMIN' || profile.email === 'admin@admin.com' || profile.email === 'sam03amorim@gmail.com') && (
          <button
            type="button"
            onClick={() => navigate('/admin')}
            style={{
              width: '100%',
              minHeight: '48px',
              padding: '12px 18px',
              borderRadius: '14px',
              background: 'linear-gradient(135deg, rgba(2, 132, 199, 0.15) 0%, rgba(37, 99, 235, 0.15) 100%)',
              border: '1px solid rgba(56, 189, 248, 0.4)',
              color: '#F8FAFC',
              fontFamily: "'Inter', system-ui, sans-serif",
              fontSize: '0.86rem',
              fontWeight: 700,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              cursor: 'pointer',
              boxShadow: '0 0 16px rgba(56, 189, 248, 0.15)',
              transition: 'all 0.15s ease'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <ShieldCheck size={18} color="#38BDF8" strokeWidth={2.2} />
              <span>Painel do Organizador (Área Admin)</span>
            </div>
            <span style={{ fontSize: '0.72rem', color: '#38BDF8', fontWeight: 800 }}>Acessar</span>
          </button>
        )}

        {/* Botão de Portaria e Credenciamento (se for Staff ou Admin) */}
        {(role === 'STAFF' || role === 'ADMIN' || profile.role === 'STAFF' || profile.role === 'ADMIN' || profile.email === 'staff@techweek.com' || profile.email === 'admin@admin.com' || profile.email === 'sam03amorim@gmail.com') && (
          <button
            type="button"
            onClick={() => navigate('/staff')}
            style={{
              width: '100%',
              minHeight: '48px',
              padding: '12px 18px',
              borderRadius: '14px',
              backgroundColor: '#0F141F',
              border: '1px solid rgba(251, 191, 36, 0.3)',
              color: '#F8FAFC',
              fontFamily: "'Inter', system-ui, sans-serif",
              fontSize: '0.86rem',
              fontWeight: 600,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              cursor: 'pointer',
              transition: 'border-color 0.15s ease'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <Award size={17} strokeWidth={1.75} color="#FBBF24" />
              <span>Portaria & Credenciamento (Staff)</span>
            </div>
            <span style={{ fontSize: '0.72rem', color: '#FBBF24' }}>Acessar</span>
          </button>
        )}

        {/* Botão de Modo Patrocinador */}
        <button
          type="button"
          onClick={() => navigate('/sponsor')}
          style={{
            width: '100%',
            minHeight: '48px',
            padding: '12px 18px',
            borderRadius: '14px',
            backgroundColor: '#0F141F',
            border: '1px solid #1E293B',
            color: '#F8FAFC',
            fontFamily: "'Inter', system-ui, sans-serif",
            fontSize: '0.86rem',
            fontWeight: 600,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            cursor: 'pointer',
            transition: 'border-color 0.15s ease'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <Building2 size={17} strokeWidth={1.75} color="#10B981" />
            <span>Modo Patrocinador (Estandes & Leads)</span>
          </div>
          <span style={{ fontSize: '0.72rem', color: '#10B981' }}>Acessar</span>
        </button>
      </section>

      {/* 5. ZONA DA CONTA (LOGOUT & EXCLUSAO) */}
      <section
        style={{
          borderTop: '1px solid #1E293B',
          paddingTop: '18px',
          display: 'flex',
          flexDirection: 'column',
          gap: '10px'
        }}
      >
        <button
          type="button"
          onClick={handleLogout}
          style={{
            width: '100%',
            minHeight: '44px',
            padding: '10px 16px',
            borderRadius: '12px',
            backgroundColor: 'transparent',
            border: '1px solid rgba(239, 68, 68, 0.25)',
            color: '#F87171',
            fontFamily: "'Inter', system-ui, sans-serif",
            fontSize: '0.84rem',
            fontWeight: 600,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '8px',
            cursor: 'pointer'
          }}
        >
          <LogOut size={16} strokeWidth={1.75} />
          <span>Sair da Conta</span>
        </button>

        <button
          type="button"
          onClick={handleDeleteAccount}
          style={{
            width: '100%',
            padding: '8px 12px',
            borderRadius: '8px',
            backgroundColor: 'transparent',
            border: 'none',
            color: '#64748B',
            fontFamily: "'Inter', system-ui, sans-serif",
            fontSize: '0.74rem',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '6px'
          }}
        >
          <Trash2 size={13} strokeWidth={1.75} />
          <span>Excluir dados cadastrais e recriar perfil</span>
        </button>
      </section>

      {/* MODAL INTERATIVO DE CORTE DE FOTO */}
      {rawImageForCrop && (
        <AvatarCropperModal
          imageSrc={rawImageForCrop}
          onCropComplete={handleCropComplete}
          onClose={() => setRawImageForCrop(null)}
        />
      )}

      {/* 6. MODAL COMPLETO DE EDICAO DE PERFIL & SYMPLA */}
      {isEditModalOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="edit-profile-modal-title"
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(7, 9, 14, 0.88)',
            backdropFilter: 'blur(8px)',
            WebkitBackdropFilter: 'blur(8px)',
            zIndex: 1000,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '16px'
          }}
        >
          <div
            className="animate-scale-up"
            style={{
              width: '100%',
              maxWidth: '430px',
              maxHeight: '90vh',
              maxHeight: '90dvh',
              backgroundColor: '#0F141F',
              border: '1px solid #1E293B',
              borderRadius: '20px',
              display: 'flex',
              flexDirection: 'column',
              position: 'relative',
              overflow: 'hidden',
              boxShadow: '0 24px 60px rgba(0, 0, 0, 0.85), 0 0 0 1px rgba(37, 99, 235, 0.2)'
            }}
          >
            {/* Header Fixo do Modal */}
            <div
              style={{
                padding: '16px 20px',
                borderBottom: '1px solid #1E293B',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                backgroundColor: '#0B0F17'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div
                  style={{
                    width: '34px',
                    height: '34px',
                    borderRadius: '10px',
                    backgroundColor: 'rgba(37, 99, 235, 0.12)',
                    border: '1px solid rgba(37, 99, 235, 0.3)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}
                >
                  <Edit3 size={17} strokeWidth={2} color="#3B82F6" />
                </div>
                <div>
                  <h3
                    id="edit-profile-modal-title"
                    style={{
                      fontFamily: "'Space Grotesk', -apple-system, BlinkMacSystemFont, sans-serif",
                      fontSize: '0.98rem',
                      fontWeight: 800,
                      color: '#F8FAFC',
                      margin: 0
                    }}
                  >
                    Editar Cadastro
                  </h3>
                  <p
                    style={{
                      fontSize: '0.72rem',
                      color: '#94A3B8',
                      margin: 0,
                      fontFamily: "'Inter', system-ui, sans-serif"
                    }}
                  >
                    Atualize seus dados e conecte seu ingresso
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => {
                  setIsEditModalOpen(false);
                  setEditFeedback(null);
                }}
                aria-label="Fechar formulário de edição"
                style={{
                  backgroundColor: '#1E293B',
                  border: '1px solid #334155',
                  borderRadius: '10px',
                  width: '32px',
                  height: '32px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#94A3B8',
                  cursor: 'pointer',
                  transition: 'background-color 0.15s ease'
                }}
              >
                <X size={16} strokeWidth={2} />
              </button>
            </div>

            {/* Formulário Único em Fluxo Vertical Contínuo */}
            <form
              onSubmit={handleSaveProfile}
              style={{
                display: 'flex',
                flexDirection: 'column',
                flex: 1,
                overflow: 'hidden'
              }}
            >
              <div
                className="no-scrollbar"
                style={{
                  padding: '16px 20px',
                  overflowY: 'auto',
                  scrollbarWidth: 'none',
                  msOverflowStyle: 'none',
                  flex: 1,
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '14px'
                }}
              >
                {/* 1. SEÇÃO: DADOS PESSOAIS */}
                <section
                  style={{
                    backgroundColor: '#07090E',
                    border: '1px solid #1E293B',
                    borderRadius: '14px',
                    padding: '14px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '12px'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '7px' }}>
                    <User size={14} color="#3B82F6" strokeWidth={2} />
                    <span
                      style={{
                        fontFamily: "'Space Grotesk', -apple-system, BlinkMacSystemFont, sans-serif",
                        fontSize: '0.74rem',
                        fontWeight: 700,
                        color: '#93C5FD',
                        textTransform: 'uppercase',
                        letterSpacing: '0.04em'
                      }}
                    >
                      Dados Pessoais
                    </span>
                  </div>

                  <div style={{ display: 'flex', gap: '10px' }}>
                    <div style={{ flex: 1 }}>
                      <label
                        style={{
                          display: 'block',
                          fontSize: '0.72rem',
                          color: '#94A3B8',
                          marginBottom: '4px',
                          fontFamily: "'Inter', system-ui, sans-serif"
                        }}
                      >
                        Primeiro Nome <span style={{ color: '#3B82F6' }}>*</span>
                      </label>
                      <input
                        type="text"
                        value={editForm.firstName}
                        onChange={(e) => setEditForm({ ...editForm, firstName: e.target.value })}
                        placeholder="Ex: Carlos"
                        required
                        style={{
                          width: '100%',
                          backgroundColor: '#0F141F',
                          border: '1px solid #1E293B',
                          borderRadius: '10px',
                          padding: '10px 12px',
                          color: '#F8FAFC',
                          fontFamily: "'Inter', system-ui, sans-serif",
                          fontSize: '0.84rem',
                          outline: 'none',
                          boxSizing: 'border-box'
                        }}
                      />
                    </div>

                    <div style={{ flex: 1 }}>
                      <label
                        style={{
                          display: 'block',
                          fontSize: '0.72rem',
                          color: '#94A3B8',
                          marginBottom: '4px',
                          fontFamily: "'Inter', system-ui, sans-serif"
                        }}
                      >
                        Sobrenome
                      </label>
                      <input
                        type="text"
                        value={editForm.lastName}
                        onChange={(e) => setEditForm({ ...editForm, lastName: e.target.value })}
                        placeholder="Ex: Mendes"
                        style={{
                          width: '100%',
                          backgroundColor: '#0F141F',
                          border: '1px solid #1E293B',
                          borderRadius: '10px',
                          padding: '10px 12px',
                          color: '#F8FAFC',
                          fontFamily: "'Inter', system-ui, sans-serif",
                          fontSize: '0.84rem',
                          outline: 'none',
                          boxSizing: 'border-box'
                        }}
                      />
                    </div>
                  </div>

                  <div>
                    <label
                      style={{
                        display: 'block',
                        fontSize: '0.72rem',
                        color: '#94A3B8',
                        marginBottom: '4px',
                        fontFamily: "'Inter', system-ui, sans-serif"
                      }}
                    >
                      Nome de Usuário (@username) <span style={{ color: '#3B82F6' }}>*</span>
                    </label>
                    <div style={{ position: 'relative' }}>
                      <span
                        style={{
                          position: 'absolute',
                          left: '12px',
                          top: '50%',
                          transform: 'translateY(-50%)',
                          color: '#64748B',
                          fontSize: '0.85rem'
                        }}
                      >
                        @
                      </span>
                      <input
                        type="text"
                        value={editForm.username}
                        onChange={(e) =>
                          setEditForm({
                            ...editForm,
                            username: e.target.value.replace(/^@/, '').replace(/\s+/g, '')
                          })
                        }
                        placeholder="carlosmendes"
                        required
                        style={{
                          width: '100%',
                          backgroundColor: '#0F141F',
                          border: '1px solid #1E293B',
                          borderRadius: '10px',
                          padding: '10px 12px 10px 28px',
                          color: '#F8FAFC',
                          fontFamily: "'Inter', system-ui, sans-serif",
                          fontSize: '0.84rem',
                          outline: 'none',
                          boxSizing: 'border-box'
                        }}
                      />
                    </div>
                    <span
                      style={{
                        fontSize: '0.68rem',
                        color: '#64748B',
                        display: 'block',
                        marginTop: '3px'
                      }}
                    >
                      Identificador público no ranking de gamificação.
                    </span>
                  </div>
                </section>

                {/* 2. SEÇÃO: VÍNCULO INSTITUCIONAL */}
                <section
                  style={{
                    backgroundColor: '#07090E',
                    border: '1px solid #1E293B',
                    borderRadius: '14px',
                    padding: '14px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '12px'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '7px' }}>
                    <GraduationCap size={14} color="#3B82F6" strokeWidth={2} />
                    <span
                      style={{
                        fontFamily: "'Space Grotesk', -apple-system, BlinkMacSystemFont, sans-serif",
                        fontSize: '0.74rem',
                        fontWeight: 700,
                        color: '#93C5FD',
                        textTransform: 'uppercase',
                        letterSpacing: '0.04em'
                      }}
                    >
                      Vínculo Acadêmico
                    </span>
                  </div>

                  <div>
                    <label
                      style={{
                        display: 'block',
                        fontSize: '0.72rem',
                        color: '#94A3B8',
                        marginBottom: '4px',
                        fontFamily: "'Inter', system-ui, sans-serif"
                      }}
                    >
                      Vínculo Institucional
                    </label>
                    <select
                      value={editForm.participantType}
                      onChange={(e) => setEditForm({ ...editForm, participantType: e.target.value })}
                      style={{
                        width: '100%',
                        backgroundColor: '#0F141F',
                        border: '1px solid #1E293B',
                        borderRadius: '10px',
                        padding: '10px 12px',
                        color: '#F8FAFC',
                        fontFamily: "'Inter', system-ui, sans-serif",
                        fontSize: '0.84rem',
                        outline: 'none',
                        boxSizing: 'border-box'
                      }}
                    >
                      {PARTICIPANT_TYPES.map((type) => (
                        <option
                          key={type}
                          value={type}
                          style={{ backgroundColor: '#0F141F', color: '#F8FAFC' }}
                        >
                          {type}
                        </option>
                      ))}
                    </select>
                  </div>

                  {editForm.participantType === 'Aluno da UFU' ||
                  editForm.participantType === 'Aluno de outra instituição' ? (
                    <>
                      <div style={{ display: 'flex', gap: '10px' }}>
                        <div style={{ flex: 2 }}>
                          <label
                            style={{
                              display: 'block',
                              fontSize: '0.72rem',
                              color: '#94A3B8',
                              marginBottom: '4px',
                              fontFamily: "'Inter', system-ui, sans-serif"
                            }}
                          >
                            Curso
                          </label>
                          <select
                            value={editForm.course}
                            onChange={(e) => setEditForm({ ...editForm, course: e.target.value })}
                            style={{
                              width: '100%',
                              backgroundColor: '#0F141F',
                              border: '1px solid #1E293B',
                              borderRadius: '10px',
                              padding: '10px 12px',
                              color: '#F8FAFC',
                              fontFamily: "'Inter', system-ui, sans-serif",
                              fontSize: '0.84rem',
                              outline: 'none',
                              boxSizing: 'border-box'
                            }}
                          >
                            <option value="" disabled>
                              Selecione seu curso
                            </option>
                            {UFU_COURSES.map((courseName) => (
                              <option
                                key={courseName}
                                value={courseName}
                                style={{ backgroundColor: '#0F141F', color: '#F8FAFC' }}
                              >
                                {courseName}
                              </option>
                            ))}
                          </select>
                        </div>

                        <div style={{ flex: 1 }}>
                          <label
                            style={{
                              display: 'block',
                              fontSize: '0.72rem',
                              color: '#94A3B8',
                              marginBottom: '4px',
                              fontFamily: "'Inter', system-ui, sans-serif"
                            }}
                          >
                            Período
                          </label>
                          <input
                            type="number"
                            min="1"
                            max="20"
                            value={editForm.period}
                            onChange={(e) => setEditForm({ ...editForm, period: e.target.value })}
                            placeholder="Ex: 5"
                            style={{
                              width: '100%',
                              backgroundColor: '#0F141F',
                              border: '1px solid #1E293B',
                              borderRadius: '10px',
                              padding: '10px 12px',
                              color: '#F8FAFC',
                              fontFamily: "'Inter', system-ui, sans-serif",
                              fontSize: '0.84rem',
                              outline: 'none',
                              boxSizing: 'border-box'
                            }}
                          />
                        </div>
                      </div>

                      {editForm.course === 'Outro (especificar)' && (
                        <div>
                          <label
                            style={{
                              display: 'block',
                              fontSize: '0.72rem',
                              color: '#3B82F6',
                              marginBottom: '4px',
                              fontFamily: "'Inter', system-ui, sans-serif",
                              fontWeight: 600
                            }}
                          >
                            Nome do Curso
                          </label>
                          <input
                            type="text"
                            value={editForm.customCourse}
                            onChange={(e) => setEditForm({ ...editForm, customCourse: e.target.value })}
                            placeholder="Digite o nome completo do seu curso..."
                            required
                            style={{
                              width: '100%',
                              backgroundColor: '#0F141F',
                              border: '1px solid #1E293B',
                              borderRadius: '10px',
                              padding: '10px 12px',
                              color: '#F8FAFC',
                              fontFamily: "'Inter', system-ui, sans-serif",
                              fontSize: '0.84rem',
                              outline: 'none',
                              boxSizing: 'border-box'
                            }}
                          />
                        </div>
                      )}
                    </>
                  ) : (
                    <div
                      style={{
                        padding: '8px 12px',
                        backgroundColor: '#0F141F',
                        border: '1px solid #1E293B',
                        borderRadius: '8px',
                        fontSize: '0.72rem',
                        color: '#64748B'
                      }}
                    >
                      Campos de curso e período aplicam-se a participantes estudantes.
                    </div>
                  )}
                </section>

                {/* 3. SEÇÃO: CONTATO & REDES SOCIAIS */}
                <section
                  style={{
                    backgroundColor: '#07090E',
                    border: '1px solid #1E293B',
                    borderRadius: '14px',
                    padding: '14px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '12px'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '7px' }}>
                    <Phone size={14} color="#3B82F6" strokeWidth={2} />
                    <span
                      style={{
                        fontFamily: "'Space Grotesk', -apple-system, BlinkMacSystemFont, sans-serif",
                        fontSize: '0.74rem',
                        fontWeight: 700,
                        color: '#93C5FD',
                        textTransform: 'uppercase',
                        letterSpacing: '0.04em'
                      }}
                    >
                      Contato & Redes Sociais
                    </span>
                  </div>

                  <div>
                    <label
                      style={{
                        display: 'block',
                        fontSize: '0.72rem',
                        color: '#94A3B8',
                        marginBottom: '4px',
                        fontFamily: "'Inter', system-ui, sans-serif"
                      }}
                    >
                      Telefone / WhatsApp (Opcional)
                    </label>
                    <input
                      type="text"
                      value={editForm.phone}
                      onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })}
                      placeholder="(34) 99999-9999"
                      style={{
                        width: '100%',
                        backgroundColor: '#0F141F',
                        border: '1px solid #1E293B',
                        borderRadius: '10px',
                        padding: '10px 12px',
                        color: '#F8FAFC',
                        fontFamily: "'Inter', system-ui, sans-serif",
                        fontSize: '0.84rem',
                        outline: 'none',
                        boxSizing: 'border-box'
                      }}
                    />
                  </div>

                  <div style={{ display: 'flex', gap: '10px' }}>
                    <div style={{ flex: 1 }}>
                      <label
                        style={{
                          display: 'block',
                          fontSize: '0.72rem',
                          color: '#94A3B8',
                          marginBottom: '4px',
                          fontFamily: "'Inter', system-ui, sans-serif"
                        }}
                      >
                        LinkedIn (Opcional)
                      </label>
                      <input
                        type="text"
                        value={editForm.linkedin}
                        onChange={(e) => setEditForm({ ...editForm, linkedin: e.target.value })}
                        placeholder="linkedin.com/in/usuario"
                        style={{
                          width: '100%',
                          backgroundColor: '#0F141F',
                          border: '1px solid #1E293B',
                          borderRadius: '10px',
                          padding: '10px 12px',
                          color: '#F8FAFC',
                          fontFamily: "'Inter', system-ui, sans-serif",
                          fontSize: '0.84rem',
                          outline: 'none',
                          boxSizing: 'border-box'
                        }}
                      />
                    </div>

                    <div style={{ flex: 1 }}>
                      <label
                        style={{
                          display: 'block',
                          fontSize: '0.72rem',
                          color: '#94A3B8',
                          marginBottom: '4px',
                          fontFamily: "'Inter', system-ui, sans-serif"
                        }}
                      >
                        Instagram (Opcional)
                      </label>
                      <input
                        type="text"
                        value={editForm.instagram}
                        onChange={(e) => setEditForm({ ...editForm, instagram: e.target.value })}
                        placeholder="@usuario"
                        style={{
                          width: '100%',
                          backgroundColor: '#0F141F',
                          border: '1px solid #1E293B',
                          borderRadius: '10px',
                          padding: '10px 12px',
                          color: '#F8FAFC',
                          fontFamily: "'Inter', system-ui, sans-serif",
                          fontSize: '0.84rem',
                          outline: 'none',
                          boxSizing: 'border-box'
                        }}
                      />
                    </div>
                  </div>

                  <div>
                    <label
                      style={{
                        display: 'block',
                        fontSize: '0.72rem',
                        color: '#94A3B8',
                        marginBottom: '4px',
                        fontFamily: "'Inter', system-ui, sans-serif"
                      }}
                    >
                      GitHub (Opcional)
                    </label>
                    <input
                      type="text"
                      value={editForm.github}
                      onChange={(e) => setEditForm({ ...editForm, github: e.target.value })}
                      placeholder="github.com/usuario ou @usuario"
                      style={{
                        width: '100%',
                        backgroundColor: '#0F141F',
                        border: '1px solid #1E293B',
                        borderRadius: '10px',
                        padding: '10px 12px',
                        color: '#F8FAFC',
                        fontFamily: "'Inter', system-ui, sans-serif",
                        fontSize: '0.84rem',
                        outline: 'none',
                        boxSizing: 'border-box'
                      }}
                    />
                  </div>
                </section>

                {/* 4. SEÇÃO: INGRESSO SYMPLA */}
                <section
                  style={{
                    backgroundColor: '#07090E',
                    border: '1px solid #1E293B',
                    borderRadius: '14px',
                    padding: '14px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '12px'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '7px' }}>
                      <Ticket size={14} color="#3B82F6" strokeWidth={2} />
                      <span
                        style={{
                          fontFamily: "'Space Grotesk', -apple-system, BlinkMacSystemFont, sans-serif",
                          fontSize: '0.74rem',
                          fontWeight: 700,
                          color: '#93C5FD',
                          textTransform: 'uppercase',
                          letterSpacing: '0.04em'
                        }}
                      >
                        Ingresso Sympla
                      </span>
                    </div>

                    {isTicketConfirmed && (
                      <span
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '4px',
                          fontSize: '0.68rem',
                          fontWeight: 600,
                          color: '#6EE7B7',
                          backgroundColor: 'rgba(16, 185, 129, 0.12)',
                          padding: '2px 8px',
                          borderRadius: '999px',
                          border: '1px solid rgba(16, 185, 129, 0.25)'
                        }}
                      >
                        <ShieldCheck size={12} strokeWidth={2.2} />
                        Confirmado
                      </span>
                    )}
                  </div>

                  {isTicketConfirmed ? (
                    /* CASO 1: Ingresso JÁ CONFIRMADO - Dados protegidos contra alteração */
                    <div
                      style={{
                        backgroundColor: '#0F141F',
                        border: '1px solid #1E293B',
                        borderRadius: '12px',
                        padding: '14px',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '12px'
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px' }}>
                        <div
                          style={{
                            width: '36px',
                            height: '36px',
                            borderRadius: '10px',
                            backgroundColor: 'rgba(16, 185, 129, 0.15)',
                            border: '1px solid rgba(16, 185, 129, 0.3)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            flexShrink: 0
                          }}
                        >
                          <ShieldCheck size={18} color="#10B981" strokeWidth={2.2} />
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontSize: '0.84rem', fontWeight: 700, color: '#F8FAFC', marginBottom: '2px' }}>
                            {profile.symplaTicket?.ticketName || 'Credencial Oficial Confirmada'}
                          </div>
                          <div style={{ fontSize: '0.72rem', color: '#6EE7B7', fontWeight: 500 }}>
                            Ingresso validado • QR Code ativo
                          </div>
                        </div>
                      </div>

                      {/* Informações protegidas em modo leitura */}
                      <div
                        style={{
                          backgroundColor: '#07090E',
                          borderRadius: '8px',
                          border: '1px solid #1E293B',
                          padding: '10px 12px',
                          display: 'flex',
                          flexDirection: 'column',
                          gap: '8px'
                        }}
                      >
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '0.72rem' }}>
                          <span style={{ color: '#64748B' }}>E-mail Vinculado:</span>
                          <span style={{ color: '#F8FAFC', fontFamily: "'Inter', system-ui, sans-serif", fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: '5px' }}>
                            <Lock size={11} color="#3B82F6" />
                            {profile.email || auth.currentUser?.email || 'Registrado'}
                          </span>
                        </div>
                        {profile.symplaTicket?.ticketNumber && (
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '0.72rem' }}>
                            <span style={{ color: '#64748B' }}>Código do Ingresso:</span>
                            <span style={{ color: '#93C5FD', fontFamily: "'Inter', system-ui, sans-serif", fontWeight: 600, fontVariantNumeric: 'tabular-nums' }}>
                              #{profile.symplaTicket.ticketNumber}
                            </span>
                          </div>
                        )}
                      </div>

                      <p style={{ fontSize: '0.68rem', color: '#64748B', margin: 0, lineHeight: 1.4 }}>
                        🔒 Os dados de e-mail e credencial do ingresso estão bloqueados para segurança do seu crachá. Para transferência de titularidade, contate a organização do evento.
                      </p>
                    </div>
                  ) : (
                    /* CASO 2: Ingresso NÃO CONFIRMADO - Permite preencher e consultar */
                    <>
                      <div
                        style={{
                          padding: '10px 12px',
                          backgroundColor: '#451A03',
                          border: '1px solid #B45309',
                          borderRadius: '10px',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '10px'
                        }}
                      >
                        <AlertCircle size={18} color="#FCD34D" strokeWidth={2} />
                        <div>
                          <div style={{ fontSize: '0.78rem', fontWeight: 700, color: '#FCD34D' }}>
                            Ingresso Sympla Pendente
                          </div>
                          <div style={{ fontSize: '0.68rem', color: '#FEF08A' }}>
                            Informe seu e-mail de compra para desbloquear o QR Code.
                          </div>
                        </div>
                      </div>

                      <div>
                        <label
                          style={{
                            display: 'block',
                            fontSize: '0.72rem',
                            color: '#94A3B8',
                            marginBottom: '4px',
                            fontFamily: "'Inter', system-ui, sans-serif"
                          }}
                        >
                          E-mail Cadastrado no Sympla <span style={{ color: '#3B82F6' }}>*</span>
                        </label>
                        <input
                          type="email"
                          value={editForm.email}
                          onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
                          placeholder="seu-email@exemplo.com"
                          required
                          style={{
                            width: '100%',
                            backgroundColor: '#0F141F',
                            border: '1px solid #1E293B',
                            borderRadius: '10px',
                            padding: '10px 12px',
                            color: '#F8FAFC',
                            fontFamily: "'Inter', system-ui, sans-serif",
                            fontSize: '0.84rem',
                            outline: 'none',
                            boxSizing: 'border-box'
                          }}
                        />
                      </div>

                      <div>
                        <label
                          style={{
                            display: 'block',
                            fontSize: '0.72rem',
                            color: '#94A3B8',
                            marginBottom: '4px',
                            fontFamily: "'Inter', system-ui, sans-serif"
                          }}
                        >
                          Código do Ingresso / Voucher (Opcional)
                        </label>
                        <input
                          type="text"
                          value={editForm.ticketNumber || ''}
                          onChange={(e) => setEditForm({ ...editForm, ticketNumber: e.target.value })}
                          placeholder="Ex: T12345678"
                          style={{
                            width: '100%',
                            backgroundColor: '#0F141F',
                            border: '1px solid #1E293B',
                            borderRadius: '10px',
                            padding: '10px 12px',
                            color: '#F8FAFC',
                            fontFamily: "'Inter', system-ui, sans-serif",
                            fontSize: '0.84rem',
                            outline: 'none',
                            boxSizing: 'border-box'
                          }}
                        />
                      </div>

                      <button
                        type="button"
                        onClick={handleVerifyTicketInModal}
                        disabled={verifyingTicket}
                        style={{
                          width: '100%',
                          minHeight: '40px',
                          padding: '10px 14px',
                          borderRadius: '10px',
                          backgroundColor: '#1E293B',
                          border: '1px solid #334155',
                          color: '#F8FAFC',
                          fontSize: '0.78rem',
                          fontWeight: 600,
                          cursor: verifyingTicket ? 'not-allowed' : 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: '8px',
                          transition: 'background-color 0.15s ease'
                        }}
                      >
                        {verifyingTicket ? (
                          <Loader2 size={14} className="animate-spin" />
                        ) : (
                          <RefreshCw size={14} strokeWidth={2} />
                        )}
                        <span>{verifyingTicket ? 'Consultando Sympla...' : 'Consultar Ingresso no Sympla'}</span>
                      </button>

                      <div style={{ textAlign: 'center', marginTop: '2px' }}>
                        <a
                          href={SYMPLA_EVENT_URL}
                          target="_blank"
                          rel="noopener noreferrer"
                          style={{
                            fontSize: '0.72rem',
                            color: '#38BDF8',
                            textDecoration: 'none',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '4px'
                          }}
                        >
                          <span>Ainda não possui ingresso? Inscreva-se no Sympla</span>
                          <ExternalLink size={11} />
                        </a>
                      </div>
                    </>
                  )}
                </section>

                {/* Feedback Contextual */}
                {editFeedback && (
                  <div
                    style={{
                      padding: '10px 12px',
                      borderRadius: '10px',
                      fontSize: '0.74rem',
                      lineHeight: '1.4',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      backgroundColor:
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
                          ? '#6EE7B7'
                          : editFeedback.type === 'warning'
                          ? '#FCD34D'
                          : '#FCA5A5'
                    }}
                  >
                    {editFeedback.type === 'success' ? <Check size={15} /> : <AlertCircle size={15} />}
                    <span>{editFeedback.text}</span>
                  </div>
                )}
              </div>

              {/* Rodapé Fixo do Modal: Cancelar e Salvar */}
              <div
                style={{
                  padding: '14px 20px',
                  borderTop: '1px solid #1E293B',
                  display: 'flex',
                  gap: '10px',
                  backgroundColor: '#0B0F17'
                }}
              >
                <button
                  type="button"
                  onClick={() => {
                    setIsEditModalOpen(false);
                    setEditFeedback(null);
                  }}
                  style={{
                    flex: 1,
                    minHeight: '44px',
                    padding: '10px',
                    borderRadius: '10px',
                    backgroundColor: '#1E293B',
                    border: '1px solid #334155',
                    color: '#94A3B8',
                    cursor: 'pointer',
                    fontSize: '0.82rem',
                    fontWeight: 600,
                    fontFamily: "'Inter', system-ui, sans-serif"
                  }}
                >
                  Cancelar
                </button>

                <button
                  type="submit"
                  disabled={savingProfile}
                  style={{
                    flex: 2,
                    minHeight: '44px',
                    padding: '10px',
                    borderRadius: '10px',
                    backgroundColor: '#2563EB',
                    border: '1px solid #3B82F6',
                    color: '#FFFFFF',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '8px',
                    fontSize: '0.82rem',
                    fontWeight: 700,
                    fontFamily: "'Space Grotesk', -apple-system, BlinkMacSystemFont, sans-serif",
                    cursor: savingProfile ? 'not-allowed' : 'pointer',
                    transition: 'background-color 0.15s ease'
                  }}
                >
                  {savingProfile ? (
                    <Loader2 size={16} className="animate-spin" />
                  ) : (
                    <Check size={16} strokeWidth={2.2} />
                  )}
                  <span>{savingProfile ? 'Salvando...' : 'Salvar Alterações'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}