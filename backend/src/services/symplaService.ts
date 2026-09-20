/**
 * Serviço de Integração com a API Oficial do Sympla (v3)
 */

export interface SymplaParticipant {
  id: number;
  order_id: string;
  order_status?: string;
  order_date?: string;
  first_name: string;
  last_name: string;
  email: string;
  ticket_number: string;
  ticket_name: string;
  ticket_num_qr_code?: string;
  qr_code?: string;
  check_in?: Array<{ status: boolean; check_in_date?: string }>;
  custom_form?: Array<{ id: number; name: string; value: string }>;
}

export interface SymplaEvent {
  id: number;
  name: string;
  start_date: string;
  end_date: string;
  published: number;
  cancelled: number;
  image?: string;
  address?: {
    name: string;
    address: string;
    city: string;
    state: string;
  };
  url?: string;
}

const SYMPLA_BASE_URL = 'https://api.sympla.com.br/public/v3';

export class SymplaService {
  private apiToken: string;
  private defaultEventId: string;

  constructor(token?: string, eventId?: string) {
    this.apiToken = token || process.env.SYMPLA_API_TOKEN || '';
    this.defaultEventId = eventId || process.env.SYMPLA_EVENT_ID || '';
  }

  private getHeaders() {
    return {
      's_token': this.apiToken,
      'Content-Type': 'application/json',
      'Accept': 'application/json'
    };
  }

  /**
   * Obtém os detalhes de um evento da FACOM Tech Week
   */
  async getEventDetails(eventId?: string): Promise<SymplaEvent> {
    const targetEventId = eventId || this.defaultEventId;
    if (!targetEventId) {
      throw new Error('Sympla Event ID não configurado.');
    }

    const response = await fetch(`${SYMPLA_BASE_URL}/events/${targetEventId}`, {
      headers: this.getHeaders()
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Erro na API Sympla (${response.status}): ${errorText}`);
    }

    const json = await response.json() as { data: SymplaEvent };
    return json.data;
  }

  /**
   * Lista participantes com paginação
   */
  async getParticipants(page = 1, pageSize = 100, eventId?: string): Promise<{ data: SymplaParticipant[]; total: number; hasNext: boolean }> {
    const targetEventId = eventId || this.defaultEventId;
    if (!targetEventId) {
      throw new Error('Sympla Event ID não configurado.');
    }

    const response = await fetch(
      `${SYMPLA_BASE_URL}/events/${targetEventId}/participants?page=${page}&page_size=${pageSize}&field_sort=id&sort=DESC`,
      { headers: this.getHeaders() }
    );

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Erro ao buscar participantes no Sympla (${response.status}): ${errorText}`);
    }

    const json = await response.json() as { 
      data: SymplaParticipant[]; 
      pagination: { total_page: number; has_next: boolean; quantity: number };
    };

    return {
      data: json.data || [],
      total: json.pagination?.quantity || 0,
      hasNext: json.pagination?.has_next || false
    };
  }

  /**
   * Busca um participante pelo e-mail (usado no cadastro e sincronização de conta)
   */
  async findParticipantByEmail(email: string, eventId?: string): Promise<SymplaParticipant | null> {
    const normalizedEmail = email.trim().toLowerCase();
    let page = 1;
    let hasMore = true;

    while (hasMore && page <= 10) { // Limita a 10 páginas para segurança
      const result = await this.getParticipants(page, 100, eventId);
      const match = result.data.find(p => p.email?.trim().toLowerCase() === normalizedEmail);
      if (match) {
        return match;
      }
      hasMore = result.hasNext;
      page++;
    }

    return null;
  }

  /**
   * Busca um participante pelo número do ingresso (ex: T123456789)
   */
  async findParticipantByTicket(ticketNumber: string, eventId?: string): Promise<SymplaParticipant | null> {
    const targetEventId = eventId || this.defaultEventId;
    if (!targetEventId) {
      throw new Error('Sympla Event ID não configurado.');
    }

    const cleanTicket = encodeURIComponent(ticketNumber.trim());
    const response = await fetch(
      `${SYMPLA_BASE_URL}/events/${targetEventId}/participants/ticketNumber/${cleanTicket}`,
      { headers: this.getHeaders() }
    );

    if (response.status === 404) {
      return null;
    }

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Erro ao buscar ingresso no Sympla (${response.status}): ${errorText}`);
    }

    const json = await response.json() as { data: SymplaParticipant };
    return json.data || null;
  }

  /**
   * Realiza o Check-in oficial do ingresso no Sympla
   */
  async checkInParticipant(ticketNumber: string, eventId?: string): Promise<{ success: boolean; message: string }> {
    const targetEventId = eventId || this.defaultEventId;
    if (!targetEventId) {
      throw new Error('Sympla Event ID não configurado.');
    }

    const cleanTicket = encodeURIComponent(ticketNumber.trim());
    const response = await fetch(
      `${SYMPLA_BASE_URL}/events/${targetEventId}/participants/ticketNumber/${cleanTicket}/checkIn`,
      {
        method: 'POST',
        headers: this.getHeaders()
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      return { success: false, message: `Falha no check-in Sympla: ${errorText}` };
    }

    return { success: true, message: 'Check-in realizado com sucesso no Sympla!' };
  }
}

export const symplaService = new SymplaService();

