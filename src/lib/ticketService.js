/**
 * ticketService.js
 * Central de Chamados, Apoio Operacional e Suporte SOS
 * TechWeek 2026 - FACOM / UFU
 *
 * Suporta aberturas de chamados por:
 * 1. Patrocinadores (Estande, energia, rede/Wi-Fi, limpeza, suprimentos, coordenação)
 * 2. Staff (Portaria, filas, scanner, lotação de auditório, material, emergência)
 * 3. Organização / Admin (Gestão unificada, despacho de apoio e notas em tempo real)
 */

import {
  collection,
  doc,
  setDoc,
  updateDoc,
  deleteDoc,
  onSnapshot,
} from 'firebase/firestore';
import { db, auth } from './firebase';
import { addNotification } from './notifications';

export const TICKETS_STORAGE_KEY = 'techweek_support_tickets_v1';
export const TICKETS_UPDATED_EVENT = 'techweek_tickets_updated';

// Categorias oficiais para Patrocinadores
export const SPONSOR_TICKET_CATEGORIES = [
  { id: 'infra', label: 'Infraestrutura do Estande', desc: 'Tomadas, energia 110v/220v, extensões, divisórias, mesa/cadeira' },
  { id: 'internet', label: 'Conectividade & Wi-Fi', desc: 'Sinal fraco, lentidão, rede corporativa ou credenciais' },
  { id: 'supplies', label: 'Suprimentos & Limpeza', desc: 'Reposição de água mineral, copos, recolhimento de lixo' },
  { id: 'organization', label: 'Dúvida com a Organização', desc: 'Horários, premiação, palco, desmontagem ou logística' },
  { id: 'urgent', label: 'Urgência / Segurança', desc: 'Incidente no estande ou atendimento prioritário' },
  { id: 'other', label: 'Outro Assunto', desc: 'Solicitação diversa ao time de apoio' },
];

// Presets de 1 toque para Patrocinadores
export const SPONSOR_PRESETS = [
  {
    title: 'Precisamos de extensão ou adaptador de tomada',
    category: 'infra',
    priority: 'alta',
    description: 'Solicitamos apoio com extensões e adaptadores de energia no nosso estande para ligar equipamentos.',
  },
  {
    title: 'Wi-Fi do estande instável / sem sinal',
    category: 'internet',
    priority: 'alta',
    description: 'A rede Wi-Fi está apresentando oscilação no estande, dificultando a coleta e demonstrações.',
  },
  {
    title: 'Reposição de água mineral e copos',
    category: 'supplies',
    priority: 'media',
    description: 'Pedimos reposição de água mineral e copos descartáveis para a equipe do nosso estande.',
  },
  {
    title: 'Recolhimento de lixo / limpeza do estande',
    category: 'supplies',
    priority: 'baixa',
    description: 'Lixeiras do estande cheias, solicitamos apoio da equipe de limpeza do evento.',
  },
  {
    title: 'Dúvida sobre cronograma ou premiação',
    category: 'organization',
    priority: 'baixa',
    description: 'Gostaríamos de esclarecimento com a coordenação sobre o encerramento e anúncios oficiais.',
  },
];

// Categorias oficiais para Staff
export const STAFF_TICKET_CATEGORIES = [
  { id: 'scanner', label: 'Scanner / Leitor de Crachá', desc: 'Câmera, app travando ou erro na leitura do QR Code' },
  { id: 'crowd', label: 'Fila / Capacidade da Sala', desc: 'Auditório lotado, fila extensa ou necessidade de reforço' },
  { id: 'participant', label: 'Participante / Sympla', desc: 'Ingresso não localizado ou participante com dúvida de credenciamento' },
  { id: 'supplies', label: 'Material de Portaria', desc: 'Falta de crachás virgens, canetas, fitas adesivas ou pulseiras' },
  { id: 'urgent', label: 'Segurança / Primeiros Socorros', desc: 'Participante passando mal ou incidente de segurança' },
  { id: 'other', label: 'Apoio Geral da Coordenação', desc: 'Comunicação direta com a organização' },
];

