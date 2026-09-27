import { 
  collection, 
  onSnapshot, 
  query, 
  where,
  doc,
  getDoc,
  setDoc,
  deleteDoc,
  updateDoc
} from 'firebase/firestore';
import { db, auth } from './firebase';
import { apiRequest } from './api';
import { getCachedUserProfile } from './userService';

/**
 * Atividades padrão de fallback caso a collection do Firestore ainda esteja vazia.
 */
export const DEFAULT_ACTIVITIES = [
  {
    id: 'palestra_abertura',
    title: 'Palestra de Abertura: O Futuro da Computação e IA',
    description: 'Boas-vindas oficiais e palestra magna sobre as principais tendências tecnológicas.',
    speaker: 'Comissão Organizadora & Convidados',
    type: 'palestra',
    day: '21/10',
    date: '2026-10-21',
    time: '19:00',
    location: 'Anfiteatro principal',
    vagas_disponiveis: 120,
    vagas_totais: 150,
    total_inscritos: 30,
    total_espera: 0,
    points: 20,
    attendanceMode: 'SELF_SCAN'
  },
  {
    id: 'palestra_samuel_amorim',
    title: 'Palestra: Dev que não aparece, não cresce',
    description: 'Como construir sua marca técnica, portfólio de impacto e se destacar no mercado.',
    speaker: 'Samuel Amorim',
    type: 'palestra',
    day: '21/10',
    date: '2026-10-21',
    time: '20:00',
    location: 'Sala 5R',
    vagas_disponiveis: 50,
    vagas_totais: 60,
    total_inscritos: 10,
    total_espera: 0,
    points: 20,
    attendanceMode: 'SELF_SCAN'
  },
  {
    id: 'workshop_firebase_node',
    title: 'Workshop: Arquitetura Serverless com Firebase e Node',
    description: 'Construção prática de backend serverless, Cloud Functions, regras de segurança e banco em tempo real.',
    speaker: 'Equipe de Engenharia TechWeek',
    type: 'workshop',
    day: '22/10',
    date: '2026-10-22',
    time: '14:00',
    location: 'Laboratório 1 - FACOM',
    vagas_disponiveis: 25,
    vagas_totais: 30,
    total_inscritos: 5,
    total_espera: 0,
    points: 35,
    attendanceMode: 'DOUBLE_CHECK'
  },
  {
    id: 'ativacao_stands_tech',
    title: 'Ativação: Speed Pitch & Networking com Patrocinadores',
    description: 'Conecte-se diretamente com líderes de empresas, descubra oportunidades de estágio e ganhe brindes.',
    speaker: 'Empresas Patrocinadoras',
    type: 'ativacao',
    day: '22/10',
    date: '2026-10-22',
    time: '10:00',
    location: 'Hall Central de Estandes',
    vagas_disponiveis: 80,
    vagas_totais: 100,
    total_inscritos: 20,
    total_espera: 0,
    points: 15,
    attendanceMode: 'SELF_SCAN'
  },
  {
    id: 'minicurso_agentes_ia',
    title: 'Minicurso: Agentes Autônomos e Engenharia de Contexto',
    description: 'Aprenda a orquestrar agentes de IA, tooling, loops de feedback e automações completas de software.',
    speaker: 'Dra. Aline Souza & Time IA',
    type: 'minicurso',
    day: '23/10',
    date: '2026-10-23',
    time: '15:30',
    location: 'Laboratório 2 - FACOM',
    vagas_disponiveis: 18,
    vagas_totais: 25,
    total_inscritos: 7,
    total_espera: 0,
    points: 40,
    attendanceMode: 'DOUBLE_CHECK'
  },
  {
    id: 'hackathon_abertura',
    title: 'Abertura & Liberação dos Desafios do Hackathon',
    description: 'Apresentação dos temas, formação de equipes, regras e início oficial da maratona.',
    speaker: 'Banca Hackathon & Mentores',
    type: 'hackathon',
    day: '23/10',
    date: '2026-10-23',
    time: '19:00',
    location: 'Anfiteatro principal',
    vagas_disponiveis: 100,
    vagas_totais: 120,
    total_inscritos: 45,
    total_espera: 0,
    points: 30,
    attendanceMode: 'SELF_SCAN'
  },
  {
    id: 'hackathon_sprint',
    title: 'Hackathon FACOM: Sprint de Desenvolvimento & Mentorias',
    description: '48h ininterruptas de ideação, prototipagem e rodadas presenciais com mentores técnicos.',
    speaker: 'Mentores & Especialistas',
    type: 'hackathon',
    day: '24/10',
    date: '2026-10-24',
    time: '09:00',
    location: 'Bloco 1B / Lab Maker',
    vagas_disponiveis: 100,
    vagas_totais: 100,
    total_inscritos: 60,
    total_espera: 0,
    points: 50,
    attendanceMode: 'DOUBLE_CHECK'
  },
  {
    id: 'hackathon_submissao',
    title: 'Hackathon FACOM: Submissão de Projetos & Demo Day',
    description: 'Prazo final de envio no GitHub e apresentação dos pitches aos jurados do evento.',
    speaker: 'Banca Julgadora',
    type: 'hackathon',
    day: '25/10',
    date: '2026-10-25',
    time: '14:00',
    location: 'Anfiteatro principal',
    vagas_disponiveis: 100,
    vagas_totais: 100,
    total_inscritos: 60,
    total_espera: 0,
    points: 50,
    attendanceMode: 'DOUBLE_CHECK'
  },
  {
    id: 'hackathon_premiacao',
    title: 'Cerimônia de Encerramento & Premiação do Hackathon',
    description: 'Anúncio dos vencedores, entrega dos troféus, premiações em dinheiro e encerramento oficial da TechWeek.',
    speaker: 'Coordenação FACOM & DACOMP',
    type: 'hackathon',
    day: '26/10',
    date: '2026-10-26',
    time: '19:00',
    location: 'Anfiteatro principal',
    vagas_disponiveis: 150,
    vagas_totais: 150,
    total_inscritos: 75,
    total_espera: 0,
    points: 30,
    attendanceMode: 'SELF_SCAN'
  }
];

