import { describe, it, expect, afterEach } from 'vitest';
import { isRouteAllowedOnSubdomain, getAppSubdomain } from './subdomain';

describe('isRouteAllowedOnSubdomain (KAN-118)', () => {
  it('admin e staff conseguem abrir o /profile (Editar perfil)', () => {
    expect(isRouteAllowedOnSubdomain('admin', '/profile')).toBe(true);
    expect(isRouteAllowedOnSubdomain('staff', '/profile')).toBe(true);
  });

  it('continua prendendo cada subdomínio no seu painel', () => {
    expect(isRouteAllowedOnSubdomain('admin', '/')).toBe(false);
    expect(isRouteAllowedOnSubdomain('admin', '/staff')).toBe(false);
    expect(isRouteAllowedOnSubdomain('staff', '/admin')).toBe(false);
    expect(isRouteAllowedOnSubdomain('staff', '/staff')).toBe(true);
  });

  it('sem subdomínio, nada é restrito', () => {
    expect(isRouteAllowedOnSubdomain(null, '/profile')).toBe(true);
  });
});

describe('getAppSubdomain', () => {
  const originalWindow = globalThis.window;

  afterEach(() => {
    if (originalWindow === undefined) {
      delete globalThis.window;
    } else {
      globalThis.window = originalWindow;
    }
  });

  it('retorna null em ambiente SSR (quando window é undefined)', () => {
    delete globalThis.window;
    expect(getAppSubdomain()).toBeNull();
  });

  it('detecta subdomínio admin com prefixo admin. ou adm. (case-insensitive)', () => {
    globalThis.window = { location: { hostname: 'admin.techweekufu.com.br' } };
    expect(getAppSubdomain()).toBe('admin');

    globalThis.window = { location: { hostname: 'ADM.techweekufu.com.br' } };
    expect(getAppSubdomain()).toBe('admin');
  });

  it('detecta subdomínio staff com prefixo staff. ou portaria. (case-insensitive)', () => {
    globalThis.window = { location: { hostname: 'staff.techweekufu.com.br' } };
    expect(getAppSubdomain()).toBe('staff');

    globalThis.window = { location: { hostname: 'PORTARIA.techweekufu.com.br' } };
    expect(getAppSubdomain()).toBe('staff');
  });

  it('retorna null para hostnames principais ou outros subdomínios', () => {
    globalThis.window = { location: { hostname: 'techweekufu.com.br' } };
    expect(getAppSubdomain()).toBeNull();

    globalThis.window = { location: { hostname: 'localhost' } };
    expect(getAppSubdomain()).toBeNull();

    globalThis.window = { location: { hostname: 'app.techweekufu.com.br' } };
    expect(getAppSubdomain()).toBeNull();
  });
});

