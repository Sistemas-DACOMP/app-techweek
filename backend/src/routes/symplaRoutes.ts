import { Router, Request, Response } from 'express';
import { symplaService } from '../services/symplaService';
import { db } from '../config/firebaseAdmin';
import { requireAuth, requireRole } from '../middlewares/authMiddleware';

const router = Router();

/**
 * GET /api/sympla/event
 * Retorna os detalhes do evento configurado
 */
router.get('/event', async (_req: Request, res: Response) => {
  try {
    const event = await symplaService.getEventDetails();
    res.status(200).json({ status: 'success', data: event });
  } catch (error: any) {
    res.status(500).json({ status: 'error', message: error.message || 'Erro ao consultar evento no Sympla.' });
  }
});

/**
 * POST /api/sympla/verify-ticket
 * Valida o ingresso do participante por e-mail ou número de ingresso
 */
router.post('/verify-ticket', async (req: Request, res: Response) => {
  try {
    const { email, ticketNumber } = req.body;

    if (!email && !ticketNumber) {
      res.status(400).json({ status: 'error', message: 'Informe o e-mail ou número do ingresso para validação.' });
      return;
    }

    let participant = null;

    if (ticketNumber) {
      participant = await symplaService.findParticipantByTicket(ticketNumber);
    } else if (email) {
      participant = await symplaService.findParticipantByEmail(email);
    }

    if (!participant) {
      res.status(404).json({
        status: 'not_found',
        verified: false,
        message: 'Nenhum ingresso ativo encontrado no Sympla para os dados informados.'
      });
      return;
    }

    const qrCodeData = participant.ticket_num_qr_code || participant.ticket_number;

    res.status(200).json({
      status: 'success',
      verified: true,
      participant: {
        id: participant.id,
        orderId: participant.order_id,
        ticketNumber: participant.ticket_number,
        ticketName: participant.ticket_name,
        firstName: participant.first_name,
        lastName: participant.last_name,
        email: participant.email,
        qrCodeData: qrCodeData,
        checkInStatus: participant.check_in?.[0]?.status || false
      }
    });
  } catch (error: any) {
    res.status(500).json({ status: 'error', message: error.message || 'Erro ao validar ingresso no Sympla.' });
  }
});

/**
 * POST /api/sympla/sync-user
 * Sincroniza o crachá/ingresso do Sympla diretamente com o perfil do usuário no Firestore
 */
router.post('/sync-user', requireAuth, async (req: Request, res: Response) => {
  try {
    const uid = req.user?.uid;
    const email = req.user?.email || req.body.email;

    if (!uid || !email) {
      res.status(400).json({ status: 'error', message: 'Usuário não autenticado ou e-mail indisponível.' });
      return;
    }

    const participant = await symplaService.findParticipantByEmail(email);

    if (!participant) {
      res.status(404).json({
        status: 'not_found',
        synced: false,
        message: 'Nenhum ingresso encontrado no Sympla para o e-mail ' + email
      });
      return;
    }

    const qrCodeData = participant.ticket_num_qr_code || participant.ticket_number;

    // Atualiza o perfil no Cloud Firestore
    await db.collection('users').doc(uid).set({
      symplaTicket: {
        participantId: participant.id,
        orderId: participant.order_id,
        ticketNumber: participant.ticket_number,
        ticketName: participant.ticket_name,
        qrCodeData: qrCodeData,
        syncedAt: new Date().toISOString()
      },
      hasSymplaTicket: true
    }, { merge: true });

    res.status(200).json({
      status: 'success',
      synced: true,
      data: {
        ticketNumber: participant.ticket_number,
        ticketName: participant.ticket_name,
        qrCodeData: qrCodeData
      }
    });
  } catch (error: any) {
    res.status(500).json({ status: 'error', message: error.message || 'Erro ao sincronizar ingresso.' });
  }
});

/**
 * POST /api/sympla/checkin
 * Realiza o Check-in oficial na portaria (Exclusivo para STAFF e ADMIN)
 */
router.post('/checkin', requireAuth, requireRole(['STAFF', 'ADMIN']), async (req: Request, res: Response) => {
  try {
    const { ticketNumber } = req.body;
    if (!ticketNumber) {
      res.status(400).json({ status: 'error', message: 'Número do ingresso é obrigatório para check-in.' });
      return;
    }

    const result = await symplaService.checkInParticipant(ticketNumber);
    if (!result.success) {
      res.status(400).json({ status: 'error', message: result.message });
      return;
    }

    res.status(200).json({ status: 'success', message: result.message });
  } catch (error: any) {
    res.status(500).json({ status: 'error', message: error.message || 'Erro ao processar check-in.' });
  }
});

export default router;

