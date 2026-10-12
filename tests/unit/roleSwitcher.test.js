import { describe, it, expect } from 'vitest';
import { rolesFor } from '../../src/components/RoleSwitcher';

describe('rolesFor (KAN-111)', () => {
  it('participante e papel desconhecido não veem staff, patrocinador nem admin', () => {
    expect(rolesFor('PARTICIPANT')).toEqual(['PARTICIPANT']);
    expect(rolesFor(undefined)).toEqual(['PARTICIPANT']);
  });
  it('staff não vê patrocinador, e patrocinador não vê staff', () => {
    expect(rolesFor('STAFF')).not.toContain('SPONSOR');
    expect(rolesFor('SPONSOR')).not.toContain('STAFF');
  });
  it('só admin vê todos', () => {
    expect(rolesFor('ADMIN')).toContain('SPONSOR');
  });
});
