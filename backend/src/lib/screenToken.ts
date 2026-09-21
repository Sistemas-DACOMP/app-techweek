import { createHmac, timingSafeEqual } from 'node:crypto';

// 5 minutos (D1 do SPEC): janela curta o suficiente pra reduzir o risco de
// replay se alguém fotografar o QR projetado depois que a sala já esvaziou.
const TOKEN_TTL_MS = 5 * 60 * 1000;

const MIN_SECRET_LENGTH = 32;

function getSecret(): string {
  const secret = process.env.SCREEN_TOKEN_SECRET;
  if (!secret) {
    throw new Error('SCREEN_TOKEN_SECRET não configurado no ambiente.');
  }
  // Segredo curto/fraco (ex: "abc") deixaria o HMAC brute-forçável offline —
  // o TTL de 5min protege o token individual, não o segredo em si.
  if (secret.length < MIN_SECRET_LENGTH) {
    throw new Error(`SCREEN_TOKEN_SECRET precisa ter pelo menos ${MIN_SECRET_LENGTH} caracteres.`);
  }
  return secret;
}

function sign(payload: string): string {
  return createHmac('sha256', getSecret()).update(payload).digest('hex');
}

export interface ScreenToken {
  token: string;
  expiresAt: number;
}

// Payload = activityId + expiresAt (epoch ms), assinado com HMAC-SHA256 e
// empacotado em base64url pra virar um token opaco de uma string só (cabe
// tranquilo num QR Code).
export function issueScreenToken(activityId: string, now: number = Date.now()): ScreenToken {
  const expiresAt = now + TOKEN_TTL_MS;
  const payload = `${activityId}.${expiresAt}`;
  const token = Buffer.from(`${payload}.${sign(payload)}`).toString('base64url');
  return { token, expiresAt };
}

export type ScreenTokenValidation =
  | { valid: true; activityId: string }
  | { valid: false; reason: 'MALFORMED' | 'BAD_SIGNATURE' | 'EXPIRED' };

export function verifyScreenToken(token: string, now: number = Date.now()): ScreenTokenValidation {
  let decoded: string;
  try {
    decoded = Buffer.from(token, 'base64url').toString('utf8');
  } catch {
    return { valid: false, reason: 'MALFORMED' };
  }

  const parts = decoded.split('.');
  if (parts.length !== 3) {
    return { valid: false, reason: 'MALFORMED' };
  }

  const [activityId, expiresAtRaw, signature] = parts;
  const expiresAt = Number(expiresAtRaw);
  if (!activityId || !Number.isFinite(expiresAt)) {
    return { valid: false, reason: 'MALFORMED' };
  }

  const expectedSignature = sign(`${activityId}.${expiresAtRaw}`);
  const providedBuf = Buffer.from(signature, 'hex');
  const expectedBuf = Buffer.from(expectedSignature, 'hex');

  // Tamanhos diferentes já provam assinatura errada — mas checar antes de
  // chamar timingSafeEqual porque a função lança exceção em vez de retornar
  // false quando os buffers têm tamanhos diferentes.
  if (providedBuf.length !== expectedBuf.length || !timingSafeEqual(providedBuf, expectedBuf)) {
    return { valid: false, reason: 'BAD_SIGNATURE' };
  }

  if (now > expiresAt) {
    return { valid: false, reason: 'EXPIRED' };
  }

  return { valid: true, activityId };
}
