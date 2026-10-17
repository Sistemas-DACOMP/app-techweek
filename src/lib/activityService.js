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
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { db, auth, storage } from './firebase';
import { apiRequest } from './api';
import { getCachedUserProfile } from './userService';
import { saveLocalPointEvent } from './gameplay';

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
    isOpenEvent: false,
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
    isOpenEvent: false,
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
    isOpenEvent: true,
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
    isOpenEvent: true,
    vagas_disponiveis: 150,
    vagas_totais: 150,
    total_inscritos: 75,
    total_espera: 0,
    points: 30,
    attendanceMode: 'SELF_SCAN'
  }
];

const LOCAL_ACTIVITIES_KEY = 'techweek_custom_activities';
const DELETED_ACTIVITIES_KEY = 'techweek_deleted_activities';

export function getDeletedActivityIds() {
  if (typeof window === 'undefined') return new Set();
  try {
    const raw = localStorage.getItem(DELETED_ACTIVITIES_KEY);
    return new Set(raw ? JSON.parse(raw) : []);
  } catch (_e) {
    return new Set();
  }
}

export function markActivityDeleted(id) {
  if (typeof window === 'undefined' || !id) return;
  try {
    const deleted = getDeletedActivityIds();
    deleted.add(id);
    localStorage.setItem(DELETED_ACTIVITIES_KEY, JSON.stringify(Array.from(deleted)));
  } catch (_e) {}
}