// Presets de 1 toque para Staff
export const STAFF_PRESETS = [
  {
    title: 'Sala atingiu capacidade máxima / lotação',
    category: 'crowd',
    priority: 'alta',
    description: 'Auditório sem assentos disponíveis. Solicitamos orientação da coordenação para liberação de fila.',
  },
  {
    title: 'Fila da portaria muito extensa, solicitamos reforço',
    category: 'crowd',
    priority: 'alta',
    description: 'Fluxo intenso de entrada. Necessitamos de mais 1 ou 2 staffs com leitor para acelerar o acesso.',
  },
  {
    title: 'Participante sem ingresso Sympla querendo entrar',
    category: 'participant',
    priority: 'media',
    description: 'Participante afirma estar cadastrado mas não consta na lista da atividade. Orientação necessária.',
  },
  {
    title: 'Reposição de crachás virgens e canetas',
    category: 'supplies',
    priority: 'media',
    description: 'Estamos com baixo estoque de crachás avulsos e canetas na recepção da portaria.',
  },
  {
    title: 'Solicitação de apoio médico / primeiros socorros',
    category: 'urgent',
    priority: 'urgente',
    description: 'Participante necessitando de suporte no hall de entrada. Acionamento prioritário.',
  },
];

// Fallback em memória para ambientes de teste e Node
const memoryStorage = new Map();
let firestoreTickets = [];
let isFirestoreInitialized = false;

function storageGet(key) {
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      return window.localStorage.getItem(key);
    }
  } catch {
    // ignore
  }
  return memoryStorage.get(key) || null;
}

function storageSet(key, value) {
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      window.localStorage.setItem(key, value);
    }
  } catch {
    // ignore
  }
  memoryStorage.set(key, value);
}

function triggerTicketsUpdate(tickets) {
  if (typeof window !== 'undefined' && typeof window.dispatchEvent === 'function') {
    try {
      window.dispatchEvent(new CustomEvent(TICKETS_UPDATED_EVENT, { detail: tickets }));
    } catch {
      // ignore
    }
  }
}

function saveTicketsToLocalCache(tickets) {
  storageSet(TICKETS_STORAGE_KEY, JSON.stringify(tickets));
}

// Inicializa o listener do Firestore em tempo real
function initFirestoreListener() {
  if (typeof window === 'undefined' || !db) return;
  try {
    const colRef = collection(db, 'support_tickets');
    onSnapshot(
      colRef,
      (snapshot) => {
        firestoreTickets = snapshot.docs.map((docSnap) => {
          const data = docSnap.data();
          return {
            id: docSnap.id,
            ...data,
            createdAt: data.createdAt?.toDate ? data.createdAt.toDate().toISOString() : (data.createdAt || new Date().toISOString()),
            updatedAt: data.updatedAt?.toDate ? data.updatedAt.toDate().toISOString() : (data.updatedAt || new Date().toISOString()),
            resolvedAt: data.resolvedAt?.toDate ? data.resolvedAt.toDate().toISOString() : data.resolvedAt,
            notes: Array.isArray(data.notes) ? data.notes : [],
          };
        });
        isFirestoreInitialized = true;
        saveTicketsToLocalCache(firestoreTickets);
        triggerTicketsUpdate(firestoreTickets);
      },
      (err) => {
        console.warn('[TicketService] Aviso ao escutar /support_tickets:', err);
      }
    );
  } catch (err) {
    console.warn('[TicketService] Erro ao inicializar listener:', err);
  }
}

if (typeof window !== 'undefined') {
  initFirestoreListener();
}

export function resetTicketsStorage() {
  memoryStorage.clear();
  firestoreTickets = [];
  isFirestoreInitialized = false;
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      window.localStorage.removeItem(TICKETS_STORAGE_KEY);
    }
  } catch {
    // ignore
  }
}

/**
 * Retorna todos os chamados cadastrados
 */
