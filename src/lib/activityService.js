import { 
  collection, 
  onSnapshot, 
  query, 
  where 
} from 'firebase/firestore';
import { db } from './firebase';
import { apiRequest } from './api';

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
    day: '19/10',
    date: '2026-10-19',
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
    day: '19/10',
    date: '2026-10-19',
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
    day: '20/10',
    date: '2026-10-20',
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
    id: 'minicurso_agentes_ia',
    title: 'Minicurso: Agentes Autônomos e Engenharia de Contexto',
    description: 'Aprenda a orquestrar agentes de IA, tooling, loops de feedback e automações completas de software.',
    speaker: 'Dra. Aline Souza & Time IA',
    type: 'minicurso',
    day: '21/10',
    date: '2026-10-21',
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
            day: data.day || data.dia || (data.date ? formatDateToDay(data.date) : '19/10'),
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
        console.warn('Aviso: Falha ao escutar /activities em tempo real, usando fallback:', err);
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

/**
 * Escuta as reservas do participante em tempo real (/bookings).
 */
export function subscribeToUserBookings(userId, onUpdate, onError) {
  if (!userId) {
    onUpdate([]);
    return () => {};
  }

  try {
    const q = query(collection(db, 'bookings'), where('userId', '==', userId));
    return onSnapshot(
      q,
      (snapshot) => {
        const bookings = snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));
        onUpdate(bookings);
      },
      (err) => {
        console.warn('Aviso: Falha ao escutar /bookings do usuário:', err);
        if (onError) onError(err);
        onUpdate([]);
      }
    );
  } catch (err) {
    console.warn('Erro ao configurar listener de /bookings:', err);
    if (onError) onError(err);
    onUpdate([]);
    return () => {};
  }
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
        console.warn('Aviso: Falha ao escutar /checkins do usuário:', err);
        if (onError) onError(err);
        onUpdate([]);
      }
    );
  } catch (err) {
    console.warn('Erro ao configurar listener de /checkins:', err);
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
        console.warn('Aviso: Falha ao escutar /pointEvents do usuário:', err);
        if (onError) onError(err);
        onUpdate([]);
      }
    );
  } catch (err) {
    console.warn('Erro ao configurar listener de /pointEvents:', err);
    if (onError) onError(err);
    onUpdate([]);
    return () => {};
  }
}

/**
 * Reserva síncrona de vaga numa atividade via backend (POST /api/activities/:id/reserve).
 */
export async function reserveActivity(activityId) {
  if (!activityId) {
    throw new Error('activityId é obrigatório para realizar reserva.');
  }

  return await apiRequest(`/activities/${activityId}/reserve`, {
    method: 'POST'
  });
}

/**
 * Conclusão de presença com double check via QR do telão (POST /api/checkin/checkout).
 */
export async function checkoutDoubleCheck(token) {
  if (!token) {
    throw new Error('Token do QR Code é obrigatório para checkout.');
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
export function calculateActivityStatus(activityId, bookings = [], checkins = [], pointEvents = []) {
  if (!activityId) return 'NONE';

  // 1. Verifica se já teve presença concluída
  const checkin = checkins.find((c) => c.activityId === activityId || c.id === activityId || c.id?.endsWith(`_${activityId}`));
  if (checkin?.status === 'COMPLETED') {
    return 'COMPLETED';
  }

  const pointEvent = pointEvents.find(
    (p) => p.referenceId === activityId || (p.eventType === 'lecture_attendance' && p.referenceId === activityId) || p.id?.includes(activityId)
  );
  if (pointEvent) {
    return 'COMPLETED';
  }

  // 2. Verifica se a entrada foi registrada pelo Staff (Double Check)
  if (checkin?.status === 'CHECKED_IN') {
    return 'CHECKED_IN';
  }

  // 3. Verifica se tem reserva confirmada ou lista de espera
  const booking = bookings.find((b) => b.activityId === activityId || b.id === activityId || b.id?.endsWith(`_${activityId}`));
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
    default:
      return { label: type ? type.toUpperCase() : 'Evento', color: '#60a5fa', bg: 'rgba(96, 165, 250, 0.15)', border: 'rgba(96, 165, 250, 0.35)' };
  }
}

/**
 * Auxiliar para formatar strings de data ISO em 'DD/MM'.
 */
function formatDateToDay(dateStr) {
  if (!dateStr) return '19/10';
  if (dateStr.includes('/')) return dateStr;
  try {
    const parts = dateStr.split('-');
    if (parts.length === 3) {
      return `${parts[2]}/${parts[1]}`;
    }
  } catch (_e) {}
  return dateStr;
}
