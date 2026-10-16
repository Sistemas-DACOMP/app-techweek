/**
 * Script de migração e backfill de /public_profiles (TechWeek 2026 - KAN-137).
 *
 * Objetivo:
 *   Varre a coleção /users/{uid} com privilégios de Admin SDK e extrai
 *   exclusivamente os dados públicos (nome, username, curso, redes, pontos, etc.),
 *   persistindo em /public_profiles/{uid}.
 *   Campos sensíveis (email, phone, termsAcceptedAt, symplaTicket, companyId, etc.)
 *   são estritamente omitidos para proteger a privacidade e cumprir a LGPD.
 *
 * Uso:
 *   node scripts/backfill-public-profiles.mjs
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

const PUBLIC_PROFILE_ALLOWED_KEYS = new Set([
  'uid',
  'role',
  'firstName',
  'lastName',
  'displayName',
  'username',
  'participantType',
  'participant_type',
  'course',
  'period',
  'institution',
  'linkedin',
  'instagram',
  'github',
  'avatarUrl',
  'photoURL',
  'mascot',
  'totalPoints',
  'pontuacaoTotal',
  'updatedAt',
  'createdAt'
]);

export function buildPublicProfileDoc(userData, uid) {
  const out = { uid };

  for (const [key, val] of Object.entries(userData || {})) {
    if (!PUBLIC_PROFILE_ALLOWED_KEYS.has(key)) continue;
    if (val === undefined || val === null) continue;

    // Sanitizações de tamanho e tipo
    if (typeof val === 'string') {
      const trimmed = val.trim();
      if (!trimmed) continue;
      if (key === 'username') {
        out.username = trimmed.replace(/^@/, '').toLowerCase();
      } else if (key === 'avatarUrl' || key === 'photoURL') {
        if (trimmed.length <= 500) out[key] = trimmed;
      } else if (trimmed.length <= 200) {
        out[key] = trimmed;
      }
    } else if (key === 'period' && typeof val === 'number') {
      out.period = val;
    } else if ((key === 'totalPoints' || key === 'pontuacaoTotal') && !Number.isNaN(Number(val))) {
      out[key] = Math.max(0, Math.min(100000, Number(val)));
    } else if (key === 'updatedAt' || key === 'createdAt') {
      out[key] = val;
    }
  }

  // Garantir displayName se tiver firstName/lastName
  if (!out.displayName && (out.firstName || out.lastName)) {
    out.displayName = [out.firstName, out.lastName].filter(Boolean).join(' ');
  }

  // Garantir role padrão
  if (!out.role) {
    out.role = 'PARTICIPANT';
  }

  return out;
}

async function runBackfill() {
  console.log('[backfill-public-profiles] Iniciando backfill de /users -> /public_profiles...');
  const startTime = Date.now();

  const usersSnap = await db.collection('users').get();
  console.log(`[backfill-public-profiles] ${usersSnap.docs.length} documentos encontrados em /users.`);

  if (usersSnap.empty) {
    console.log('[backfill-public-profiles] Nenhum documento para migrar.');
    return;
  }

  let batch = db.batch();
  let opCount = 0;
  let batchIndex = 0;
  let migratedCount = 0;

  for (const docSnap of usersSnap.docs) {
    const uid = docSnap.id;
    const userData = docSnap.data() || {};

    const publicProfile = buildPublicProfileDoc(userData, uid);
    const pubRef = db.collection('public_profiles').doc(uid);

    batch.set(pubRef, publicProfile, { merge: true });
    opCount++;
    migratedCount++;

    if (opCount >= 400) {
      batchIndex++;
      console.log(`[backfill-public-profiles] Commitando batch #${batchIndex} com ${opCount} operações...`);
      await batch.commit();
      batch = db.batch();
      opCount = 0;
    }
  }

  if (opCount > 0) {
    batchIndex++;
    console.log(`[backfill-public-profiles] Commitando batch final #${batchIndex} com ${opCount} operações...`);
    await batch.commit();
  }

  const durationMs = Date.now() - startTime;
  console.log(`[backfill-public-profiles] Concluído com sucesso! ${migratedCount} perfis públicos sincronizados em ${durationMs}ms.`);
}

// Executa se chamado diretamente
if (process.argv[1] && process.argv[1].endsWith('backfill-public-profiles.mjs')) {
  runBackfill()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error('[backfill-public-profiles] Erro fatal no backfill:', err);
      process.exit(1);
    });
}
