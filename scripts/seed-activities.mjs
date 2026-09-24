// Seed do catálogo de atividades em /activities (KAN-50).
//
// Popula o Firestore com as palestras, minicursos, workshops e ativações
// da FACOM Tech Week para teste no emulador local ou homologação.
//
// Uso:
//   npm run seed:activities

import { createRequire } from 'node:module';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const rootDir = path.dirname(fileURLToPath(import.meta.url)) + '/..';
const backendDir = path.join(rootDir, 'backend');
const require = createRequire(path.join(backendDir, 'package.json'));
const admin = require('firebase-admin');

const PROJECT_ID = 'facom-techweek-layerx';
const FIRESTORE_EMULATOR_HOST = process.env.FIRESTORE_EMULATOR_HOST || '127.0.0.1:8080';
process.env.FIRESTORE_EMULATOR_HOST = FIRESTORE_EMULATOR_HOST;

const ACTIVITIES = [
  {
    id: 'palestra_abertura',
    title: 'Palestra de Abertura: O Futuro da Computação e IA',
    description: 'Boas-vindas oficiais e palestra magna sobre as principais tendências tecnológicas.',
    speaker: 'Comissão Organizadora & Convidados',
    type: 'palestra',
    day: '19/10',
    date: '2026-10-19',
    time: '19:00',
    location: 'Anfiteatro principal',
    vagas_disponiveis: 120,
    vagas_totais: 150,
    total_inscritos: 0,
    total_espera: 0,
    points: 20,
    attendanceMode: 'SELF_SCAN'
  },
  {
    id: 'palestra_samuel_amorim',
    title: 'Palestra: Dev que não aparece, não cresce',
    description: 'Como construir sua marca técnica, portfólio de impacto e se destacar no mercado.',
    speaker: 'Samuel Amorim',
    type: 'palestra',
    day: '19/10',
    date: '2026-10-19',
    time: '20:00',
    location: 'Sala 5R',
    vagas_disponiveis: 50,
    vagas_totais: 60,
    total_inscritos: 0,
    total_espera: 0,
    points: 20,
    attendanceMode: 'SELF_SCAN'
  },
  {
    id: 'workshop_firebase_node',
    title: 'Workshop: Arquitetura Serverless com Firebase e Node',
    description: 'Construção prática de backend serverless, Cloud Functions, regras de segurança e banco em tempo real.',
    speaker: 'Equipe de Engenharia TechWeek',
    type: 'workshop',
    day: '20/10',
    date: '2026-10-20',
    time: '14:00',
    location: 'Laboratório 1 - FACOM',
    vagas_disponiveis: 25,
    vagas_totais: 30,
    total_inscritos: 0,
    total_espera: 0,
    points: 35,
    attendanceMode: 'DOUBLE_CHECK'
  },
  {
    id: 'minicurso_agentes_ia',
    title: 'Minicurso: Agentes Autônomos e Engenharia de Contexto',
    description: 'Aprenda a orquestrar agentes de IA, tooling, loops de feedback e automações completas de software.',
    speaker: 'Dra. Aline Souza & Time IA',
    type: 'minicurso',
    day: '21/10',
    date: '2026-10-21',
    time: '15:30',
    location: 'Laboratório 2 - FACOM',
    vagas_disponiveis: 18,
    vagas_totais: 25,
    total_inscritos: 0,
    total_espera: 0,
    points: 40,
    attendanceMode: 'DOUBLE_CHECK'
  },
  {
    id: 'ativacao_stands_tech',
    title: 'Ativação: Speed Pitch & Networking com Patrocinadores',
    description: 'Conecte-se diretamente com líderes de empresas, descubra oportunidades de estágio e ganhe brindes.',
    speaker: 'Empresas Patrocinadoras',
    type: 'ativacao',
    day: '22/10',
    date: '2026-10-22',
    time: '10:00',
    location: 'Hall Central de Estandes',
    vagas_disponiveis: 80,
    vagas_totais: 100,
    total_inscritos: 0,
    total_espera: 0,
    points: 15,
    attendanceMode: 'SELF_SCAN'
  }
];

async function main() {
  admin.initializeApp({ projectId: PROJECT_ID });
  const db = admin.firestore();

  console.log(`Seedando ${ACTIVITIES.length} atividades em /activities no emulador (${FIRESTORE_EMULATOR_HOST})...`);

  const batch = db.batch();
  for (const act of ACTIVITIES) {
    const { id, ...data } = act;
    batch.set(db.collection('activities').doc(id), data, { merge: true });
  }
  await batch.commit();

  console.log('OK! Atividades criadas com sucesso no Firestore:');
  ACTIVITIES.forEach((a) => console.log(` - [${a.id}] ${a.title} (${a.vagas_disponiveis} vagas)`));
}

main().catch((error) => {
  console.error('Falha ao seedar atividades:', error);
  process.exit(1);
});
