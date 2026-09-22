import { Router, Request, Response } from 'express';
import * as admin from 'firebase-admin';
import { db } from '../config/firebaseAdmin';
import { requireAuth } from '../middlewares/authMiddleware';
import { participantActionLimiter } from '../middlewares/rateLimiter';
import { isValidFirestoreId } from '../lib/firestoreId';

const router = Router();

// Achado do security review: colapsar todo caractere fora de [a-zA-Z0-9_-]
// pro mesmo "_" fazia referenceIds distintos colidirem no mesmo doc id (ex:
// "foo/bar" e "foo:bar" viravam "foo_bar") — na pior hipótese nega um
// crédito legítimo como "alreadyClaimed", nunca duplica ponto, mas é bug
// real. Único caractere de fato proibido em doc id do Firestore é "/".
function sanitizeId(value: string): string {
  return value.replace(/\//g, '_');
}

// KAN-80: 'scan' é o único eventType cujo referenceId é livre/dinâmico
// (código de QR arbitrário ou `user_{username}` de outro participante) — a
// missão "escanear qualquer código" vale sempre o mesmo tanto, então o
// catálogo é consultado pela chave fixa 'scan', não pelo referenceId da vez.
// Todo outro eventType ('challenge'/'manual_challenge') usa o referenceId
// como id da missão, que é justamente o `challenge.id` do client
// (src/pages/Challenges.jsx) — ver scripts/seed-missions.mjs pro catálogo
// completo migrado dos valores hoje hardcoded no client.
function resolveMissionId(eventType: string, referenceId: string): string {
  return eventType === 'scan' ? 'scan' : referenceId;
}

// POST /api/points/claim
//
// KAN-79: antes disso, o client tentava creditar totalPoints direto no
// Firestore (userService.js::addUserPointEvent) — a regra de /users bloqueia
// isso desde o fix do SEC-003 (KAN-69), então todo crédito de missão/desafio
// falhava em silêncio (o erro era engolido e a UI mostrava sucesso mesmo
// assim). Mesmo padrão de dedup por doc id determinístico já usado em
// checkin.ts/checkinDoubleCheck.ts, só que na subcollection que o client já
// vinha usando (users/{uid}/point_events) — evita órfãos de tentativas
// anteriores à correção e mantém um único lugar de leitura.
//
// KAN-80 (achado HIGH do security review do KAN-79): o `points` do body NUNCA
// é usado pra creditar — é só aceito (e ignorado) por compatibilidade com o
// client atual, que ainda o envia. O valor real vem do catálogo em
// /missions/{missionId}, que só ADMIN escreve (ver firestore.rules) — um
// client não consegue mais inflar o próprio totalPoints inventando um
// `points` alto numa chamada direta à API.
router.post('/claim', requireAuth, participantActionLimiter, async (req: Request, res: Response) => {
  const { eventType, referenceId, metadata } = req.body ?? {};
  const uid = req.user!.uid;

  if (typeof eventType !== 'string' || !eventType) {
    res.status(400).json({ error: 'INVALID_PAYLOAD', message: 'eventType é obrigatório.' });
    return;
  }

  if (typeof referenceId !== 'string' || !referenceId) {
    res.status(400).json({ error: 'INVALID_PAYLOAD', message: 'referenceId é obrigatório.' });
    return;
  }

  const missionId = resolveMissionId(eventType, referenceId);

  // Achado BLOCKER do security review: .doc(missionId) lança exceção SÍNCRONA
  // (não uma Promise rejeitada) se o id tiver um "/" formando um número ímpar
  // de segmentos — antes mesmo de entrar no try/catch abaixo, derrubando a
  // instância inteira (mesmo padrão de risco já resolvido em checkin.ts,
  // booking.ts, admin.ts etc, só que esquecido aqui pro missionRef). Só
  // 'scan' teria referenceId livre o bastante pra disparar isso, mas
  // resolveMissionId já isola 'scan' pra chave fixa 'scan' — então esta
  // checagem só rejeita de fato um id de missão malformado/inventado, nunca
  // um scan legítimo.
  if (!isValidFirestoreId(missionId)) {
    res.status(400).json({ error: 'INVALID_PAYLOAD', message: 'referenceId inválido para o eventType informado.' });
    return;
  }

  const eventDocId = `${sanitizeId(eventType)}_${sanitizeId(referenceId)}`;
  const eventRef = db.collection('users').doc(uid).collection('point_events').doc(eventDocId);
  const userRef = db.collection('users').doc(uid);
  const missionRef = db.collection('missions').doc(missionId);

  try {
    const result = await db.runTransaction(async (tx) => {
      const [eventSnap, userSnap, missionSnap] = await Promise.all([
        tx.get(eventRef),
        tx.get(userRef),
        tx.get(missionRef)
      ]);

      if (eventSnap.exists) {
        return { status: 200 as const, body: { success: false, alreadyClaimed: true } };
      }

      if (!userSnap.exists) {
        return {
          status: 404 as const,
          body: { error: 'PARTICIPANT_NOT_FOUND', message: 'Perfil do participante não encontrado.' }
        };
      }

      if (!missionSnap.exists) {
        return {
          status: 404 as const,
          body: { error: 'MISSION_NOT_FOUND', message: `Missão "${eventType}/${referenceId}" não existe no catálogo.` }
        };
      }

      const missionPoints = missionSnap.data()?.points;
      if (typeof missionPoints !== 'number' || !Number.isFinite(missionPoints) || missionPoints < 0) {
        // Catálogo mal formado (dado de seed/edição manual quebrado) — erro de
        // integridade de dado, não payload do client, por isso 500 e não 400.
        throw new Error(`Catálogo de missões com valor inválido para ${missionRef.path}: ${String(missionPoints)}`);
      }

      tx.set(eventRef, {
        eventType,
        referenceId,
        points: missionPoints,
        metadata: metadata ?? null,
        createdAt: admin.firestore.FieldValue.serverTimestamp()
      });

      tx.update(userRef, {
        totalPoints: admin.firestore.FieldValue.increment(missionPoints)
      });

      return { status: 200 as const, body: { success: true, points: missionPoints } };
    });

    res.status(result.status).json(result.body);
  } catch (error) {
    console.error('Erro ao creditar pontos:', error);
    res.status(500).json({ error: 'INTERNAL_ERROR', message: 'Não foi possível registrar os pontos.' });
  }
});

export default router;
