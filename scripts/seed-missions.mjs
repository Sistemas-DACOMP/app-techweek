// Seed do catálogo de missões/desafios em /missions (KAN-80).
//
// Migra os valores de pontos hoje hardcoded no client (src/pages/Challenges.jsx,
// src/hooks/useUser.js, src/pages/InstagramMission.jsx) pro Firestore, que é
// de onde POST /api/points/claim (backend/src/routes/points.ts) passa a ler
// o valor real a creditar — o client continua exibindo a mesma lista pra UI,
// mas não decide mais quantos pontos valem.
//
// Uso:
//   contra o Firebase Emulator Suite local (padrão, seguro, idempotente):
//     npm run emulators            (outro terminal, deixar rodando)
//     npm run seed:missions
//
//   contra homolog/prod (precisa credencial real — `gcloud auth
//   application-default login` ou GOOGLE_APPLICATION_CREDENTIALS apontando
//   pra uma service account; nenhuma das duas está configurada nesta
//   máquina no momento em que este script foi escrito, então NUNCA foi
//   testado contra um projeto real — só contra o emulador):
//     npm run seed:missions -- --yes
//
// Idempotente: usa `set` (não `create`), rodar de novo só sobrescreve os
// mesmos 16 docs com os mesmos valores — seguro re-rodar.
//
// firebase-admin não é dependência da raiz do repo — só do backend/. Mesmo
// truque de scripts/load-test-booking.mjs: resolve o módulo a partir de
// backend/ em vez de duplicar a dependência aqui.
import { createRequire } from 'node:module';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const rootDir = path.dirname(fileURLToPath(import.meta.url)) + '/..';
const backendDir = path.join(rootDir, 'backend');
const require = createRequire(path.join(backendDir, 'package.json'));
const admin = require('firebase-admin');

const PROJECT_ID = 'facom-techweek-layerx';

// Catálogo migrado — cada chave é o id da missão. Pra eventType 'challenge'/
// 'manual_challenge' o id bate com o `challenge.id` de Challenges.jsx; 'scan'
// é a chave fixa usada pra qualquer QR escaneado (ver resolveMissionId em
// backend/src/routes/points.ts).
const MISSIONS = {
  scan: 5,
  network_first: 10,
  network_course: 15,
  network_type: 15,
  network_period: 15,
  network_career: 20,
  network_connect_two: 20,
  network_past_edition: 15,
  network_first_edition: 15,
  sponsor_visit: 15,
  sponsor_vaga: 20,
  sponsor_tecnologia: 20,
  sponsor_colecao: 50,
  secret_password: 30,
  secret_qr: 40,
  instagram_story: 50
};

async function main() {
  const usingEmulator = !!process.env.FIRESTORE_EMULATOR_HOST;
  const confirmed = process.argv.includes('--yes');

  if (!usingEmulator && !confirmed) {
    console.error(
      'FIRESTORE_EMULATOR_HOST não está setado — isso escreveria direto no projeto ' +
      `real (${PROJECT_ID}). Rode "npm run emulators" num outro terminal e tente de ` +
      'novo pra testar local, ou passe --yes se a intenção é mesmo seedar homolog/prod ' +
      '(precisa de credencial real via gcloud auth application-default login ou ' +
      'GOOGLE_APPLICATION_CREDENTIALS — nunca testado contra projeto real ainda).'
    );
    process.exit(1);
  }

  admin.initializeApp({ projectId: PROJECT_ID });
  const db = admin.firestore();

  const entries = Object.entries(MISSIONS);
  console.log(`Seedando ${entries.length} missões em /missions (${usingEmulator ? 'emulador' : 'PROJETO REAL: ' + PROJECT_ID})...`);

  const batch = db.batch();
  for (const [missionId, points] of entries) {
    batch.set(db.collection('missions').doc(missionId), { points });
  }
  await batch.commit();

  console.log('OK:', entries.map(([id, pts]) => `${id}=${pts}`).join(', '));
}

main().catch((error) => {
  console.error('Falha ao seedar missões:', error);
  process.exit(1);
});
