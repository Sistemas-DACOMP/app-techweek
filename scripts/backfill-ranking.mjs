/**
 * Script de reconciliação e backfill do Ranking (TechWeek 2026).
 *
 * Varre:
 *  - /users/{uid}
 *  - /users/{uid}/point_events/*
 *  - /pointEvents/*
 *  - /ranking/{uid}
 *
 * E consolida em `/users/{uid}` e `/ranking/{uid}` os campos `totalPoints`,
 * `pontuacaoTotal`, `role`, `firstName`, `username`, `displayName`, etc.,
 * garantindo que todos os participantes apareçam no Ranking com sua pontuação real.
 *
 * Uso:
 *   node scripts/backfill-ranking.mjs
 */

import { createRequire } from 'node:module';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const requireFromBackend = createRequire(path.join(__dirname, '..', 'backend', 'package.json'));
const admin = requireFromBackend('firebase-admin');

if (!admin.apps.length) {
  const projectId =
    process.env.GCLOUD_PROJECT ||
    process.env.GOOGLE_CLOUD_PROJECT ||
    process.env.VITE_FIREBASE_PROJECT_ID ||
    'techweek-ufu-2026';
  admin.initializeApp({ projectId });
}

const db = admin.firestore();

function isNonParticipant(role) {
  if (role === 'ADMIN' || role === 'STAFF' || role === 'SPONSOR') return true;
  return false;
}

async function runBackfill() {
  console.log('[backfill-ranking] Iniciando reconciliação de /users, /pointEvents e /ranking...');

  const [usersSnap, rankingSnap, rootEventsSnap] = await Promise.all([
    db.collection('users').get(),
    db.collection('ranking').get(),
    db.collection('pointEvents').get()
  ]);

  const usersByUid = new Map();
  for (const docSnap of usersSnap.docs) {
    usersByUid.set(docSnap.id, { id: docSnap.id, ...docSnap.data() });
  }

  const rankingByUid = new Map();
  for (const docSnap of rankingSnap.docs) {
    rankingByUid.set(docSnap.id, { id: docSnap.id, ...docSnap.data() });
  }

  // Agrupa eventos da coleção raiz /pointEvents por userId e referenceId
  const eventsByUid = new Map();
  for (const docSnap of rootEventsSnap.docs) {
    const data = docSnap.data() || {};
    const uid = data.userId || data.user_id;
    if (!uid) continue;
    if (!eventsByUid.has(uid)) eventsByUid.set(uid, new Map());
    const refKey = data.referenceId || data.reference_id || docSnap.id;
    eventsByUid.get(uid).set(refKey, Math.max(0, Number(data.points) || 0));
  }

  // Coleta todos os UIDs conhecidos em qualquer uma das coleções
  const allUids = new Set([
    ...usersByUid.keys(),
    ...rankingByUid.keys(),
    ...eventsByUid.keys()
  ]);

  let syncedCount = 0;
  let skippedStaffCount = 0;

  for (const uid of allUids) {
    const userDoc = usersByUid.get(uid) || {};
    const rankDoc = rankingByUid.get(uid) || {};

    // Também lê subcoleção /users/{uid}/point_events
    const subEventsSnap = await db.collection('users').doc(uid).collection('point_events').get();
    if (!eventsByUid.has(uid)) eventsByUid.set(uid, new Map());
    const userEventMap = eventsByUid.get(uid);
    for (const subDoc of subEventsSnap.docs) {
      const subData = subDoc.data() || {};
      const refKey = subData.referenceId || subData.reference_id || subDoc.id;
      const pts = Math.max(0, Number(subData.points) || 0);
      userEventMap.set(refKey, Math.max(userEventMap.get(refKey) || 0, pts));
    }

    let summedEventPoints = 0;
    for (const pts of userEventMap.values()) {
      summedEventPoints += pts;
    }

    const email = userDoc.email || rankDoc.email || '';
    const role = userDoc.role || rankDoc.role || 'PARTICIPANT';

    if (isNonParticipant(role)) {
      skippedStaffCount++;
      continue;
    }

    const resolvedPoints = Math.max(
      0,
      Number(userDoc.pontuacaoTotal ?? 0) || 0,
      Number(userDoc.totalPoints ?? 0) || 0,
      Number(rankDoc.pontuacaoTotal ?? 0) || 0,
      Number(rankDoc.totalPoints ?? 0) || 0,
      summedEventPoints
    );

    const firstName =
      userDoc.firstName ||
      userDoc.first_name ||
      rankDoc.firstName ||
      rankDoc.first_name ||
      (userDoc.displayName ? String(userDoc.displayName).trim().split(' ')[0] : '') ||
      (email ? String(email).split('@')[0] : '') ||
      'Participante';
    const lastName = userDoc.lastName || userDoc.last_name || rankDoc.lastName || rankDoc.last_name || '';
    const username =
      userDoc.username ||
      rankDoc.username ||
      (email ? String(email).split('@')[0] : '') ||
      firstName ||
      'user';
    const displayName =
      userDoc.displayName ||
      rankDoc.displayName ||
      [firstName, lastName].filter(Boolean).join(' ').trim() ||
      firstName;
    const avatarUrl =
      userDoc.avatarUrl ||
      userDoc.photoURL ||
      rankDoc.avatarUrl ||
      rankDoc.photoURL ||
      null;
    const course = userDoc.course || rankDoc.course || '';
    const mascot = userDoc.mascot || rankDoc.mascot || 'blue';
    const now = admin.firestore.FieldValue.serverTimestamp();

    await Promise.all([
      db.collection('users').doc(uid).set(
        {
          uid,
          role: 'PARTICIPANT',
          firstName,
          lastName,
          displayName,
          username,
          avatarUrl,
          course,
          mascot,
          totalPoints: resolvedPoints,
          pontuacaoTotal: resolvedPoints,
          updatedAt: now
        },
        { merge: true }
      ),
      db.collection('ranking').doc(uid).set(
        {
          uid,
          role: 'PARTICIPANT',
          firstName,
          lastName,
          displayName,
          username,
          avatarUrl,
          course,
          mascot,
          totalPoints: resolvedPoints,
          pontuacaoTotal: resolvedPoints,
          updatedAt: now
        },
        { merge: true }
      )
    ]);

    syncedCount++;
  }

  console.log(
    `[backfill-ranking] Concluído! Participantes sincronizados: ${syncedCount} | Staff/Admin/Sponsor ignorados: ${skippedStaffCount}`
  );
}

runBackfill().catch((err) => {
  console.error('[backfill-ranking] Erro fatal:', err);
  process.exit(1);
});