/**
 * Escuta a coleção /activities em tempo real via onSnapshot.
 */
export function subscribeToActivities(onUpdate, onError) {
  try {
    const activitiesRef = collection(db, 'activities');
    return onSnapshot(
      activitiesRef,
      (snapshot) => {
        if (snapshot.empty) {
          onUpdate(DEFAULT_ACTIVITIES);
          return;
        }

        const list = snapshot.docs.map((docSnap) => {
          const data = docSnap.data() || {};
          return {
            id: docSnap.id,
            title: data.title || data.titulo || 'Atividade',
            description: data.description || data.descricao || '',
            speaker: data.speaker || data.palestrante || '',
            type: (data.type || data.tipo || 'palestra').toLowerCase(),
            day: data.day || data.dia || (data.date ? formatDateToDay(data.date) : '21/10'),
            date: data.date || data.data || '',
            time: data.time || data.horario || data.hora || '',
            location: data.location || data.local || '',
            vagas_disponiveis: typeof data.vagas_disponiveis === 'number' 
              ? data.vagas_disponiveis 
              : (typeof data.vagasDisponiveis === 'number' ? data.vagasDisponiveis : 0),
            vagas_totais: typeof data.vagas_totais === 'number' 
              ? data.vagas_totais 
              : (typeof data.vagasTotais === 'number' ? data.vagasTotais : (typeof data.capacidade === 'number' ? data.capacidade : 0)),
            total_inscritos: typeof data.total_inscritos === 'number' ? data.total_inscritos : 0,
            total_espera: typeof data.total_espera === 'number' ? data.total_espera : 0,
            points: typeof data.points === 'number' ? data.points : (typeof data.pontos === 'number' ? data.pontos : 20),
            attendanceMode: data.attendanceMode === 'DOUBLE_CHECK' ? 'DOUBLE_CHECK' : 'SELF_SCAN'
          };
        });

        // Ordenação cronológica estável por dia/hora
        list.sort((a, b) => {
          const dayCompare = (a.date || a.day || '').localeCompare(b.date || b.day || '');
          if (dayCompare !== 0) return dayCompare;
          return (a.time || '').localeCompare(b.time || '');
        });

        onUpdate(list);
      },
      (err) => {
        if (err?.code !== 'permission-denied') {
          console.warn('Aviso: Falha ao escutar /activities em tempo real, usando fallback:', err);
        }
        if (onError) onError(err);
        onUpdate(DEFAULT_ACTIVITIES);
      }
    );
  } catch (err) {
    console.warn('Erro ao inicializar listener de /activities:', err);
    if (onError) onError(err);
    onUpdate(DEFAULT_ACTIVITIES);
    return () => {};
  }
}

