import { describe, it, expect } from 'vitest';
import {
  passwordsMatch,
  isPasswordLongEnough,
  validateAvatarFile,
  MAX_AVATAR_BYTES,
  normalizeEmail,
  isValidEmail,
  suggestEmailCorrection,
  isQrForLecture,
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

describe('normalizeEmail', () => {
  it('remove espacos e converte para minusculo', () => {
    expect(normalizeEmail('  Samuel.Amorim@UFU.BR  ')).toBe('samuel.amorim@ufu.br');
  });

  it('retorna string vazia para tipos nao string', () => {
    expect(normalizeEmail(null)).toBe('');
    expect(normalizeEmail(undefined)).toBe('');
  });
});

describe('isValidEmail', () => {
  it('aceita emails institucionais da UFU (@ufu.br e @ufu.edu.br)', () => {
    expect(isValidEmail('samuel.amorim@ufu.br')).toBe(true);
    expect(isValidEmail('samuel.amorim@ufu.edu.br')).toBe(true);
    expect(isValidEmail('aluno@facom.ufu.br')).toBe(true);
  });

  it('aceita emails genericos', () => {
    expect(isValidEmail('usuario@gmail.com')).toBe(true);
    expect(isValidEmail('usuario@outlook.com')).toBe(true);
  });

  it('rejeita emails invalidos ou malformados', () => {
    expect(isValidEmail('sem-arroba.com')).toBe(false);
    expect(isValidEmail('@sem-usuario.com')).toBe(false);
    expect(isValidEmail('usuario@')).toBe(false);
    expect(isValidEmail('')).toBe(false);
    expect(isValidEmail(null)).toBe(false);
  });
});

describe('suggestEmailCorrection', () => {
  it('sugere correcao para emails @ufu.edu.br -> @ufu.br', () => {
    expect(suggestEmailCorrection('samuel.amorim@ufu.edu.br')).toBe('samuel.amorim@ufu.br');
    expect(suggestEmailCorrection('  SAMUEL@UFU.EDU.BR  ')).toBe('samuel@ufu.br');
  });

  it('retorna null para emails que ja sao validos ou de outros dominios', () => {
    expect(suggestEmailCorrection('samuel.amorim@ufu.br')).toBeNull();
    expect(suggestEmailCorrection('usuario@gmail.com')).toBeNull();
    expect(suggestEmailCorrection(null)).toBeNull();
  });
});

// REG-SCANNER-001 (KAN-30, confirmada com o Fabio em 2026-09-12): o scanner
// de presenca so pode aceitar o QR da palestra selecionada. Convencao do
// payload: JSON `{"lectureId": "<id>"}`.
describe('isQrForLecture (REG-SCANNER-001 / KAN-30)', () => {
  it('aceita quando o lectureId do QR bate com o esperado', () => {
    expect(isQrForLecture('{"lectureId":"palestra-1"}', 'palestra-1')).toBe(true);
  });

  it('rejeita quando o lectureId do QR e de outra palestra', () => {
    expect(isQrForLecture('{"lectureId":"palestra-2"}', 'palestra-1')).toBe(false);
  });

  it('rejeita JSON malformado sem lancar excecao', () => {
    expect(isQrForLecture('isso nao e json', 'palestra-1')).toBe(false);
    expect(isQrForLecture('{lectureId: palestra-1}', 'palestra-1')).toBe(false);
    expect(isQrForLecture('', 'palestra-1')).toBe(false);
  });

  it('rejeita quando o campo lectureId esta ausente', () => {
    expect(isQrForLecture('{"outraCoisa":"palestra-1"}', 'palestra-1')).toBe(false);
    expect(isQrForLecture('{}', 'palestra-1')).toBe(false);
  });

  it('rejeita entradas nao-string ou nulas para o dado escaneado', () => {
    expect(isQrForLecture(null, 'palestra-1')).toBe(false);
    expect(isQrForLecture(undefined, 'palestra-1')).toBe(false);
    expect(isQrForLecture(123, 'palestra-1')).toBe(false);
    expect(isQrForLecture({ lectureId: 'palestra-1' }, 'palestra-1')).toBe(false);
  });

  it('rejeita quando o lectureId esperado e nulo/indefinido, mesmo com payload valido', () => {
    expect(isQrForLecture('{"lectureId":"palestra-1"}', null)).toBe(false);
    expect(isQrForLecture('{"lectureId":"palestra-1"}', undefined)).toBe(false);
  });

  it('nao faz comparacao frouxa entre tipos diferentes (numero vs string)', () => {
    expect(isQrForLecture('{"lectureId":1}', '1')).toBe(false);
    expect(isQrForLecture('{"lectureId":"1"}', 1)).toBe(false);
  });
});

