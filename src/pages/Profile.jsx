import { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { updateProfile } from 'firebase/auth';
import {
  ChevronLeft, ChevronRight, Camera, Loader2, Ticket, Link as LinkIcon, ShieldCheck, Lock, Check, Trash2, LogOut,
  ExternalLink, CalendarCheck, QrCode, Trophy
} from 'lucide-react';
import { useUser } from '../hooks/useUser';
import { getMyProfile, uploadAvatar } from '../lib/gameplay';
import { logoutUser, onAuthChange, deleteCurrentUserAccount } from '../lib/auth';
import { auth } from '../lib/firebase';
import { validateAvatarFile, isValidEmail } from '../lib/validators';
import { SYMPLA_EVENT_URL, verifySymplaTicket } from '../lib/sympla';
import {
  getUserProfile, uploadUserAvatar, updateUserEmail, updateUserProfile, getCachedUserProfile,
  getLeaderboardUsers, checkUsernameAvailability
} from '../lib/userService';
import AvatarCropperModal from '../components/AvatarCropperModal';
import ConfirmModal from '../components/ConfirmModal';
import FeedbackModal from '../components/FeedbackModal';
import RoleSwitcher, { rolesFor } from '../components/RoleSwitcher';
import SymplaStickyBanner from '../components/SymplaStickyBanner';
import Mascot from '../components/Mascot';
import icone from '../assets/icone.png';
import '../styles/perfil.css';

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

// Estandes do passaporte (mesma lista do PassportTab — regra OBSERVADA, DESIGN.md §12).
const PASSPORT_STANDS = ['kanastra', 'bayer', 'aimirim', 'bip', 'hyperflow'];
const PERIODS = Array.from({ length: 20 }, (_, i) => String(i + 1));

const initialsOf = (first, last) =>
  ((first || '').charAt(0) + (last || '').charAt(0)).toUpperCase() || '?';

export default function Profile() {
  const { points, userLevel, role, profile: userProfile } = useUser();
  const navigate = useNavigate();
  const location = useLocation();
  const fileInputRef = useRef(null);
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

  // Editar perfil é uma sub-view do Perfil (?edit=true), não modal (DESIGN.md §6, tela 1.34).
  const params = new URLSearchParams(location.search);
  const isEditing = params.get('edit') === 'true';
  const editSection = params.get('s');
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
  const [needsPassword, setNeedsPassword] = useState(false); // troca de e-mail pede a senha (re-autenticação)
  const [reauthPassword, setReauthPassword] = useState('');
  const [ticketSheetOpen, setTicketSheetOpen] = useState(false);
  const [confirmModal, setConfirmModal] = useState(null);
  const [feedbackModal, setFeedbackModal] = useState(null);
  const [isActionLoading, setIsActionLoading] = useState(false);
  const [rankPosition, setRankPosition] = useState(null);
  const [usernameStatus, setUsernameStatus] = useState(null); // null | 'checking' | 'ok' | 'taken'

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

  const fillEditForm = () => {
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
  };

  // Entrou em ?edit=true (ou o perfil terminou de carregar): preenche o formulário.
  // ?changeEmail=true (link antigo) abre a folha do ingresso, onde o e-mail do Sympla é informado.
  useEffect(() => {
    if (isEditing) fillEditForm();
    if (params.get('changeEmail') === 'true') openTicketSheet();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.search, profile.id]);

  // Rola até a seção pedida (Redes sociais / Privacidade) ao abrir a edição.
  useEffect(() => {
    if (!isEditing || !editSection) return;
    document.getElementById(`perfil-${editSection}`)?.scrollIntoView({ block: 'start' });
  }, [isEditing, editSection]);

  // Posição no ranking: mesma fonte da tela de Ranking (top 50). Fora do top 50 mostra "—".
  useEffect(() => {
    if (!profile.id) return;
    let alive = true;
    getLeaderboardUsers(50)
      .then((list) => {
        if (alive) setRankPosition(list.find((u) => u.id === profile.id)?.rank ?? null);
      })
      .catch(() => {});
    return () => { alive = false; };
  }, [profile.id]);

  // "@usuário" com validação na hora (DESIGN.md §6). Só informa; quem decide é o save.
  useEffect(() => {
    if (!isEditing) return;
    const clean = editForm.username.trim().toLowerCase();
    if (!clean || clean === (profile.username || '').replace(/^@/, '').toLowerCase()) {
      setUsernameStatus(null);
      return;
    }
    setUsernameStatus('checking');
    const t = setTimeout(() => {
      checkUsernameAvailability(clean).then((r) => setUsernameStatus(r.available ? 'ok' : 'taken'));
    }, 400);
    return () => clearTimeout(t);
  }, [editForm.username, isEditing, profile.username]);

  const openEdit = (section) => navigate(`/profile?edit=true${section ? `&s=${section}` : ''}`);
  const closeEdit = () => {
    if (location.key !== 'default') navigate(-1);
    else navigate('/profile', { replace: true });
  };

  const openTicketSheet = () => {
    if (!isEditing) fillEditForm();
    setEditFeedback(null);
    setTicketSheetOpen(true);
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

      // Troca de e-mail: Auth primeiro. Se falhar, nada é gravado (nem o resto do perfil),
      // pra o e-mail do perfil nunca divergir do e-mail de login.
      if (!isTicketConfirmed && cleanEmail && auth.currentUser && auth.currentUser.email !== cleanEmail) {
        try {
          await updateUserEmail(uid, cleanEmail, reauthPassword || undefined);
          setNeedsPassword(false);
          setReauthPassword('');
        } catch (authErr) {
          const code = authErr?.code;
          if (code === 'auth/requires-recent-login') {
            setNeedsPassword(true);
            setEditFeedback({ type: 'error', text: 'Por segurança, informe sua senha atual para trocar o e-mail.' });
          } else if (code === 'auth/wrong-password' || code === 'auth/invalid-credential') {
            setNeedsPassword(true);
            setEditFeedback({ type: 'error', text: 'Senha incorreta. Tente de novo.' });
          } else if (code === 'auth/email-already-in-use') {
            setEditFeedback({ type: 'error', text: 'Este e-mail já está em uso por outra conta.' });
          } else {
            setEditFeedback({ type: 'error', text: 'Não foi possível trocar o e-mail agora. Nada foi alterado.' });
          }
          return;
        }
      }

      // Se o ingresso ainda NÃO estava confirmado, o e-mail (já aceito pelo Auth) vai junto
      if (!isTicketConfirmed && cleanEmail) {
        updates.email = cleanEmail;
      }

      // 1. Atualiza documento no Firestore
      await updateUserProfile(uid, updates);

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
              symplaMessage = ` Ingresso Sympla vinculado: ${ticketObj.ticketName || p?.ticketName || 'Oficial'}!`;
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
              symplaMessage = ` Ingresso Sympla vinculado (#${cleanTicketNum})!`;
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

      // Volta pro Perfil após 1.2s se sucesso
      setTimeout(() => {
        closeEdit();
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
        setEditFeedback({ type: 'success', text: `Ingresso confirmado com sucesso: ${ticketObj.ticketName || p?.ticketName || 'Oficial'}!` });
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
        setEditFeedback({ type: 'success', text: `Ingresso (#${cleanTicket}) vinculado com sucesso!` });
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

  const handleLogout = () => {
    setConfirmModal({
      title: 'Sair da conta',
      message: 'Tem certeza que deseja sair da sua conta? Você precisará fazer login novamente para acessar seus pontos e desafios.',
      confirmLabel: 'Sair da conta',
      cancelLabel: 'Continuar no app',
      variant: 'danger',
      Icon: LogOut,
      onConfirm: async () => {
        setIsActionLoading(true);
        try {
          await logoutUser();
          navigate('/login');
        } finally {
          setIsActionLoading(false);
          setConfirmModal(null);
        }
      }
    });
  };

  const handleDeleteAccount = () => {
    setConfirmModal({
      title: 'Apagar conta permanentemente',
      message: 'Esta ação não pode ser desfeita. Todos os seus pontos acumulados, carimbos do passaporte e dados cadastrais serão removidos do evento.',
      confirmLabel: 'Sim, apagar minha conta',
      cancelLabel: 'Manter minha conta',
      variant: 'danger',
      Icon: Trash2,
      requireConfirmationText: 'EXCLUIR',
      confirmationPrompt: 'Para confirmar a exclusão definitiva da sua conta, digite EXCLUIR abaixo:',
      onConfirm: async () => {
        setIsActionLoading(true);
        try {
          const res = await deleteCurrentUserAccount();
          setConfirmModal(null);
          if (res.success) {
            setFeedbackModal({
              type: 'success',
              title: 'Conta apagada',
              message: 'Seus dados foram excluídos com sucesso. Redirecionando para a tela inicial...',
              actionLabel: 'OK',
              onClose: () => navigate('/register')
            });
            setTimeout(() => {
              navigate('/register');
            }, 2500);
          } else {
            setFeedbackModal({
              type: 'error',
              title: 'Não foi possível excluir',
              message: res.error || 'Tente sair e fazer login novamente antes de excluir sua conta.',
              actionLabel: 'Entendido',
              onClose: () => setFeedbackModal(null)
            });
          }
        } catch (err) {
          setConfirmModal(null);
          setFeedbackModal({
            type: 'error',
            title: 'Não foi possível excluir',
            message: err.message || 'Ocorreu um erro inesperado ao excluir sua conta.',
            actionLabel: 'Fechar',
            onClose: () => setFeedbackModal(null)
          });
        } finally {
          setIsActionLoading(false);
        }
      }
    });
  };

  // Remover foto: limpa avatarUrl no perfil e a photoURL do Firebase Auth (senão o fallback traz a foto de volta).
  const handleRemoveAvatar = async () => {
    const uid = profile.id || auth.currentUser?.uid;
    setAvatarError('');
    setUploadingAvatar(true);
    try {
      if (uid) await updateUserProfile(uid, { avatarUrl: '' });
      if (auth.currentUser?.photoURL) await updateProfile(auth.currentUser, { photoURL: null });
      setProfile(prev => ({ ...prev, avatarUrl: '' }));
    } catch {
      setAvatarError('Não foi possível remover a foto. Tente novamente.');
    } finally {
      setUploadingAvatar(false);
    }
  };

  const cleanFirstName = (profile.firstName || '').replace(/^@/, '');
  const cleanLastName = profile.lastName || '';
  const fullName = [cleanFirstName, cleanLastName].filter(Boolean).join(' ').trim();
  const cleanUsername = (profile.username || '').replace(/^@/, '');
  const initials = initialsOf(cleanFirstName, cleanLastName);
  const isStudentProfile = profile.participantType === 'Aluno da UFU' || profile.participantType === 'Aluno de outra instituição';
  const academic = isStudentProfile && profile.course
    ? `${profile.course}${profile.period ? `, ${profile.period}º` : ''}`
    : profile.participantType;
  const subtitle = [cleanUsername && `@${cleanUsername}`, academic].filter(Boolean).join(' · ');

  const visited = userProfile?.visitedSponsors || {};
  const standsVisited = PASSPORT_STANDS.filter((k) => visited[k]).length;
  const socials = [
    profile.linkedin && 'LinkedIn',
    profile.instagram && 'Instagram',
    profile.github && 'GitHub'
  ].filter(Boolean);
  const socialsText = socials.length
    ? (socials.length === 3 ? 'LinkedIn, Instagram e GitHub' : `${socials.join(' e ')} no crachá`)
    : 'Nenhuma rede no crachá ainda';
  const effectiveRole = role || profile.role || 'PARTICIPANT';
  const showRoleSwitch = rolesFor(effectiveRole).length > 1;

  const modals = (
    <>
      {rawImageForCrop && (
        <AvatarCropperModal
          imageSrc={rawImageForCrop}
          onCropComplete={handleCropComplete}
          onClose={() => setRawImageForCrop(null)}
        />
      )}
      {ticketSheetOpen && (
        <TicketSheet
          confirmed={isTicketConfirmed}
          profile={profile}
          editForm={editForm}
          setEditForm={setEditForm}
          verifying={verifyingTicket}
          feedback={editFeedback}
          onVerify={handleVerifyTicketInModal}
          onOpenBadge={() => navigate('/scanner')}
          onClose={() => setTicketSheetOpen(false)}
        />
      )}
      {confirmModal && (
        <ConfirmModal
          isOpen={!!confirmModal}
          title={confirmModal.title}
          message={confirmModal.message}
          confirmLabel={confirmModal.confirmLabel}
          cancelLabel={confirmModal.cancelLabel}
          variant={confirmModal.variant}
          Icon={confirmModal.Icon}
          requireConfirmationText={confirmModal.requireConfirmationText}
          confirmationPrompt={confirmModal.confirmationPrompt}
          isLoading={isActionLoading}
          onConfirm={confirmModal.onConfirm}
          onCancel={() => !isActionLoading && setConfirmModal(null)}
        />
      )}
      {feedbackModal && (
        <FeedbackModal
          isOpen={!!feedbackModal}
          type={feedbackModal.type}
          title={feedbackModal.title}
          message={feedbackModal.message}
          actionLabel={feedbackModal.actionLabel}
          onClose={() => {
            feedbackModal.onClose?.();
            setFeedbackModal(null);
          }}
        />
      )}
      <input ref={fileInputRef} type="file" accept="image/*" onChange={handleAvatarChange} className="hidden" />
    </>
  );

  /* ------------------------------------------------------------------ Editar perfil (1.34) */
  if (isEditing) {
    const isStudent = editForm.participantType === 'Aluno da UFU' || editForm.participantType === 'Aluno de outra instituição';
    return (
      <div className="perfil-scroll h-full overflow-y-auto overflow-x-hidden bg-bg text-text">
        <form id="perfil-form" onSubmit={handleSaveProfile} noValidate className="flex min-h-full flex-col">
          <header className="grid grid-cols-[64px_1fr_64px] items-center px-2 pt-3.5">
            <button type="button" onClick={closeEdit} aria-label="Voltar" className="press flex h-11 w-11 items-center justify-center rounded-full text-text">
              <ChevronLeft size={22} aria-hidden="true" />
            </button>
            <h1 className="screen-title !mb-0 !text-[20px]">Editar perfil</h1>
            <button type="submit" disabled={savingProfile} className="h-11 justify-self-end px-2 text-[15px] font-extrabold text-link disabled:opacity-50">
              Salvar
            </button>
          </header>

          {/* Foto */}
          <div className="mt-[22px] flex flex-col items-center">
            <span className="relative h-[104px] w-[104px] rounded-full p-1" style={{ background: 'linear-gradient(135deg, #2563EB, #7C3AED)' }}>
              <Avatar url={profile.avatarUrl} initials={initials} className="text-[32px]" />
              <button
                type="button"
                onClick={handleAvatarClick}
                aria-label="Trocar foto"
                className="press absolute -right-0.5 bottom-0.5 flex h-9 w-9 items-center justify-center rounded-full border-[3px] border-bg bg-white text-[#3730A3]"
              >
                {uploadingAvatar ? <Loader2 size={16} className="animate-spin" aria-hidden="true" /> : <Camera size={17} strokeWidth={2.2} aria-hidden="true" />}
              </button>
            </span>
            <div className="mt-3 flex gap-2">
              <button
                type="button"
                onClick={handleAvatarClick}
                disabled={uploadingAvatar}
                className="press min-h-11 rounded-full border-[1.5px] border-[#8F7BFF] bg-[rgba(124,58,237,0.16)] px-4 text-[13px] font-extrabold text-text disabled:opacity-50"
              >
                Trocar foto
              </button>
              {profile.avatarUrl && (
                <button type="button" onClick={handleRemoveAvatar} disabled={uploadingAvatar} className="min-h-11 px-3 text-[13px] font-bold text-text-2 disabled:opacity-50">
                  Remover
                </button>
              )}
            </div>
            <span className="mt-1 text-[12px] text-text-3" role={avatarError ? 'alert' : undefined}>
              {avatarError ? <span className="text-err">{avatarError}</span> : uploadingAvatar ? 'Enviando foto...' : 'Imagem de até 2 MB'}
            </span>
          </div>

          {/* Sobre você */}
          <h2 className="mx-5 mt-7 text-[16px] font-extrabold">Sobre você</h2>
          <div className="mx-5 mt-3 flex flex-col gap-3.5">
            <div className="grid grid-cols-2 gap-3">
              <Field id="pf-nome" label="Nome">
                <input id="pf-nome" className="field pf-field" value={editForm.firstName} required autoComplete="given-name"
                  onChange={(e) => setEditForm({ ...editForm, firstName: e.target.value })} />
              </Field>
              <Field id="pf-sobrenome" label="Sobrenome">
                <input id="pf-sobrenome" className="field pf-field" value={editForm.lastName} autoComplete="family-name"
                  onChange={(e) => setEditForm({ ...editForm, lastName: e.target.value })} />
              </Field>
            </div>

            <Field id="pf-user" label="Usuário">
              <div className={`pf-group ${usernameStatus === 'ok' ? 'is-valid' : ''}`} aria-invalid={usernameStatus === 'taken' || undefined}>
                <span className="text-[15px] text-text-4" aria-hidden="true">@</span>
                <input
                  id="pf-user"
                  className="pf-group-input font-bold"
                  value={editForm.username}
                  required
                  autoComplete="username"
                  aria-describedby="pf-user-status"
                  aria-invalid={usernameStatus === 'taken' || undefined}
                  onChange={(e) => setEditForm({ ...editForm, username: e.target.value.replace(/^@/, '').replace(/\s+/g, '') })}
                />
                <span id="pf-user-status" aria-live="polite" className="flex shrink-0 items-center gap-1 text-[12px] font-extrabold">
                  {usernameStatus === 'ok' && <span className="flex items-center gap-1 text-ok"><Check size={14} strokeWidth={2.8} aria-hidden="true" />disponível</span>}
                  {usernameStatus === 'taken' && <span className="text-err">já está em uso</span>}
                  {usernameStatus === 'checking' && <Loader2 size={14} className="animate-spin text-text-3" aria-label="Verificando" />}
                </span>
              </div>
            </Field>

            {isStudent && (
              <div className="grid grid-cols-[1.6fr_1fr] gap-3">
                <Field id="pf-curso" label="Curso">
                  <select id="pf-curso" className="field pf-field" value={editForm.course}
                    onChange={(e) => setEditForm({ ...editForm, course: e.target.value })}>
                    {UFU_COURSES.map((c) => <option key={c} value={c}>{c === 'Outro (especificar)' ? 'Outro' : c}</option>)}
                  </select>
                </Field>
                <Field id="pf-periodo" label="Período">
                  <select id="pf-periodo" className="field pf-field" value={editForm.period}
                    onChange={(e) => setEditForm({ ...editForm, period: e.target.value })}>
                    <option value="">—</option>
                    {PERIODS.map((p) => <option key={p} value={p}>{p}º</option>)}
                  </select>
                </Field>
              </div>
            )}
            {isStudent && editForm.course === 'Outro (especificar)' && (
              <Field id="pf-curso-outro" label="Nome do curso">
                <input id="pf-curso-outro" className="field pf-field" value={editForm.customCourse} required
                  onChange={(e) => setEditForm({ ...editForm, customCourse: e.target.value })} />
              </Field>
            )}

            <Field id="pf-vem" label="Você vem como">
              <select id="pf-vem" className="field pf-field" value={editForm.participantType}
                onChange={(e) => setEditForm({ ...editForm, participantType: e.target.value })}>
                {[...new Set([...PARTICIPANT_TYPES, editForm.participantType].filter(Boolean))].map((t) => <option key={t} value={t}>{t}</option>)}
              </select>
            </Field>

            <Field id="pf-phone" label="Telefone ou WhatsApp (opcional)">
              <input id="pf-phone" type="tel" inputMode="tel" autoComplete="tel" className="field pf-field" value={editForm.phone}
                placeholder="(34) 99999-9999" onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })} />
            </Field>
          </div>

          {/* Redes no crachá */}
          <h2 id="perfil-redes" className="mx-5 mt-7 scroll-mt-4 text-[16px] font-extrabold">Redes no crachá</h2>
          <p className="mx-5 mt-1 text-[13px] text-text-3">Aparecem para quem escanear o seu QR.</p>
          <div className="mx-5 mt-3 flex flex-col gap-3.5">
            <SocialField id="pf-li" label="LinkedIn" prefix="linkedin.com/in/" logo={<LinkedInLogo />}
              value={editForm.linkedin} onChange={(v) => setEditForm({ ...editForm, linkedin: v })} placeholder="seu-perfil" />
            <SocialField id="pf-ig" label="Instagram" prefix="@" logo={<InstagramLogo />}
              value={editForm.instagram} onChange={(v) => setEditForm({ ...editForm, instagram: v })} placeholder="seu.usuario" />
            <SocialField id="pf-gh" label="GitHub" prefix="github.com/" logo={<GitHubLogo />}
              value={editForm.github} onChange={(v) => setEditForm({ ...editForm, github: v })} placeholder="seu-usuario" />
          </div>

          {/* Privacidade */}
          <h2 id="perfil-privacidade" className="mx-5 mt-7 scroll-mt-4 text-[16px] font-extrabold">Privacidade</h2>
          <div className="mx-5 mt-3 rounded-2xl bg-surface px-3.5">
            {isTicketConfirmed ? (
              <div className="flex min-h-16 items-center gap-3 border-b border-line">
                <span className="min-w-0 flex-1">
                  <span className="block text-[14px] font-bold">E-mail</span>
                  <span className="mt-px block break-all text-[13px] text-text-3">{profile.email} · usado para entrar</span>
                </span>
                <Lock size={18} className="shrink-0 text-text-4" aria-label="Não editável: vinculado ao ingresso" />
              </div>
            ) : (
              <div className="border-b border-line py-3.5">
                <Field id="pf-email" label="E-mail">
                  <input id="pf-email" type="email" autoComplete="email" className="field pf-field" value={editForm.email}
                    onChange={(e) => setEditForm({ ...editForm, email: e.target.value })} />
                </Field>
                <p className="mt-1.5 text-[12.5px] text-text-3">Usado para entrar e para achar seu ingresso no Sympla.</p>
                {needsPassword && (
                  <div className="mt-3">
                    <Field id="pf-reauth" label="Senha atual (para confirmar a troca de e-mail)">
                      <input id="pf-reauth" type="password" autoComplete="current-password" className="field pf-field" value={reauthPassword}
                        onChange={(e) => setReauthPassword(e.target.value)} />
                    </Field>
                  </div>
                )}
              </div>
            )}
            <button type="button" onClick={handleDeleteAccount} className="flex min-h-14 w-full items-center gap-3 text-left text-err">
              <Trash2 size={18} aria-hidden="true" />
              <span className="flex-1 text-[14px] font-bold">Apagar minha conta</span>
            </button>
          </div>

          {editFeedback && (
            <p
              role={editFeedback.type === 'error' ? 'alert' : 'status'}
              className={`mx-5 mt-4 text-[13px] font-semibold ${editFeedback.type === 'error' ? 'text-err' : editFeedback.type === 'warning' ? 'text-warn' : 'text-ok'}`}
            >
              {editFeedback.text}
            </p>
          )}

          <div className="pf-save-bar sticky bottom-0 z-20 mt-auto px-5 pt-4">
            <button type="submit" disabled={savingProfile} className="btn btn-primary btn-block !min-h-[54px] !text-[16px]">
              {savingProfile ? <><Loader2 size={18} className="animate-spin" aria-hidden="true" />Salvando</> : 'Salvar alterações'}
            </button>
          </div>
        </form>
        {modals}
      </div>
    );
  }

  /* ------------------------------------------------------------------ Perfil (1.33) */
  const nextTitle = userLevel && !userLevel.isMaxLevel
    ? ['Novato', 'Explorador', 'Conectado', 'Avançado', 'Expert'][userLevel.level]
    : null;

  return (
    <div className="perfil-scroll relative h-full overflow-y-auto overflow-x-hidden bg-bg pb-[110px] text-text">
      <SymplaStickyBanner />

      <div className="relative">
        <ProfileArt />

        <header className="relative flex items-center justify-between pl-2 pr-2.5 pt-2.5">
          <button type="button" onClick={() => navigate(-1)} aria-label="Voltar" className="press flex h-11 w-11 items-center justify-center rounded-full text-white">
            <ChevronLeft size={22} aria-hidden="true" />
          </button>
          <button type="button" onClick={() => openEdit()} className="press flex min-h-11 items-center px-0.5">
            <span className="flex h-9 items-center rounded-full bg-[rgba(10,15,36,0.35)] px-3.5 text-[14px] font-bold text-white">Editar perfil</span>
          </button>
        </header>

        <section className="relative mt-[34px] flex flex-col items-center px-5 text-center">
          <span className="h-24 w-24 rounded-full bg-bg p-1">
            <Avatar url={profile.avatarUrl} initials={initials} className="text-[30px]" />
          </span>
          <h1 className="mt-2.5 text-[22px] font-extrabold leading-tight">{fullName || 'Participante'}</h1>
          {subtitle && <p className="mt-0.5 text-[14px] text-text-2">{subtitle}</p>}
          {userLevel && (
            <span className="mt-2.5 flex items-center gap-1.5 rounded-[14px] bg-you-soft py-[5px] pl-1.5 pr-3 text-[13px] font-bold text-you-text">
              <Mascot color="purple" className="pf-still" style={{ width: 22, height: 22 }} />
              Nível {userLevel.level} · {userLevel.title}
            </span>
          )}
        </section>
      </div>

      <section aria-label="Seus números" className="mx-5 mt-5 rounded-[18px] bg-surface p-4">
        <div className="grid grid-cols-3 text-center">
          <div className="flex flex-col justify-center py-1">
            <div className="text-[22px] font-extrabold">{points}</div>
            <div className="text-[12px] text-text-2">pontos</div>
          </div>
          <button type="button" onClick={() => navigate('/ranking')} className="press border-x border-line-2 py-1">
            <div className="text-[22px] font-extrabold text-warn">{rankPosition ? `${rankPosition}º` : '—'}</div>
            <div className="text-[12px] text-text-2">ranking ›</div>
          </button>
          <button type="button" onClick={() => navigate('/challenges?tab=passport')} className="press py-1">
            <div className="text-[22px] font-extrabold">{standsVisited}/{PASSPORT_STANDS.length}</div>
            <div className="text-[12px] text-text-2">estandes ›</div>
          </button>
        </div>
        {userLevel && (
          <>
            <div className="mt-3.5 flex justify-between text-[13px] text-text-2">
              <span>{nextTitle ? `Rumo ao ${nextTitle}` : 'Nível máximo'}</span>
              {nextTitle && <span>{points} / {userLevel.nextLevelPoints}</span>}
            </div>
            <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-surface-raised" role="progressbar" aria-label="Progresso de nível" aria-valuenow={userLevel.progress} aria-valuemin={0} aria-valuemax={100}>
              <div className="h-full rounded-full" style={{ width: `${userLevel.progress}%`, background: 'linear-gradient(90deg, #2563EB, #7C3AED)' }} />
            </div>
          </>
        )}
      </section>

      <section aria-label="Conta" className="mx-5 mt-5 rounded-2xl bg-surface px-3.5">
        <AccountRow
          color="#FBBF24"
          icon={Ticket}
          title="Ingresso Sympla"
          desc={isTicketConfirmed ? `Vinculado${profile.symplaTicket?.ticketNumber ? ` · ${profile.symplaTicket.ticketNumber}` : ''}` : 'Ainda não vinculado'}
          badge={isTicketConfirmed
            ? <span className="rounded-[9px] bg-[rgba(111,216,166,0.14)] px-[9px] py-[3px] text-[12px] font-extrabold text-ok">Ativo</span>
            : <span className="rounded-[9px] bg-[rgba(242,196,106,0.16)] px-[9px] py-[3px] text-[12px] font-extrabold text-warn">Vincular</span>}
          onClick={openTicketSheet}
        />
        <AccountRow color="#8FA0FF" icon={LinkIcon} title="Redes sociais" desc={socialsText} onClick={() => openEdit('redes')} />
        <AccountRow color="#6FD8A6" icon={ShieldCheck} title="Privacidade e dados" desc="O que os outros veem de você" onClick={() => openEdit('privacidade')} last />
      </section>

      {showRoleSwitch && (
        <section aria-labelledby="pf-papel" className="mx-5 mt-3.5">
          <h2 id="pf-papel" className="mb-2 text-[16px] font-extrabold">Trocar de conta</h2>
          <RoleSwitcher role={effectiveRole} current="PARTICIPANT" />
          <p className="mx-0.5 mt-2 text-[12px] text-text-4">Só aparecem os papéis que a sua conta tem.</p>
        </section>
      )}

      <button type="button" onClick={handleLogout} className="press mx-5 mb-4 mt-2.5 flex h-12 w-[calc(100%-40px)] items-center justify-center text-[14px] font-bold text-err">
        Sair da conta
      </button>

      {modals}
    </div>
  );
}

/* ====================================================================== peças visuais */

function Avatar({ url, initials, className = '' }) {
  return url ? (
    <img src={url} alt="" className="h-full w-full rounded-full object-cover" />
  ) : (
    <span aria-hidden="true" className={`flex h-full w-full items-center justify-center rounded-full bg-surface-raised font-extrabold text-text ${className}`}>
      {initials}
    </span>
  );
}

// Arte fixa atrás da foto (não editável, não é "capa"): gradiente da marca, quadradinhos dos mascotes,
// símbolo Tech Week em marca d'água e Alan/Ada nos cantos (DESIGN.md §6 Perfil).
function ProfileArt() {
  return (
    <div aria-hidden="true" className="perfil-art absolute inset-x-0 top-0 h-[186px] overflow-hidden" style={{ background: 'linear-gradient(160deg, #2563EB 0%, #4F46E5 50%, #7C3AED 100%)' }}>
      <svg viewBox="0 0 390 186" preserveAspectRatio="xMidYMid slice" className="absolute inset-0 h-full w-full">
        <g fill="none" stroke="#fff" strokeOpacity="0.13" strokeWidth="2">
          <rect x="18" y="58" width="34" height="34" rx="8" transform="rotate(-14 35 75)" />
          <rect x="96" y="18" width="20" height="20" rx="5" transform="rotate(12 106 28)" />
          <rect x="300" y="110" width="26" height="26" rx="6" transform="rotate(18 313 123)" />
          <rect x="250" y="30" width="16" height="16" rx="4" />
          <rect x="150" y="128" width="14" height="14" rx="4" transform="rotate(-20 157 135)" />
        </g>
        <g fill="#fff" fillOpacity="0.16">
          <rect x="70" y="120" width="8" height="8" rx="2" />
          <rect x="200" y="22" width="8" height="8" rx="2" />
          <rect x="350" y="70" width="8" height="8" rx="2" />
        </g>
      </svg>
      <img src={icone} alt="" className="absolute -right-7 -top-[18px] h-40 w-[150px] rotate-[-12deg] object-contain opacity-[0.09] [filter:brightness(0)_invert(1)]" />
      <span className="absolute inset-x-0 bottom-0 h-14 bg-gradient-to-b from-[rgba(10,15,36,0)] to-bg" />
      <Mascot color="blue" isWaving className="pf-still absolute bottom-1 left-[18px]" style={{ width: 62, height: 62 }} />
      <Mascot color="purple" className="pf-still absolute bottom-1 right-[18px] -scale-x-100" style={{ width: 58, height: 58 }} />
    </div>
  );
}

function AccountRow({ color, icon: Icon, title, desc, badge, onClick, last }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex min-h-16 w-full items-center gap-3 text-left ${last ? '' : 'border-b border-line'}`}
    >
      <span className="flex h-[38px] w-[38px] shrink-0 items-center justify-center rounded-[11px]" style={{ background: `${color}22`, color }}>
        <Icon size={19} strokeWidth={2} aria-hidden="true" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-[15px] font-bold">{title}</span>
        <span className="mt-px block truncate text-[13px] text-text-3">{desc}</span>
      </span>
      {badge}
      <ChevronRight size={18} className="shrink-0 text-text-4" aria-hidden="true" />
    </button>
  );
}

function Field({ id, label, children }) {
  return (
    <div className="flex min-w-0 flex-col">
      <label htmlFor={id} className="field-label">{label}</label>
      {children}
    </div>
  );
}

function SocialField({ id, label, prefix, logo, value, onChange, placeholder }) {
  const handle = value.trim();
  return (
    <Field id={id} label={label}>
      <div className={`pf-group pf-social ${handle ? 'is-valid' : ''}`}>
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#0D1430]" aria-hidden="true">{logo}</span>
        <span className="whitespace-nowrap text-[15px] text-text-4" aria-hidden="true">{prefix}</span>
        <input id={id} className="pf-group-input font-bold" value={value} placeholder={placeholder} autoCapitalize="none" spellCheck="false"
          onChange={(e) => onChange(e.target.value)} />
        {handle && (
          <span className="flex h-[22px] w-[22px] shrink-0 items-center justify-center rounded-full bg-ok text-[#0A2A1C]" aria-hidden="true">
            <Check size={13} strokeWidth={3.2} />
          </span>
        )}
      </div>
    </Field>
  );
}

// Folha "Ingresso Sympla": vincular (sem ingresso) ou ver o vínculo (com ingresso). Lógica é a do Profile.
function TicketSheet({ confirmed, profile, editForm, setEditForm, verifying, feedback, onVerify, onOpenBadge, onClose }) {
  useEffect(() => {
    const onKey = (e) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  return (
    <>
      <div className="ds-scrim" onClick={onClose} />
      <div role="dialog" aria-modal="true" aria-labelledby="pf-ticket-title" className="ds-sheet text-text">
        <div className="flex items-center gap-3">
          <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-[14px] bg-surface-selected text-link" aria-hidden="true">
            <Ticket size={22} />
          </span>
          <div className="min-w-0">
            <h2 id="pf-ticket-title" className="text-[20px] font-extrabold leading-tight">{confirmed ? 'Ingresso vinculado' : 'Vincule seu ingresso'}</h2>
            <p className="text-[13px] text-text-2">{confirmed ? 'Seu crachá já está ativo.' : 'Leva menos de 1 minuto.'}</p>
          </div>
        </div>

        {confirmed ? (
          <>
            <dl className="mt-4 rounded-2xl bg-surface-raised px-3.5 text-[14px]">
              <div className="flex justify-between gap-3 border-b border-line-2 py-3"><dt className="text-text-3">Ingresso</dt><dd className="text-right font-bold">{profile.symplaTicket?.ticketName || 'Ingresso Sympla'}</dd></div>
              {profile.symplaTicket?.ticketNumber && (
                <div className="flex justify-between gap-3 border-b border-line-2 py-3"><dt className="text-text-3">Código</dt><dd className="font-bold">{profile.symplaTicket.ticketNumber}</dd></div>
              )}
              <div className="flex justify-between gap-3 py-3"><dt className="text-text-3">E-mail</dt><dd className="break-all text-right font-bold">{profile.email}</dd></div>
            </dl>
            <p className="mt-3 text-[12.5px] leading-snug text-text-3">
              E-mail e ingresso ficam travados para proteger seu crachá. Para transferir o ingresso, fale com a organização.
            </p>
            <button type="button" onClick={onOpenBadge} className="btn btn-primary btn-block mt-4">
              <QrCode size={18} aria-hidden="true" /> Ver meu crachá
            </button>
          </>
        ) : (
          <form onSubmit={(e) => { e.preventDefault(); onVerify(); }} noValidate>
            <ul className="mt-4 grid grid-cols-3 gap-2 text-center">
              {[
                { icon: CalendarCheck, label: 'Reservar vagas', color: '#8FA0FF' },
                { icon: QrCode, label: 'QR do crachá', color: '#67D4E8' },
                { icon: Trophy, label: 'Pontos e ranking', color: '#F2C46A' }
              ].map(({ icon: Icon, label, color }) => (
                <li key={label} className="flex flex-col items-center gap-2 rounded-2xl bg-surface-raised px-2 py-3.5 text-[12.5px] font-bold leading-tight">
                  <Icon size={20} style={{ color }} aria-hidden="true" />{label}
                </li>
              ))}
            </ul>
            <div className="mt-4">
              <label htmlFor="pf-t-email" className="field-label">E-mail usado na compra do ingresso</label>
              <input id="pf-t-email" type="email" autoComplete="email" className="field pf-field" value={editForm.email}
                onChange={(e) => setEditForm({ ...editForm, email: e.target.value })} />
              <p className="mt-1.5 text-[12.5px] text-text-3">A gente procura seu ingresso no Sympla com esse e-mail.</p>
            </div>
            <div className="mt-3">
              <label htmlFor="pf-t-code" className="field-label">Código do ingresso (opcional)</label>
              <input id="pf-t-code" className="field pf-field" value={editForm.ticketNumber || ''} autoCapitalize="characters"
                onChange={(e) => setEditForm({ ...editForm, ticketNumber: e.target.value })} />
            </div>
            {feedback && (
              <p role={feedback.type === 'error' ? 'alert' : 'status'}
                className={`mt-3 text-[13px] font-semibold ${feedback.type === 'error' ? 'text-err' : feedback.type === 'warning' ? 'text-warn' : 'text-ok'}`}>
                {feedback.text}
              </p>
            )}
            <button type="submit" disabled={verifying} className="btn btn-primary btn-block mt-4">
              {verifying ? <><Loader2 size={18} className="animate-spin" aria-hidden="true" />Procurando</> : <><Ticket size={18} aria-hidden="true" />Vincular ingresso</>}
            </button>
            <a href={SYMPLA_EVENT_URL} target="_blank" rel="noopener noreferrer" className="mt-3 flex min-h-11 items-center justify-between gap-2 text-[14px] font-bold text-link">
              Ainda não tem ingresso? Garantir no Sympla <ExternalLink size={16} aria-hidden="true" />
            </a>
          </form>
        )}
      </div>
    </>
  );
}

const LinkedInLogo = () => (
  <svg width="24" height="24" viewBox="0 0 24 24"><rect width="24" height="24" rx="6" fill="#0A66C2" /><circle cx="7" cy="7.4" r="1.7" fill="#fff" /><rect x="5.5" y="9.8" width="3" height="8.4" rx="0.5" fill="#fff" /><path d="M10.6 9.8h2.7v1.2c.4-.7 1.3-1.4 2.7-1.4 2.6 0 3.1 1.6 3.1 3.8v4.8h-2.8v-4.2c0-1-.1-2.2-1.4-2.2s-1.6 1-1.6 2.1v4.3h-2.7z" fill="#fff" /></svg>
);
const InstagramLogo = () => (
  <svg width="24" height="24" viewBox="0 0 24 24"><defs><linearGradient id="pf-igf" x1="0" y1="1" x2="1" y2="0"><stop offset="0" stopColor="#F58529" /><stop offset="0.5" stopColor="#DD2A7B" /><stop offset="1" stopColor="#8134AF" /></linearGradient></defs><rect width="24" height="24" rx="6" fill="url(#pf-igf)" /><rect x="5" y="5" width="14" height="14" rx="4.2" fill="none" stroke="#fff" strokeWidth="1.9" /><circle cx="12" cy="12" r="3.3" fill="none" stroke="#fff" strokeWidth="1.9" /><circle cx="16.3" cy="7.7" r="1" fill="#fff" /></svg>
);
const GitHubLogo = () => (
  <svg width="24" height="24" viewBox="0 0 24 24"><rect width="24" height="24" rx="6" fill="#EEF1FA" /><g transform="translate(4 4)"><path fill="#0A0F24" d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0016 8c0-4.42-3.58-8-8-8z" /></g></svg>
);