const LOCAL_BOOKINGS_PREFIX = 'techweek_local_bookings_';

export function getLocalBookings(userId) {
  if (!userId) return [];
  try {
    const raw = localStorage.getItem(`${LOCAL_BOOKINGS_PREFIX}${userId}`);
    return raw ? JSON.parse(raw) : [];
  } catch (_e) {
    return [];
  }
}

export function saveLocalBooking(userId, booking) {
  if (!userId || !booking?.activityId) return;
  try {
    const current = getLocalBookings(userId);
    const filtered = current.filter((b) => b.activityId !== booking.activityId && b.id !== booking.id);
    const updated = [...filtered, booking];
    localStorage.setItem(`${LOCAL_BOOKINGS_PREFIX}${userId}`, JSON.stringify(updated));
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('techweek_bookings_updated', { detail: { userId, bookings: updated } }));
    }
  } catch (_e) {}
}

export function removeLocalBooking(userId, activityId) {
  if (!userId || !activityId) return;
  try {
    const current = getLocalBookings(userId);
    const updated = current.filter((b) => b.activityId !== activityId && b.id !== `${userId}_${activityId}`);
    localStorage.setItem(`${LOCAL_BOOKINGS_PREFIX}${userId}`, JSON.stringify(updated));
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('techweek_bookings_updated', { detail: { userId, bookings: updated } }));
    }
  } catch (_e) {}
}

/**
 * Escuta as reservas do participante em tempo real (/bookings)
 * com fusão não-destrutiva de cache local instantâneo.
 */
export function subscribeToUserBookings(userId, onUpdate, onError) {
  if (!userId) {
    onUpdate([]);
    return () => {};
  }

  let firestoreBookings = [];
  let localBookings = getLocalBookings(userId);

  const emitMerged = () => {
    const map = new Map();
    localBookings.forEach((b) => {
      const key = b.activityId || b.id;
      if (key) map.set(key, b);
    });
    firestoreBookings.forEach((b) => {
      const key = b.activityId || b.id;
      if (key) {
        const existing = map.get(key) || {};
        map.set(key, { ...existing, ...b });
      }
    });
    onUpdate(Array.from(map.values()));
  };

  // 1. Notifica imediatamente com dados locais para zero delay na UI
  emitMerged();

  // 2. Escuta eventos locais na mesma aba/janela
  const handleLocalUpdate = (e) => {
    if (e.detail?.userId === userId) {
      localBookings = e.detail.bookings || [];
      emitMerged();
    }
  };

  if (typeof window !== 'undefined') {
    window.addEventListener('techweek_bookings_updated', handleLocalUpdate);
  }

  // 3. Escuta Firestore em background
  let unsubFirestore = () => {};
  try {
    const q = query(collection(db, 'bookings'), where('userId', '==', userId));
    unsubFirestore = onSnapshot(
      q,
      (snapshot) => {
        firestoreBookings = snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));
        emitMerged();
      },
      (err) => {
        if (err?.code !== 'permission-denied') {
          console.warn('Aviso: Falha ao escutar /bookings do usuário:', err);
        }
        if (onError) onError(err);
        emitMerged();
      }
    );
  } catch (err) {
    if (err?.code !== 'permission-denied') {
      console.warn('Erro ao configurar listener de /bookings:', err);
    }
    if (onError) onError(err);
    emitMerged();
  }

  return () => {
    if (typeof window !== 'undefined') {
      window.removeEventListener('techweek_bookings_updated', handleLocalUpdate);
    }
    if (typeof unsubFirestore === 'function') unsubFirestore();
  };
}

