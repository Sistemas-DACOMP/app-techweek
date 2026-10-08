import { describe, it, expect } from 'vitest';
import { decideAccess } from './accessGuard';

const base = { authLoading: false, user: { uid: 'u' }, profileReady: true, role: 'PARTICIPANT', allowed: ['ADMIN'] };

describe('decideAccess', () => {
  it('espera enquanto o auth carrega', () => {
    expect(decideAccess({ ...base, authLoading: true, user: null })).toBe('loading');
  });
  it('sem usuário vai pro login', () => {
    expect(decideAccess({ ...base, user: null })).toBe('login');
  });
  it('usuário logado espera o perfil chegar', () => {
    expect(decideAccess({ ...base, profileReady: false, role: undefined })).toBe('loading');
  });
  it('usuário sem papel permitido vai pro login', () => {
    expect(decideAccess(base)).toBe('login');
    expect(decideAccess({ ...base, role: undefined })).toBe('login');
  });
  it('ADMIN entra no painel', () => {
    expect(decideAccess({ ...base, role: 'ADMIN' })).toBe('allowed');
  });
  it('STAFF entra na portaria (STAFF e ADMIN permitidos)', () => {
    const staff = { ...base, allowed: ['STAFF', 'ADMIN'] };
    expect(decideAccess({ ...staff, role: 'STAFF' })).toBe('allowed');
    expect(decideAccess({ ...staff, role: 'ADMIN' })).toBe('allowed');
    expect(decideAccess({ ...staff, role: 'PARTICIPANT' })).toBe('login');
  });
});
