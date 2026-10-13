#!/usr/bin/env node
/**
 * CLI Administrativo: Aplicação de Custom Claims no Firebase Auth (KAN-116 / KAN-60 / KAN-81).
 *
 * Uso:
 *   node scripts/set-admin-claim.mjs <uid_ou_email> [ROLE]
 *
 * Exemplos:
 *   node scripts/set-admin-claim.mjs sam03amorim@gmail.com ADMIN
 *   node scripts/set-admin-claim.mjs user_xyz STAFF
 *   node scripts/set-admin-claim.mjs admin_test_uid ADMIN
 *
 * Suporta emulador local (quando FIREBASE_AUTH_EMULATOR_HOST estiver setado)
 * ou ambiente real (Google Application Default Credentials / Service Account).
 */

import { createRequire } from 'node:module';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const target = process.argv[2];
const role = (process.argv[3] || 'ADMIN').toUpperCase();

if (!target) {
  console.error(`
Uso: node scripts/set-admin-claim.mjs <uid_ou_email> [ROLE]

Exemplos:
  node scripts/set-admin-claim.mjs sam03amorim@gmail.com ADMIN
  node scripts/set-admin-claim.mjs staff@techweek.com STAFF
  node scripts/set-admin-claim.mjs aluno@ufu.br PARTICIPANT
`);
  process.exit(1);
}

const ALLOWED_ROLES = ['ADMIN', 'STAFF', 'SPONSOR', 'PARTICIPANT'];
if (!ALLOWED_ROLES.includes(role)) {
  console.error(`Erro: ROLE inválida "${role}". Deve ser uma de: ${ALLOWED_ROLES.join(', ')}.`);
  process.exit(1);
}

const backendDir = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'backend');
const require = createRequire(path.join(backendDir, 'package.json'));
const admin = require('firebase-admin');

const PROJECT_ID = process.env.GCLOUD_PROJECT || 'facom-techweek-layerx';

if (admin.apps.length === 0) {
  admin.initializeApp({
    projectId: PROJECT_ID
  });
}

const auth = admin.auth();
const db = admin.firestore();

async function run() {
  const isEmulator = Boolean(process.env.FIREBASE_AUTH_EMULATOR_HOST);
  console.log(`🔧 Modo: ${isEmulator ? `Emulador (${process.env.FIREBASE_AUTH_EMULATOR_HOST})` : 'Produção / Nuvem'}`);
  console.log(`🔍 Buscando usuário: "${target}"...`);

  let userRecord;
  try {
    if (target.includes('@')) {
      userRecord = await auth.getUserByEmail(target.trim().toLowerCase());
    } else {
      userRecord = await auth.getUser(target.trim());
    }
  } catch (err) {
    console.error(`❌ Erro ao localizar usuário no Firebase Auth:`, err.message || err);
    process.exit(1);
  }

  const uid = userRecord.uid;
  const email = userRecord.email || '(sem e-mail)';
  console.log(`👤 Usuário localizado: ${uid} [${email}]`);

  const currentClaims = userRecord.customClaims || {};
  console.log(`📋 Claims atuais:`, currentClaims);

  const newClaims = {
    ...currentClaims,
    role,
    admin: role === 'ADMIN'
  };

  await auth.setCustomUserClaims(uid, newClaims);
  console.log(`🔑 Novas Custom Claims aplicadas com sucesso:`, newClaims);

  // Sincroniza também no Firestore se o documento existir
  try {
    const userRef = db.collection('users').doc(uid);
    const snap = await userRef.get();
    if (snap.exists) {
      await userRef.update({
        role,
        updatedAt: admin.firestore.FieldValue.serverTimestamp()
      });
      console.log(`💾 Documento /users/${uid} sincronizado no Firestore com role: "${role}".`);
    } else {
      console.log(`ℹ️ Documento /users/${uid} ainda não existe no Firestore (será criado no primeiro login/onboarding).`);
    }
  } catch (dbErr) {
    console.warn(`⚠️ Aviso: Não foi possível atualizar o Firestore (/users/${uid}):`, dbErr.message || dbErr);
  }

  console.log(`\n🎉 Concluído! Para que o usuário obtenha o token atualizado, ele deve fazer login novamente ou chamar getIdToken(true).`);
}

run().catch((err) => {
  console.error(`❌ Falha na execução do script:`, err);
  process.exit(1);
});

