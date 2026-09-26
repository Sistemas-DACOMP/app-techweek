// Teste de carga/concorrência de POST /api/activities/:id/reserve (KAN-53).
//
// SÓ roda contra o Firebase Emulator Suite local — nunca contra homolog/prod.
// Pré-requisito: emuladores no ar (`npm run emulators`) e backend compilado
// (`npm run backend:watch` ou `npm run backend:build`) ANTES de rodar este
// script. Ver docs/GUIA_DEV_EMULADORES.md.
//
// O que faz: seeda a atividade `workshop-1` com 10 vagas, cria 50 usuários
// fake no Auth emulator, dispara as 50 reservas em paralelo via Promise.all
// e confirma no Firestore que 10 ficaram CONFIRMED e 40 em WAITING_LIST.
//
// NOTA DE AMBIENTE (rodado várias vezes durante o KAN-53, 2026-09-22): o
// emulador LOCAL do Firestore (processo Java único) degrada bastante sob 50
// escritas verdadeiramente simultâneas no MESMO documento de atividade — em
// runs reais aqui, boa parte das 50 requisições levou minutos pra resolver
// (contenção otimista + retry), embora a garantia de segurança (zero
// overbooking, `vagas_disponiveis` sempre fechando certo) tenha se mantido em
// TODAS as execuções. Isso é característica conhecida do emulador (sua
// implementação de concorrência otimista não escala como a do Firestore de
// produção), não indício de bug no `booking.ts` — que já tem cobertura
// determinística em `booking.test.ts` e foi verificado também em concorrência
// real menor (5 e 20 requisições, sem problema). Se rodar este script e ele
// demorar bastante pra fechar 10/40/0, não é sinal de travamento — é o preço
// de testar contenção pesada contra o emulador local. Rodar com paciência
// (minutos, não segundos) ou reduzir TOTAL_REQUESTS/AVAILABLE_SEATS pra uma
// verificação mais rápida do dia a dia.
//
// firebase-admin não é dependência da raiz do repo — só do backend/. Em vez
// de duplicar a dependência aqui, resolve o módulo a partir de backend/
// (createRequire aponta a resolução do Node pra lá, sem precisar de um
// `npm install` extra nem de node_modules duplicado).
import { createRequire } from 'node:module';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const rootDir = path.dirname(fileURLToPath(import.meta.url)) + '/..';
const backendDir = path.join(rootDir, 'backend');
const require = createRequire(path.join(backendDir, 'package.json'));
const admin = require('firebase-admin');

// Portas e projeto conforme firebase.json / .firebaserc; região e nome da
// function conforme backend/src/index.ts (export const api = onRequest(...)).
const PROJECT_ID = 'facom-techweek-layerx';
const REGION = 'us-east1';
const FUNCTIONS_HOST = `http://127.0.0.1:5001/${PROJECT_ID}/${REGION}/api`;
const AUTH_EMULATOR_HOST = '127.0.0.1:9099';
const FIRESTORE_EMULATOR_HOST = '127.0.0.1:8080';

const ACTIVITY_ID = 'workshop-1';
const AVAILABLE_SEATS = 10;
const TOTAL_REQUESTS = 50;
const RUN_ID = Date.now();

process.env.FIRESTORE_EMULATOR_HOST = FIRESTORE_EMULATOR_HOST;
process.env.FIREBASE_AUTH_EMULATOR_HOST = AUTH_EMULATOR_HOST;

admin.initializeApp({ projectId: PROJECT_ID });
const db = admin.firestore();
const auth = admin.auth();

async function seedActivity() {
  await db.collection('activities').doc(ACTIVITY_ID).set({
    nome: 'Workshop de Carga (KAN-53)',
    vagas_disponiveis: AVAILABLE_SEATS,
    total_inscritos: 0,
    total_espera: 0
  });
}

// Admin SDK não emite ID token diretamente (só custom token). Troca o custom
// token por um ID token de verdade via REST do Auth emulator — é o caminho
// oficial pra isso em ambiente de emulador (sem API key real, "key" pode ser
// qualquer string; singleProjectMode em firebase.json cobre a validação de projeto).
async function createParticipant(index) {
  const uid = `loadtest-${RUN_ID}-${index}`;
  await auth.createUser({ uid, email: `${uid}@example.com` });
  const customToken = await auth.createCustomToken(uid);

  const res = await fetch(
    `http://${AUTH_EMULATOR_HOST}/identitytoolkit.googleapis.com/v1/accounts:signInWithCustomToken?key=fake-api-key`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token: customToken, returnSecureToken: true })
    }
  );
  const body = await res.json();
  if (!res.ok || !body.idToken) {
    throw new Error(`Falha ao trocar custom token por ID token (uid=${uid}): ${JSON.stringify(body)}`);
  }
  return { uid, idToken: body.idToken };
}

