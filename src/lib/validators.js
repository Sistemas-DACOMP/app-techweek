// Regras de negocio do cadastro/perfil, isoladas em funcoes puras pra poder
// testar sem precisar renderizar componente nem chamar o Supabase.

// REG-C2 (KAN-27, ainda nao aplicada em Register.jsx): Supabase recusa
// senha com menos de 6 caracteres. Este valor espelha o minimo real do
// projeto Supabase, nao um numero arbitrario.
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

// Auxilia na correção de domínios comuns como @ufu.edu.br -> @ufu.br
export function suggestEmailCorrection(email) {
  if (typeof email !== 'string') return null;
  const normalized = email.trim().toLowerCase();
  if (normalized.endsWith('@ufu.edu.br')) {
    return normalized.replace(/@ufu\.edu\.br$/, '@ufu.br');
  }
  return null;
}
