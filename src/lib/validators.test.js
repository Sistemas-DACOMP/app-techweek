import { describe, it, expect } from 'vitest';
import {
  passwordsMatch,
  isPasswordLongEnough,
  validateAvatarFile,
  MAX_AVATAR_BYTES,
} from './validators';

// REG-C1 (comportamento observado no codigo, sem card Jira dedicado):
// senha e confirmacao devem ser identicas.
describe('passwordsMatch', () => {
  it('aceita quando as duas senhas sao iguais', () => {
    expect(passwordsMatch('Teste123', 'Teste123')).toBe(true);
  });

  it('rejeita quando as senhas sao diferentes', () => {
    expect(passwordsMatch('Teste123', 'Teste124')).toBe(false);
  });
});

// REG-C2 (KAN-27): senha deve ter pelo menos 6 caracteres, o minimo real
// exigido pelo Supabase. Esta funcao ainda NAO esta ligada ao
// Register.jsx (KAN-27 continua no backlog) - o teste documenta a regra
// que falta ser aplicada no fluxo real.
describe('isPasswordLongEnough (KAN-27)', () => {
  it('rejeita senha vazia', () => {
    expect(isPasswordLongEnough('')).toBe(false);
  });

  it('rejeita senha com 5 caracteres (abaixo do minimo)', () => {
    expect(isPasswordLongEnough('12345')).toBe(false);
  });

  it('aceita senha com exatamente 6 caracteres (limite)', () => {
    expect(isPasswordLongEnough('123456')).toBe(true);
  });

  it('aceita senha acima do minimo', () => {
    expect(isPasswordLongEnough('umaSenhaBemLonga')).toBe(true);
  });
});

// REG-A3 (Profile.jsx, ja implementada no front): avatar precisa ser
// imagem e ter ate 2MB.
describe('validateAvatarFile', () => {
  const imageFile = (sizeBytes) => ({ type: 'image/png', size: sizeBytes });

  it('rejeita quando nao ha arquivo', () => {
    expect(validateAvatarFile(null)).toEqual({ valid: false, reason: 'missing' });
  });

  it('rejeita tipo que nao e imagem', () => {
    const file = { type: 'application/pdf', size: 1000 };
    expect(validateAvatarFile(file)).toEqual({ valid: false, reason: 'invalid_type' });
  });

  it('rejeita arquivo sem MIME type (extensao enganosa/arquivo sem tipo)', () => {
    const file = { type: '', size: 1000 };
    expect(validateAvatarFile(file)).toEqual({ valid: false, reason: 'invalid_type' });
  });

  it('aceita imagem abaixo do limite', () => {
    expect(validateAvatarFile(imageFile(MAX_AVATAR_BYTES - 1))).toEqual({ valid: true, reason: null });
  });

  it('aceita imagem exatamente no limite (boundary)', () => {
    expect(validateAvatarFile(imageFile(MAX_AVATAR_BYTES))).toEqual({ valid: true, reason: null });
  });

  it('rejeita imagem acima do limite', () => {
    expect(validateAvatarFile(imageFile(MAX_AVATAR_BYTES + 1))).toEqual({ valid: false, reason: 'too_large' });
  });
});