export function getTickets(filters = {}) {
  try {
    let tickets = [];
    if (isFirestoreInitialized && Array.isArray(firestoreTickets)) {
      tickets = [...firestoreTickets];
    } else {
      const raw = storageGet(TICKETS_STORAGE_KEY);
      tickets = raw ? JSON.parse(raw) : [];
      if (!Array.isArray(tickets)) {
        tickets = [];
      }
    }

    let filtered = [...tickets];

    if (filters.role) {
      filtered = filtered.filter((t) => t.role === filters.role);
    }
    if (filters.status) {
      filtered = filtered.filter((t) => t.status === filters.status);
    }
    if (filters.entityName) {
      const match = filters.entityName.trim().toLowerCase();
      filtered = filtered.filter((t) => (t.entityName || '').toLowerCase().includes(match));
    }
    if (filters.senderEmail) {
      filtered = filtered.filter((t) => (t.senderEmail || '').toLowerCase() === filters.senderEmail.toLowerCase());
    }
    if (filters.category) {
      filtered = filtered.filter((t) => t.category === filters.category);
    }
    if (filters.priority) {
      filtered = filtered.filter((t) => t.priority === filters.priority);
    }

    // Ordena do mais recente para o mais antigo, com chamados urgentes e abertos no topo
    filtered.sort((a, b) => {
      if (a.status === 'open' && b.status !== 'open') return -1;
      if (b.status === 'open' && a.status !== 'open') return 1;
      if (a.priority === 'urgente' && b.priority !== 'urgente') return -1;
      if (b.priority === 'urgente' && a.priority !== 'urgente') return 1;
      return new Date(b.createdAt || 0) - new Date(a.createdAt || 0);
    });

    return filtered;
  } catch (err) {
    console.error('[TicketService] Erro ao carregar chamados:', err);
    return [];
  }
}

/**
 * Salva a lista de chamados no storage e dispara evento reativo
 */
export function saveTickets(tickets) {
  try {
    saveTicketsToLocalCache(tickets);
    triggerTicketsUpdate(tickets);
  } catch (err) {
    console.error('[TicketService] Erro ao salvar chamados:', err);
  }
}

/**
 * Cria um novo chamado de suporte (Sponsor, Staff ou Admin) e persiste no Firestore
 */
export function createTicket({
  role = 'SPONSOR',
  senderName = '',
  senderEmail = '',
  senderPhone = '',
  entityName = '',
  location = '',
  category = 'other',
  priority = 'media',
  title = '',
  description = '',
}) {
  const current = getTickets();
  const nowIso = new Date().toISOString();
  const ticketId = `tkt_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  const senderUid = auth?.currentUser?.uid || '';

  const newTicket = {
    id: ticketId,
    senderUid,
    role: role.toUpperCase(),
    senderName: senderName || (role === 'SPONSOR' ? 'Patrocinador' : 'Staff'),
    senderEmail: senderEmail || (auth?.currentUser?.email || ''),
    senderPhone: senderPhone || '',
    entityName: entityName || (role === 'SPONSOR' ? 'Estande Patrocinador' : 'Equipe Staff'),
    location: location || 'Local não informado',
    category,
    priority,
    title: title.trim() || 'Chamado de suporte',
    description: description.trim() || '',
    status: 'open',
    assignedTo: null,
    createdAt: nowIso,
    updatedAt: nowIso,
    resolvedAt: null,
    notes: [],
  };

  const updated = [newTicket, ...current.filter((t) => t.id !== ticketId)];
  if (isFirestoreInitialized) {
    firestoreTickets = updated;
  }
  saveTicketsToLocalCache(updated);
  triggerTicketsUpdate(updated);

  // Persistência assíncrona no Firestore
  if (db) {
    setDoc(doc(db, 'support_tickets', ticketId), newTicket).catch((err) => {
      console.warn('[TicketService] Erro ao persistir ticket no Firestore:', err);
    });
  }

  // Notificação do sistema para visibilidade imediata
  addNotification({
    title: `Chamado Aberto: ${newTicket.title}`,
    message: `${newTicket.entityName} (${newTicket.location}) solicitou apoio. Prioridade: ${priority.toUpperCase()}.`,
    type: priority === 'urgente' ? 'warning' : 'system',
    urgent: priority === 'urgente',
    actionUrl: '/admin',
    actionLabel: 'Ver Chamado',
  });

  return newTicket;
}

/**
 * Atualiza o status de um chamado (Atender, Resolver, Cancelar)
 */
export function updateTicketStatus(ticketId, status, assignedTo = null, responseNote = null) {
  const current = getTickets();
  const nowIso = new Date().toISOString();

  let target = null;
  const updated = current.map((tkt) => {
    if (tkt.id !== ticketId) return tkt;

    const notes = Array.isArray(tkt.notes) ? [...tkt.notes] : [];
    if (responseNote && responseNote.trim()) {
      notes.push({
        id: `note_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
        author: assignedTo || 'Coordenação TechWeek',
        text: responseNote.trim(),
        createdAt: nowIso,
        isStaffOrAdmin: true,
      });
    }

    target = {
      ...tkt,
      status,
      assignedTo: assignedTo !== null ? assignedTo : tkt.assignedTo,
      resolvedAt: status === 'resolved' ? (tkt.resolvedAt || nowIso) : (status === 'open' ? null : tkt.resolvedAt),
      updatedAt: nowIso,
      notes,
    };
    return target;
  });

  if (isFirestoreInitialized) {
    firestoreTickets = updated;
  }
  saveTicketsToLocalCache(updated);
  triggerTicketsUpdate(updated);

  // Atualização no Firestore
  if (db && target) {
    updateDoc(doc(db, 'support_tickets', ticketId), {
      status: target.status,
      assignedTo: target.assignedTo,
      resolvedAt: target.resolvedAt,
      updatedAt: target.updatedAt,
      notes: target.notes,
    }).catch((err) => {
      console.warn('[TicketService] Erro ao atualizar status no Firestore:', err);
    });
  }

  return target || updated.find((t) => t.id === ticketId);
}

