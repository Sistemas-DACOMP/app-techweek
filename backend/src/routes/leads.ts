import { Router, Request, Response } from 'express';
import { db } from '../config/firebaseAdmin';
import * as admin from 'firebase-admin';
import { requireAuth, requireRole } from '../middlewares/authMiddleware';
import { isValidFirestoreId } from '../lib/firestoreId';

const router = Router();

/**
 * Calcula a faixa etária com base na data de nascimento fornecida,
 * preservando a privacidade da data exata (LGPD / KAN-55).
 * A data exata NUNCA é repassada ou gravada no lead.
 */
export function calculateAgeGroup(birthDateRaw: any): string {
  if (!birthDateRaw) {
    return 'Não informada';
  }

  let birthDate: Date;

  if (typeof birthDateRaw?.toDate === 'function') {
    birthDate = birthDateRaw.toDate();
  } else if (birthDateRaw instanceof Date) {
    birthDate = birthDateRaw;
  } else if (typeof birthDateRaw === 'string' || typeof birthDateRaw === 'number') {
    birthDate = new Date(birthDateRaw);
  } else {
    return 'Não informada';
  }

  if (isNaN(birthDate.getTime())) {
    return 'Não informada';
  }

  const today = new Date();
  let age = today.getFullYear() - birthDate.getFullYear();
  const monthDiff = today.getMonth() - birthDate.getMonth();

  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
    age--;
  }

  if (age < 0 || age > 120) {
    return 'Não informada';
  }

  if (age < 18) return 'Menor de 18';
  if (age <= 20) return '18-20';
  if (age <= 24) return '21-24';
  if (age <= 30) return '25-30';
  return '31+';
}

/**
 * Sanitiza o telefone do participante e monta a URL para contato imediato via WhatsApp.
 */
export function buildWhatsAppPayload(phoneRaw: any, participantName: string) {
  if (!phoneRaw || typeof phoneRaw !== 'string') {
    return {
      phone: null,
      formattedPhone: null,
      message: '',
      url: null
    };
  }

  const digits = phoneRaw.replace(/\D/g, '');
  let phoneWithCountry: string | null = null;

  if (digits.length === 10 || digits.length === 11) {
    phoneWithCountry = `55${digits}`;
  } else if (digits.length >= 12 && digits.startsWith('55')) {
    phoneWithCountry = digits;
  }

  if (!phoneWithCountry) {
    return {
      phone: phoneRaw,
      formattedPhone: null,
      message: '',
      url: null
    };
  }

  const name = participantName?.trim() || 'Participante';
  const message = `Olá, ${name}! Foi um prazer conversar com você no estande da FACOM TechWeek.`;
  const url = `https://wa.me/${phoneWithCountry}?text=${encodeURIComponent(message)}`;

  return {
    phone: phoneRaw,
    formattedPhone: phoneWithCountry,
    message,
    url
  };
}

/**
 * Handler do endpoint POST /api/leads
 * Extraído para facilitar testes unitários isolados.
 */
export async function leadsHandler(req: Request, res: Response): Promise<void> {
  const { participantUid, notes, rating } = req.body ?? {};
  const sponsorUid = req.user!.uid;

  if (typeof participantUid !== 'string' || !participantUid || !isValidFirestoreId(participantUid)) {
    res.status(400).json({
      error: 'INVALID_PAYLOAD',
      message: 'participantUid é obrigatório e deve ser um ID de documento válido.'
    });
    return;
  }

  if (notes !== undefined && typeof notes !== 'string') {
    res.status(400).json({
      error: 'INVALID_PAYLOAD',
      message: 'notes deve ser uma string.'
    });
    return;
  }

  if (
    rating !== undefined &&
    rating !== null &&
    (typeof rating !== 'number' || !Number.isInteger(rating) || rating < 1 || rating > 5)
  ) {
    res.status(400).json({
      error: 'INVALID_PAYLOAD',
      message: 'rating deve ser um número inteiro entre 1 e 5.'
    });
    return;
  }

  const userRef = db.collection('users').doc(participantUid);
  const leadRef = db.collection('leads').doc(sponsorUid).collection('contacts').doc(participantUid);
  const pointEventRef = db.collection('pointEvents').doc(`${participantUid}_sponsor_lead_${sponsorUid}`);

  try {
    const result = await db.runTransaction(async (tx) => {
      const [userSnap, pointEventSnap] = await Promise.all([
        tx.get(userRef),
        tx.get(pointEventRef)
      ]);

      if (!userSnap.exists) {
        return {
          status: 404 as const,
          body: {
            error: 'PARTICIPANT_NOT_FOUND',
            message: 'Participante não encontrado no sistema.'
          }
        };
      }

      const userData = userSnap.data() ?? {};
      const name = (
        userData.name ||
        [userData.first_name, userData.last_name].filter(Boolean).join(' ') ||
        [userData.firstName, userData.lastName].filter(Boolean).join(' ') ||
        'Participante'
      ).trim();

      const email = userData.email || null;
      const phone = userData.phone || userData.telefone || null;
      const course = userData.course || userData.curso || null;
      const period = userData.period || userData.periodo || null;
      const linkedin = userData.linkedin || null;
      const instagram = userData.instagram || null;

      const birthDateRaw =
        userData.birthDate ||
        userData.birth_date ||
        userData.dataNascimento ||
        userData.data_nascimento ||
        null;

      const faixaEtaria = calculateAgeGroup(birthDateRaw);
      const now = admin.firestore.FieldValue.serverTimestamp();

      const alreadyAwarded = pointEventSnap.exists;
      const pointsAwarded = alreadyAwarded ? 0 : 50;

      // Incremento atômico de +50 pontos na primeira visita a este patrocinador
      if (!alreadyAwarded) {
        tx.update(userRef, {
          pontuacaoTotal: admin.firestore.FieldValue.increment(50),
          updatedAt: now
        });

        tx.set(pointEventRef, {
          userId: participantUid,
          eventType: 'sponsor_lead',
          referenceId: sponsorUid,
          points: 50,
          metadata: {
            sponsorUid,
            sponsorEmail: req.user?.email || null
          },
          createdAt: now
        });
      }

      const leadContactData: Record<string, any> = {
        participantUid,
        sponsorUid,
        name,
        email,
        phone,
        course,
        period,
        linkedin,
        instagram,
        faixaEtaria,
        notes: typeof notes === 'string' ? notes.trim() : '',
        rating: typeof rating === 'number' ? rating : null,
        updatedAt: now
      };

      if (!alreadyAwarded) {
        leadContactData.createdAt = now;
      }

      tx.set(leadRef, leadContactData, { merge: true });

      const whatsapp = buildWhatsAppPayload(phone, name);

      return {
        status: alreadyAwarded ? (200 as const) : (201 as const),
        body: {
          success: true,
          lead: {
            participantUid,
            sponsorUid,
            name,
            email,
            phone,
            course,
            period,
            linkedin,
            instagram,
            faixaEtaria,
            notes: leadContactData.notes,
            rating: leadContactData.rating,
            pointsAwarded
          },
          whatsapp
        }
      };
    });

    res.status(result.status).json(result.body);
  } catch (error) {
    console.error('Erro ao processar captura de lead:', error);
    res.status(500).json({
      error: 'INTERNAL_ERROR',
      message: 'Não foi possível registrar o contato no momento.'
    });
  }
}

// Registro da rota com RBAC: apenas SPONSOR e ADMIN podem capturar leads
router.post('/', requireAuth, requireRole(['SPONSOR', 'ADMIN']), leadsHandler);

export default router;