// Timeout por requisição: o emulador LOCAL do Firestore degrada bastante sob
// contenção alta (muitos writers concorrentes no mesmo doc de atividade) —
// já visto nesta sessão requisição isolada ficar presa ~5min sem isso (perto
// do timeout default de 300s do fetch do Node). Isso é limite conhecido do
// emulador, não do booking.ts (a transação em si já tem cobertura de teste
// unitário determinística e foi verificada em concorrência real menor,
// 5-20 requisições). 3min dá folga generosa sem mascarar um travamento real.
const REQUEST_TIMEOUT_MS = 180_000;

async function reserve(participant) {
  const startedAt = performance.now();
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  try {
    const res = await fetch(`${FUNCTIONS_HOST}/api/activities/${ACTIVITY_ID}/reserve`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${participant.idToken}` },
      signal: controller.signal
    });
    const durationMs = performance.now() - startedAt;
    let body = null;
    try { body = await res.json(); } catch { /* corpo vazio/inválido não impede o relatório */ }
    return { uid: participant.uid, httpStatus: res.status, body, durationMs };
  } catch (error) {
    const timedOut = error.name === 'AbortError';
    return {
      uid: participant.uid,
      httpStatus: null,
      error: timedOut ? `timeout após ${REQUEST_TIMEOUT_MS}ms` : error.message,
      durationMs: performance.now() - startedAt
    };
  } finally {
    clearTimeout(timeoutId);
  }
}

function printReport(results, totalMs) {
  const httpStatusCounts = new Map();
  for (const r of results) {
    const key = r.httpStatus ?? 'ERRO_REDE';
    httpStatusCounts.set(key, (httpStatusCounts.get(key) ?? 0) + 1);
  }
  const avgMs = results.reduce((sum, r) => sum + r.durationMs, 0) / results.length;

  console.log('\n--- Relatório de carga ---');
  console.log(`Requisições: ${results.length}`);
  console.log(`Tempo total (Promise.all): ${totalMs.toFixed(1)}ms`);
  console.log(`Tempo médio por requisição: ${avgMs.toFixed(1)}ms`);
  console.log('Status HTTP recebidos:', Object.fromEntries(httpStatusCounts));
}

async function main() {
  console.log(`Seedando ${ACTIVITY_ID} com ${AVAILABLE_SEATS} vagas...`);
  await seedActivity();

  console.log(`Criando ${TOTAL_REQUESTS} participantes de teste no Auth emulator...`);
  const participants = await Promise.all(
    Array.from({ length: TOTAL_REQUESTS }, (_, i) => createParticipant(i))
  );

  console.log(`Disparando ${TOTAL_REQUESTS} reservas em paralelo contra ${FUNCTIONS_HOST}/api/activities/${ACTIVITY_ID}/reserve ...`);
  const startedAt = performance.now();
  const results = await Promise.all(participants.map(reserve));
  const totalMs = performance.now() - startedAt;

  printReport(results, totalMs);

  const activitySnap = await db.collection('activities').doc(ACTIVITY_ID).get();
  const finalSeats = activitySnap.data()?.vagas_disponiveis;

  const bookingSnaps = await Promise.all(
    participants.map((p) => db.collection('bookings').doc(`${p.uid}_${ACTIVITY_ID}`).get())
  );
  const confirmed = bookingSnaps.filter((s) => s.exists && s.data().status === 'CONFIRMED').length;
  const waiting = bookingSnaps.filter((s) => s.exists && s.data().status === 'WAITING_LIST').length;
  const missing = bookingSnaps.filter((s) => !s.exists).length;

  console.log(`\nCONFIRMED: ${confirmed} | WAITING_LIST: ${waiting} | sem booking: ${missing} | vagas_disponiveis final: ${finalSeats}`);

  const expectedConfirmed = AVAILABLE_SEATS;
  const expectedWaiting = TOTAL_REQUESTS - AVAILABLE_SEATS;
  const problems = [];
  if (confirmed !== expectedConfirmed) problems.push(`esperava ${expectedConfirmed} CONFIRMED, achou ${confirmed}`);
  if (waiting !== expectedWaiting) problems.push(`esperava ${expectedWaiting} WAITING_LIST, achou ${waiting}`);
  if (finalSeats !== 0) problems.push(`esperava vagas_disponiveis = 0, achou ${finalSeats}`);
  if (missing > 0) problems.push(`${missing} participante(s) sem booking gravado (ver status HTTP acima)`);

  if (problems.length > 0) {
    console.error('\nFALHOU — divergência de concorrência encontrada:');
    for (const p of problems) console.error(`  - ${p}`);
    process.exitCode = 1;
    return;
  }

  console.log('\nOK — nenhum overbooking, contagem bate exatamente com o esperado.');
}

main().catch((error) => {
  console.error('\nErro ao rodar o teste de carga:', error.message);
  if (error.cause?.code === 'ECONNREFUSED' || error.message?.includes('fetch failed')) {
    console.error('Os emuladores estão rodando? `npm run emulators` (e `npm run backend:watch` compilado) precisam estar no ar antes deste script.');
  }
  process.exitCode = 1;
});