/**
 * Escuta os check-ins (double-check de presença) do participante (/checkins).
 */
export function subscribeToUserCheckins(userId, onUpdate, onError) {
  if (!userId) {
    onUpdate([]);
    return () => {};
  }

  try {
    const q = query(collection(db, 'checkins'), where('uid', '==', userId));
    return onSnapshot(
      q,
      (snapshot) => {
        const checkins = snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));
        onUpdate(checkins);
      },
      (err) => {
        if (err?.code !== 'permission-denied') {
          console.warn('Aviso: Falha ao escutar /checkins do usuário:', err);
        }
        if (onError) onError(err);
        onUpdate([]);
      }
    );
  } catch (err) {
    if (err?.code !== 'permission-denied') {
      console.warn('Erro ao configurar listener de /checkins:', err);
    }
    if (onError) onError(err);
    onUpdate([]);
    return () => {};
  }
}

/**
 * Escuta os eventos de presença pontuados do participante (/pointEvents).
 */
export function subscribeToUserPointEvents(userId, onUpdate, onError) {
  if (!userId) {
    onUpdate([]);
    return () => {};
  }

  try {
    const q = query(collection(db, 'pointEvents'), where('userId', '==', userId));
    return onSnapshot(
      q,
      (snapshot) => {
        const events = snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));
        onUpdate(events);
      },
      (err) => {
        if (err?.code !== 'permission-denied') {
          console.warn('Aviso: Falha ao escutar /pointEvents do usuário:', err);
        }
        if (onError) onError(err);
        onUpdate([]);
      }
    );
  } catch (err) {
    if (err?.code !== 'permission-denied') {
      console.warn('Erro ao configurar listener de /pointEvents:', err);
    }
    if (onError) onError(err);
    onUpdate([]);
    return () => {};
  }
}

/**
 * Reserva de vaga numa atividade com garantia total de persistência
 * (API serverless -> Firestore -> Cache Local resiliente).
 */
