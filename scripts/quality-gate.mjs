#!/usr/bin/env node
// Quality Gate objetivo — App TechWeek.
// Roda os critérios obrigatórios (lint/build/test) e imprime um resultado estruturado.
// confidence_score e security_score não são calculados aqui: vêm do agente/skill que revisou
// a mudança (qa-agent / security-reviewer) e são combinados com este resultado pelo workflow.
// Ver `.claude/skills/dev-workflows/SKILL.md` para o registro completo do quality gate.

import { execSync } from 'node:child_process';
import { readFileSync } from 'node:fs';

function run(cmd) {
  try {
    const output = execSync(cmd, { stdio: 'pipe' }).toString();
    return { ok: true, output };
  } catch (err) {
    return {
      ok: false,
      output: (err.stdout?.toString() || '') + (err.stderr?.toString() || ''),
    };
  }
}

const pkg = JSON.parse(readFileSync(new URL('../package.json', import.meta.url), 'utf8'));
const hasTestScript = Boolean(pkg.scripts?.test);

console.log('Quality Gate — App TechWeek\n');

const lint = run('npx oxlint --quiet');
console.log(`lint  ... ${lint.ok ? 'PASS' : 'FAIL'}`);

const build = run('npm run build');
console.log(`build ... ${build.ok ? 'PASS' : 'FAIL'}`);

let test = { ok: true, output: '' };
if (hasTestScript) {
  test = run('npm run test');
  console.log(`test  ... ${test.ok ? 'PASS' : 'FAIL'}`);
} else {
  console.log('test  ... SKIP (sem script "test" no package.json ainda — ver PR #17/KAN-31)');
}

const checks = [lint.ok, build.ok, ...(hasTestScript ? [test.ok] : [])];
const objectiveScore = Number((checks.filter(Boolean).length / checks.length).toFixed(2));
const mandatoryPassed = lint.ok && build.ok && (!hasTestScript || test.ok);

const result = {
  quality_score: objectiveScore,
  confidence_score: null,
  security_score: null,
  tests_passed: hasTestScript ? test.ok : null,
  regression_passed: hasTestScript ? test.ok : null,
  mandatory_checks: {
    lint: lint.ok,
    build: build.ok,
    test: hasTestScript ? test.ok : 'skipped',
  },
  approved: mandatoryPassed,
};

console.log('\n' + JSON.stringify(result, null, 2));

if (!mandatoryPassed) {
  console.log('\nFALHOU: critério obrigatório não atendido. Nenhuma nota substitui isso.');
  for (const [name, r] of [
    ['lint', lint],
    ['build', build],
    ['test', test],
  ]) {
    if (!r.ok && r.output) {
      console.log(`\n--- ${name} output (últimas linhas) ---`);
      console.log(r.output.trim().split('\n').slice(-20).join('\n'));
    }
  }
  process.exit(1);
}

process.exit(0);
