import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import express, { Request, Response } from 'express';
import { getTrustProxyHops, healthCheckHandler } from './index';

function makeRes(): Response {
  const res: any = {};
  res.status = vi.fn().mockReturnValue(res);
  res.json = vi.fn().mockReturnValue(res);
  return res as Response;
}

function makeFakeReq(app: any, xff?: string, remoteAddress = '10.0.0.1'): Request {
  const req = Object.create(express.request);
  req.app = app;
  req.headers = xff ? { 'x-forwarded-for': xff } : {};
  req.connection = { remoteAddress };
  return req as Request;
}

describe('getTrustProxyHops (Ops / KAN-124 / Proxy Topology)', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it('retorna 1 como padrão seguro quando TRUST_PROXY_HOPS não está definido', () => {
    delete process.env.TRUST_PROXY_HOPS;
    expect(getTrustProxyHops()).toBe(1);
  });

  it('retorna 1 quando TRUST_PROXY_HOPS é inválido ou menor que 1', () => {
    process.env.TRUST_PROXY_HOPS = 'invalid';
    expect(getTrustProxyHops()).toBe(1);

    process.env.TRUST_PROXY_HOPS = '0';
    expect(getTrustProxyHops()).toBe(1);

    process.env.TRUST_PROXY_HOPS = '-3';
    expect(getTrustProxyHops()).toBe(1);
  });

  it('retorna o número exato de hops quando configurado para topologias com múltiplos proxies (ex: Firebase Hosting rewrite = 2)', () => {
    process.env.TRUST_PROXY_HOPS = '2';
    expect(getTrustProxyHops()).toBe(2);

    process.env.TRUST_PROXY_HOPS = '3';
    expect(getTrustProxyHops()).toBe(3);
  });
});

describe('healthCheckHandler (GET /api/health / Diagnóstico de IP)', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it('em operação normal (DEBUG_CLIENT_IP desligado), retorna payload padrão sem vazar dados de debug', () => {
    delete process.env.DEBUG_CLIENT_IP;
    const req = {
      ip: '203.0.113.50',
      ips: [],
      headers: {}
    } as unknown as Request;
    const res = makeRes();

    healthCheckHandler(req, res);

    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        status: 'ok',
        service: 'facom-techweek-api'
      })
    );
    expect((res.json as any).mock.calls[0][0].debug).toBeUndefined();
  });

  it('quando DEBUG_CLIENT_IP="1", inclui nó debug com clientIp, ips, xForwardedFor e trustProxyHops', () => {
    process.env.DEBUG_CLIENT_IP = '1';
    process.env.TRUST_PROXY_HOPS = '2';

    const req = {
      ip: '177.100.20.15',
      ips: ['177.100.20.15', '199.36.158.100'],
      headers: { 'x-forwarded-for': '177.100.20.15, 199.36.158.100' }
    } as unknown as Request;
    const res = makeRes();

    healthCheckHandler(req, res);

    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        status: 'ok',
        service: 'facom-techweek-api',
        debug: {
          clientIp: '177.100.20.15',
          ips: ['177.100.20.15', '199.36.158.100'],
          xForwardedFor: '177.100.20.15, 199.36.158.100',
          trustProxyHops: 2
        }
      })
    );
  });
});

describe('Topologia Express Trust Proxy (Cloud Function direto vs Firebase Hosting rewrite)', () => {
  it('com trust proxy 1: chamada direta à Cloud Function identifica IP real do cliente corretamente', () => {
    const app = express();
    app.set('trust proxy', 1);

    const clientIp = '189.40.10.45';
    // Topologia direta: Cliente -> Cloud Run GFE (1 hop)
    const req = makeFakeReq(app, clientIp);

    expect(req.ip).toBe(clientIp);
  });

  it('com trust proxy 1: chamada via Firebase Hosting colapsa no IP do Hosting (problema identificado)', () => {
    const app = express();
    app.set('trust proxy', 1);

    const clientIp = '189.40.10.45';
    const hostingIp = '199.36.158.100'; // CDN do Firebase Hosting
    // Topologia com rewrite: Cliente -> Firebase Hosting -> Cloud Run (2 hops)
    const req = makeFakeReq(app, `${clientIp}, ${hostingIp}`);

    // Com 1 hop de confiança, Express confia apenas no socket e toma o Hosting IP como cliente
    expect(req.ip).toBe(hostingIp);
  });

  it('com trust proxy 2: chamada via Firebase Hosting resolve o IP real do cliente com precisão', () => {
    const app = express();
    app.set('trust proxy', 2);

    const clientIp = '189.40.10.45';
    const hostingIp = '199.36.158.100';
    // Topologia com rewrite: Cliente -> Firebase Hosting -> Cloud Run (2 hops)
    const req = makeFakeReq(app, `${clientIp}, ${hostingIp}`);

    // Com 2 hops de confiança, Express descarta o Hosting IP e extrai o IP real do cliente
    expect(req.ip).toBe(clientIp);
  });
});
