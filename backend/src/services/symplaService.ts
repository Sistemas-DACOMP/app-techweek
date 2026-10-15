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
  private apiToken?: string;
  private defaultEventId?: string;

  constructor(token?: string, eventId?: string) {
    this.apiToken = token;
    this.defaultEventId = eventId;
  }

  private getToken(): string {
    return this.apiToken || process.env.SYMPLA_API_TOKEN || '';
  }

  private getEventId(): string {
    return this.defaultEventId || process.env.SYMPLA_EVENT_ID || '';
  }

  private getHeaders() {
    return {
      's_token': this.getToken(),
      'Content-Type': 'application/json',
      'Accept': 'application/json'
    };
  }

  /**
   * Obtém os detalhes de um evento da FACOM Tech Week
   */
  async getEventDetails(eventId?: string): Promise<SymplaEvent> {
    const targetEventId = eventId || this.getEventId();
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
    const targetEventId = eventId || this.getEventId();
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

    while (hasMore && page <= 50) { // Limita a 50 páginas para eventos maiores
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
   * Busca um participante pelo número do ingresso ou código QR (ex: T123456789, ABCD-01-2345, SYMPLA:T123)
   */
  async findParticipantByTicket(ticketNumber: string, eventId?: string): Promise<SymplaParticipant | null> {
    const targetEventId = eventId || this.getEventId();
    if (!targetEventId) {
      throw new Error('Sympla Event ID não configurado.');
    }

    const stripped = ticketNumber.replace(/^SYMPLA:/i, '').trim();
    if (!stripped) return null;

    const cleanTicket = encodeURIComponent(stripped);
    const response = await fetch(
      `${SYMPLA_BASE_URL}/events/${targetEventId}/participants/ticketNumber/${cleanTicket}`,
      { headers: this.getHeaders() }
    );

    if (response.ok) {
      const json = await response.json() as { data: SymplaParticipant };
      if (json.data) return json.data;
    } else if (response.status !== 404) {
      const errorText = await response.text();
      throw new Error(`Erro ao buscar ingresso no Sympla (${response.status}): ${errorText}`);
    }

    // Fallback: se o QR lido for ticket_num_qr_code ou tiver formatação com/sem traços diferente de ticket_number
    const normTarget = stripped.replace(/[-\s]/g, '').toUpperCase();
    let page = 1;
    let hasMore = true;

    while (hasMore && page <= 10) {
      try {
        const result = await this.getParticipants(page, 100, targetEventId);
        const match = result.data.find((p) => {
          const candidates = [p.ticket_number, p.ticket_num_qr_code, p.qr_code].filter(Boolean) as string[];
          return candidates.some((c) => {
            const cleanC = c.replace(/^SYMPLA:/i, '').trim();
            return (
              cleanC.toUpperCase() === stripped.toUpperCase() ||
              cleanC.replace(/[-\s]/g, '').toUpperCase() === normTarget
            );
          });
        });
        if (match) return match;
        hasMore = result.hasNext;
        page++;
      } catch {
        break;
      }
    }

    return null;
  }

  /**
   * Realiza o Check-in oficial do ingresso no Sympla
   */
  async checkInParticipant(ticketNumber: string, eventId?: string): Promise<{ success: boolean; message: string }> {
    const targetEventId = eventId || this.getEventId();
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

