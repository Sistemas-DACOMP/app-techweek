import { describe, it, expect } from 'vitest';
import { evaluateGate } from './quality-gate.mjs';

describe('evaluateGate', () => {
  it('aprova quando lint, build e test passam', () => {
    const result = evaluateGate({ lintOk: true, buildOk: true, hasTestScript: true, testOk: true });
    expect(result.approved).toBe(true);
    expect(result.quality_score).toBe(1);
    expect(result.mandatory_checks).toEqual({ lint: true, build: true, test: true });
  });

  it('reprova quando lint falha, mesmo com build e test passando', () => {
    const result = evaluateGate({ lintOk: false, buildOk: true, hasTestScript: true, testOk: true });
    expect(result.approved).toBe(false);
    expect(result.mandatory_checks.lint).toBe(false);
  });

  it('reprova quando build falha', () => {
    const result = evaluateGate({ lintOk: true, buildOk: false, hasTestScript: true, testOk: true });
    expect(result.approved).toBe(false);
  });

  it('reprova quando existe script de teste mas ele falha', () => {
    const result = evaluateGate({ lintOk: true, buildOk: true, hasTestScript: true, testOk: false });
    expect(result.approved).toBe(false);
    expect(result.tests_passed).toBe(false);
    expect(result.regression_passed).toBe(false);
  });

  it('aprova com lint+build quando não existe script de teste ainda, e marca test como null/skipped', () => {
    const result = evaluateGate({ lintOk: true, buildOk: true, hasTestScript: false, testOk: false });
    expect(result.approved).toBe(true);
    expect(result.tests_passed).toBeNull();
    expect(result.mandatory_checks.test).toBe('skipped');
    expect(result.quality_score).toBe(1);
  });

  it('nota nunca aparece como aprovada quando critério obrigatório falha, mesmo com score alto', () => {
    // 2 de 3 checks passam (score 0.67) mas lint falhou - mandatory bloqueia mesmo assim.
    const result = evaluateGate({ lintOk: false, buildOk: true, hasTestScript: true, testOk: true });
    expect(result.quality_score).toBeGreaterThan(0.5);
    expect(result.approved).toBe(false);
  });
});
