import cors from 'cors';

/**
 * Regex para validar domínios oficiais do Firebase Hosting do projeto:
 * Ex: https://facom-techweek.web.app, https://facom-techweek-2026.web.app,
 * https://facom-techweek.firebaseapp.com
 */
const FIREBASE_HOSTING_REGEX = /^https:\/\/facom-techweek[a-zA-Z0-9-]*\.(web\.app|firebaseapp\.com)$/;

/**
 * Regex para validar origens locais em ambiente de desenvolvimento/teste:
 * Ex: http://localhost:5173, http://127.0.0.1:3000
 */
const LOCAL_DEV_REGEX = /^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/;

/**
 * Avalia se uma origem de requisição HTTP é permitida pela política de CORS.
 *
 * @param origin Header 'Origin' recebido na requisição (ou undefined)
 * @returns boolean true se permitida, false se bloqueada
 */
export function isOriginAllowed(origin: string | undefined): boolean {
  // 1. Requisições sem header Origin (health check interno, curl, server-to-server)
  if (!origin) {
    return true;
  }

  // 2. Ambiente de desenvolvimento/teste: permite localhost e 127.0.0.1 em qualquer porta
  if (process.env.NODE_ENV !== 'production' && LOCAL_DEV_REGEX.test(origin)) {
    return true;
  }

  // 3. Origens adicionais configuradas via variável de ambiente (ALLOWED_ORIGINS)
  if (process.env.ALLOWED_ORIGINS) {
    const allowedList = process.env.ALLOWED_ORIGINS
      .split(',')
      .map((entry) => entry.trim())
      .filter(Boolean);

    if (allowedList.includes(origin)) {
      return true;
    }
  }

  // 4. Domínios oficiais do Firebase Hosting
  if (FIREBASE_HOSTING_REGEX.test(origin)) {
    return true;
  }

  // 5. Qualquer outra origem externa é bloqueada
  return false;
}

/**
 * Opções configuradas para o middleware express 'cors'.
 */
export const corsOptions: cors.CorsOptions = {
  origin: (origin, callback) => {
    if (isOriginAllowed(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Origem não permitida pela política de CORS.'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept']
};

