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

// Mocks iniciais realistas para povoar o sistema
const INITIAL_TICKETS = [
  {
    id: 'tkt_init_1',
    role: 'SPONSOR',
    senderName: 'Samuel Amorim',
    senderEmail: 'samuel@kanastra.com.br',
    senderPhone: '(34) 99123-4567',
    entityName: 'KANASTRA',
    location: 'Estande KANASTRA (Hall Central)',
    category: 'infra',
    priority: 'alta',
    title: 'Precisamos de extensão 220v para telão extra',
    description: 'Estamos montando um segundo display para apresentação da esteira de crédito e precisamos de uma régua/extensão.',
    status: 'in_progress',
    assignedTo: 'Guilherme (Infra UFU)',
    createdAt: new Date(Date.now() - 1000 * 60 * 35).toISOString(),
    updatedAt: new Date(Date.now() - 1000 * 60 * 18).toISOString(),
    resolvedAt: null,
    notes: [
      {
        id: 'note_1',
        author: 'Coordenação TechWeek',
        text: 'Guilherme da equipe de infraestrutura já está a caminho com a extensão 220v.',
        createdAt: new Date(Date.now() - 1000 * 60 * 18).toISOString(),
        isStaffOrAdmin: true,
      },
    ],
  },
  {
    id: 'tkt_init_2',
    role: 'STAFF',
    senderName: 'Lucas Oliveira',
    senderEmail: 'lucas.staff@ufu.br',
    senderPhone: '(34) 99876-5432',
    entityName: 'Portaria Principal',
    location: 'Portaria Anfiteatro FACOM',
    category: 'crowd',
    priority: 'alta',
    title: 'Fila de entrada longa para o Keynote de IA',
    description: 'Muitos alunos chegando simultaneamente no hall. Precisamos de mais um monitor com scanner.',
    status: 'open',
    assignedTo: null,
    createdAt: new Date(Date.now() - 1000 * 60 * 12).toISOString(),
    updatedAt: new Date(Date.now() - 1000 * 60 * 12).toISOString(),
    resolvedAt: null,
    notes: [],
  },
  {
    id: 'tkt_init_3',
    role: 'SPONSOR',
    senderName: 'Mariana Costa',
    senderEmail: 'mariana@sankhya.com.br',
    senderPhone: '(34) 98888-2233',
    entityName: 'SANKHYA',
    location: 'Estande SANKHYA',
    category: 'supplies',
    priority: 'baixa',
    title: 'Reposição de água mineral e copos',
    description: 'Galão de água do estande terminou. Solicitamos reposição para nossa equipe.',
    status: 'resolved',
    assignedTo: 'Equipe de Apoio',
    createdAt: new Date(Date.now() - 1000 * 60 * 90).toISOString(),
    updatedAt: new Date(Date.now() - 1000 * 60 * 45).toISOString(),
    resolvedAt: new Date(Date.now() - 1000 * 60 * 45).toISOString(),
    notes: [
      {
        id: 'note_2',
        author: 'Equipe de Apoio',
        text: 'Galão e copos entregues no estande pela equipe de apoio.',
        createdAt: new Date(Date.now() - 1000 * 60 * 45).toISOString(),
        isStaffOrAdmin: true,
      },
    ],
  },
];

// Fallback em memória para ambientes de teste e Node
const memoryStorage = new Map();

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

export function resetTicketsStorage() {
  memoryStorage.clear();
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      window.localStorage.removeItem(TICKETS_STORAGE_KEY);
    }
  } catch {
    // ignore
  }
}

/**
 * Retorna todos os chamados cadastrados, inicializando os defaults se vazio
 */
export function getTickets(filters = {}) {
  try {
    const raw = storageGet(TICKETS_STORAGE_KEY);
    let tickets = raw ? JSON.parse(raw) : null;
    if (!tickets || !Array.isArray(tickets)) {
      tickets = INITIAL_TICKETS;
      storageSet(TICKETS_STORAGE_KEY, JSON.stringify(tickets));
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
    return INITIAL_TICKETS;
  }
}

/**
 * Salva a lista de chamados no storage e dispara evento reativo
 */
export function saveTickets(tickets) {
  try {
    storageSet(TICKETS_STORAGE_KEY, JSON.stringify(tickets));
    triggerTicketsUpdate(tickets);
  } catch (err) {
    console.error('[TicketService] Erro ao salvar chamados:', err);
  }
}

/**
 * Cria um novo chamado de suporte (Sponsor, Staff ou Admin)
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

  const newTicket = {
    id: `tkt_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
    role: role.toUpperCase(),
    senderName: senderName || (role === 'SPONSOR' ? 'Patrocinador' : 'Staff'),
    senderEmail: senderEmail || '',
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

  const updated = [newTicket, ...current];
  saveTickets(updated);

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

    return {
      ...tkt,
      status,
      assignedTo: assignedTo !== null ? assignedTo : tkt.assignedTo,
      resolvedAt: status === 'resolved' ? (tkt.resolvedAt || nowIso) : (status === 'open' ? null : tkt.resolvedAt),
      updatedAt: nowIso,
      notes,
    };
  });

  saveTickets(updated);
  return updated.find((t) => t.id === ticketId);
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

  saveTickets(updated);
  return target;
}

/**
 * Exclui um chamado
 */
export function deleteTicket(ticketId) {
  const current = getTickets();
  const updated = current.filter((t) => t.id !== ticketId);
  saveTickets(updated);
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
