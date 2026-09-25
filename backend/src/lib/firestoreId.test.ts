import { describe, it, expect } from 'vitest';
import { isValidFirestoreId } from './firestoreId';

describe('isValidFirestoreId (KAN-49/KAN-71 — activityId de req.params usado em .doc())', () => {
  it('aceita ids alfanuméricos simples', () => {
    expect(isValidFirestoreId('workshop-1')).toBe(true);
    expect(isValidFirestoreId('abc_123')).toBe(true);
  });

  it('rejeita id vazio', () => {
    expect(isValidFirestoreId('')).toBe(false);
  });

  it('rejeita id com barra (path traversal / segmento extra no doc ref)', () => {
    expect(isValidFirestoreId('x/y')).toBe(false);
  });

  it('rejeita id com espaço ou caractere especial', () => {
    expect(isValidFirestoreId('abc def')).toBe(false);
    expect(isValidFirestoreId('abc$def')).toBe(false);
  });

  it('rejeita id maior que 200 caracteres', () => {
    expect(isValidFirestoreId('a'.repeat(201))).toBe(false);
  });
});
