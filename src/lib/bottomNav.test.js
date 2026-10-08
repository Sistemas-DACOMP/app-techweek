import { describe, it, expect } from 'vitest';
import { shouldShowBottomNav } from './bottomNav';

const base = { pathname: '/profile', search: '?edit=true' };

describe('shouldShowBottomNav', () => {
  it('esconde ao editar perfil sendo admin, staff ou patrocinador', () => {
    for (const role of ['ADMIN', 'STAFF', 'SPONSOR']) {
      expect(shouldShowBottomNav({ ...base, role })).toBe(false);
    }
  });
  it('mantém para participante (ou papel ainda desconhecido) editando o perfil', () => {
    expect(shouldShowBottomNav({ ...base, role: 'PARTICIPANT' })).toBe(true);
    expect(shouldShowBottomNav({ ...base, role: undefined })).toBe(true);
  });
  it('só esconde na edição: o perfil sem edit e as outras telas mantêm a barra', () => {
    expect(shouldShowBottomNav({ pathname: '/profile', search: '', role: 'ADMIN' })).toBe(true);
    expect(shouldShowBottomNav({ pathname: '/feed', search: '?edit=true', role: 'ADMIN' })).toBe(true);
  });
  it('continua escondida nas telas de entrada e nos painéis', () => {
    expect(shouldShowBottomNav({ pathname: '/login', isAuthPage: true, role: 'PARTICIPANT' })).toBe(false);
    expect(shouldShowBottomNav({ pathname: '/admin', isPortalPage: true, role: 'ADMIN' })).toBe(false);
  });
});
