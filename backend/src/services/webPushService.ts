import * as crypto from 'node:crypto';
import type * as admin from 'firebase-admin';

/**
 * Chaves VAPID P-256 padrão do projeto FACOM TechWeek 2026 (RFC 8292).
 * Podem ser sobrescritas via variáveis de ambiente VAPID_PUBLIC_KEY / VAPID_PRIVATE_KEY,
 * mantendo par válido por padrão para garantir funcionamento imediato em iOS (APNs Web Push)
 * e Android (FCM Web Push) mesmo quando o PWA e o Safari estão 100% fechados.
 */
export const DEFAULT_VAPID_PUBLIC_KEY =
  'BOgJT40xkre0x9-zEttJCnDsJrLVhsPNV2F6KCkoxcfp_ayNGY8DqrUISh79LfQ0JTYEk9mq9BEjx9FIoiSmJXw';
export const DEFAULT_VAPID_PRIVATE_KEY =
  'x6UTyIq1BzsIPyeUOQLtevH5NanW25_i_mpvrtpawtg';
export const DEFAULT_VAPID_SUBJECT = 'mailto:techweek@ufu.br';

export interface WebPushSubscriptionData {
  endpoint: string;
  keys: {
    p256dh: string;
    auth: string;
  };
}

export interface WebPushNotificationPayload {
  id?: string;
  title: string;
  body: string;
  message?: string;
  actionUrl?: string;
  actionLabel?: string;
  priority?: string;
  urgent?: boolean;
  type?: string;
  tag?: string;
}

export function getVapidKeys() {
  return {
    publicKey: (process.env.VAPID_PUBLIC_KEY || DEFAULT_VAPID_PUBLIC_KEY).trim(),
    privateKey: (process.env.VAPID_PRIVATE_KEY || DEFAULT_VAPID_PRIVATE_KEY).trim(),
    subject: (process.env.VAPID_SUBJECT || DEFAULT_VAPID_SUBJECT).trim(),
  };
}

export function subscriptionIdFromEndpoint(endpoint: string): string {
  return crypto.createHash('sha256').update(String(endpoint)).digest('hex').slice(0, 40);
}

/**
 * Gera o cabeçalho Authorization VAPID (RFC 8292) assinado com ES256 (P-256).
 * Compatível com Apple Push Notification service (web.push.apple.com) e Google FCM.
 */
export function createVapidAuthHeader(
  endpoint: string,
  subject = DEFAULT_VAPID_SUBJECT,
  publicKey = DEFAULT_VAPID_PUBLIC_KEY,
  privateKey = DEFAULT_VAPID_PRIVATE_KEY
): string {
  const parsedUrl = new URL(endpoint);
  const audience = `${parsedUrl.protocol}//${parsedUrl.host}`;
  const exp = Math.floor(Date.now() / 1000) + 12 * 60 * 60; // 12h (Apple exige <= 24h)

  const headerObj = { typ: 'JWT', alg: 'ES256' };
  const payloadObj = {
    aud: audience,
    exp,
    sub: subject,
  };

  const encodedHeader = Buffer.from(JSON.stringify(headerObj), 'utf8').toString('base64url');
  const encodedPayload = Buffer.from(JSON.stringify(payloadObj), 'utf8').toString('base64url');
  const unsignedToken = `${encodedHeader}.${encodedPayload}`;

  const pubBuf = Buffer.from(publicKey, 'base64url');
  if (pubBuf.length !== 65 || pubBuf[0] !== 0x04) {
    throw new Error('VAPID public key inválida (esperado ponto P-256 não-comprimido de 65 bytes).');
  }

  const x = pubBuf.subarray(1, 33).toString('base64url');
  const y = pubBuf.subarray(33, 65).toString('base64url');
  const d = Buffer.from(privateKey, 'base64url').toString('base64url');

  const privateKeyObj = crypto.createPrivateKey({
    key: { kty: 'EC', crv: 'P-256', x, y, d },
    format: 'jwk',
  });

  const signature = crypto
    .sign('sha256', Buffer.from(unsignedToken, 'ascii'), {
      key: privateKeyObj,
      dsaEncoding: 'ieee-p1363',
    })
    .toString('base64url');

  const jwt = `${unsignedToken}.${signature}`;
  return `vapid t=${jwt}, k=${publicKey}`;
}

/**
 * Criptografa o payload JSON da notificação no formato RFC 8291 (aes128gcm).
 */
