// Seed das 5 empresas patrocinadoras existentes em /sponsors (KAN-124).
//
// Cria sponsors/{companyId} com legacyCompanyId, ligando o passaporte/leads
// antigos ao novo modelo. Idempotente: doc já existente é só reportado (nunca
// sobrescrito). DRY-RUN por padrão.
//
// Uso:
//   node scripts/seed-sponsors.mjs                  # dry-run, só mostra o plano
//   node scripts/seed-sponsors.mjs --apply          # grava (exige emulador ligado)
//   node scripts/seed-sponsors.mjs --apply --allow-real-project   # grava no projeto real

import { createRequire } from 'node:module';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const rootDir = path.dirname(fileURLToPath(import.meta.url)) + '/..';
const require = createRequire(path.join(rootDir, 'backend', 'package.json'));
const admin = require('firebase-admin');

const PROJECT_ID = 'facom-techweek-layerx';
const APPLY = process.argv.includes('--apply');
const ALLOW_REAL = process.argv.includes('--allow-real-project');

const SPONSORS = [
  { id: 'kanastra', name: 'Kanastra', tier: 'DIAMANTE', teamLimit: 5 },
  { id: 'bayer', name: 'Bayer', tier: 'OURO', teamLimit: 4 },
  { id: 'aimirim', name: 'Aimirim', tier: 'PRATA', teamLimit: 3 },
  { id: 'bip', name: 'Bip', tier: 'PRATA', teamLimit: 3 },
  { id: 'hyperflow', name: 'HyperFlow', tier: 'PRATA', teamLimit: 3 }
];

if (APPLY && !process.env.FIRESTORE_EMULATOR_HOST && !ALLOW_REAL) {
  console.error('Recusado: --apply sem FIRESTORE_EMULATOR_HOST. Suba o emulador e exporte FIRESTORE_EMULATOR_HOST (ex: 127.0.0.1:8080), ou passe --allow-real-project de propósito.');
  process.exit(1);
}

admin.initializeApp({ projectId: PROJECT_ID });
const db = admin.firestore();

console.log(APPLY ? 'MODO APPLY' : 'DRY-RUN (use --apply pra gravar)');
console.log(process.env.FIRESTORE_EMULATOR_HOST ? `Alvo: emulador ${process.env.FIRESTORE_EMULATOR_HOST}` : `Alvo: projeto REAL ${PROJECT_ID}`);

for (const s of SPONSORS) {
  const ref = db.collection('sponsors').doc(s.id);
  const exists = APPLY || process.env.FIRESTORE_EMULATOR_HOST ? (await ref.get()).exists : null;
  if (exists) {
    console.log(`= ${s.id}: já existe, mantido`);
    continue;
  }
  console.log(`${APPLY ? '+' : '~'} ${s.id}: ${s.name} (${s.tier}, equipe ${s.teamLimit})`);
  if (APPLY) {
    const now = admin.firestore.FieldValue.serverTimestamp();
    await ref.create({
      name: s.name,
      logoUrl: null,
      tier: s.tier,
      teamLimit: s.teamLimit,
      booth: null,
      allowedEmailDomain: null,
      legacyCompanyId: s.id,
      createdBy: 'seed-sponsors',
      createdAt: now,
      updatedAt: now
    });
  }
}
