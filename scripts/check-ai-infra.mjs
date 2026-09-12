#!/usr/bin/env node
// Bootstrap check — confirma que o ambiente de desenvolvimento assistido por IA está
// configurado neste checkout. Não imprime "tudo certo" sem checar de verdade.

import { existsSync, readFileSync } from 'node:fs';
import { execSync } from 'node:child_process';
import { pathToFileURL } from 'node:url';

const root = new URL('..', import.meta.url);
const path = (p) => new URL(p, root);

export function check(label, ok, detail) {
  const mark = ok ? '✓' : '✗';
  console.log(`${mark} ${label}${detail ? ' — ' + detail : ''}`);
  return ok;
}

export function hasCommand(cmd) {
  try {
    execSync(`${cmd} --version`, { stdio: 'pipe' });
    return true;
  } catch {
    return false;
  }
}

// Lógica pura — recebe o mapa de resultados já apurados e decide o veredito geral.
// Testável isolada de filesystem/exec (ver check-ai-infra.test.mjs).
export function isEnvironmentReady(results) {
  return Object.values(results).every(Boolean);
}

function main() {
  console.log('AI DEVELOPMENT ENVIRONMENT — App TechWeek');
  console.log('───────────────────────────────────────────\n');

  const pkg = JSON.parse(readFileSync(path('package.json'), 'utf8'));

  const results = {
    context: check('Context (CLAUDE.md)', existsSync(path('CLAUDE.md'))),
    businessRules: check('Business rules (docs/business-rules/)', existsSync(path('docs/business-rules/README.md'))),
    qaSkill: check('QA skill (.claude/skills/qa-agent)', existsSync(path('.claude/skills/qa-agent/SKILL.md'))),
    devWorkflows: check('Dev workflows / orchestrator skill', existsSync(path('.claude/skills/dev-workflows/SKILL.md'))),
    prReview: check('PR Review agent', existsSync(path('.claude/agents/pr-review.md'))),
    securityReviewer: check('Security Reviewer agent', existsSync(path('.claude/agents/security-reviewer.md'))),
    qualityGate: check('Quality gate script', existsSync(path('scripts/quality-gate.mjs'))),
    ci: check('CI workflow (.github/workflows/ci.yml)', existsSync(path('.github/workflows/ci.yml'))),
    deploy: check('Deploy workflow (.github/workflows/deploy.yml)', existsSync(path('.github/workflows/deploy.yml'))),
    testScript: check('Test suite (npm run test)', Boolean(pkg.scripts?.test)),
    gh: check('gh CLI disponível', hasCommand('gh')),
    git: check('git disponível', hasCommand('git')),
    envLocal: (() => {
      const hasEnvLocal = existsSync(path('.env.local'));
      return check(
        '.env.local presente (config pessoal, não versionada)',
        hasEnvLocal,
        hasEnvLocal ? undefined : 'configure a partir de .env.example'
      );
    })(),
  };

  const ready = isEnvironmentReady(results);

  console.log('\n───────────────────────────────────────────');
  console.log(ready ? 'Environment ready.' : 'Environment INCOMPLETO — ver itens ✗ acima.');
  console.log('Ver docs/ai-infra/README.md para arquitetura completa e como configurar o que falta.');

  process.exit(ready ? 0 : 1);
}

const isMain = process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href;
if (isMain) main();
