// Regras de negocio do cadastro/perfil, isoladas em funcoes puras pra poder
// testar sem precisar renderizar componente nem chamar o Firebase Auth.

// REG-C2 (KAN-27): Firebase Auth recusa senha com menos de 6 caracteres.
// Este valor espelha o minimo real do Firebase Auth, nao um numero arbitrario.
export const MIN_PASSWORD_LENGTH = 6;

export function passwordsMatch(password, confirmPassword) {
  return password === confirmPassword;
}

export function isPasswordLongEnough(password, minLength = MIN_PASSWORD_LENGTH) {
  return typeof password === 'string' && password.length >= minLength;
}

// REG-A3 (Profile.jsx::handleAvatarChange, ja implementada no front hoje).
export const MAX_AVATAR_BYTES = 2 * 1024 * 1024;

export function validateAvatarFile(file, { maxBytes = MAX_AVATAR_BYTES } = {}) {
  if (!file) {
    return { valid: false, reason: 'missing' };
  }
  if (!file.type || !file.type.startsWith('image/')) {
    return { valid: false, reason: 'invalid_type' };
  }
  if (file.size > maxBytes) {
    return { valid: false, reason: 'too_large' };
  }
  return { valid: true, reason: null };
}

// REG-MISSION-002: Fotos comprovantes de missões (máximo 5MB e formatos aceitos pelo Storage)
export const MAX_MISSION_PHOTO_BYTES = 5 * 1024 * 1024;
export const ALLOWED_MISSION_IMAGE_TYPES = ['image/png', 'image/jpeg', 'image/webp', 'image/gif'];

export function validateMissionPhoto(file, { maxBytes = MAX_MISSION_PHOTO_BYTES, allowedTypes = ALLOWED_MISSION_IMAGE_TYPES } = {}) {
  if (!file) {
    return { valid: false, reason: 'missing' };
  }
  if (!file.type || !allowedTypes.includes(file.type)) {
    return { valid: false, reason: 'invalid_type' };
  }
  if (file.size > maxBytes) {
    return { valid: false, reason: 'too_large' };
  }
  return { valid: true, reason: null };
}

// Validação e normalização de e-mail (suporta domínios institucionais com múltiplos níveis como @ufu.br, @ufu.edu.br)
export function normalizeEmail(email) {
  if (typeof email !== 'string') return '';
  return email.trim().toLowerCase();
}

export function isValidEmail(email) {
  if (typeof email !== 'string') return false;
  const normalized = email.trim();
  const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
  return emailRegex.test(normalized);
}

// Avalia a força da senha de forma reativa (score 0 a 4)
export function getPasswordStrength(password) {
  if (typeof password !== 'string' || !password) {
    return { score: 0, label: 'Muito fraca', color: '#6b7280', percent: 0, valid: false };
  }

  let score = 0;
  if (password.length >= 6) score += 1;
  if (password.length >= 8) score += 1;
  if (/[0-9]/.test(password) && /[a-zA-Z]/.test(password)) score += 1;
  if (/[^a-zA-Z0-9]/.test(password) || /[A-Z]/.test(password) && /[a-z]/.test(password)) score += 1;

  const labels = ['Muito fraca', 'Fraca', 'Média', 'Boa', 'Forte'];
  const colors = ['#ef4444', '#f97316', '#eab308', '#3b82f6', '#10b981'];
  const percents = [10, 25, 50, 75, 100];

  return {
    score,
    label: labels[score],
    color: colors[score],
    percent: percents[score],
    valid: password.length >= MIN_PASSWORD_LENGTH
  };
}

// Auxilia na correção de domínios comuns como @ufu.edu.br -> @ufu.br
export function suggestEmailCorrection(email) {
  if (typeof email !== 'string') return null;
  const normalized = email.trim().toLowerCase();
  if (normalized.endsWith('@ufu.edu.br')) {
    return normalized.replace(/@ufu\.edu\.br$/, '@ufu.br');
  }
  return null;
}

// Validação de Nome / Sobrenome (mínimo de 2 caracteres)
export function isValidName(name) {
  if (typeof name !== 'string') return false;
  return name.trim().length >= 2;
}

// Validação de Nome de Usuário (@handle, de 3 a 20 caracteres alfanuméricos/underline/ponto)
export function isValidUsername(username) {
  if (typeof username !== 'string') return false;
  const clean = username.trim().replace(/^@/, '');
  return /^[a-zA-Z0-9._]{3,20}$/.test(clean);
}

// Formatação automática e aplicação de máscara de telefone (BR)
export function formatPhone(phone) {
  if (typeof phone !== 'string') return '';
  const digits = phone.replace(/\D/g, '').slice(0, 11);
  if (digits.length <= 2) {
    return digits ? `(${digits}` : '';
  }
  if (digits.length <= 6) {
    return `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
  }
  if (digits.length <= 10) {
    return `(${digits.slice(0, 2)}) ${digits.slice(2, 6)}-${digits.slice(6)}`;
  }
  return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
}

// Validação de telefone (10 a 11 dígitos numéricos limpos)
export function isValidPhone(phone) {
  if (typeof phone !== 'string') return false;
  const digits = phone.replace(/\D/g, '');
  return digits.length === 10 || digits.length === 11;
}

