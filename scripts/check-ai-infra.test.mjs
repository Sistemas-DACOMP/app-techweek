import { describe, it, expect } from 'vitest';
import { isEnvironmentReady } from './check-ai-infra.mjs';

describe('isEnvironmentReady', () => {
  it('pronto quando todo item obrigatório está OK', () => {
    expect(isEnvironmentReady({ a: true, b: true, c: true })).toBe(true);
  });

  it('não pronto quando qualquer item falha', () => {
    expect(isEnvironmentReady({ a: true, b: false, c: true })).toBe(false);
  });

  it('não pronto quando todos falham', () => {
    expect(isEnvironmentReady({ a: false, b: false })).toBe(false);
  });

  it('objeto vazio é considerado pronto (nenhum check reprovou)', () => {
    expect(isEnvironmentReady({})).toBe(true);
  });
});
