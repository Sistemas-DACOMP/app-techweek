import { Router, Request, Response } from 'express';
import { db } from '../config/firebaseAdmin';
import * as admin from 'firebase-admin';
import { requireAuth, requireRole, requireVerifiedEmail } from '../middlewares/authMiddleware';
import { adminSponsorLimiter } from '../middlewares/rateLimiter';
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

export type SponsorCompanyId = 'kanastra' | 'bayer' | 'aimirim' | 'bip' | 'hyperflow';

export const PASSPORT_COMPANIES: SponsorCompanyId[] = ['kanastra', 'bayer', 'aimirim', 'bip', 'hyperflow'];

export function resolveCompanyId(raw?: string | null): SponsorCompanyId | null {
  if (!raw || typeof raw !== 'string') return null;
  const clean = raw.toLowerCase().trim();
  if (clean.includes('kanastra')) return 'kanastra';
  if (clean.includes('bayer')) return 'bayer';
  if (clean.includes('aimirim')) return 'aimirim';
  if (clean.includes('bip')) return 'bip';
  if (clean.includes('hyperflow')) return 'hyperflow';
  return null;
}

/**
 * KAN-124: a empresa do patrocinador vem SEMPRE do servidor, nunca do cliente
 * (body/query). Com `users.sponsorId` a empresa é `sponsors/{id}.legacyCompanyId`
 * (sem fallback: conta vinculada a um patrocinador sem legacyCompanyId não
 * entra no passaporte). Sem sponsorId, mantém o fallback legado (campos do
 * próprio users/{uid} e e-mail). `linked` indica conta vinculada a sponsors/.
 */
async function resolveSponsorCompany(
  read: (ref: any) => Promise<any>,
  sponsorData: Record<string, any>,
  email?: string | null
): Promise<{ companyId: SponsorCompanyId | null; linked: boolean }> {
  const sponsorId = sponsorData.sponsorId;
  if (typeof sponsorId === 'string' && isValidFirestoreId(sponsorId)) {
    const snap = await read(db.collection('sponsors').doc(sponsorId));
    const legacy = snap?.exists ? snap.data?.()?.legacyCompanyId : null;
    return { companyId: PASSPORT_COMPANIES.includes(legacy) ? legacy : null, linked: true };
  }
  const candidate =
    sponsorData.companyId || sponsorData.company || sponsorData.empresa || sponsorData.companyName || email || '';
  return { companyId: resolveCompanyId(candidate), linked: false };
}

/**
 * Handler do endpoint POST /api/leads
 * Extraído para facilitar testes unitários isolados.
 */
