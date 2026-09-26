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
function keyGenerator(req: Request): string {
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
