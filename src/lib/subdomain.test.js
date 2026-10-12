import { describe, it, expect } from 'vitest';
import { isRouteAllowedOnSubdomain } from './subdomain';

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