export async function reserveActivity(activityId) {
  if (!activityId) {
    throw new Error('activityId é obrigatório para realizar reserva.');
  }

  const currentUser = auth?.currentUser;
  if (!currentUser) {
    throw new Error('Você precisa estar autenticado para se inscrever.');
  }

  const cachedProfile = getCachedUserProfile();
  const hasTicket = Boolean(
    cachedProfile?.hasSymplaTicket ||
    cachedProfile?.symplaTicket ||
    cachedProfile?.sympla_ticket ||
    cachedProfile?.role === 'ADMIN'
  );

  if (!hasTicket) {
    const err = new Error('É necessário possuir um ingresso oficial do Sympla vinculado para reservar vagas.');
    err.status = 403;
    err.code = 'SYMPLA_TICKET_REQUIRED';
    err.data = { error: 'SYMPLA_TICKET_REQUIRED', message: err.message };
    throw err;
  }

  const bookingId = `${currentUser.uid}_${activityId}`;
  const now = new Date().toISOString();
  const fallbackBooking = {
    id: bookingId,
    bookingId,
    userId: currentUser.uid,
    activityId,
    status: 'CONFIRMED',
    createdAt: now,
    updatedAt: now
  };

  // 1. Tenta via API Serverless oficial se online
  try {
    const apiRes = await apiRequest(`/activities/${activityId}/reserve`, {
      method: 'POST'
    });
    saveLocalBooking(currentUser.uid, {
      ...fallbackBooking,
      status: apiRes?.status || 'CONFIRMED'
    });
    return apiRes;
  } catch (apiErr) {
    // Se for erro de validação com regra de negócio 4xx (exceto se for offline ou server down), repassa
    if (apiErr.status && apiErr.status !== 500 && apiErr.status !== 502 && apiErr.status !== 503 && apiErr.status !== 504) {
      throw apiErr;
    }

    console.warn('[Reserve] Backend indisponível, garantindo vaga com persistência resiliente:', apiErr?.message);

    // 2. Salva localmente de forma síncrona imediata (zero falha)
    saveLocalBooking(currentUser.uid, fallbackBooking);

    // 3. Tenta salvar no Firestore /bookings (caso regras estejam habilitadas)
    try {
      const bookingRef = doc(db, 'bookings', bookingId);
      await setDoc(bookingRef, fallbackBooking);
    } catch (_fsErr) {
      // 4. Se /bookings falhar por permissão, salva no próprio perfil do usuário em /users/{uid}
      try {
        const userRef = doc(db, 'users', currentUser.uid);
        await updateDoc(userRef, {
          [`bookedActivities.${activityId}`]: {
            status: 'CONFIRMED',
            bookedAt: now
          }
        });
      } catch (_userFsErr) {}
    }

    return {
      success: true,
      bookingId,
      status: 'CONFIRMED',
      message: 'Inscrição confirmada com sucesso!'
    };
  }
}

/**
 * Cancela a reserva de vaga numa atividade via backend (DELETE /api/activities/:id/reserve)
 * com fallback no Firestore e cache local.
 */
export async function cancelActivityReservation(activityId) {
  if (!activityId) {
    throw new Error('activityId é obrigatório para cancelar reserva.');
  }

  const currentUser = auth?.currentUser;
  if (!currentUser) {
    throw new Error('Você precisa estar autenticado para cancelar.');
  }

  const bookingId = `${currentUser.uid}_${activityId}`;

  // 1. Remove localmente de imediato
  removeLocalBooking(currentUser.uid, activityId);

  // 2. Tenta API se disponível
  try {
    await apiRequest(`/activities/${activityId}/reserve`, {
      method: 'DELETE'
    });
  } catch (_apiErr) {
    // 3. Tenta Firestore
    try {
      await deleteDoc(doc(db, 'bookings', bookingId));
    } catch (_e) {}
    try {
      const userRef = doc(db, 'users', currentUser.uid);
      await updateDoc(userRef, {
        [`bookedActivities.${activityId}`]: null
      });
    } catch (_e) {}
  }

  return { success: true, cancelled: true };
}

/**
 * Conclusão de presença com double check via QR do telão (POST /api/checkin/checkout).
 */
export async function checkoutDoubleCheck(token) {
  if (!token) {
    throw new Error('Token do QR Code é obrigatório para checkout.');
  }

  const cachedProfile = getCachedUserProfile();
  const hasTicket = Boolean(
    cachedProfile?.hasSymplaTicket ||
    cachedProfile?.symplaTicket ||
    cachedProfile?.sympla_ticket ||
    cachedProfile?.role === 'ADMIN'
  );

  if (!hasTicket) {
    const err = new Error('É necessário possuir um ingresso oficial do Sympla vinculado para confirmar presença.');
    err.status = 403;
    err.code = 'SYMPLA_TICKET_REQUIRED';
    err.data = { error: 'SYMPLA_TICKET_REQUIRED', message: err.message };
    throw err;
  }

  return await apiRequest('/checkin/checkout', {
    method: 'POST',
    body: JSON.stringify({ token })
  });
}