export function encryptWebPushPayload(
  payloadJson: string,
  p256dhBase64Url: string,
  authBase64Url: string
): Buffer {
  const uaPublic = Buffer.from(p256dhBase64Url, 'base64url');
  const authSecret = Buffer.from(authBase64Url, 'base64url');

  const asEcdh = crypto.createECDH('prime256v1');
  asEcdh.generateKeys();
  const asPublic = asEcdh.getPublicKey(); // 65 bytes uncompressed
  const sharedSecret = asEcdh.computeSecret(uaPublic);
  const salt = crypto.randomBytes(16);

  // RFC 8291 §3.3 — Combinação do segredo ECDH com o segredo de autenticação
  const keyInfo = Buffer.concat([
    Buffer.from('WebPush: info\0', 'ascii'),
    uaPublic,
    asPublic,
  ]);
  const ikm = Buffer.from(crypto.hkdfSync('sha256', sharedSecret, authSecret, keyInfo, 32));

  // RFC 8291 §3.4 — Derivação da chave de criptografia (CEK) e do Nonce
  const cekInfo = Buffer.from('Content-Encoding: aes128gcm\0', 'ascii');
  const nonceInfo = Buffer.from('Content-Encoding: nonce\0', 'ascii');
  const cek = Buffer.from(crypto.hkdfSync('sha256', ikm, salt, cekInfo, 16));
  const nonce = Buffer.from(crypto.hkdfSync('sha256', ikm, salt, nonceInfo, 12));

  // RFC 8188 §2 — Delimitador de fim de registro (0x02) + criptografia AES-128-GCM
  const plaintext = Buffer.from(payloadJson, 'utf8');
  const paddedPlaintext = Buffer.concat([plaintext, Buffer.from([0x02])]);

  const cipher = crypto.createCipheriv('aes-128-gcm', cek, nonce);
  const ciphertext = Buffer.concat([
    cipher.update(paddedPlaintext),
    cipher.final(),
    cipher.getAuthTag(),
  ]);

  // Cabeçalho aes128gcm (86 bytes): salt (16B) + rs (4B uint32BE = 4096) + idlen (1B = 65) + keyid (65B)
  const header = Buffer.alloc(16 + 4 + 1 + asPublic.length);
  salt.copy(header, 0);
  header.writeUInt32BE(4096, 16);
  header.writeUInt8(asPublic.length, 20);
  asPublic.copy(header, 21);

  return Buffer.concat([header, ciphertext]);
}

/**
 * Envia uma notificação Web Push criptografada (RFC 8030 + RFC 8291 + RFC 8292)
 * diretamente para o endpoint do dispositivo (Apple APNs web.push.apple.com ou Google FCM).
 */
export async function sendWebPushToSubscription(
  subscription: WebPushSubscriptionData,
  payload: WebPushNotificationPayload
): Promise<{ ok: boolean; status: number; gone?: boolean }> {
  if (
    !subscription?.endpoint ||
    !subscription?.keys?.p256dh ||
    !subscription?.keys?.auth
  ) {
    return { ok: false, status: 400 };
  }

  const { publicKey, privateKey, subject } = getVapidKeys();
  const payloadJson = JSON.stringify({
    id: payload.id || `tw-push-${Date.now()}`,
    title: payload.title || 'FACOM TechWeek 2026',
    body: payload.body || payload.message || '',
    message: payload.message || payload.body || '',
    actionUrl: payload.actionUrl || '/',
    actionLabel: payload.actionLabel || 'Abrir App',
    priority: payload.priority || 'HIGH',
    urgent: payload.urgent !== false,
    type: payload.type || 'system',
    tag: payload.tag || payload.id || `tw-push-${Date.now()}`,
  });

  const encryptedBody = encryptWebPushPayload(
    payloadJson,
    subscription.keys.p256dh,
    subscription.keys.auth
  );
  const authHeader = createVapidAuthHeader(
    subscription.endpoint,
    subject,
    publicKey,
    privateKey
  );

  const response = await fetch(subscription.endpoint, {
    method: 'POST',
    headers: {
      Authorization: authHeader,
      'Content-Type': 'application/octet-stream',
      'Content-Encoding': 'aes128gcm',
      'Content-Length': String(encryptedBody.length),
      TTL: '86400',
      Urgency: 'high',
    },
    body: new Uint8Array(encryptedBody),
  });

  const status = response.status;
  const ok = status >= 200 && status < 300;
  const gone = status === 404 || status === 410;
  return { ok, status, gone };
}

/**
 * Dispara Web Push para todas as inscrições ativas salvas em /push_subscriptions no Firestore.
 * Remove automaticamente inscrições expiradas (HTTP 404 / 410).
 */
export async function dispatchWebPushBroadcast(
  db: admin.firestore.Firestore,
  payload: WebPushNotificationPayload
): Promise<{ sent: number; failed: number; removed: number }> {
  let sent = 0;
  let failed = 0;
  let removed = 0;

  try {
    const colRef = db.collection('push_subscriptions');
    if (!colRef || typeof colRef.get !== 'function') {
      return { sent, failed, removed };
    }

    const snap = await colRef.get();
    if (!snap || snap.empty || !Array.isArray(snap.docs)) {
      return { sent, failed, removed };
    }

    await Promise.allSettled(
      snap.docs.map(async (docSnap) => {
        const data = typeof docSnap.data === 'function' ? docSnap.data() : null;
        if (!data?.endpoint || !data?.keys?.p256dh || !data?.keys?.auth) {
          return;
        }
        try {
          const result = await sendWebPushToSubscription(
            {
              endpoint: data.endpoint,
              keys: {
                p256dh: data.keys.p256dh,
                auth: data.keys.auth,
              },
            },
            payload
          );
          if (result.ok) {
            sent += 1;
          } else {
            failed += 1;
            if (result.gone && docSnap.ref && typeof docSnap.ref.delete === 'function') {
              await docSnap.ref.delete().catch(() => {});
              removed += 1;
            }
          }
        } catch {
          failed += 1;
        }
      })
    );
  } catch {
    // ignore se a coleção não estiver acessível no ambiente de teste mockado
  }

  return { sent, failed, removed };
}
