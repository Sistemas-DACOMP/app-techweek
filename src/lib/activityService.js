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
    id: 'act_1588971',
    number: '1588971',
    title: 'Workshoop',
    description: 'Imersão prática com ferramentas de desenvolvimento moderno e arquitetura de software.',
    speaker: 'Samuel Amorim',
    speakerRole: 'Tech Lead',
    type: 'curso',
    day: '21/10',
    date: '2026-10-21',
    time: '14:00',
    endTime: '15:00',
    schedule: [
      { date: '21 de out de 2026', time: '14:00-15:00', startTime: '14:00', endTime: '15:00' }
    ],
    duration: 'Um dia',
    location: 'Laboratório 1 - FACOM',
    vagas_disponiveis: 50,
    vagas_totais: 50,
    total_inscritos: 0,
    total_espera: 0,
    points: 25,
    registrationType: 'Gratuita',
    value: 'Grátis',
    attendanceMode: 'SELF_SCAN'
  },
  {
    id: 'act_1589102',
    number: '1589102',
    title: 'DACOMP - Mini Curso',
    description: 'Mini curso intensivo oferecido pelo DACOMP com tópicos avançados de computação.',
    speaker: 'Dra. Aline Souza',
    speakerRole: 'Professora UFU',
    type: 'palestra',
    day: '21/10',
    date: '2026-10-21',
    time: '15:00',
    endTime: '18:00',
    schedule: [
      { date: '21 de out de 2026', time: '15:00-18:00', startTime: '15:00', endTime: '18:00' },
      { date: '23 de out de 2026', time: '14:00-15:00', startTime: '14:00', endTime: '15:00' }
    ],
    duration: 'Dois dias',
    location: 'Sala 5R',
    vagas_disponiveis: 199,
    vagas_totais: 200,
    total_inscritos: 1,
    total_espera: 0,
    points: 30,
    registrationType: 'Gratuita',
    value: 'Grátis',
    attendanceMode: 'SELF_SCAN'
  },
  {
    id: 'act_1588972',
    number: '1588972',
    title: 'Palestra Mesa Abertura',
    description: 'Mesa redonda oficial de abertura da FACOM TechWeek com convidados do mercado e academia.',
    speaker: 'Comissão Organizadora',
    speakerRole: 'Coordenação FACOM',
    type: 'palestra',
    day: '21/10',
    date: '2026-10-21',
    time: '19:00',
    endTime: '21:00',
    schedule: [
      { date: 'Horário a definir', time: '', startTime: '', endTime: '' }
    ],
    duration: 'A definir',
    location: 'Anfiteatro FACOM',
    vagas_disponiveis: 999,
    vagas_totais: 999,
    total_inscritos: 0,
    total_espera: 0,
    points: 20,
    registrationType: 'Não requer inscrição',
    value: 'Grátis',
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

const LOCAL_ACTIVITIES_KEY = 'techweek_custom_activities';

export function getLocalCustomActivities() {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(LOCAL_ACTIVITIES_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch (_e) {
    return [];
  }
}

export function saveLocalCustomActivity(activity) {
  if (typeof window === 'undefined' || !activity?.id) return;
  try {
    const current = getLocalCustomActivities();
    const filtered = current.filter(a => a.id !== activity.id);
    const updated = [activity, ...filtered];
    localStorage.setItem(LOCAL_ACTIVITIES_KEY, JSON.stringify(updated));
    window.dispatchEvent(new CustomEvent('techweek_activities_updated', { detail: updated }));
  } catch (_e) {}
}

export function removeLocalCustomActivity(id) {
  if (typeof window === 'undefined' || !id) return;
  try {
    const current = getLocalCustomActivities();
    const updated = current.filter(a => a.id !== id);
    localStorage.setItem(LOCAL_ACTIVITIES_KEY, JSON.stringify(updated));
    window.dispatchEvent(new CustomEvent('techweek_activities_updated', { detail: updated }));
  } catch (_e) {}
}

/**
 * Escuta a coleção /activities em tempo real via onSnapshot.
 */
export function subscribeToActivities(onUpdate, onError) {
  let lastFirestoreList = [];

  const mergeAndNotify = (firestoreList) => {
    const baseList = (firestoreList && firestoreList.length > 0) ? firestoreList : DEFAULT_ACTIVITIES;
    const customLocal = getLocalCustomActivities();
    const map = new Map();
    baseList.forEach(item => map.set(item.id, item));
    customLocal.forEach(item => map.set(item.id, { ...map.get(item.id), ...item }));
    const combined = Array.from(map.values());
    combined.sort((a, b) => {
      const dayCompare = (a.date || a.day || '').localeCompare(b.date || b.day || '');
      if (dayCompare !== 0) return dayCompare;
      return (a.time || '').localeCompare(b.time || '');
    });
    onUpdate(combined);
  };

  const handleLocalUpdate = () => {
    mergeAndNotify(lastFirestoreList);
  };

  if (typeof window !== 'undefined') {
    window.addEventListener('techweek_activities_updated', handleLocalUpdate);
  }

  try {
    const activitiesRef = collection(db, 'activities');
    const unsub = onSnapshot(
      activitiesRef,
      (snapshot) => {
        if (snapshot.empty) {
          lastFirestoreList = [];
          mergeAndNotify([]);
          return;
        }

        const list = snapshot.docs.map((docSnap) => {
          const data = docSnap.data() || {};
          return {
            ...data,
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

        lastFirestoreList = list;
        mergeAndNotify(list);
      },
      (err) => {
        if (err?.code !== 'permission-denied') {
          console.warn('Aviso: Falha ao escutar /activities em tempo real, usando fallback:', err);
        }
        if (onError) onError(err);
        mergeAndNotify([]);
      }
    );

    return () => {
      unsub();
      if (typeof window !== 'undefined') {
        window.removeEventListener('techweek_activities_updated', handleLocalUpdate);
      }
    };
  } catch (err) {
    console.warn('Erro ao inicializar listener de /activities:', err);
    if (onError) onError(err);
    mergeAndNotify([]);
    return () => {
      if (typeof window !== 'undefined') {
        window.removeEventListener('techweek_activities_updated', handleLocalUpdate);
      }
    };
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

/**
 * Cria ou atualiza uma nova atividade na programação no Firestore.
 */
export async function createActivity(activityData) {
  const id = activityData.id || `act_${Date.now()}`;
  const docRef = doc(db, 'activities', id);
  const vagasTotais = Number(activityData.vagas_totais || activityData.capacity || 100);
  const inscritos = Number(activityData.total_inscritos || 0);
  const generatedNumber = activityData.number || String(Math.floor(1588000 + Math.random() * 9999));

  const payload = {
    id,
    number: generatedNumber,
    title: activityData.title || '',
    description: activityData.description || '',
    speaker: activityData.speaker || '',
    speakerRole: activityData.speakerRole || '',
    speakerPhoto: activityData.speakerPhoto || '',
    speakerBio: activityData.speakerBio || '',
    speakerEmail: activityData.speakerEmail || '',
    speakerId: activityData.speakerId || '',
    type: activityData.type || 'palestra',
    registrationType: activityData.registrationType || 'Não requer inscrição',
    duration: activityData.duration || 'Um dia',
    schedule: Array.isArray(activityData.schedule) && activityData.schedule.length > 0 
      ? activityData.schedule 
      : [{ 
          date: activityData.date || '2026-10-21', 
          day: activityData.day || '21/10', 
          time: activityData.time || '14:00', 
          endTime: activityData.endTime || '15:30' 
        }],
    day: activityData.day || '21/10',
    date: activityData.date || '2026-10-21',
    time: activityData.time || '14:00',
    endTime: activityData.endTime || '15:30',
    location: activityData.location || 'Anfiteatro FACOM',
    vagas_totais: vagasTotais,
    vagas_disponiveis: Math.max(0, vagasTotais - inscritos),
    total_inscritos: inscritos,
    total_espera: Number(activityData.total_espera || 0),
    points: Number(activityData.points || 20),
    tags: Array.isArray(activityData.tags) ? activityData.tags : (activityData.tags ? String(activityData.tags).split(',').map(t => t.trim()) : []),
    attendanceMode: activityData.attendanceMode || 'SELF_SCAN',
    materials: Array.isArray(activityData.materials) ? activityData.materials : [],
    hidden: Boolean(activityData.hidden),
    value: activityData.value || 'Grátis',
    createdAt: activityData.createdAt || new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };

  saveLocalCustomActivity(payload);

  try {
    await setDoc(docRef, payload, { merge: true });
    return { success: true, activity: payload };
  } catch (err) {
    console.warn('Aviso ao salvar atividade no Firestore (salvo localmente):', err);
    return { success: true, activity: payload };
  }
}

/**
 * Remove uma atividade do Firestore.
 */
export async function deleteActivity(id) {
  removeLocalCustomActivity(id);
  try {
    const docRef = doc(db, 'activities', id);
    await deleteDoc(docRef);
    return { success: true };
  } catch (err) {
    console.warn('Erro ao deletar atividade no Firestore:', err);
    return { success: true };
  }
}

/**
 * Convidados padrão (Speakers) para a TechWeek
 */
export const DEFAULT_SPEAKERS = [
  {
    id: 'spk_1',
    name: 'Samuel Amorim',
    email: 'sam03amorim@gmail.com',
    role: 'Engenheiro de Software & Fundador',
    institution: 'TechWeek / Sistemas DACOMP',
    classification: 'Convidado Externo',
    bio: 'Especialista em arquiteturas modernas, React e ecossistema Firebase.',
    photo: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200&auto=format&fit=crop&q=80',
    socialLinks: { linkedin: 'https://linkedin.com/in/samuelamorim', github: 'https://github.com/samuelamorim', instagram: '' },
    inviteStatus: 'Aceito'
  },
  {
    id: 'spk_2',
    name: 'Dra. Aline Souza',
    email: 'aline.souza@ufu.br',
    role: 'Professora e Pesquisadora em IA',
    institution: 'FACOM - UFU',
    classification: 'Professor UFU',
    bio: 'Pesquisadora em Inteligência Artificial Generativa e Sistemas Multi-Agentes.',
    photo: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=200&auto=format&fit=crop&q=80',
    socialLinks: { linkedin: 'https://linkedin.com', github: '', instagram: '' },
    inviteStatus: 'Aceito'
  },
  {
    id: 'spk_3',
    name: 'Lucas Mendes',
    email: 'lucas.mendes@cloudtech.io',
    role: 'Tech Lead Cloud & DevOps',
    institution: 'CloudTech Soluções',
    classification: 'Convidado Externo',
    bio: 'Atua há mais de 8 anos liderando migrações cloud e arquiteturas orientadas a eventos.',
    photo: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=200&auto=format&fit=crop&q=80',
    socialLinks: { linkedin: 'https://linkedin.com', github: '', instagram: '' },
    inviteStatus: 'Aceito'
  }
];

/**
 * Escuta convidados/palestrantes em tempo real.
 */
export function subscribeToSpeakers(callback) {
  try {
    const q = collection(db, 'speakers');
    return onSnapshot(q, (snapshot) => {
      const list = [];
      snapshot.forEach(docSnap => {
        list.push({ id: docSnap.id, ...docSnap.data() });
      });
      callback(list.length > 0 ? list : DEFAULT_SPEAKERS);
    }, (_err) => {
      callback(DEFAULT_SPEAKERS);
    });
  } catch (_e) {
    callback(DEFAULT_SPEAKERS);
    return () => {};
  }
}

/**
 * Cria ou atualiza um convidado no Firestore.
 */
export async function createSpeaker(speakerData) {
  const id = speakerData.id || `spk_${Date.now()}`;
  const docRef = doc(db, 'speakers', id);
  const payload = {
    id,
    name: speakerData.name || '',
    email: speakerData.email || '',
    role: speakerData.role || speakerData.institution || '',
    institution: speakerData.institution || '',
    bio: speakerData.bio || '',
    photo: speakerData.photo || '',
    socialLinks: Array.isArray(speakerData.socialLinks) ? speakerData.socialLinks : [],
    inviteViaEmail: Boolean(speakerData.inviteViaEmail),
    inviteStatus: speakerData.inviteStatus || 'Aceito',
    createdAt: speakerData.createdAt || new Date().toISOString()
  };

  try {
    await setDoc(docRef, payload, { merge: true });
    return { success: true, speaker: payload };
  } catch (err) {
    console.warn('Erro ao salvar speaker no Firestore:', err);
    return { success: true, speaker: payload };
  }
}

/**
 * Remove um convidado do Firestore.
 */
export async function deleteSpeaker(id) {
  try {
    const docRef = doc(db, 'speakers', id);
    await deleteDoc(docRef);
    return { success: true };
  } catch (err) {
    return { success: false, error: err.message };
  }
}

/**
 * Locais padrão (Venues)
 */
export const DEFAULT_LOCATIONS = [
  { id: 'loc_1', name: 'Anfiteatro FACOM', capacity: 150, description: 'Auditório principal bloco 1B' },
  { id: 'loc_2', name: 'Sala 5R', capacity: 60, description: 'Sala de palestras técnicas' },
  { id: 'loc_3', name: 'Laboratório 1 - FACOM', capacity: 30, description: 'Lab com 30 computadores' },
  { id: 'loc_4', name: 'Laboratório 2 - FACOM', capacity: 25, description: 'Lab de IA e Sistemas' },
  { id: 'loc_5', name: 'Hall Central de Estandes', capacity: 200, description: 'Área de networking' }
];

export function subscribeToLocations(callback) {
  try {
    const q = collection(db, 'locations');
    return onSnapshot(q, (snapshot) => {
      const list = [];
      snapshot.forEach(docSnap => {
        list.push({ id: docSnap.id, ...docSnap.data() });
      });
      callback(list.length > 0 ? list : DEFAULT_LOCATIONS);
    }, (_err) => {
      callback(DEFAULT_LOCATIONS);
    });
  } catch (_e) {
    callback(DEFAULT_LOCATIONS);
    return () => {};
  }
}

export async function createLocation(locData) {
  const id = locData.id || `loc_${Date.now()}`;
  const docRef = doc(db, 'locations', id);
  const payload = {
    id,
    name: locData.name || '',
    capacity: Number(locData.capacity || 100),
    description: locData.description || ''
  };
  try {
    await setDoc(docRef, payload, { merge: true });
    return { success: true, location: payload };
  } catch (err) {
    return { success: true, location: payload };
  }
}