export async function leadsHandler(req: Request, res: Response): Promise<void> {
  const { participantUid, notes, rating, validateOnly, tags } = req.body ?? {};
  const sponsorUid = req.user!.uid;

  let resolvedUid = participantUid;

  if (typeof resolvedUid === 'string' && resolvedUid.includes('@')) {
    try {
      const usersCol = db.collection('users');
      if (typeof usersCol.where === 'function') {
        const emailSnap = await usersCol.where('email', '==', resolvedUid.toLowerCase().trim()).limit(1).get();
        if (emailSnap && !emailSnap.empty) {
          resolvedUid = emailSnap.docs[0].id;
        }
      }
    } catch (e) {
      console.warn('Erro ao resolver UID por e-mail em leadsHandler:', e);
    }
  }

  if (typeof resolvedUid !== 'string' || !resolvedUid || !isValidFirestoreId(resolvedUid)) {
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

  const sanitizedTags = Array.isArray(tags)
    ? tags
        .filter((t): t is string => typeof t === 'string')
        .map(t => t.trim())
        .filter(Boolean)
        .slice(0, 25)
    : [];

  const userRef = db.collection('users').doc(resolvedUid);
  const leadRef = db.collection('leads').doc(sponsorUid).collection('contacts').doc(resolvedUid);
  const pointEventRef = db.collection('pointEvents').doc(`${resolvedUid}_sponsor_lead_${sponsorUid}`);
  const goldenTicketPointEventRef = db.collection('pointEvents').doc(`${resolvedUid}_passport_golden_ticket`);
  const sponsorRef = db.collection('users').doc(sponsorUid);

  try {
    const result = await db.runTransaction(async (tx) => {
      const [userSnap, pointEventSnap, goldenTicketPointEventSnap, sponsorSnap] = await Promise.all([
        tx.get(userRef),
        tx.get(pointEventRef),
        tx.get(goldenTicketPointEventRef),
        tx.get(sponsorRef).catch(() => ({ exists: false, data: () => ({}) }))
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
      const github = userData.github || null;

      const birthDateRaw =
        userData.birthDate ||
        userData.birth_date ||
        userData.dataNascimento ||
        userData.data_nascimento ||
        null;

      const faixaEtaria = calculateAgeGroup(birthDateRaw);
      const now = admin.firestore.FieldValue.serverTimestamp();
      const alreadyAwarded = pointEventSnap.exists;

      // Resolução da empresa patrocinadora para o Passaporte
      const sponsorData = (typeof sponsorSnap?.data === 'function' ? (sponsorSnap.data() || {}) : {}) as Record<string, any>;
      const { companyId } = await resolveSponsorCompany((ref) => tx.get(ref), sponsorData, req.user?.email);

      const existingVisited = userData.visitedSponsors || {};
      const updatedVisited = { ...existingVisited };
      if (companyId && !updatedVisited[companyId]) {
        updatedVisited[companyId] = {
          visitedAt: new Date().toISOString(),
          sponsorUid,
          sponsorEmail: req.user?.email || null
        };
      }

      // Checa se completou todas as 5 empresas do passaporte (Bilhete Dourado) com idempotência atômica
      const allPassportVisited = PASSPORT_COMPANIES.every(c => !!updatedVisited[c]);
      const goldenTicketAlreadyAwarded = Boolean(userData.goldenTicketAwarded || goldenTicketPointEventSnap.exists);
      const isNewGoldenTicket = allPassportVisited && !goldenTicketAlreadyAwarded;

      let pointsToIncrement = 0;
      if (!alreadyAwarded) {
        pointsToIncrement += 50;
      }
      if (isNewGoldenTicket) {
        pointsToIncrement += 100;
      }

      const userUpdates: Record<string, any> = {};

      if (companyId && (!existingVisited[companyId] || !existingVisited[companyId]?.visitedAt)) {
        userUpdates.visitedSponsors = updatedVisited;
      }

      if (isNewGoldenTicket) {
        userUpdates.goldenTicketAwarded = true;
        userUpdates.goldenTicketAwardedAt = now;
      } else if (goldenTicketPointEventSnap.exists && !userData.goldenTicketAwarded) {
        // Reconcilia campo no documento do usuário sem conceder pontos novamente
        userUpdates.goldenTicketAwarded = true;
      }

      if (pointsToIncrement > 0) {
        userUpdates.totalPoints = admin.firestore.FieldValue.increment(pointsToIncrement);
        userUpdates.pontuacaoTotal = admin.firestore.FieldValue.increment(pointsToIncrement);
      }

      if (Object.keys(userUpdates).length > 0) {
        userUpdates.updatedAt = now;
        tx.update(userRef, userUpdates);
      }

      if (!alreadyAwarded) {
        tx.set(pointEventRef, {
          userId: resolvedUid,
          eventType: 'sponsor_lead',
          referenceId: sponsorUid,
          points: 50,
          metadata: {
            sponsorUid,
            sponsorEmail: req.user?.email || null,
            companyId: companyId || null
          },
          createdAt: now
        });
      }

      if (isNewGoldenTicket) {
        tx.set(goldenTicketPointEventRef, {
          userId: resolvedUid,
          eventType: 'passport_golden_ticket',
          referenceId: 'golden_ticket',
          points: 100,
          metadata: {
            companies: PASSPORT_COMPANIES
          },
          createdAt: now
        });
      }

      const leadContactData: Record<string, any> = {
        participantUid: resolvedUid,
        sponsorUid,
        companyId: companyId || null,
        collectedByEmail: req.user?.email || null,
        name,
        email,
        phone,
        course,
        period,
        linkedin,
        instagram,
        github,
        faixaEtaria,
        tags: sanitizedTags,
        notes: typeof notes === 'string' ? notes.trim() : '',
        rating: typeof rating === 'number' ? rating : null,
        updatedAt: now
      };

      if (!alreadyAwarded) {
        leadContactData.createdAt = now;
      }

      if (!validateOnly) {
        tx.set(leadRef, leadContactData, { merge: true });

        if (companyId) {
          const companyLeadRef = db.collection('company_leads').doc(companyId).collection('contacts').doc(resolvedUid);
          tx.set(companyLeadRef, leadContactData, { merge: true });
        }
      }

      const whatsapp = buildWhatsAppPayload(phone, name);

      return {
        status: alreadyAwarded ? (200 as const) : (201 as const),
        body: {
          success: true,
          validateOnly: Boolean(validateOnly),
          lead: {
            participantUid: resolvedUid,
            sponsorUid,
            companyId,
            name,
            email,
            phone,
            course,
            period,
            linkedin,
            instagram,
            github,
            faixaEtaria,
            tags: leadContactData.tags,
            notes: leadContactData.notes,
            rating: leadContactData.rating,
            pointsAwarded: pointsToIncrement,
            goldenTicketAwarded: isNewGoldenTicket || goldenTicketAlreadyAwarded
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

/**
 * Handler do endpoint GET /api/leads
 * Retorna os leads capturados pelo usuário logado (myLeads)
 * e todos os leads da empresa (companyLeads).
 */
export async function getLeadsHandler(req: Request, res: Response): Promise<void> {
  const sponsorUid = req.user!.uid;
  // KAN-124: só ADMIN (sem vínculo de patrocinador) escolhe a empresa por
  // query; SPONSOR nunca lê leads de outra empresa.
  const queryCompany = req.user?.role === 'ADMIN' ? (req.query?.companyId as string | undefined) : undefined;

  try {
    const sponsorSnap = await db.collection('users').doc(sponsorUid).get().catch(() => ({ exists: false, data: () => ({}) }));
    const sponsorData = ((sponsorSnap && typeof sponsorSnap.data === 'function' ? sponsorSnap.data() : {}) || {}) as Record<string, any>;
    const resolved = await resolveSponsorCompany((ref) => ref.get(), sponsorData, req.user?.email);
    const companyId = queryCompany ? (resolveCompanyId(queryCompany) || queryCompany.toLowerCase()) : resolved.companyId;

    const rawLimit = Number(req.query?.limit);
    const limit = Number.isInteger(rawLimit) && rawLimit > 0 ? Math.min(rawLimit, 100) : 50;

    let myLeadsRef: any = db.collection('leads').doc(sponsorUid).collection('contacts');
    if (typeof myLeadsRef.orderBy === 'function') {
      myLeadsRef = myLeadsRef.orderBy('createdAt', 'desc');
    }
    if (typeof myLeadsRef.limit === 'function') {
      myLeadsRef = myLeadsRef.limit(limit);
    }
    const myLeadsSnap = await myLeadsRef.get();
    const myLeads: any[] = myLeadsSnap.docs ? myLeadsSnap.docs.map(d => ({ ...d.data(), id: d.id })) : [];

    let companyLeads = [...myLeads];
    // Decisão do Fabio (KAN-124): leads por pessoa. Conta vinculada a sponsors/ não
    // enxerga leads dos colegas; o compartilhamento por empresa só sobra pro legado.
    if (companyId && (queryCompany || !resolved.linked)) {
      let compLeadsRef: any = db.collection('company_leads').doc(companyId).collection('contacts');
      if (typeof compLeadsRef.orderBy === 'function') {
        compLeadsRef = compLeadsRef.orderBy('createdAt', 'desc');
      }
      if (typeof compLeadsRef.limit === 'function') {
        compLeadsRef = compLeadsRef.limit(limit);
      }
      const compLeadsSnap = await compLeadsRef.get();
      if (compLeadsSnap.docs && compLeadsSnap.docs.length > 0) {
        const map = new Map<string, any>();
        compLeadsSnap.docs.forEach(d => map.set(d.id, { ...d.data(), id: d.id }));
        myLeads.forEach(l => map.set(l.participantUid || l.id, { ...map.get(l.participantUid || l.id), ...l }));
        companyLeads = Array.from(map.values());
      }
    }

    res.status(200).json({
      success: true,
      myLeads,
      companyLeads,
      companyId,
      pagination: {
        limit,
        totalReturned: myLeads.length
      }
    });
  } catch (error) {
    console.error('Erro ao buscar leads:', error);
    res.status(500).json({
      error: 'INTERNAL_ERROR',
      message: 'Não foi possível listar os contatos.'
    });
  }
}

/**
 * Handler do endpoint PATCH /api/leads/:participantUid
 * Permite atualizar rating (0 a 5 estrelas) e observações (notes) de um lead capturado.
 */
export async function updateLeadHandler(req: Request, res: Response): Promise<void> {
  const { participantUid } = req.params;
  const { rating, notes, tags } = req.body ?? {};
  const sponsorUid = req.user!.uid;

  if (!participantUid || !isValidFirestoreId(participantUid)) {
    res.status(400).json({
      error: 'INVALID_PAYLOAD',
      message: 'participantUid é obrigatório e deve ser válido.'
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
    (typeof rating !== 'number' || rating < 0 || rating > 5)
  ) {
    res.status(400).json({
      error: 'INVALID_PAYLOAD',
      message: 'rating deve ser um número entre 0 e 5.'
    });
    return;
  }

  if (tags !== undefined && !Array.isArray(tags)) {
    res.status(400).json({
      error: 'INVALID_PAYLOAD',
      message: 'tags deve ser uma lista de strings.'
    });
    return;
  }

  try {
    const sponsorSnap = await db.collection('users').doc(sponsorUid).get().catch(() => ({ exists: false, data: () => ({}) }));
    const sponsorData = ((sponsorSnap && typeof sponsorSnap.data === 'function' ? sponsorSnap.data() : {}) || {}) as Record<string, any>;
    const { companyId } = await resolveSponsorCompany((ref) => ref.get(), sponsorData, req.user?.email);

    const now = admin.firestore.FieldValue.serverTimestamp();
    const updates: Record<string, any> = { updatedAt: now };

    if (notes !== undefined) {
      updates.notes = notes.trim();
    }
    if (rating !== undefined) {
      updates.rating = rating === 0 ? null : Math.round(rating);
    }
    if (tags !== undefined) {
      updates.tags = Array.isArray(tags)
        ? tags
            .filter((t): t is string => typeof t === 'string')
            .map(t => t.trim())
            .filter(Boolean)
            .slice(0, 25)
        : [];
    }

    const leadRef = db.collection('leads').doc(sponsorUid).collection('contacts').doc(participantUid);
    await leadRef.set(updates, { merge: true });

    if (companyId) {
      const companyLeadRef = db.collection('company_leads').doc(companyId).collection('contacts').doc(participantUid);
      await companyLeadRef.set(updates, { merge: true });
    }

    const updatedSnap = await leadRef.get();
    res.status(200).json({
      success: true,
      lead: {
        participantUid,
        ...(updatedSnap && typeof updatedSnap.data === 'function' ? updatedSnap.data() : updates)
      }
    });
  } catch (error) {
    console.error('Erro ao atualizar lead:', error);
    res.status(500).json({
      error: 'INTERNAL_ERROR',
      message: 'Não foi possível atualizar o lead.'
    });
  }
}

// Registro das rotas com RBAC e Rate Limiting: apenas SPONSOR e ADMIN podem gerenciar leads
router.get('/', requireAuth, requireRole(['SPONSOR', 'ADMIN']), adminSponsorLimiter, getLeadsHandler);
router.post('/', requireAuth, requireRole(['SPONSOR', 'ADMIN']), adminSponsorLimiter, requireVerifiedEmail, leadsHandler);
router.patch('/:participantUid', requireAuth, requireRole(['SPONSOR', 'ADMIN']), adminSponsorLimiter, updateLeadHandler);

export default router;

