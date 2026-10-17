import { Router, Request, Response } from 'express';
import { symplaService } from '../services/symplaService';
import { linkSymplaTicket, unlinkSymplaTicket, TicketInUseError, TICKET_IN_USE_MESSAGE } from '../services/symplaLink';
import { requireAuth, requireRole } from '../middlewares/authMiddleware';
import { symplaPublicLimiter, symplaSyncLimiter, staffActionLimiter } from '../middlewares/rateLimiter';
import { db } from '../config/firebaseAdmin';

const router = Router();

/**
 * GET /api/sympla/event
 * Retorna os detalhes do evento configurado
 */
router.get('/event', symplaPublicLimiter, async (_req: Request, res: Response) => {
  try {
    const event = await symplaService.getEventDetails();
    res.status(200).json({ status: 'success', data: event });
  } catch (error: any) {
    res.status(500).json({ status: 'error', message: error.message || 'Erro ao consultar evento no Sympla.' });
  }
});

/**
 * POST /api/sympla/verify-ticket
 * Valida o ingresso do participante por e-mail ou número de ingresso.
 * Requer autenticação. Usuários normais só podem consultar o próprio ingresso.
 */
router.post('/verify-ticket', requireAuth, symplaSyncLimiter, async (req: Request, res: Response) => {
  try {
    const userEmail = req.user?.email;
    const userRole = req.user?.role;
    const isAdmin = userRole === 'ADMIN';
    const isPrivilegedScanner = isAdmin || userRole === 'SPONSOR' || userRole === 'STAFF';
    const { email, ticketNumber } = req.body;

    const targetEmail = isPrivilegedScanner ? (email || userEmail) : userEmail;

    if (!targetEmail && !ticketNumber) {
      res.status(400).json({ status: 'error', message: 'Informe o e-mail ou número do ingresso para validação.' });
      return;
    }

    let participant = null;

    if (ticketNumber) {
      participant = await symplaService.findParticipantByTicket(ticketNumber);
      if (participant && !isPrivilegedScanner && userEmail && participant.email?.toLowerCase() !== userEmail.toLowerCase()) {
        res.status(403).json({ status: 'error', message: 'Acesso não autorizado ao ingresso de outro participante.' });
        return;
      }
    }
    if (!participant && targetEmail) {
      participant = await symplaService.findParticipantByEmail(targetEmail);
    }

    if (!participant) {
      res.status(404).json({
        status: 'not_found',
        verified: false,
        hasTicket: false,
        message: 'Nenhum ingresso ativo encontrado no Sympla para os dados informados.'
      });
      return;
    }

    const qrCodeData = participant.ticket_num_qr_code || participant.ticket_number;

    const ticketObj = {
      participantId: participant.id,
      orderId: participant.order_id,
      ticketNumber: participant.ticket_number,
      ticketName: participant.ticket_name,
      qrCodeData: qrCodeData,
      syncedAt: new Date().toISOString()
    };

    // Vincula o ingresso ao participante apenas quando a consulta é do próprio titular (KAN-108)
    const uid = req.user?.uid;
    const isOwnTicket =
      !isPrivilegedScanner ||
      (Boolean(participant.email) && Boolean(userEmail) && participant.email.toLowerCase() === userEmail!.toLowerCase());
    if (uid && isOwnTicket) {
      try {
        await linkSymplaTicket(uid, ticketObj);
      } catch (linkErr) {
        if (linkErr instanceof TicketInUseError) {
          res.status(409).json({ status: 'conflict', verified: false, message: TICKET_IN_USE_MESSAGE });
          return;
        }
        throw linkErr;
      }
    }

    // Quando escaneado por SPONSOR/STAFF/ADMIN, busca também o perfil completo do titular no Firestore
    let userProfile: Record<string, any> | null = null;
    if (isPrivilegedScanner && db?.collection) {
      try {
        const ticketIdKey = String(participant.ticket_number || qrCodeData || '').trim().toUpperCase();
        let matchedUid: string | null = null;
        let matchedData: Record<string, any> | null = null;

        if (ticketIdKey) {
          const claimSnap = await db.collection('symplaTickets')?.doc?.(ticketIdKey)?.get?.();
          const claimedUid = claimSnap?.exists ? claimSnap.data()?.uid : null;
          if (claimedUid) {
            const uSnap = await db.collection('users')?.doc?.(claimedUid)?.get?.();
            if (uSnap?.exists) {
              matchedUid = claimedUid;
              matchedData = uSnap.data() || null;
            }
          }
        }

        if (!matchedData && participant.email && typeof (db.collection('users') as any)?.where === 'function') {
          const cleanEmail = participant.email.trim().toLowerCase();
          const emailSnap = await (db.collection('users') as any).where('email', '==', cleanEmail).limit(1).get();
          if (emailSnap && !emailSnap.empty && emailSnap.docs?.[0]) {
            matchedUid = emailSnap.docs[0].id;
            matchedData = emailSnap.docs[0].data() || null;
          }
        }

        if (matchedUid && matchedData) {
          if (!matchedData.symplaTicket && ticketObj.ticketNumber) {
            await linkSymplaTicket(matchedUid, ticketObj).catch(() => {});
          }
          const resolvedName =
            matchedData.name ||
            matchedData.displayName ||
            [matchedData.firstName, matchedData.lastName].filter(Boolean).join(' ') ||
            [participant.first_name, participant.last_name].filter(Boolean).join(' ');
          userProfile = {
            uid: matchedUid,
            name: resolvedName,
            firstName: matchedData.firstName || participant.first_name || '',
            lastName: matchedData.lastName || participant.last_name || '',
            username: matchedData.username || '',
            email: matchedData.email || participant.email || '',
            phone: matchedData.phone || matchedData.telefone || '',
            course: matchedData.course || matchedData.curso || '',
            period: matchedData.period ?? matchedData.periodo ?? null,
            institution: matchedData.institution || matchedData.instituicao || '',
            participantType: matchedData.participantType || matchedData.participant_type || '',
            linkedin: matchedData.linkedin || '',
            instagram: matchedData.instagram || '',
            github: matchedData.github || '',
            avatarUrl: matchedData.avatarUrl || matchedData.photoURL || null
          };
        }
      } catch (_lookupErr) {}
    }

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
      },
      symplaTicket: ticketObj,
      ...(userProfile ? { userProfile } : {})
    });
  } catch (error: any) {
    res.status(500).json({ status: 'error', message: error.message || 'Erro ao validar ingresso no Sympla.' });
  }
});