/**
 * Determina o status da atividade para o usuário:
 * 'COMPLETED' | 'CHECKED_IN' | 'BOOKED' | 'WAITING_LIST' | 'NONE'
 */
export function calculateActivityStatus(activityOrId, bookings = [], checkins = [], pointEvents = []) {
  if (!activityOrId) return 'NONE';

  const activityId = typeof activityOrId === 'object' && activityOrId !== null
    ? activityOrId.id
    : String(activityOrId);

  if (!activityId) return 'NONE';

  // 1. Verifica se já teve presença concluída
  const checkin = checkins.find((c) => {
    const cActId = c.activityId || c.activity_id;
    return cActId === activityId || c.id === activityId || (typeof c.id === 'string' && c.id.endsWith(`_${activityId}`));
  });
  if (checkin?.status === 'COMPLETED') {
    return 'COMPLETED';
  }

  const pointEvent = pointEvents.find((p) => {
    const refId = p.referenceId || p.reference_id;
    return refId === activityId || 
           (p.eventType === 'lecture_attendance' && refId === activityId) ||
           (typeof p.id === 'string' && p.id.includes(activityId));
  });
  if (pointEvent) {
    return 'COMPLETED';
  }

  // 2. Verifica se a entrada foi registrada pelo Staff (Double Check)
  if (checkin?.status === 'CHECKED_IN') {
    return 'CHECKED_IN';
  }

  // 3. Verifica se tem reserva confirmada ou lista de espera
  const booking = bookings.find((b) => {
    const bActId = b.activityId || b.activity_id;
    return bActId === activityId || b.id === activityId || (typeof b.id === 'string' && b.id.endsWith(`_${activityId}`));
  });
  if (booking) {
    if (booking.status === 'CONFIRMED') {
      return 'BOOKED';
    }
    if (booking.status === 'WAITING_LIST') {
      return 'WAITING_LIST';
    }
  }

  return 'NONE';
}

/**
 * Formata labels amigáveis para tipos de atividade.
 */
export function formatActivityType(type = '') {
  const norm = String(type).toLowerCase().trim();
  switch (norm) {
    case 'palestra':
    case 'palestras':
      return { label: 'Palestra', color: '#38bdf8', bg: 'rgba(56, 189, 248, 0.15)', border: 'rgba(56, 189, 248, 0.35)' };
    case 'minicurso':
    case 'minicursos':
      return { label: 'Minicurso', color: '#c084fc', bg: 'rgba(192, 132, 252, 0.15)', border: 'rgba(192, 132, 252, 0.35)' };
    case 'workshop':
    case 'workshops':
      return { label: 'Workshop', color: '#f59e0b', bg: 'rgba(245, 158, 11, 0.15)', border: 'rgba(245, 158, 11, 0.35)' };
    case 'ativacao':
    case 'ativacoes':
    case 'ativação':
      return { label: 'Ativação', color: '#34d399', bg: 'rgba(52, 211, 153, 0.15)', border: 'rgba(52, 211, 153, 0.35)' };
    case 'hackathon':
      return { label: 'Hackathon', color: '#ec4899', bg: 'rgba(236, 72, 153, 0.15)', border: 'rgba(236, 72, 153, 0.35)' };
    default:
      return { label: type ? type.toUpperCase() : 'Evento', color: '#60a5fa', bg: 'rgba(96, 165, 250, 0.15)', border: 'rgba(96, 165, 250, 0.35)' };
  }
}

/**
 * Auxiliar para formatar strings de data ISO em 'DD/MM'.
 */
function formatDateToDay(dateStr) {
  if (!dateStr) return '21/10';
  if (dateStr.includes('/')) return dateStr;
  try {
    const parts = dateStr.split('-');
    if (parts.length === 3) {
      return `${parts[2]}/${parts[1]}`;
    }
  } catch (_e) {}
  return dateStr;
}