/**
 * Adiciona uma mensagem/nota em um chamado existente
 */
export function addTicketNote(ticketId, { author = 'Solicitante', text = '', isStaffOrAdmin = false }) {
  if (!text || !text.trim()) return null;
  const current = getTickets();
  const nowIso = new Date().toISOString();

  let target = null;
  const updated = current.map((tkt) => {
    if (tkt.id !== ticketId) return tkt;

    const newNote = {
      id: `note_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      author,
      text: text.trim(),
      createdAt: nowIso,
      isStaffOrAdmin,
    };

    const notes = Array.isArray(tkt.notes) ? [...tkt.notes, newNote] : [newNote];
    target = {
      ...tkt,
      updatedAt: nowIso,
      notes,
    };
    return target;
  });

  if (isFirestoreInitialized) {
    firestoreTickets = updated;
  }
  saveTicketsToLocalCache(updated);
  triggerTicketsUpdate(updated);

  // Atualização no Firestore
  if (db && target) {
    updateDoc(doc(db, 'support_tickets', ticketId), {
      updatedAt: target.updatedAt,
      notes: target.notes,
    }).catch((err) => {
      console.warn('[TicketService] Erro ao adicionar nota no Firestore:', err);
    });
  }

  return target;
}

/**
 * Exclui um chamado
 */
export function deleteTicket(ticketId) {
  const current = getTickets();
  const updated = current.filter((t) => t.id !== ticketId);
  if (isFirestoreInitialized) {
    firestoreTickets = updated;
  }
  saveTicketsToLocalCache(updated);
  triggerTicketsUpdate(updated);

  // Remoção no Firestore
  if (db) {
    deleteDoc(doc(db, 'support_tickets', ticketId)).catch((err) => {
      console.warn('[TicketService] Erro ao excluir chamado do Firestore:', err);
    });
  }

  return updated;
}

/**
 * Estatísticas resumidas de chamados para KPIs e badges
 */
export function getTicketStats(filters = {}) {
  const tickets = getTickets(filters);
  const open = tickets.filter((t) => t.status === 'open').length;
  const inProgress = tickets.filter((t) => t.status === 'in_progress').length;
  const resolved = tickets.filter((t) => t.status === 'resolved').length;
  const urgent = tickets.filter((t) => t.status !== 'resolved' && t.priority === 'urgente').length;

  return {
    total: tickets.length,
    open,
    inProgress,
    resolved,
    urgent,
    active: open + inProgress,
  };
}

/**
 * Escuta atualizações do Firestore em tempo real via callback
 */
export function subscribeToSupportTickets(callback) {
  if (!db) return () => {};
  const colRef = collection(db, 'support_tickets');
  return onSnapshot(
    colRef,
    (snapshot) => {
      const list = snapshot.docs.map((d) => ({
        id: d.id,
        ...d.data(),
      }));
      callback(list);
    },
    (err) => {
      console.warn('[TicketService] Erro no listener de tickets:', err);
    }
  );
}
