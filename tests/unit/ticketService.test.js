import { describe, it, expect, beforeEach } from 'vitest';
import {
  getTickets,
  createTicket,
  updateTicketStatus,
  addTicketNote,
  deleteTicket,
  getTicketStats,
  resetTicketsStorage,
  SPONSOR_PRESETS,
  STAFF_PRESETS,
} from '../../src/lib/ticketService';

describe('ticketService - Central de Chamados (Sponsor & Staff)', () => {
  beforeEach(() => {
    resetTicketsStorage();
  });

  it('retorna array vazio quando inicializado sem chamados (zero mock data)', () => {
    const tickets = getTickets();
    expect(Array.isArray(tickets)).toBe(true);
    expect(tickets.length).toBe(0);
  });

  it('permite que patrocinador abra um chamado com localização e prioridade', () => {
    const ticket = createTicket({
      role: 'SPONSOR',
      senderName: 'Samuel Amorim',
      senderEmail: 'samuel@kanastra.com.br',
      senderPhone: '(34) 99123-4567',
      entityName: 'KANASTRA',
      location: 'Estande KANASTRA (Hall Central)',
      category: 'infra',
      priority: 'alta',
      title: 'Tomada 220v sem energia',
      description: 'Precisamos ligar o monitor de demonstração.',
    });

    expect(ticket.id).toMatch(/^tkt_/);
    expect(ticket.role).toBe('SPONSOR');
    expect(ticket.entityName).toBe('KANASTRA');
    expect(ticket.status).toBe('open');
    expect(ticket.priority).toBe('alta');

    const all = getTickets();
    expect(all[0].id).toBe(ticket.id);
  });

  it('permite que staff da portaria abra um chamado de reforço', () => {
    const ticket = createTicket({
      role: 'STAFF',
      senderName: 'Beatriz Staff',
      senderEmail: 'beatriz@ufu.br',
      senderPhone: '(34) 99999-0000',
      entityName: 'Portaria Principal',
      location: 'Entrada Auditório 5R',
      category: 'crowd',
      priority: 'urgente',
      title: STAFF_PRESETS[1].title,
      description: STAFF_PRESETS[1].description,
    });

    expect(ticket.role).toBe('STAFF');
    expect(ticket.priority).toBe('urgente');
    expect(ticket.status).toBe('open');

    const staffOnly = getTickets({ role: 'STAFF' });
    expect(staffOnly.some((t) => t.id === ticket.id)).toBe(true);
  });

  it('atualiza status do chamado para em atendimento e resolvido com notas', () => {
    const ticket = createTicket({
      role: 'SPONSOR',
      entityName: 'NVIDIA',
      title: 'Cabos HDMI extras',
    });

    // Despacho / Atendimento
    const inProgress = updateTicketStatus(ticket.id, 'in_progress', 'Lucas Suporte', 'Equipe técnica a caminho.');
    expect(inProgress.status).toBe('in_progress');
    expect(inProgress.assignedTo).toBe('Lucas Suporte');
    expect(inProgress.notes.length).toBe(1);
    expect(inProgress.notes[0].text).toContain('Equipe técnica');

    // Resolução
    const resolved = updateTicketStatus(ticket.id, 'resolved', 'Lucas Suporte', 'Cabos entregues.');
    expect(resolved.status).toBe('resolved');
    expect(resolved.resolvedAt).toBeDefined();
    expect(resolved.notes.length).toBe(2);
  });

  it('adiciona mensagem de réplica/nota em um chamado', () => {
    const ticket = createTicket({
      role: 'STAFF',
      entityName: 'Portaria 2',
      title: 'Falta de canetas',
    });

    const updated = addTicketNote(ticket.id, {
      author: 'Beatriz Staff',
      text: 'Já conseguimos algumas canetas emprestadas, mas ainda precisamos do pacote.',
      isStaffOrAdmin: false,
    });

    expect(updated.notes.length).toBe(1);
    expect(updated.notes[0].author).toBe('Beatriz Staff');
  });

  it('filtra chamados por role, status e entidade', () => {
    createTicket({ role: 'SPONSOR', entityName: 'UBER', status: 'open' });
    createTicket({ role: 'STAFF', entityName: 'Portaria 3', status: 'open' });

    const sponsors = getTickets({ role: 'SPONSOR' });
    expect(sponsors.every((t) => t.role === 'SPONSOR')).toBe(true);

    const uber = getTickets({ entityName: 'UBER' });
    expect(uber.length).toBe(1);
    expect(uber[0].entityName).toBe('UBER');
  });

  it('calcula estatísticas corretas de chamados com getTicketStats', () => {
    createTicket({ role: 'SPONSOR', title: 'Stats 1', priority: 'urgente' });
    createTicket({ role: 'STAFF', title: 'Stats 2', priority: 'alta' });
    const stats = getTicketStats();
    expect(stats.total).toBeGreaterThanOrEqual(2);
    expect(typeof stats.open).toBe('number');
    expect(typeof stats.inProgress).toBe('number');
    expect(typeof stats.resolved).toBe('number');
    expect(typeof stats.active).toBe('number');
    expect(stats.urgent).toBeGreaterThanOrEqual(1);
  });

  it('exclui chamado com deleteTicket', () => {
    const ticket = createTicket({ role: 'SPONSOR', title: 'Teste exclusão' });
    deleteTicket(ticket.id);
    const all = getTickets();
    expect(all.find((t) => t.id === ticket.id)).toBeUndefined();
  });
});