export function unmarkActivityDeleted(id) {
  if (typeof window === 'undefined' || !id) return;
  try {
    const deleted = getDeletedActivityIds();
    deleted.delete(id);
    localStorage.setItem(DELETED_ACTIVITIES_KEY, JSON.stringify(Array.from(deleted)));
  } catch (_e) {}
}

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
    unmarkActivityDeleted(activity.id);
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
  let lastBookingsCounts = {};

  const mergeAndNotify = (firestoreList) => {
    const deletedIds = getDeletedActivityIds();
    const availableDefaults = DEFAULT_ACTIVITIES.filter(da => !deletedIds.has(da.id));
    const filteredFirestore = (firestoreList || []).filter(fa => !deletedIds.has(fa.id));
    const baseList = filteredFirestore.length > 0
      ? [...availableDefaults.filter(da => !filteredFirestore.some(fa => fa.id === da.id)), ...filteredFirestore]
      : availableDefaults;
    const customLocal = getLocalCustomActivities().filter(a => !deletedIds.has(a.id));
    const map = new Map();
    baseList.forEach(item => map.set(item.id, item));
    customLocal.forEach(item => {
      const live = map.get(item.id);
      const merged = { ...live, ...item };
      // Contadores de vaga são do servidor: a cópia salva no localStorage do admin
      // ficou congelada no valor de quando a atividade foi criada/editada.
      if (live) {
        ['vagas_disponiveis', 'total_inscritos', 'total_espera'].forEach((k) => { merged[k] = live[k]; });
      }
      map.set(item.id, merged);
    });
    const combined = Array.from(map.values()).map(item => {
      const actId = item.id;
      const numId = item.number ? String(item.number) : null;
      const bCount = (actId && lastBookingsCounts[actId]) || (numId && lastBookingsCounts[numId]);

      if (bCount) {
        const totalInscritos = bCount.confirmed;
        const totalEspera = bCount.waiting;
        const vagasTotais = typeof item.vagas_totais === 'number' 
          ? item.vagas_totais 
          : (typeof item.vagasTotais === 'number' ? item.vagasTotais : (typeof item.capacidade === 'number' ? item.capacidade : 0));
        const vagasDisponiveis = vagasTotais > 0 ? Math.max(0, vagasTotais - totalInscritos) : (typeof item.vagas_disponiveis === 'number' ? item.vagas_disponiveis : 0);
        return {
          ...item,
          total_inscritos: totalInscritos,
          total_espera: totalEspera,
          vagas_disponiveis: vagasDisponiveis
        };
      }
      return item;
    });
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

  let unsubBookings = () => {};
  try {
    const bookingsRef = collection(db, 'bookings');
    const unsubB = onSnapshot(
      bookingsRef,
      (snapshot) => {
        if (!snapshot) return;
        const counts = {};
        const docs = snapshot.docs || [];
        docs.forEach((docSnap) => {
          const data = (typeof docSnap.data === 'function' ? docSnap.data() : docSnap) || {};
          const actId = data.activityId;
          if (!actId) return;
          if (!counts[actId]) {
            counts[actId] = { confirmed: 0, waiting: 0 };
          }
          const isWaiting = data.status === 'WAITING_LIST' || data.status === 'WAITING' || data.status === 'FILA';
          const isConfirmed = data.status === 'CONFIRMED' || data.status === 'ACTIVE' || (!data.status && !data.position && !isWaiting);
          if (isWaiting) {
            counts[actId].waiting += 1;
          } else if (isConfirmed) {
            counts[actId].confirmed += 1;
          }
        });
        lastBookingsCounts = counts;
        mergeAndNotify(lastFirestoreList);
      },
      (_err) => {
        // Silencioso se usuário não tiver permissão global para /bookings (ex: não-admin)
      }
    );
    if (typeof unsubB === 'function') unsubBookings = unsubB;
  } catch (_e) {}

  try {
    const activitiesRef = collection(db, 'activities');
    const unsub = onSnapshot(
      activitiesRef,
      (snapshot) => {
        if (!snapshot || snapshot.empty) {
          lastFirestoreList = [];
          mergeAndNotify([]);
          return;
        }

        const list = (snapshot.docs || []).map((docSnap) => {
          const data = (typeof docSnap.data === 'function' ? docSnap.data() : docSnap) || {};
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
            isOpenEvent: Boolean(data.isOpenEvent || data.is_open_event || data.isPublic),
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
      if (typeof unsub === 'function') unsub();
      if (typeof unsubBookings === 'function') unsubBookings();
      if (typeof window !== 'undefined') {
        window.removeEventListener('techweek_activities_updated', handleLocalUpdate);
      }
    };
  } catch (err) {
    console.warn('Erro ao inicializar listener de /activities:', err);
    if (onError) onError(err);
    mergeAndNotify([]);
    return () => {
      if (typeof unsubBookings === 'function') unsubBookings();
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
export async function reserveActivity(activityId, activityMeta = null) {
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

  let isOpen = Boolean(activityMeta?.isOpenEvent);
  if (!isOpen) {
    const localActs = getLocalCustomActivities();
    const found = localActs.find(a => a.id === activityId) || DEFAULT_ACTIVITIES.find(a => a.id === activityId);
    if (found?.isOpenEvent) {
      isOpen = true;
    }
  }

  if (!hasTicket && !isOpen) {
    const err = new Error('É necessário possuir um ingresso oficial do Sympla vinculado para reservar vagas.');
    err.status = 403;
    err.code = 'SYMPLA_TICKET_REQUIRED';
    err.data = { error: 'SYMPLA_TICKET_REQUIRED', message: err.message };
    throw err;
  }

  const targetAct =
    activityMeta ||
    getLocalCustomActivities().find((a) => a.id === activityId) ||
    DEFAULT_ACTIVITIES.find((a) => a.id === activityId) ||
    null;
  const hasAvailableSeats =
    targetAct?.vagas_disponiveis === undefined || Number(targetAct.vagas_disponiveis) > 0;
  const fallbackStatus = hasAvailableSeats ? 'CONFIRMED' : 'WAITING_LIST';
  const fallbackPosition = hasAvailableSeats ? null : (Number(targetAct?.total_espera) || 0) + 1;

  const bookingId = `${currentUser.uid}_${activityId}`;
  const now = new Date().toISOString();
  const fallbackBooking = {
    id: bookingId,
    bookingId,
    userId: currentUser.uid,
    activityId,
    status: fallbackStatus,
    position: fallbackPosition,
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
      status: apiRes?.status || 'CONFIRMED',
      position: apiRes?.position ?? null,
      ...(apiRes?.confirmationDeadline ? { confirmationDeadline: apiRes.confirmationDeadline } : {})
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
            status: fallbackStatus,
            position: fallbackPosition,
            activityId,
            userId: currentUser.uid,
            bookedAt: now
          }
        });
      } catch (_userFsErr) {}
    }

    return {
      success: true,
      bookingId,
      status: fallbackStatus,
      position: fallbackPosition,
      message:
        fallbackStatus === 'CONFIRMED'
          ? 'Inscrição confirmada com sucesso!'
          : 'Você entrou na lista de espera!'
    };
  }
}

/**
 * Cancela a reserva de vaga numa atividade via backend (DELETE /api/activities/:id/reserve)
 * com fallback no Firestore e cache local apenas se o backend estiver inacessível.
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
  } catch (apiErr) {
    if (
      apiErr?.status &&
      apiErr.status !== 404 &&
      apiErr.status !== 500 &&
      apiErr.status !== 502 &&
      apiErr.status !== 503 &&
      apiErr.status !== 504
    ) {
      throw apiErr;
    }
    // 3. Fallback no Firestore apenas quando o backend está offline/indisponível
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
 * Converte qualquer formato de confirmationDeadline (Firestore Timestamp, Date, ISO string, number)
 * para milissegundos epoch.
 */
export function parseConfirmationDeadlineMs(deadline) {
  if (!deadline) return null;
  if (deadline instanceof Date) {
    const ms = deadline.getTime();
    return Number.isNaN(ms) ? null : ms;
  }
  if (typeof deadline === 'number') {
    return Number.isFinite(deadline) ? deadline : null;
  }
  if (typeof deadline === 'string') {
    const ms = Date.parse(deadline);
    return Number.isNaN(ms) ? null : ms;
  }
  if (typeof deadline === 'object') {
    if (typeof deadline.toMillis === 'function') {
      return deadline.toMillis();
    }
    if (typeof deadline.toDate === 'function') {
      const d = deadline.toDate();
      return d instanceof Date ? d.getTime() : null;
    }
    const secs = typeof deadline.seconds === 'number'
      ? deadline.seconds
      : typeof deadline._seconds === 'number'
      ? deadline._seconds
      : null;
    if (secs !== null) return secs * 1000;
  }
  return null;
}

/**
 * Calcula e formata o tempo restante até confirmationDeadline para exibição em contador regressivo.
 * Retorna string ('01h 59m 50s', '59m 50s' ou 'Prazo expirado') ou null se deadline for inválido.
 */
export function formatCountdownRemaining(deadline, nowMs = Date.now()) {
  const deadlineMs = parseConfirmationDeadlineMs(deadline);
  if (deadlineMs === null) {
    return null;
  }

  const diffMs = deadlineMs - nowMs;
  if (diffMs <= 0) {
    return 'Prazo expirado';
  }

  const totalSeconds = Math.floor(diffMs / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  const pad = (n) => String(n).padStart(2, '0');
  return hours > 0
    ? `${pad(hours)}h ${pad(minutes)}m ${pad(seconds)}s`
    : `${pad(minutes)}m ${pad(seconds)}s`;
}

/**
 * Confirma a vaga liberada na lista de espera (POST /api/activities/:id/confirm-waiting).
 */
export async function confirmWaitingActivity(activityId) {
  if (!activityId) {
    throw new Error('activityId é obrigatório para confirmar a vaga.');
  }

  const currentUser = auth?.currentUser;
  if (!currentUser) {
    throw new Error('Você precisa estar autenticado para confirmar sua vaga.');
  }

  const bookingId = `${currentUser.uid}_${activityId}`;
  const apiRes = await apiRequest(`/activities/${activityId}/confirm-waiting`, {
    method: 'POST'
  });

  const now = new Date().toISOString();
  saveLocalBooking(currentUser.uid, {
    id: bookingId,
    bookingId,
    userId: currentUser.uid,
    activityId,
    status: 'CONFIRMED',
    position: null,
    confirmationDeadline: null,
    confirmedAt: now,
    updatedAt: now
  });

  return apiRes;
}

/**
 * Recusa voluntariamente a vaga liberada na lista de espera (POST /api/activities/:id/decline-waiting),
 * liberando-a imediatamente para o próximo participante da fila.
 */
export async function declineWaitingActivity(activityId) {
  if (!activityId) {
    throw new Error('activityId é obrigatório para recusar a vaga.');
  }

  const currentUser = auth?.currentUser;
  if (!currentUser) {
    throw new Error('Você precisa estar autenticado para recusar a vaga.');
  }

  removeLocalBooking(currentUser.uid, activityId);

  const apiRes = await apiRequest(`/activities/${activityId}/decline-waiting`, {
    method: 'POST'
  });

  return apiRes;
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

const ATTENDED_ACTIVITIES_PREFIX = 'facom_attended_activities_';

function hasLocallyAttendedActivity(uid, activityId) {
  if (!uid || !activityId) return false;
  try {
    const raw = localStorage.getItem(`${ATTENDED_ACTIVITIES_PREFIX}${uid}`);
    const list = raw ? JSON.parse(raw) : [];
    return Array.isArray(list) && list.includes(activityId);
  } catch {
    return false;
  }
}

function markLocallyAttendedActivity(uid, activityId) {
  if (!uid || !activityId) return;
  try {
    const key = `${ATTENDED_ACTIVITIES_PREFIX}${uid}`;
    const raw = localStorage.getItem(key);
    const list = raw ? JSON.parse(raw) : [];
    if (Array.isArray(list) && !list.includes(activityId)) {
      list.push(activityId);
      localStorage.setItem(key, JSON.stringify(list));
    }
  } catch {
    // Ignora falha de localStorage
  }
}

/**
 * Registra a presença do participante em uma atividade escaneada via QR Code.
 * Permite escanear mais de uma vez (success: true), mas só pontua na primeira leitura.
 */
export async function registerActivityAttendance(activityId, sessionToken = null, rating = 5) {
  if (!activityId) {
    return { success: false, error: 'Identificador da atividade não informado.' };
  }

  const uid = auth?.currentUser?.uid || 'anon';
  const buildAttendanceEvent = (pointsAwarded) => ({
    id: `local_checkin_${activityId}`,
    userId: uid,
    user_id: uid,
    eventType: 'lecture_attendance',
    event_type: 'lecture_attendance',
    referenceId: String(activityId),
    reference_id: String(activityId),
    points: pointsAwarded,
    metadata: { activityId, rating },
    createdAt: new Date().toISOString()
  });

  // 1. Se houver sessionToken informado (QR dinâmico do telão), tenta o fluxo de checkout
  if (sessionToken) {
    try {
      const checkoutRes = await checkoutDoubleCheck(sessionToken);
      const points = typeof checkoutRes?.pointsCredited === 'number' ? checkoutRes.pointsCredited : 20;
      markLocallyAttendedActivity(uid, activityId);
      if (points > 0) {
        const attendanceEvent = buildAttendanceEvent(points);
        if (uid && uid !== 'anon' && typeof saveLocalPointEvent === 'function') {
          saveLocalPointEvent(uid, attendanceEvent);
        }
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent('facom_points_updated', {
            detail: { delta: points, source: 'checkin', activityId, event: attendanceEvent }
          }));
        }
      }
      return { success: true, points, alreadyCheckedIn: points === 0, mode: 'double_check' };
    } catch (err) {
      if (err.status === 409 || err.data?.error === 'CHECKIN_DUPLICATE') {
        markLocallyAttendedActivity(uid, activityId);
        return { success: true, points: 0, alreadyCheckedIn: true, message: 'Presença confirmada nesta atividade.' };
      }
      if (err.status === 403 && (err.code === 'SYMPLA_TICKET_REQUIRED' || err.data?.error === 'SYMPLA_TICKET_REQUIRED')) {
        return { success: false, symplaRequired: true, message: 'Ingresso do Sympla obrigatório para confirmar presença.' };
      }
      // Se der 400 (WRONG_ATTENDANCE_MODE) ou 401 (token expirado), tenta o endpoint padrão de checkin abaixo
    }
  }

  // 2. Tenta o endpoint direto de presença (/activities/:activityId/checkin)
  try {
    const checkinRes = await apiRequest(`/activities/${activityId}/checkin`, {
      method: 'POST',
      body: JSON.stringify({ lectureId: activityId, rating })
    });
    if (!checkinRes || typeof checkinRes !== 'object') {
      throw new Error('Invalid checkin response');
    }
    const points = typeof checkinRes?.pointsCredited === 'number'
      ? checkinRes.pointsCredited
      : typeof checkinRes?.points === 'number'
      ? checkinRes.points
      : 20;
    markLocallyAttendedActivity(uid, activityId);
    if (points > 0) {
      const attendanceEvent = buildAttendanceEvent(points);
      if (uid && uid !== 'anon' && typeof saveLocalPointEvent === 'function') {
        saveLocalPointEvent(uid, attendanceEvent);
      }
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('facom_points_updated', {
          detail: { delta: points, source: 'checkin', activityId, event: attendanceEvent }
        }));
      }
    }
    return { success: true, points, alreadyCheckedIn: points === 0, mode: 'self_scan' };
  } catch (err) {
    if (err.status === 409 || err.data?.error === 'CHECKIN_DUPLICATE') {
      markLocallyAttendedActivity(uid, activityId);
      return { success: true, points: 0, alreadyCheckedIn: true, message: 'Presença confirmada nesta atividade.' };
    }
    if (err.status === 403 && (err.code === 'SYMPLA_TICKET_REQUIRED' || err.data?.error === 'SYMPLA_TICKET_REQUIRED' || err.data?.code === 'SYMPLA_TICKET_REQUIRED')) {
      return { success: false, symplaRequired: true, message: 'Ingresso do Sympla obrigatório para confirmar presença.' };
    }
    if (err.status && err.status >= 400 && err.status < 500 && err.status !== 404 && typeof err.data !== 'string') {
      return { success: false, error: err.data?.message || err.message };
    }

    // Fallback resiliente para ambiente de testes, offline ou sem backend:
    // Só pontua na primeira leitura da atividade
    if (hasLocallyAttendedActivity(uid, activityId)) {
      return { success: true, points: 0, alreadyCheckedIn: true, fallback: true };
    }

    markLocallyAttendedActivity(uid, activityId);
    const attendanceEvent = buildAttendanceEvent(20);
    if (uid && uid !== 'anon' && typeof saveLocalPointEvent === 'function') {
      saveLocalPointEvent(uid, attendanceEvent);
    }
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('facom_points_updated', {
        detail: { delta: 20, source: 'checkin', activityId, event: attendanceEvent }
      }));
    }
    return { success: true, points: 20, alreadyCheckedIn: false, fallback: true };
  }
}

