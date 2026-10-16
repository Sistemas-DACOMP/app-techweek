import { describe, it, expect } from 'vitest';
import {
  passwordsMatch,
  isPasswordLongEnough,
  getPasswordStrength,
  validateAvatarFile,
  MAX_AVATAR_BYTES,
  validateMissionPhoto,
  MAX_MISSION_PHOTO_BYTES,
  ALLOWED_MISSION_IMAGE_TYPES,
  normalizeEmail,
  isValidEmail,
  suggestEmailCorrection,
  isValidName,
  isValidUsername,
  formatPhone,
  isValidPhone,
  normalizeGithub,
  isValidGithub,
  formatFileSize,
  validateResumeFile,
  MAX_RESUME_BYTES,
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
// exigido pelo Firebase Auth. Ligada de verdade ao fluxo em Register.jsx
// desde a migracao pra Firebase (KAN-69) - REG-AUTH-001 = CONFIRMADA.
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

describe('getPasswordStrength', () => {
  it('retorna score 0 com estado inválido para valores vazios ou não string', () => {
    expect(getPasswordStrength('')).toEqual({
      score: 0,
      label: 'Muito fraca',
      color: '#6b7280',
      percent: 0,
      valid: false
    });
    expect(getPasswordStrength(null)).toEqual({
      score: 0,
      label: 'Muito fraca',
      color: '#6b7280',
      percent: 0,
      valid: false
    });
    expect(getPasswordStrength(undefined)).toEqual({
      score: 0,
      label: 'Muito fraca',
      color: '#6b7280',
      percent: 0,
      valid: false
    });
  });

  it('avalia senha curta e simples com score 0 (Muito fraca)', () => {
    expect(getPasswordStrength('123')).toEqual({
      score: 0,
      label: 'Muito fraca',
      color: '#ef4444',
      percent: 10,
      valid: false
    });
  });

  it('avalia senha com 6 caracteres simples com score 1 (Fraca, válida para Auth)', () => {
    expect(getPasswordStrength('123456')).toEqual({
      score: 1,
      label: 'Fraca',
      color: '#f97316',
      percent: 25,
      valid: true
    });
  });

  it('avalia senha com 8 caracteres simples com score 2 (Média)', () => {
    expect(getPasswordStrength('12345678')).toEqual({
      score: 2,
      label: 'Média',
      color: '#eab308',
      percent: 50,
      valid: true
    });
  });

  it('avalia senha de 8 caracteres misturando letras e números com score 3 (Boa)', () => {
    expect(getPasswordStrength('senha123')).toEqual({
      score: 3,
      label: 'Boa',
      color: '#3b82f6',
      percent: 75,
      valid: true
    });
  });

  it('avalia senha forte com score 4 ao incluir maiúsculas ou caracteres especiais (Forte)', () => {
    expect(getPasswordStrength('Senha123')).toEqual({
      score: 4,
      label: 'Forte',
      color: '#10b981',
      percent: 100,
      valid: true
    });
    expect(getPasswordStrength('senha123!')).toEqual({
      score: 4,
      label: 'Forte',
      color: '#10b981',
      percent: 100,
      valid: true
    });
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

// REG-MISSION-002: Fotos comprovantes de missões manuais
describe('validateMissionPhoto (REG-MISSION-002)', () => {
  it('rejeita quando nao ha arquivo', () => {
    expect(validateMissionPhoto(null)).toEqual({ valid: false, reason: 'missing' });
  });

  it('rejeita tipo que nao esta na lista de formatos seguros permitidos', () => {
    expect(validateMissionPhoto({ type: 'application/pdf', size: 1000 })).toEqual({
      valid: false,
      reason: 'invalid_type',
    });
    expect(validateMissionPhoto({ type: 'image/svg+xml', size: 1000 })).toEqual({
      valid: false,
      reason: 'invalid_type',
    });
  });

  it('rejeita arquivo com tamanho acima de 5MB', () => {
    const file = { type: 'image/png', size: MAX_MISSION_PHOTO_BYTES + 1 };
    expect(validateMissionPhoto(file)).toEqual({ valid: false, reason: 'too_large' });
  });

  it('aceita imagens validas (PNG, JPEG, WebP, GIF) dentro do limite de 5MB', () => {
    for (const type of ALLOWED_MISSION_IMAGE_TYPES) {
      expect(validateMissionPhoto({ type, size: 1024 * 1024 })).toEqual({
        valid: true,
        reason: null,
      });
    }
  });

  it('aceita imagem no limite exato de 5MB', () => {
    expect(validateMissionPhoto({ type: 'image/jpeg', size: MAX_MISSION_PHOTO_BYTES })).toEqual({
      valid: true,
      reason: null,
    });
  });
});

describe('isValidName', () => {
  it('rejeita nomes com menos de 2 caracteres', () => {
    expect(isValidName('')).toBe(false);
    expect(isValidName('a')).toBe(false);
    expect(isValidName('  b  ')).toBe(false);
  });

  it('aceita nomes validos com 2 ou mais caracteres', () => {
    expect(isValidName('Ana')).toBe(true);
    expect(isValidName('Samuel')).toBe(true);
  });
});

describe('isValidUsername', () => {
  it('rejeita usernames com menos de 3 caracteres ou com caracteres invalidos', () => {
    expect(isValidUsername('ab')).toBe(false);
    expect(isValidUsername('user name')).toBe(false);
    expect(isValidUsername('user#123')).toBe(false);
  });

  it('aceita usernames validos', () => {
    expect(isValidUsername('samuel')).toBe(true);
    expect(isValidUsername('@dev_ninja')).toBe(true);
    expect(isValidUsername('user.123')).toBe(true);
  });
});

describe('formatPhone e isValidPhone', () => {
  it('formata telefone limpando letras e aplicando mascara (34) 99999-8888', () => {
    expect(formatPhone('34999998888')).toBe('(34) 99999-8888');
    expect(formatPhone('3499998888')).toBe('(34) 9999-8888');
    expect(formatPhone('abc34999998888xyz')).toBe('(34) 99999-8888');
  });

  it('valida telefone apenas se tiver 10 ou 11 digitos numéricos', () => {
    expect(isValidPhone('(34) 99999-8888')).toBe(true);
    expect(isValidPhone('(34) 3232-1000')).toBe(true);
    expect(isValidPhone('34999998888')).toBe(true);
    expect(isValidPhone('12345')).toBe(false);
    expect(isValidPhone('')).toBe(false);
  });
});

describe('normalizeGithub e isValidGithub (KAN-96)', () => {
  it('normaliza links completos, arrobas e espaços para o handle puro', () => {
    expect(normalizeGithub('https://github.com/erickraposo')).toBe('erickraposo');
    expect(normalizeGithub('http://github.com/erickraposo/')).toBe('erickraposo');
    expect(normalizeGithub('https://www.github.com/erickraposo')).toBe('erickraposo');
    expect(normalizeGithub('@erickraposo')).toBe('erickraposo');
    expect(normalizeGithub('  erickraposo  ')).toBe('erickraposo');
    expect(normalizeGithub('')).toBe('');
    expect(normalizeGithub(null)).toBe('');
  });

  it('valida handles e links válidos do GitHub', () => {
    expect(isValidGithub('erickraposo')).toBe(true);
    expect(isValidGithub('@erickraposo')).toBe(true);
    expect(isValidGithub('https://github.com/erickraposo')).toBe(true);
    expect(isValidGithub('dev-tech-123')).toBe(true);
    expect(isValidGithub('a')).toBe(true);
  });

  it('rejeita handles inválidos do GitHub', () => {
    expect(isValidGithub('')).toBe(false);
    expect(isValidGithub('   ')).toBe(false);
    expect(isValidGithub('-invalido')).toBe(false);
    expect(isValidGithub('invalido-')).toBe(false);
    expect(isValidGithub('user name')).toBe(false);
    expect(isValidGithub('user@github')).toBe(false);
    expect(isValidGithub('a'.repeat(40))).toBe(false);
  });
});

describe('formatFileSize', () => {
  it('formata bytes, KB e MB corretamente', () => {
    expect(formatFileSize(0)).toBe('0 B');
    expect(formatFileSize(500)).toBe('500 B');
    expect(formatFileSize(1024)).toBe('1.0 KB');
    expect(formatFileSize(1536)).toBe('1.5 KB');
    expect(formatFileSize(1024 * 1024)).toBe('1.0 MB');
    expect(formatFileSize(2.5 * 1024 * 1024)).toBe('2.5 MB');
  });

  it('retorna 0 B para valores inválidos ou negativos', () => {
    expect(formatFileSize(-1)).toBe('0 B');
    expect(formatFileSize(null)).toBe('0 B');
    expect(formatFileSize(undefined)).toBe('0 B');
    expect(formatFileSize(NaN)).toBe('0 B');
  });
});

describe('validateResumeFile', () => {
  it('rejeita arquivo ausente', () => {
    expect(validateResumeFile(null)).toEqual({
      valid: false,
      reason: 'missing',
      message: 'Nenhum arquivo selecionado.'
    });
  });

  it('aceita arquivos PDF válidos', () => {
    const file = {
      name: 'curriculo.pdf',
      type: 'application/pdf',
      size: 1.5 * 1024 * 1024
    };
    expect(validateResumeFile(file)).toEqual({
      valid: true,
      reason: null,
      message: null
    });
  });

  it('aceita arquivos DOC e DOCX válidos', () => {
    const docFile = {
      name: 'meu_curriculo.doc',
      type: 'application/msword',
      size: 500 * 1024
    };
    expect(validateResumeFile(docFile).valid).toBe(true);

    const docxFile = {
      name: 'meu_curriculo.docx',
      type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      size: 800 * 1024
    };
    expect(validateResumeFile(docxFile).valid).toBe(true);
  });

  it('aceita arquivo DOCX mesmo com MIME type genérico ou vazio se extensão for válida (compatibilidade mobile/Windows)', () => {
    const docxGeneric = {
      name: 'curriculo.docx',
      type: 'application/octet-stream',
      size: 500 * 1024
    };
    expect(validateResumeFile(docxGeneric).valid).toBe(true);

    const docxEmptyMime = {
      name: 'curriculo.docx',
      type: '',
      size: 500 * 1024
    };
    expect(validateResumeFile(docxEmptyMime).valid).toBe(true);
  });

  it('rejeita formatos não suportados (.exe, .png, .txt)', () => {
    const exeFile = {
      name: 'programa.exe',
      type: 'application/x-msdownload',
      size: 1024
    };
    const res = validateResumeFile(exeFile);
    expect(res.valid).toBe(false);
    expect(res.reason).toBe('invalid_type');

    const imageFile = {
      name: 'foto.png',
      type: 'image/png',
      size: 1024
    };
    expect(validateResumeFile(imageFile).valid).toBe(false);
  });

  it('rejeita arquivos que excedem o limite de 5MB', () => {
    const heavyFile = {
      name: 'curriculo_pesado.pdf',
      type: 'application/pdf',
      size: 6 * 1024 * 1024 // 6MB
    };
    const res = validateResumeFile(heavyFile);
    expect(res.valid).toBe(false);
    expect(res.reason).toBe('too_large');
    expect(res.message).toContain('limite máximo de 5.0 MB');
  });
});

