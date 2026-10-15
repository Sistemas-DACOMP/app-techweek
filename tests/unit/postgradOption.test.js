import { describe, it, expect, vi } from 'vitest';
import { createUserProfile } from '../../src/lib/userService';
import { validateAcademicProfile } from '../../src/lib/validators';

// Mock doc, setDoc, serverTimestamp from firebase/firestore
vi.mock('firebase/firestore', () => {
  return {
    doc: vi.fn((db, col, id) => ({ path: `${col}/${id}` })),
    setDoc: vi.fn(async () => Promise.resolve()),
    serverTimestamp: vi.fn(() => 'MOCK_TIMESTAMP'),
    getDoc: vi.fn(),
    updateDoc: vi.fn(),
    getFirestore: vi.fn()
  };
});

vi.mock('../../src/lib/firebase', () => ({
  db: {},
  auth: { currentUser: null }
}));

describe('Pós-graduação Form and Service Logic', () => {
  it('grava o campo institution em createUserProfile quando fornecido', async () => {
    const { setDoc } = await import('firebase/firestore');

    await createUserProfile('user123', {
      email: 'posgrad@ufu.br',
      displayName: 'Ana Silva',
      username: 'anasilva',
      participantType: 'Pós-graduação',
      course: 'Pós-graduação',
      period: null,
      institution: 'FACOM'
    });

    expect(setDoc).toHaveBeenCalledWith(
      { path: 'users/user123' },
      expect.objectContaining({
        email: 'posgrad@ufu.br',
        participantType: 'Pós-graduação',
        course: 'Pós-graduação',
        period: null,
        institution: 'FACOM'
      }),
      { merge: true }
    );
  });

  it('grava instituição customizada para Pós-graduação com opção Outra', async () => {
    const { setDoc } = await import('firebase/firestore');

    await createUserProfile('user456', {
      email: 'posgrad2@usp.br',
      displayName: 'Carlos Souza',
      username: 'carlossouza',
      participantType: 'Pós-graduação',
      course: 'Pós-graduação',
      period: null,
      institution: 'USP - São Carlos'
    });

    expect(setDoc).toHaveBeenCalledWith(
      { path: 'users/user456' },
      expect.objectContaining({
        participantType: 'Pós-graduação',
        institution: 'USP - São Carlos',
        period: null
      }),
      { merge: true }
    );
  });

  it('valida regras de negócio para Pós-graduação vs Aluno da UFU usando validateAcademicProfile real', () => {
    // Caso 1: Pós-graduação com FACOM (válido, sem período)
    const res1 = validateAcademicProfile({
      participantType: 'Pós-graduação',
      institution: 'FACOM',
      period: null
    }, { requirePeriod: true });
    expect(res1).toEqual({});

    // Caso 1b: Aluno UFU Pós-graduação com FEELT (válido, sem período)
    const res1b = validateAcademicProfile({
      participantType: 'Aluno UFU Pós-graduação',
      institution: 'FEELT',
      period: null
    }, { requirePeriod: true });
    expect(res1b).toEqual({});

    // Caso 2: Pós-graduação sem instituição (erro)
    const res2 = validateAcademicProfile({
      participantType: 'Aluno UFU Pós-graduação',
      institution: '',
      period: null
    }, { requirePeriod: true });
    expect(res2.institution).toBe('Por favor, selecione sua instituição.');

    // Caso 3: Pós-graduação com Outra mas sem preencher texto (erro)
    const res3 = validateAcademicProfile({
      participantType: 'Aluno UFU Pós-graduação',
      institution: 'Outra',
      customInstitution: '   ',
      period: null
    }, { requirePeriod: true });
    expect(res3.customInstitution).toBe('Por favor, digite o nome da sua instituição.');

    // Caso 4: Pós-graduação com Outra e texto preenchido (válido)
    const res4 = validateAcademicProfile({
      participantType: 'Aluno UFU Pós-graduação',
      institution: 'Outra',
      customInstitution: 'UNICAMP',
      period: null
    }, { requirePeriod: true });
    expect(res4).toEqual({});

    // Caso 5: Aluno da UFU exige período quando requirePeriod=true
    const res5 = validateAcademicProfile({
      participantType: 'Aluno da UFU',
      period: null
    }, { requirePeriod: true });
    expect(res5.period).toBe('Selecione o período');

    // Caso 6: Aluno UFU Graduação exige período quando requirePeriod=true
    const res6 = validateAcademicProfile({
      participantType: 'Aluno UFU Graduação',
      period: null
    }, { requirePeriod: true });
    expect(res6.period).toBe('Selecione o período');

    // Caso 7: Aluno UFU Graduação com período preenchido (válido)
    const res7 = validateAcademicProfile({
      participantType: 'Aluno UFU Graduação',
      period: 3
    }, { requirePeriod: true });
    expect(res7).toEqual({});

    // Caso 8: Aluno UFU Graduação com curso "Outro (especificar)" sem texto exige customCourse
    const res8 = validateAcademicProfile({
      participantType: 'Aluno UFU Graduação',
      course: 'Outro (especificar)',
      customCourse: '  ',
      period: 3
    });
    expect(res8.customCourse).toBe('Por favor, digite o nome do seu curso.');
  });
});

