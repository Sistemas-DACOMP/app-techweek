// @vitest-environment happy-dom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import React from 'react';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';

const mockNavigate = vi.fn();

vi.mock('react-router-dom', () => ({
  useNavigate: () => mockNavigate,
}));

import RoleSwitcher, { rolesFor, ROLE_COLORS, ROLE_LABELS } from '../../src/components/RoleSwitcher';

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
    expect(rolesFor('ADMIN')).toEqual(['PARTICIPANT', 'STAFF', 'SPONSOR', 'ADMIN']);
  });
});

describe('RoleSwitcher Component (KAN-111)', () => {
  beforeEach(() => {
    mockNavigate.mockReset();
  });

  afterEach(() => {
    cleanup();
  });

  it('renderiza apenas os papéis disponíveis para STAFF e destaca o papel atual com aria-current e selo "em uso"', () => {
    render(React.createElement(RoleSwitcher, { role: 'STAFF', current: 'PARTICIPANT' }));

    const buttons = screen.getAllByRole('button');
    expect(buttons).toHaveLength(2);

    const participantBtn = screen.getByRole('button', { name: /participante/i });
    const staffBtn = screen.getByRole('button', { name: /staff/i });

    expect(participantBtn.getAttribute('aria-current')).toBe('true');
    expect(participantBtn.textContent).toContain('em uso');
    expect(staffBtn.getAttribute('aria-current')).toBeNull();
    expect(screen.queryByRole('button', { name: /patrocinador/i })).toBeNull();
    expect(screen.queryByRole('button', { name: /admin/i })).toBeNull();
  });

  it('não navega ao clicar no papel que já está em uso, mas navega ao clicar em outro papel disponível', () => {
    render(React.createElement(RoleSwitcher, { role: 'ADMIN', current: 'ADMIN' }));

    const buttons = screen.getAllByRole('button');
    expect(buttons).toHaveLength(4);

    const adminBtn = screen.getByRole('button', { name: /admin/i });
    fireEvent.click(adminBtn);
    expect(mockNavigate).not.toHaveBeenCalled();

    const sponsorBtn = screen.getByRole('button', { name: /patrocinador/i });
    fireEvent.click(sponsorBtn);
    expect(mockNavigate).toHaveBeenCalledWith('/sponsor');

    const staffBtn = screen.getByRole('button', { name: /staff/i });
    fireEvent.click(staffBtn);
    expect(mockNavigate).toHaveBeenCalledWith('/staff');

    const participantBtn = screen.getByRole('button', { name: /participante/i });
    fireEvent.click(participantBtn);
    expect(mockNavigate).toHaveBeenCalledWith('/');
  });

  it('exporta ROLE_COLORS e ROLE_LABELS consistentes para os 4 papéis', () => {
    expect(ROLE_LABELS).toEqual({
      PARTICIPANT: 'Participante',
      STAFF: 'Staff',
      SPONSOR: 'Patrocinador',
      ADMIN: 'Admin',
    });
    expect(Object.keys(ROLE_COLORS)).toEqual(['PARTICIPANT', 'STAFF', 'SPONSOR', 'ADMIN']);
  });
});

