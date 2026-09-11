#!/usr/bin/env node
// Bootstrap check — confirma que o ambiente de desenvolvimento assistido por IA está
// configurado neste checkout. Não imprime "tudo certo" sem checar de verdade.

import { existsSync, readFileSync } from 'node:fs';
import { execSync } from 'node:child_process';

const root = new URL('..', import.meta.url);
const path = (p) => new URL(p, root);

function check(label, ok, detail) {
  const mark = ok ? '✓' : '✗';
  console.log(`${mark} ${label}${detail ? ' — ' + detail : ''}`);
  return ok;
}

function hasCommand(cmd) {
  try {
    execSync(`${cmd} --version`, { stdio: 'pipe' });
    return true;
  } catch {
    return false;
  }
}

console.log('AI DEVELOPMENT ENVIRONMENT — App TechWeek');
console.log('───────────────────────────────────────────\n');

let allOk = true;

allOk &= check('Context (CLAUDE.md)', existsSync(path('CLAUDE.md')));
allOk &= check('Business rules (docs/business-rules/)', existsSync(path('docs/business-rules/README.md')));
allOk &= check('QA skill (.claude/skills/qa-agent)', existsSync(path('.claude/skills/qa-agent/SKILL.md')));
allOk &= check('Dev workflows / orchestrator skill', existsSync(path('.claude/skills/dev-workflows/SKILL.md')));
allOk &= check('PR Review agent', existsSync(path('.claude/agents/pr-review.md')));
allOk &= check('Security Reviewer agent', existsSync(path('.claude/agents/security-reviewer.md')));
allOk &= check('Quality gate script', existsSync(path('scripts/quality-gate.mjs')));
allOk &= check('CI workflow (.github/workflows/ci.yml)', existsSync(path('.github/workflows/ci.yml')));
allOk &= check('Deploy workflow (.github/workflows/deploy.yml)', existsSync(path('.github/workflows/deploy.yml')));

const pkg = JSON.parse(readFileSync(path('package.json'), 'utf8'));
const hasTestScript = Boolean(pkg.scripts?.test);
check(
  'Test suite (npm run test)',
  hasTestScript,
  hasTestScript ? undefined : 'pendência conhecida — ver PR #17/KAN-31, não bloqueia o ambiente'
);

allOk &= check('gh CLI disponível', hasCommand('gh'));
allOk &= check('git disponível', hasCommand('git'));

let hasEnvLocal = existsSync(path('.env.local'));
check('.env.local presente (config pessoal, não versionada)', hasEnvLocal, hasEnvLocal ? undefined : 'configure a partir de .env.example');
if (!hasEnvLocal) allOk = false;

console.log('\n───────────────────────────────────────────');
console.log(allOk ? 'Environment ready (test suite ainda pendente, ver acima).' : 'Environment INCOMPLETO — ver itens ✗ acima.');
console.log('Ver docs/ai-infra/README.md para arquitetura completa e como configurar o que falta.');

process.exit(allOk ? 0 : 1);
