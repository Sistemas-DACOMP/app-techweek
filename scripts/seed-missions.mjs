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

// Catálogo migrado com metadados completos para inicialização no Firestore (KAN-106).
const MISSIONS_CATALOG = [
  {
    id: 'instagram_story',
    title: 'Post no Stories',
    description: 'Abra a câmera oficial, tire ou envie uma foto com a moldura TechWeek e compartilhe.',
    category: 'social',
    points: 50,
    icon: 'Camera',
    status: 'active',
    type: 'action',
    triggerMode: 'action',
    actionRoute: '/instagram-mission',
    fields: [
      { id: 'photo', type: 'photo', label: 'Envie a foto ou print do seu Story', required: true }
    ],
    order: 1
  },
  {
    id: 'sponsor_visit',
    title: 'Conheça Kanastra',
    description: 'Visite o stand e escaneie o QR Code oficial.',
    category: 'sponsors',
    points: 15,
    icon: 'MapPin',
    status: 'active',
    type: 'auto',
    triggerMode: 'auto',
    autoConfig: {
      eventType: 'sponsor_visit',
      targetId: 'Kanastra'
    },
    order: 2
  },
  {
    id: 'sponsor_vaga',
    title: 'De Olho na Vaga',
    description: 'Converse com alguém da empresa sobre oportunidades para estudantes.',
    category: 'sponsors',
    points: 20,
    icon: 'MessageCircle',
    status: 'active',
    type: 'manual',
    triggerMode: 'form',
    fields: [
      { id: 'company', type: 'select', label: 'Qual empresa foi?', options: ['Levty', 'Kanastra', 'Sankhya', 'Neospace', 'Sebrae', 'Outra'], required: true }
    ],
    order: 3
  },
  {
    id: 'sponsor_tecnologia',
    title: 'Descubra a Tecnologia',
    description: 'Pergunte qual tecnologia está transformando o trabalho da empresa.',
    category: 'sponsors',
    points: 20,
    icon: 'MessageCircle',
    status: 'active',
    type: 'manual',
    triggerMode: 'form',
    fields: [
      { id: 'company', type: 'select', label: 'Qual empresa foi?', options: ['Levty', 'Kanastra', 'Sankhya', 'Neospace', 'Sebrae', 'Outra'], required: true },
      { id: 'response', type: 'textarea', label: 'Qual tecnologia eles usam?', required: true }
    ],
    order: 4
  },
  {
    id: 'sponsor_colecao',
    title: 'Colecione Patrocinadores',
    description: 'Complete seu passaporte visitando todos os stands.',
    category: 'sponsors',
    points: 50,
    icon: 'QrCode',
    status: 'active',
    type: 'auto',
    triggerMode: 'auto',
    autoConfig: {
      eventType: 'passport_complete'
    },
    order: 5
  },
  {
    id: 'secret_password',
    title: 'Missão Secreta',
    description: 'Descubra a palavra-chave escondida no stand da Kanastra.',
    category: 'sponsors',
    points: 30,
    icon: 'Lock',
    status: 'active',
    type: 'manual',
    triggerMode: 'secret',
    isSecret: true,
    secretConfig: {
      secretWord: 'OPORTUNIDADES'
    },
    fields: [
      { id: 'password', type: 'password', label: 'Qual a palavra-chave?', required: true }
    ],
    order: 6
  },
  {
    id: 'secret_qr',
    title: 'Caça ao QR Code',
    description: 'Encontre o QR Code escondido antes que termine.',
    category: 'sponsors',
    points: 40,
    icon: 'Search',
    status: 'active',
    type: 'auto',
    triggerMode: 'auto',
    isSecret: true,
    autoConfig: {
      eventType: 'secret_qr',
      targetId: 'QR_HUNT_MASTER'
    },
    order: 7
  },
  {
    id: 'network_course',
    title: 'Outro Curso',
    description: 'Conecte-se com alguém de um curso diferente.',
    category: 'networking',
    points: 15,
    icon: 'Users',
    status: 'active',
    type: 'auto',
    triggerMode: 'auto',
    autoConfig: {
      eventType: 'network_course'
    },
    order: 8
  },
  {
    id: 'network_type',
    title: 'Fora da UFU',
    description: 'Encontre alguém de outra instituição ou empresa.',
    category: 'networking',
    points: 15,
    icon: 'Users',
    status: 'active',
    type: 'auto',
    triggerMode: 'auto',
    autoConfig: {
      eventType: 'network_external'
    },
    order: 9
  },
  {
    id: 'network_first',
    title: 'Primeira Conexão',
    description: 'Faça sua primeira conexão na TechWeek.',
    category: 'networking',
    points: 10,
    icon: 'Users',
    status: 'active',
    type: 'auto',
    triggerMode: 'auto',
    autoConfig: {
      eventType: 'network_first'
    },
    order: 10
  },
  {
    id: 'network_period',
    title: 'Calouro na Área',
    description: 'Conecte-se com alguém do primeiro período.',
    category: 'networking',
    points: 15,
    icon: 'Users',
    status: 'active',
    type: 'auto',
    triggerMode: 'auto',
    autoConfig: {
      eventType: 'network_freshman'
    },
    order: 11
  },
  {
    id: 'network_career',
    title: 'Sua Área',
    description: 'Encontre alguém da área que quer seguir.',
    category: 'networking',
    points: 20,
    icon: 'MessageCircle',
    status: 'active',
    type: 'manual',
    triggerMode: 'form',
    fields: [
      { id: 'prompt1', type: 'text', label: 'Qual o @/user da pessoa?', required: true },
      { id: 'prompt2', type: 'textarea', label: 'Qual foi o 1º passo dela na carreira?', required: true }
    ],
    order: 12
  },
  {
    id: 'network_connect_two',
    title: 'Conector',
    description: 'Apresente duas pessoas que devem se conhecer.',
    category: 'networking',
    points: 20,
    icon: 'MessageCircle',
    status: 'active',
    type: 'manual',
    triggerMode: 'form',
    fields: [
      { id: 'prompt1', type: 'text', label: 'Qual o @/user da 1ª pessoa?', required: true },
      { id: 'prompt2', type: 'text', label: 'Qual o @/user da 2ª pessoa?', required: true }
    ],
    order: 13
  },
  {
    id: 'network_past_edition',
    title: 'Veterano',
    description: 'Encontre alguém de edições passadas.',
    category: 'networking',
    points: 15,
    icon: 'MessageCircle',
    status: 'active',
    type: 'manual',
    triggerMode: 'form',
    fields: [
      { id: 'prompt1', type: 'text', label: 'Qual o @/user da pessoa?', required: true },
      { id: 'prompt2', type: 'textarea', label: 'Qual foi a melhor experiência dela?', required: true }
    ],
    order: 14
  },
  {
    id: 'network_first_edition',
    title: 'Novato',
    description: 'Encontre alguém novato e mostre o app.',
    category: 'networking',
    points: 15,
    icon: 'MessageCircle',
    status: 'active',
    type: 'manual',
    triggerMode: 'form',
    fields: [
      { id: 'prompt1', type: 'text', label: 'Qual o @/user da pessoa?', required: true },
      { id: 'prompt2', type: 'textarea', label: 'O que você mostrou para ela?', required: true }
    ],
    order: 15
  },
  {
    id: 'sponsor_quiz_levty',
    title: 'Quiz Levty: Tecnologia',
    description: 'Responda qual tecnologia é amplamente utilizada pela Levty.',
    category: 'sponsors',
    points: 30,
    icon: 'HelpCircle',
    status: 'active',
    type: 'manual',
    triggerMode: 'quiz',
    quizConfig: {
      question: 'Qual dessas plataformas proprietárias é utilizada no dia a dia da Levty?',
      options: ['SYDLE ONE', 'SAP NetWeaver', 'Oracle ERP Cloud', 'Salesforce CRM'],
      correctOptionIndex: 0
    },
    order: 16
  },
  {
    id: 'social_mascot_photo',
    title: 'Foto com Teko e Weeka',
    description: 'Encontre os mascotes pelo evento e registre o momento!',
    category: 'social',
    points: 40,
    icon: 'Camera',
    status: 'active',
    type: 'manual',
    triggerMode: 'form',
    fields: [
      { id: 'photo', type: 'photo', label: 'Envie a foto com os mascotes', required: true }
    ],
    order: 17
  },
  {
    id: 'scan',
    title: 'Check-in / Scan QR',
    description: 'Pontos por escanear QR codes pelo evento.',
    category: 'event',
    points: 5,
    icon: 'QrCode',
    status: 'active',
    type: 'auto',
    triggerMode: 'auto',
    order: 0
  }
];

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

  console.log(`Seedando ${MISSIONS_CATALOG.length} missões em /missions (${usingEmulator ? 'emulador' : 'PROJETO REAL: ' + PROJECT_ID})...`);

  const batch = db.batch();
  for (const mission of MISSIONS_CATALOG) {
    const { id, ...data } = mission;
    batch.set(db.collection('missions').doc(id), {
      ...data,
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    }, { merge: true });
  }
  await batch.commit();

  console.log('OK:', MISSIONS_CATALOG.map((m) => `${m.id}=${m.points}`).join(', '));
}

main().catch((error) => {
  console.error('Falha ao seedar missões:', error);
  process.exit(1);
});
