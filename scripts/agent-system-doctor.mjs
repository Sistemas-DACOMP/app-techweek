#!/usr/bin/env node
// agent-system-doctor.mjs
//
// Health check for .agent-system/ (spec seção 13). Diagnostic only — it never
// fails the build or CI. It checks that the files/tools this portable agent
// system depends on are actually present on the machine running it, and
// prints PASS/WARN/FAIL per check plus a summary line.
//
// Usage: node scripts/agent-system-doctor.mjs
//
// Uses Node built-ins only (fs, path, child_process) — no new npm dependency
// added just for this script. See .agent-system/docs/health-check.md.

import fs from 'node:fs';
import path from 'node:path';
import { execSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, '..');

const EXPECTED_AGENTS = [
  'orchestrator.md',
  'spec.md',
  'product.md',
  'architecture.md',
  'backend.md',
  'pwa.md',
  'admin.md',
  'qa.md',
  'security.md',
  'infra.md',
  'code-review.md',
  'adr.md',
  'ponytail.md',
];

const results = [];

function record(status, label, detail) {
  results.push({ status, label, detail });
}

function checkFileNonEmpty(relPath, label) {
  const abs = path.join(repoRoot, relPath);
  try {
    const stat = fs.statSync(abs);
    if (!stat.isFile()) {
      record('FAIL', label, `${relPath} existe mas não é um arquivo`);
      return;
    }
    if (stat.size === 0) {
      record('FAIL', label, `${relPath} existe mas está vazio`);
      return;
    }
    record('PASS', label, `${relPath} (${stat.size} bytes)`);
  } catch {
    record('FAIL', label, `${relPath} não encontrado`);
  }
}

function checkDirExists(relPath, label) {
  const abs = path.join(repoRoot, relPath);
  try {
    const stat = fs.statSync(abs);
    if (!stat.isDirectory()) {
      record('FAIL', label, `${relPath} existe mas não é diretório`);
      return;
    }
    record('PASS', label, `${relPath} existe`);
  } catch {
    record('FAIL', label, `${relPath} não encontrado`);
  }
}

function checkAgentFiles() {
  const dir = path.join(repoRoot, '.agent-system', 'agents');
  let present = [];
  try {
    present = fs.readdirSync(dir);
  } catch {
    record('FAIL', '.agent-system/agents/ (13 agentes esperados)', 'diretório não encontrado');
    return;
  }
  const missing = EXPECTED_AGENTS.filter((f) => !present.includes(f));
  if (missing.length === 0) {
    record('PASS', '.agent-system/agents/ (13 agentes esperados)', `todos presentes: ${EXPECTED_AGENTS.join(', ')}`);
  } else {
    record('FAIL', '.agent-system/agents/ (13 agentes esperados)', `faltando: ${missing.join(', ')}`);
  }
}

function checkCliOnPath(cmd, label, { warnOnly = false, note = '' } = {}) {
  try {
    const out = execSync(cmd, { stdio: ['ignore', 'pipe', 'pipe'] }).toString().trim().split('\n')[0];
    record('PASS', label, out);
  } catch {
    record(warnOnly ? 'WARN' : 'FAIL', label, note || 'não encontrado no PATH');
  }
}

// --- Checks ---

checkFileNonEmpty(path.join('.agent-system', 'manifests', 'system.yaml'), 'manifests/system.yaml existe e não está vazio');

checkAgentFiles();

checkDirExists(path.join('.claude', 'agents'), '.claude/agents/ existe');
checkDirExists(path.join('.claude', 'skills'), '.claude/skills/ existe');

checkCliOnPath('git --version', 'git no PATH');
checkCliOnPath('gh --version', 'gh CLI no PATH');

// node/npm: trivially true, this script is running under node.
record('PASS', 'node no PATH', process.version);
checkCliOnPath('npm --version', 'npm no PATH');

checkCliOnPath('docker --version', 'docker no PATH', {
  warnOnly: true,
  note: 'opcional para este sistema — não bloqueia trabalho hoje',
});
checkCliOnPath('firebase --version', 'firebase CLI no PATH', {
  warnOnly: true,
  note: 'necessário para o alvo Firebase (agente infra), não para trabalhar neste sistema em si',
});
checkCliOnPath('gcloud --version', 'gcloud CLI no PATH', {
  warnOnly: true,
  note: 'necessário para o alvo Firebase (agente infra), não para trabalhar neste sistema em si',
});

// --- Print report ---

const symbol = { PASS: 'PASS', WARN: 'WARN', FAIL: 'FAIL' };

console.log('agent-system-doctor — health check .agent-system/\n');
for (const r of results) {
  console.log(`[${symbol[r.status]}] ${r.label} — ${r.detail}`);
}

const counts = results.reduce(
  (acc, r) => {
    acc[r.status] += 1;
    return acc;
  },
  { PASS: 0, WARN: 0, FAIL: 0 }
);

console.log(`\nResumo: ${counts.PASS} PASS, ${counts.WARN} WARN, ${counts.FAIL} FAIL`);

// Diagnostic only — never fail the process/CI over this.
process.exit(0);
