#!/usr/bin/env node
// Quality Gate objetivo — App TechWeek.
// Roda os critérios obrigatórios (lint/build/test) e imprime um resultado estruturado.
// confidence_score e security_score não são calculados aqui: vêm do agente/skill que revisou
// a mudança (qa-agent / security-reviewer) e são combinados com este resultado pelo workflow.
// Ver `.claude/skills/dev-workflows/SKILL.md` para o registro completo do quality gate.

import { execSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';

export function run(cmd) {
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

// Lógica pura do gate — sem I/O, testável isolada (ver quality-gate.test.mjs).
export function evaluateGate({ lintOk, buildOk, hasTestScript, testOk }) {
  const checks = [lintOk, buildOk, ...(hasTestScript ? [testOk] : [])];
  const quality_score = Number((checks.filter(Boolean).length / checks.length).toFixed(2));
  const mandatoryPassed = lintOk && buildOk && (!hasTestScript || testOk);

  return {
    quality_score,
    confidence_score: null,
    security_score: null,
    tests_passed: hasTestScript ? testOk : null,
    regression_passed: hasTestScript ? testOk : null,
    mandatory_checks: {
      lint: lintOk,
      build: buildOk,
      test: hasTestScript ? testOk : 'skipped',
    },
    approved: mandatoryPassed,
  };
}

function main() {
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
    console.log('test  ... SKIP (sem script "test" no package.json)');
  }

  const result = evaluateGate({ lintOk: lint.ok, buildOk: build.ok, hasTestScript, testOk: test.ok });

  console.log('\n' + JSON.stringify(result, null, 2));

  if (!result.approved) {
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
}

const isMain = process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href;
if (isMain) main();
