import { randomUUID } from 'node:crypto';
import { Request, Response } from 'express';
import rateLimit, { Options } from 'express-rate-limit';

// KAN-75: rate limit por uid, não por IP — Cloud Run/Functions pode servir
// vários usuários atrás do mesmo IP (NAT, rede do evento), então IP erra pra
// mais e pra menos. `keyGenerator` só funciona corretamente em rotas
// montadas DEPOIS de `requireAuth` (precisa de `req.user.uid` já setado).
//
// ponytail: store em memória (padrão do express-rate-limit), não
// compartilhado entre instâncias — com `maxInstances: 10` (backend/src/index.ts)
// um atacante espalhado entre instâncias pode levar até ~10x o limite
// nominal antes de qualquer instância individual bloquear. Aceitável pro
// volume esperado do evento (throttling real continua existindo, só não é
// exato); migrar pra um store compartilhado (Firestore/Redis) só se abuso
// distribuído de verdade for observado.
// Achado do security review: um fallback fixo tipo 'sem-uid' criaria um balde
// COMPARTILHADO entre toda requisição sem uid, se algum dia uma rota nova
// montar este limiter antes/sem requireAuth por engano — um usuário sem uid
// nenhum bloquearia outro sem relação nenhuma entre eles, mascarando o erro
// de wiring como "rate limit funcionando". Melhor: cada requisição sem uid
// vira sua própria chave (randomUUID), nunca compete com outra, e o erro
// fica visível no log em vez de silencioso.
export function keyGenerator(req: Request): string {
  if (req.user?.uid) return req.user.uid;
  console.error('rateLimiter: req.user.uid ausente — limiter montado antes/sem requireAuth?', req.method, req.path);
  return randomUUID();
}

function handler(req: Request, res: Response): void {
  res.status(429).json({
    error: 'RATE_LIMITED',
    message: 'Muitas requisições em pouco tempo. Aguarde um momento antes de tentar de novo.'
  });
}

const shared: Partial<Options> = {
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator,
  handler
};

// Rotas de participante (register, checkin, reserve, points/claim): mesma
// classe de risco (token válido martelando a mesma ação repetidamente).
export const participantActionLimiter = rateLimit({
  ...shared,
  windowMs: 5 * 60 * 1000,
  limit: 30
});

// Broadcast (KAN-61): dispara push real pra todo mundo, custo/risco maior por
// chamada — teto bem mais baixo que as rotas de participante.
export const adminBroadcastLimiter = rateLimit({
  ...shared,
  windowMs: 10 * 60 * 1000,
  limit: 10
});

// KAN-124: gestão de patrocinadores/convites (cada chamada pode disparar e-mail).
export const adminSponsorLimiter = rateLimit({
  ...shared,
  windowMs: 10 * 60 * 1000,
  limit: 60
});

// Screen-token / KAN-51 (ERR-080): emissão de token de telão por STAFF/ADMIN.
// Limite de 60 requisições por minuto por usuário autenticado.
export const staffActionLimiter = rateLimit({
  ...shared,
  windowMs: 1 * 60 * 1000,
  limit: 60
});

// Sympla (ERR-085): sincronização/verificação de ingressos contra a API externa do Sympla.
// Protege a cota da organização no Sympla com teto de 10 req/min por participante autenticado.
export const symplaSyncLimiter = rateLimit({
  ...shared,
  windowMs: 1 * 60 * 1000,
  limit: 10
});

// Sympla (ERR-085): consulta pública dos detalhes do evento Sympla.
// 30 req/5min por IP.
export const symplaPublicLimiter = rateLimit({
  standardHeaders: true,
  legacyHeaders: false,
  handler,
  windowMs: 5 * 60 * 1000,
  limit: 30
});

// KAN-124: rotas PÚBLICAS de convite (sem auth no GET, auth só depois no
// accept): chave = IP (padrão do express-rate-limit, sem keyGenerator de uid).
// 60 req/15min por IP (CGNAT/Wi-Fi do evento junta muita gente num IP só).
// ATENÇÃO: `trust proxy` (index.ts) depende da topologia real: Cloud Function
// direto (1 hop do Google), ou Vercel/Hosting na frente (mais hops). Se estiver
// errado, req.ip vira o IP do proxy (todo mundo no mesmo balde) ou fica
// spoofável via X-Forwarded-For. Validar em homolog ligando DEBUG_CLIENT_IP=1
// (ver debugClientIp) e comparando req.ip com x-forwarded-for.
// ponytail: store em memória por instância (ver nota acima).
export const sponsorInviteIpLimiter = rateLimit({
  standardHeaders: true,
  legacyHeaders: false,
  handler,
  windowMs: 15 * 60 * 1000,
  limit: 60
});

// Log temporário pra validar a topologia do proxy em homolog: só liga com
// DEBUG_CLIENT_IP=1 (desligado por padrão), loga UMA vez por instância e
// nunca o path/URL (o token do convite vai na URL).
let clientIpLogged = false;
export function debugClientIp(req: Request, _res: Response, next: () => void): void {
  if (process.env.DEBUG_CLIENT_IP === '1' && !clientIpLogged) {
    clientIpLogged = true;
    console.warn('DEBUG_CLIENT_IP req.ip=', req.ip, 'x-forwarded-for=', req.headers['x-forwarded-for']);
  }
  next();
}
