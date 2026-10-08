// Seed de perfis de teste (admin/staff/participante) em /users — EXCLUSIVO do
// emulador (KAN-123). Recusa rodar sem as duas variáveis de emulador, então
// nunca escreve em Firebase real. Uso: ver docs/GUIA_DEV_EMULADORES.md.
import { createRequire } from 'node:module';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { missingEmulatorVars } from './seed-guard.mjs';

const missing = missingEmulatorVars();
if (missing.length > 0) {
  console.error(`Recusado: este seed só roda no emulador. Defina ${missing.join(' e ')} (ex: 127.0.0.1:8080 / 127.0.0.1:9099) com os emuladores rodando (npm run emulators).`);
  process.exit(1);
}

const backendDir = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'backend');
const require = createRequire(path.join(backendDir, 'package.json'));
const admin = require('firebase-admin');

const PROJECT_ID = 'facom-techweek-layerx';

if (admin.apps.length === 0) {
  admin.initializeApp({ projectId: PROJECT_ID });
}

const db = admin.firestore();

const TEST_PROFILES = [
  {
    uid: 'admin_test_uid',
    email: 'admin@admin.com',
    role: 'ADMIN',
    participantType: 'Organizador',
    participant_type: 'Organizador',
    firstName: 'Administrador',
    lastName: 'FACOM',
    fullName: 'Administrador FACOM',
    username: 'admin',
    hasSymplaTicket: true,
    course: 'Sistemas de Informação'
  },
  {
    uid: 'staff_test_uid',
    email: 'staff@techweek.com',
    role: 'STAFF',
    participantType: 'Organizador',
    participant_type: 'Organizador',
    firstName: 'Staff',
    lastName: 'Validador',
    fullName: 'Staff Validador Porta',
    username: 'staff_porta',
    hasSymplaTicket: true,
    course: 'Ciência da Computação'
  },
  {
    uid: 'aluno_test_uid',
    email: 'aluno@ufu.br',
    role: 'PARTICIPANT',
    participantType: 'Aluno da UFU',
    participant_type: 'Aluno da UFU',
    firstName: 'Aluno',
    lastName: 'UFU',
    fullName: 'Aluno Teste UFU',
    username: 'aluno_ufu',
    hasSymplaTicket: true,
    course: 'Sistemas de Informação',
    period: 4
  }
];

async function seedProfiles() {
  console.log('Seeding 3 perfis de teste no Firestore...');
  const now = new Date().toISOString();

  for (const prof of TEST_PROFILES) {
    const docRef = db.collection('users').doc(prof.uid);
    const data = {
      ...prof,
      createdAt: now,
      updatedAt: now,
      termsAcceptedAt: now
    };
    await docRef.set(data, { merge: true });
    console.log(`✅ Perfil [${prof.role}] ${prof.email} salvo no Firestore (UID: ${prof.uid})`);
  }
}

seedProfiles().then(() => {
  console.log('Finalizado com sucesso!');
  process.exit(0);
}).catch(err => {
  console.error('Erro ao popular perfis:', err);
  process.exit(1);
});