/**
 * POST /api/sympla/sync-user
 * Sincroniza o crachá/ingresso do Sympla diretamente com o perfil do usuário no Firestore
 */
router.post('/sync-user', requireAuth, symplaSyncLimiter, async (req: Request, res: Response) => {
  try {
    const uid = req.user?.uid;
    const { email: bodyEmail, ticketNumber } = req.body;
    const email = req.user?.email || bodyEmail;

    if (!uid || (!email && !ticketNumber)) {
      res.status(400).json({ status: 'error', message: 'Usuário não autenticado ou identificador indisponível.' });
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
        synced: false,
        hasTicket: false,
        message: 'Nenhum ingresso encontrado no Sympla para os dados informados.'
      });
      return;
    }

    const qrCodeData = participant.ticket_num_qr_code || participant.ticket_number;

    const ticketObj = {
      participantId: participant.id,
      orderId: participant.order_id,
      ticketNumber: participant.ticket_number,
      ticketName: participant.ticket_name,
      qrCodeData: qrCodeData,
      syncedAt: new Date().toISOString()
    };

    try {
      await linkSymplaTicket(uid, ticketObj);
    } catch (linkErr) {
      if (linkErr instanceof TicketInUseError) {
        res.status(409).json({ status: 'conflict', synced: false, message: TICKET_IN_USE_MESSAGE });
        return;
      }
      throw linkErr;
    }

    res.status(200).json({
      status: 'success',
      synced: true,
      data: {
        ticketNumber: participant.ticket_number,
        ticketName: participant.ticket_name,
        qrCodeData: qrCodeData
      },
      symplaTicket: ticketObj
    });
  } catch (error: any) {
    res.status(500).json({ status: 'error', message: error.message || 'Erro ao sincronizar ingresso.' });
  }
});

/**
 * POST /api/sympla/unlink-ticket
 * Desvincula o ingresso do Sympla da conta autenticada (ou de outro usuário se for ADMIN)
 */
router.post('/unlink-ticket', requireAuth, symplaSyncLimiter, async (req: Request, res: Response) => {
  try {
    const isAdmin = req.user?.role === 'ADMIN';
    const targetUid = (isAdmin && req.body?.uid) ? req.body.uid : req.user?.uid;

    if (!targetUid) {
      res.status(400).json({ status: 'error', message: 'Identificador do usuário indisponível.' });
      return;
    }

    await unlinkSymplaTicket(targetUid);

    res.status(200).json({
      status: 'success',
      unlinked: true,
      message: 'Ingresso desvinculado com sucesso.'
    });
  } catch (error: any) {
    res.status(500).json({ status: 'error', message: error.message || 'Erro ao desvincular ingresso.' });
  }
});

/**
 * POST /api/sympla/checkin
 * Realiza o Check-in oficial na portaria (Exclusivo para STAFF e ADMIN)
 */
router.post('/checkin', requireAuth, requireRole(['STAFF', 'ADMIN']), staffActionLimiter, async (req: Request, res: Response) => {
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