/**
 * Determina o status da atividade para o usuário:
 * 'COMPLETED' | 'CHECKED_IN' | 'BOOKED' | 'WAITING_CONFIRMATION' | 'WAITING_LIST' | 'NONE'
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

  // 3. Verifica se tem reserva confirmada, aguardando confirmação ou lista de espera
  const booking = bookings.find((b) => {
    const bActId = b.activityId || b.activity_id;
    return bActId === activityId || b.id === activityId || (typeof b.id === 'string' && b.id.endsWith(`_${activityId}`));
  });
  if (booking) {
    if (booking.status === 'CONFIRMED') {
      return 'BOOKED';
    }
    if (booking.status === 'WAITING_CONFIRMATION') {
      return 'WAITING_CONFIRMATION';
    }
    if (booking.status === 'WAITING_LIST') {
      return 'WAITING_LIST';
    }
  }

  return 'NONE';
}

/**
 * Formata labels amigáveis para tipos de atividade.
 * Cores = DESIGN.md §2.3, em sincronia com CATEGORY_STYLES.accent (components/Badge.jsx).
 */
export function formatActivityType(type = '') {
  const norm = String(type).toLowerCase().trim();
  switch (norm) {
    case 'palestra':
    case 'palestras':
      return { label: 'Palestra', color: '#8fa0ff', bg: 'rgba(143, 160, 255, 0.16)', border: 'rgba(143, 160, 255, 0.45)' };
    case 'minicurso':
    case 'minicursos':
      return { label: 'Minicurso', color: '#67d4e8', bg: 'rgba(103, 212, 232, 0.16)', border: 'rgba(103, 212, 232, 0.45)' };
    case 'workshop':
    case 'workshops':
      return { label: 'Workshop', color: '#b9a6f5', bg: 'rgba(185, 166, 245, 0.16)', border: 'rgba(185, 166, 245, 0.45)' };
    case 'ativacao':
    case 'ativacoes':
    case 'ativação':
      return { label: 'Ativação', color: '#f2c46a', bg: 'rgba(242, 196, 106, 0.16)', border: 'rgba(242, 196, 106, 0.45)' };
    case 'hackathon':
      return { label: 'Hackathon', color: '#f59ac0', bg: 'rgba(245, 154, 192, 0.16)', border: 'rgba(245, 154, 192, 0.45)' };
    default:
      return { label: type ? type.toUpperCase() : 'Evento', color: '#8fa0ff', bg: 'rgba(143, 160, 255, 0.16)', border: 'rgba(143, 160, 255, 0.45)' };
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
  // Edição pelo admin não manda os contadores: preserva o que já está no Firestore
  // em vez de zerar inscritos e devolver todas as vagas.
  let existing = {};
  if (activityData.total_inscritos === undefined) {
    try {
      const snap = await getDoc(docRef);
      if (snap.exists()) existing = snap.data() || {};
    } catch (_e) {}
  }
  const inscritos = Number(activityData.total_inscritos ?? existing.total_inscritos ?? 0);
  const existingTotal = Number(existing.vagas_totais);
  const existingDisp = Number(existing.vagas_disponiveis);
  const existingInscritos = Number(existing.total_inscritos ?? 0);
  // Vagas retidas em WAITING_CONFIRMATION (onde total_inscritos já desceu 1 mas a vaga segue bloqueada)
  const heldSeats =
    Number.isFinite(existingTotal) && Number.isFinite(existingDisp)
      ? Math.max(0, existingTotal - existingInscritos - existingDisp)
      : 0;
  const totalEspera = Number(activityData.total_espera ?? existing.total_espera ?? 0);
  const waitingSeq = Number(activityData.waiting_seq ?? existing.waiting_seq ?? totalEspera);
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
    vagas_disponiveis: Math.max(0, vagasTotais - inscritos - heldSeats),
    total_inscritos: inscritos,
    total_espera: totalEspera,
    waiting_seq: waitingSeq,
    points: Number(activityData.points || 20),
    tags: Array.isArray(activityData.tags) ? activityData.tags : (activityData.tags ? String(activityData.tags).split(',').map(t => t.trim()) : []),
    attendanceMode: activityData.attendanceMode || 'SELF_SCAN',
    isOpenEvent: Boolean(activityData.isOpenEvent),
    requiresRegistration: Boolean(activityData.requiresRegistration),
    hasCapacityLimit: activityData.hasCapacityLimit !== undefined ? Boolean(activityData.hasCapacityLimit) : true,
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
  if (!id) return { success: false, error: 'ID da atividade não informado.' };
  markActivityDeleted(id);
  removeLocalCustomActivity(id);
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('techweek_activities_updated', { detail: { deletedId: id } }));
  }
  try {
    const docRef = doc(db, 'activities', id);
    await deleteDoc(docRef);
    return { success: true };
  } catch (err) {
    console.warn('Aviso ao deletar atividade no Firestore (marcada como deletada localmente):', err);
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

const LOCAL_SPEAKERS_KEY = 'techweek_custom_speakers';
const DELETED_SPEAKERS_KEY = 'techweek_deleted_speakers';

function fileToDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

/**
 * Faz upload da foto do palestrante no Firebase Storage com fallback resiliente para Data URL.
 * @param {File|Blob} file - Arquivo de imagem
 * @param {string} speakerId - ID do palestrante (ou 'new')
 * @returns {Promise<string>} URL de download da imagem ou Data URL
 */
export async function uploadSpeakerPhoto(file, speakerId = 'new') {
  if (!file) throw new Error('Nenhum arquivo de imagem fornecido.');
  if (!file.type || !file.type.startsWith('image/')) {
    throw new Error('Formato inválido. Por favor, envie uma imagem (JPG, PNG, WebP ou GIF).');
  }
  const maxBytes = 10 * 1024 * 1024; // 10MB
  if (file.size > maxBytes) {
    throw new Error('A imagem deve ter no máximo 10MB.');
  }

  const ext = (file && typeof file.name === 'string') 
    ? (file.name.split('.').pop() || 'jpg') 
    : (file?.type ? file.type.split('/').pop() : 'jpg');
  const path = `speakers/photos/${speakerId}_${Date.now()}_${Math.random().toString(36).substring(2, 6)}.${ext}`;

  try {
    const storageRef = ref(storage, path);
    const uploadTask = (async () => {
      await uploadBytes(storageRef, file, { contentType: file.type || 'image/jpeg' });
      return await getDownloadURL(storageRef);
    })();

    const timeoutTask = new Promise((_, reject) => {
      setTimeout(() => reject(new Error('Tempo limite excedido ao salvar foto no Storage.')), 15000);
    });

    return await Promise.race([uploadTask, timeoutTask]);
  } catch (storageErr) {
    console.warn('Aviso: Falha no upload para o Storage, usando Data URL local:', storageErr);
    return await fileToDataUrl(file);
  }
}

export function getDeletedSpeakerIds() {
  if (typeof window === 'undefined') return new Set();
  try {
    const raw = localStorage.getItem(DELETED_SPEAKERS_KEY);
    const arr = raw ? JSON.parse(raw) : [];
    return new Set(Array.isArray(arr) ? arr : []);
  } catch (_e) {
    return new Set();
  }
}

export function markSpeakerDeleted(id) {
  if (typeof window === 'undefined' || !id) return;
  try {
    const deleted = getDeletedSpeakerIds();
    deleted.add(id);
    localStorage.setItem(DELETED_SPEAKERS_KEY, JSON.stringify(Array.from(deleted)));
  } catch (_e) {}
}

export function unmarkSpeakerDeleted(id) {
  if (typeof window === 'undefined' || !id) return;
  try {
    const deleted = getDeletedSpeakerIds();
    deleted.delete(id);
    localStorage.setItem(DELETED_SPEAKERS_KEY, JSON.stringify(Array.from(deleted)));
  } catch (_e) {}
}

export function getLocalCustomSpeakers() {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(LOCAL_SPEAKERS_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch (_e) {
    return [];
  }
}

export function saveLocalCustomSpeaker(speaker) {
  if (typeof window === 'undefined' || !speaker?.id) return;
  try {
    unmarkSpeakerDeleted(speaker.id);
    const current = getLocalCustomSpeakers();
    const filtered = current.filter(s => s.id !== speaker.id);
    const updated = [speaker, ...filtered];
    localStorage.setItem(LOCAL_SPEAKERS_KEY, JSON.stringify(updated));
    window.dispatchEvent(new CustomEvent('techweek_speakers_updated', { detail: updated }));
  } catch (_e) {}
}

export function removeLocalCustomSpeaker(id) {
  if (typeof window === 'undefined' || !id) return;
  try {
    markSpeakerDeleted(id);
    const current = getLocalCustomSpeakers();
    const updated = current.filter(s => s.id !== id);
    localStorage.setItem(LOCAL_SPEAKERS_KEY, JSON.stringify(updated));
    window.dispatchEvent(new CustomEvent('techweek_speakers_updated', { detail: updated }));
  } catch (_e) {}
}

/**
 * Escuta convidados/palestrantes em tempo real.
 */
export function subscribeToSpeakers(callback) {
  let lastFirestoreList = [];

  const mergeAndNotify = (firestoreList) => {
    const deletedIds = getDeletedSpeakerIds();
    const availableDefaults = DEFAULT_SPEAKERS.filter(ds => !deletedIds.has(ds.id));
    const filteredFirestore = (firestoreList || []).filter(fs => !deletedIds.has(fs.id));

    const baseList = (filteredFirestore.length > 0) ? filteredFirestore : availableDefaults;
    const customLocal = getLocalCustomSpeakers().filter(s => !deletedIds.has(s.id));
    const map = new Map();
    baseList.forEach(item => map.set(item.id, item));
    customLocal.forEach(item => {
      const live = map.get(item.id);
      const merged = { ...live, ...item };
      map.set(item.id, merged);
    });
    callback(Array.from(map.values()));
  };

  const handleLocalUpdate = () => {
    mergeAndNotify(lastFirestoreList);
  };

  if (typeof window !== 'undefined') {
    window.addEventListener('techweek_speakers_updated', handleLocalUpdate);
  }

  try {
    const q = collection(db, 'speakers');
    const unsub = onSnapshot(q, (snapshot) => {
      const list = [];
      snapshot.forEach(docSnap => {
        list.push({ id: docSnap.id, ...docSnap.data() });
      });
      lastFirestoreList = list;
      mergeAndNotify(list);
    }, (_err) => {
      mergeAndNotify([]);
    });

    return () => {
      unsub();
      if (typeof window !== 'undefined') {
        window.removeEventListener('techweek_speakers_updated', handleLocalUpdate);
      }
    };
  } catch (_e) {
    mergeAndNotify([]);
    return () => {
      if (typeof window !== 'undefined') {
        window.removeEventListener('techweek_speakers_updated', handleLocalUpdate);
      }
    };
  }
}

/**
 * Filtra palestrantes/convidados por texto de busca e classificação.
 * @param {Array} speakers - Lista de palestrantes
 * @param {string} search - Termo de busca (nome, instituição ou cargo)
 * @param {string} classification - Classificação ('ALL' ou categoria específica)
 * @returns {Array} Lista filtrada de palestrantes
 */
export function filterSpeakers(speakers, search = '', classification = 'ALL') {
  const query = (search || '').trim().toLowerCase();
  return (speakers || []).filter((spk) => {
    const matchText = !query ||
      (spk.name || '').toLowerCase().includes(query) ||
      (spk.institution || '').toLowerCase().includes(query) ||
      (spk.role || '').toLowerCase().includes(query);
    const matchClass = !classification || classification === 'ALL' || spk.classification === classification;
    return matchText && matchClass;
  });
}

/**
 * Cria ou atualiza um convidado no Firestore.
 */
export async function createSpeaker(speakerData) {
  const id = speakerData.id || `spk_${Date.now()}`;
  unmarkSpeakerDeleted(id);
  const docRef = doc(db, 'speakers', id);
  const payload = {
    id,
    name: speakerData.name || '',
    email: speakerData.email || '',
    role: speakerData.role || speakerData.institution || '',
    institution: speakerData.institution || '',
    classification: speakerData.classification || 'Convidado Externo',
    bio: speakerData.bio || '',
    photo: speakerData.photo || '',
    socialLinks: typeof speakerData.socialLinks === 'object' && speakerData.socialLinks !== null ? speakerData.socialLinks : {},
    inviteViaEmail: Boolean(speakerData.inviteViaEmail),
    inviteStatus: speakerData.inviteStatus || 'Aceito',
    createdAt: speakerData.createdAt || new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };

  try {
    await setDoc(docRef, payload, { merge: true });
  } catch (err) {
    console.warn('Aviso ao salvar palestrante no Firestore (salvo localmente):', err);
  }
  saveLocalCustomSpeaker(payload);
  return { success: true, speaker: payload };
}

/**
 * Remove um convidado do Firestore.
 */
export async function deleteSpeaker(id) {
  markSpeakerDeleted(id);
  removeLocalCustomSpeaker(id);
  try {
    const docRef = doc(db, 'speakers', id);
    await deleteDoc(docRef);
  } catch (err) {
    console.warn('Aviso ao deletar palestrante no Firestore (marcado como deletado localmente):', err);
  }
  return { success: true };
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

const LOCAL_LOCATIONS_KEY = 'techweek_custom_locations';

export function getLocalCustomLocations() {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(LOCAL_LOCATIONS_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch (_e) {
    return [];
  }
}

export function saveLocalCustomLocation(loc) {
  if (typeof window === 'undefined' || !loc?.id) return;
  try {
    const current = getLocalCustomLocations();
    const filtered = current.filter(l => l.id !== loc.id);
    const updated = [loc, ...filtered];
    localStorage.setItem(LOCAL_LOCATIONS_KEY, JSON.stringify(updated));
    window.dispatchEvent(new CustomEvent('techweek_locations_updated', { detail: updated }));
  } catch (_e) {}
}

export function removeLocalCustomLocation(id) {
  if (typeof window === 'undefined' || !id) return;
  try {
    const current = getLocalCustomLocations();
    const updated = current.filter(l => l.id !== id);
    localStorage.setItem(LOCAL_LOCATIONS_KEY, JSON.stringify(updated));
    window.dispatchEvent(new CustomEvent('techweek_locations_updated', { detail: updated }));
  } catch (_e) {}
}

export function subscribeToLocations(callback) {
  let lastFirestoreList = [];

  const mergeAndNotify = (firestoreList) => {
    const baseList = (firestoreList && firestoreList.length > 0) ? firestoreList : DEFAULT_LOCATIONS;
    const customLocal = getLocalCustomLocations();
    const map = new Map();
    baseList.forEach(item => map.set(item.id, item));
    customLocal.forEach(item => {
      const live = map.get(item.id);
      const merged = { ...live, ...item };
      // Contadores de vaga são do servidor: a cópia salva no localStorage do admin
      // ficou congelada no valor de quando a atividade foi criada/editada.
      if (live) {
        ['vagas_disponiveis', 'total_inscritos', 'total_espera'].forEach((k) => { merged[k] = live[k]; });
      }
      map.set(item.id, merged);
    });
    callback(Array.from(map.values()));
  };

  const handleLocalUpdate = () => {
    mergeAndNotify(lastFirestoreList);
  };

  if (typeof window !== 'undefined') {
    window.addEventListener('techweek_locations_updated', handleLocalUpdate);
  }

  try {
    const q = collection(db, 'locations');
    const unsub = onSnapshot(q, (snapshot) => {
      const list = [];
      snapshot.forEach(docSnap => {
        list.push({ id: docSnap.id, ...docSnap.data() });
      });
      lastFirestoreList = list;
      mergeAndNotify(list);
    }, (_err) => {
      mergeAndNotify([]);
    });

    return () => {
      unsub();
      if (typeof window !== 'undefined') {
        window.removeEventListener('techweek_locations_updated', handleLocalUpdate);
      }
    };
  } catch (_e) {
    mergeAndNotify([]);
    return () => {
      if (typeof window !== 'undefined') {
        window.removeEventListener('techweek_locations_updated', handleLocalUpdate);
      }
    };
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

  await setDoc(docRef, payload, { merge: true });
  saveLocalCustomLocation(payload);
  return { success: true, location: payload };
}

export async function deleteLocation(id) {
  const docRef = doc(db, 'locations', id);
  await deleteDoc(docRef);
  removeLocalCustomLocation(id);
  return { success: true };
}

/**
 * Converte qualquer formato de data/timestamp para milissegundos desde o epoch.
 */
export function toEpochMillis(val) {
  if (!val) return 0;
  if (typeof val.toMillis === 'function') return val.toMillis();
  if (typeof val.toDate === 'function') return val.toDate().getTime();
  if (val instanceof Date) return val.getTime();
  if (typeof val === 'number') return val;
  if (typeof val.seconds === 'number') {
    return val.seconds * 1000 + (val.nanoseconds ? Math.floor(val.nanoseconds / 1e6) : 0);
  }
  const parsed = Date.parse(val);
  return Number.isNaN(parsed) ? 0 : parsed;
}

/**
 * Formata data/timestamp para exibição legível de inscritos.
 * Exemplo: "21/10 às 14:32" ou "21/10 às 14:32:05"
 */
export function formatBookingDateTime(val, options = {}) {
  const ms = toEpochMillis(val);
  if (!ms) return 'Data não registrada';
  const d = new Date(ms);
  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const hours = String(d.getHours()).padStart(2, '0');
  const minutes = String(d.getMinutes()).padStart(2, '0');
  if (options.withSeconds) {
    const seconds = String(d.getSeconds()).padStart(2, '0');
    return `${day}/${month} às ${hours}:${minutes}:${seconds}`;
  }
  return `${day}/${month} às ${hours}:${minutes}`;
}

/**
 * Escuta em tempo real os inscritos e fila de espera de uma atividade no Firestore (/bookings).
 * Cruza com a coleção /users e os check-ins /checkins para fornecer dados completos.
 * 
 * @param {string|object} activityOrId - ID da atividade ou objeto da atividade
 * @param {function} onUpdate - Callback chamado com { confirmed, waitingList, all, stats }
 * @param {function} onError - Callback de erro
 * @param {object} options - Opções adicionais (ex: { usersList })
 * @returns {function} unsubscribe
 */
export function subscribeToActivityBookings(activityOrId, onUpdate, onError, options = {}) {
  if (!activityOrId) {
    onUpdate({ confirmed: [], waitingList: [], all: [], stats: { confirmedCount: 0, waitingCount: 0, checkedInCount: 0 } });
    return () => {};
  }

  const actObj = typeof activityOrId === 'object' && activityOrId !== null ? activityOrId : null;
  const primaryId = actObj?.id || String(activityOrId);
  const secondaryId = actObj?.number && String(actObj.number) !== primaryId ? String(actObj.number) : null;
  const targetIds = secondaryId ? [primaryId, secondaryId] : [primaryId];

  let rawBookings = [];
  let checkinsMap = new Map();
  const fetchedUsersMap = new Map();
  let isUnsubscribed = false;

  const emit = () => {
    if (isUnsubscribed) return;

    // Resolve user data from options.usersList or fetched cache
    const usersList = options.usersList || [];
    const usersProvidedMap = new Map();
    for (const u of usersList) {
      if (u) {
        if (u.uid) usersProvidedMap.set(u.uid, u);
        if (u.id) usersProvidedMap.set(u.id, u);
      }
    }

    // Suplementa com bookedActivities de usuários se a collection bookings ainda estiver vazia
    let effectiveBookings = [...rawBookings];
    if (effectiveBookings.length === 0 && usersList.length === 0) {
      if (!isUnsubscribed) {
        import('firebase/firestore').then(({ getDocs, collection }) => {
          getDocs(collection(db, 'users')).then(snap => {
            const fetchedList = snap.docs.map(d => ({id: d.id, ...d.data()}));
            for (const u of fetchedList) {
              const bEntry = u.bookedActivities?.[primaryId] || (secondaryId && u.bookedActivities?.[secondaryId]);
              if (bEntry) {
                effectiveBookings.push({
                  id: `${u.uid || u.id}_${primaryId}`,
                  userId: u.uid || u.id,
                  activityId: primaryId,
                  status: bEntry.status || 'CONFIRMED',
                  position: bEntry.position || null,
                  createdAt: bEntry.bookedAt || bEntry.createdAt || null
                });
                fetchedUsersMap.set(u.uid || u.id, u);
              }
            }
            if (effectiveBookings.length > 0) {
              rawBookings = effectiveBookings; // Update rawBookings so next emit uses it
              emit();
            }
          });
        });
      }
    }
    
    if (usersList.length > 0) {
      const existingUserIds = new Set(effectiveBookings.map(b => String(b.userId || b.uid || b.id)));
      for (const u of usersList) {
        const uid = String(u.uid || u.id);
        if (existingUserIds.has(uid)) continue;
        const bEntry = u.bookedActivities?.[primaryId] || (secondaryId && u.bookedActivities?.[secondaryId]);
        if (bEntry) {
          effectiveBookings.push({
            id: `${uid}_${primaryId}`,
            userId: uid,
            activityId: primaryId,
            status: bEntry.status || 'CONFIRMED',
            position: bEntry.position || null,
            createdAt: bEntry.bookedAt || bEntry.createdAt || null
          });
        }
      }
    }

    const enriched = effectiveBookings.map((b) => {
      const uid = b.userId || b.uid || b.id;
      const user = usersProvidedMap.get(uid) || fetchedUsersMap.get(uid) || {};

      const checkinDoc = checkinsMap.get(uid);
      const isCheckedIn = Boolean(
        checkinDoc && 
        (checkinDoc.status === 'CHECKED_IN' || checkinDoc.status === 'COMPLETED' || checkinDoc.entranceAt)
      );
      const checkinTime = checkinDoc?.entranceAt || checkinDoc?.createdAt || null;

      const fullName = user.displayName || user.fullName || [user.firstName, user.lastName].filter(Boolean).join(' ') || b.userName || b.displayName || 'Participante';
      const username = user.username ? (user.username.startsWith('@') ? user.username : `@${user.username}`) : (b.username ? (b.username.startsWith('@') ? b.username : `@${b.username}`) : '');
      const email = user.email || b.userEmail || b.email || '';
      const phone = user.phone || user.whatsapp || user.phoneNumber || b.phone || '';
      const course = user.course || user.curso || b.course || '';
      const period = user.period || user.periodo || b.period || '';
      const hasSympla = Boolean(user.hasSymplaTicket || user.symplaTicket || user.ticketNumber || user.ticketId || b.hasSymplaTicket);
      const ticketNumber = user.ticketNumber || user.ticketId || (user.symplaTicket && user.symplaTicket.ticketNumber) || b.ticketNumber || null;
      const avatarUrl = user.avatarUrl || user.photoURL || b.avatarUrl || null;
      const participantType = user.participantType || user.participant_type || b.participantType || 'Estudante';

      const createdAtMs = toEpochMillis(b.createdAt);

      return {
        id: b.id,
        bookingId: b.id,
        userId: uid,
        status: b.status || 'CONFIRMED',
        position: typeof b.position === 'number' ? b.position : null,
        createdAt: b.createdAt,
        createdAtMs,
        createdAtFormatted: formatBookingDateTime(b.createdAt),
        checkedIn: isCheckedIn,
        checkedInAt: checkinTime,
        checkedInAtFormatted: checkinTime ? formatBookingDateTime(checkinTime) : null,
        fullName,
        displayName: fullName,
        username,
        email,
        phone,
        course,
        period,
        hasSymplaTicket: hasSympla,
        ticketNumber,
        avatarUrl,
        participantType
      };
    });

    // Filtra confirmados e lista de espera
    const confirmedList = enriched
      .filter((b) => b.status === 'CONFIRMED' || b.status === 'ACTIVE' || (!b.status && !b.position))
      .sort((a, b) => (a.createdAtMs || 0) - (b.createdAtMs || 0))
      .map((item, index) => ({
        ...item,
        rank: index + 1,
        rankLabel: `${index + 1}º`
      }));

    const waitingList = enriched
      .filter((b) => b.status === 'WAITING_LIST' || b.status === 'WAITING' || b.status === 'FILA')
      .sort((a, b) => {
        if (a.position !== null && b.position !== null) return a.position - b.position;
        if (a.position !== null) return -1;
        if (b.position !== null) return 1;
        return (a.createdAtMs || 0) - (b.createdAtMs || 0);
      })
      .map((item, index) => {
        const queuePosition = item.position !== null ? item.position : index + 1;
        return {
          ...item,
          queuePosition,
          rank: queuePosition,
          rankLabel: `${queuePosition}º da fila`
        };
      });

    const checkedInCount = confirmedList.filter((b) => b.checkedIn).length;

    onUpdate({
      confirmed: confirmedList,
      waitingList,
      all: [...confirmedList, ...waitingList],
      stats: {
        confirmedCount: confirmedList.length,
        waitingCount: waitingList.length,
        checkedInCount
      }
    });

    // Se houver usuários sem dados no cache, busca no Firestore
    for (const b of effectiveBookings) {
      const uid = b.userId || b.uid || b.id;
      if (uid && !usersProvidedMap.has(uid) && !fetchedUsersMap.has(uid)) {
        getDoc(doc(db, 'users', uid)).then((snap) => {
          if (isUnsubscribed) return;
          if (snap && snap.exists()) {
            fetchedUsersMap.set(uid, { id: snap.id, uid: snap.id, ...snap.data() });
            emit();
          }
        }).catch(() => {});
      }
    }
  };

  // 1. Escuta a coleção /bookings para a atividade
  let unsubBookings = () => {};
  try {
    const qBookings = targetIds.length > 1
      ? query(collection(db, 'bookings'), where('activityId', 'in', targetIds))
      : query(collection(db, 'bookings'), where('activityId', '==', targetIds[0]));

    unsubBookings = onSnapshot(
      qBookings,
      (snapshot) => {
        rawBookings = snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));
        emit();
      },
      (err) => {
        if (err?.code !== 'permission-denied') {
          console.warn('[subscribeToActivityBookings] Erro ao escutar bookings:', err);
        }
        if (onError) onError(err);
        emit();
      }
    );
  } catch (err) {
    if (err?.code !== 'permission-denied') {
      console.warn('[subscribeToActivityBookings] Falha na query de bookings:', err);
    }
    if (onError) onError(err);
  }

  // 2. Escuta a coleção /checkins para saber quem deu entrada presencial
  let unsubCheckins = () => {};
  try {
    const qCheckins = targetIds.length > 1
      ? query(collection(db, 'checkins'), where('activityId', 'in', targetIds))
      : query(collection(db, 'checkins'), where('activityId', '==', targetIds[0]));

    unsubCheckins = onSnapshot(
      qCheckins,
      (snapshot) => {
        checkinsMap = new Map();
        snapshot.docs.forEach((d) => {
          const data = d.data();
          const uid = data.uid || data.userId;
          if (uid) {
            checkinsMap.set(uid, { id: d.id, ...data });
          }
        });
        emit();
      },
      () => {
        // Silencioso se der erro em checkins (ex: coleção nova)
      }
    );
  } catch (_err) {}

  return () => {
    isUnsubscribed = true;
    if (typeof unsubBookings === 'function') unsubBookings();
    if (typeof unsubCheckins === 'function') unsubCheckins();
  };
}


