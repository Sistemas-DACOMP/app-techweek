import { describe, it, expect, vi } from 'vitest';
import { createUserProfile } from '../../src/lib/userService';

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

  it('valida regras de negócio para Pós-graduação vs Aluno da UFU (incluindo novos rótulos)', () => {
    const validatePostgrad = (data) => {
      const errors = {};
      const isStudent = data.participantType === 'Aluno UFU Graduação' || data.participantType === 'Aluno da UFU' || data.participantType === 'Aluno de outra instituição';
      const isPostgrad = data.participantType === 'Aluno UFU Pós-graduação' || data.participantType === 'Pós-graduação';

      if (isStudent && !data.period) {
        errors.period = 'Selecione o período';
      }

      if (isPostgrad) {
        if (!data.institution) {
          errors.institution = 'Por favor, selecione sua instituição.';
        } else if (data.institution === 'Outra' && !data.customInstitution?.trim()) {
          errors.customInstitution = 'Por favor, digite o nome da sua instituição.';
        }
      }
      return errors;
    };

    // Caso 1: Pós-graduação com FACOM (válido, sem período)
    const res1 = validatePostgrad({
      participantType: 'Pós-graduação',
      institution: 'FACOM',
      period: null
    });
    expect(res1).toEqual({});

    // Caso 1b: Aluno UFU Pós-graduação com FEELT (válido, sem período)
    const res1b = validatePostgrad({
      participantType: 'Aluno UFU Pós-graduação',
      institution: 'FEELT',
      period: null
    });
    expect(res1b).toEqual({});

    // Caso 2: Pós-graduação sem instituição (erro)
    const res2 = validatePostgrad({
      participantType: 'Aluno UFU Pós-graduação',
      institution: '',
      period: null
    });
    expect(res2.institution).toBeDefined();

    // Caso 3: Pós-graduação com Outra mas sem preencher texto (erro)
    const res3 = validatePostgrad({
      participantType: 'Aluno UFU Pós-graduação',
      institution: 'Outra',
      customInstitution: '',
      period: null
    });
    expect(res3.customInstitution).toBeDefined();

    // Caso 4: Pós-graduação com Outra e texto preenchido (válido)
    const res4 = validatePostgrad({
      participantType: 'Aluno UFU Pós-graduação',
      institution: 'Outra',
      customInstitution: 'UNICAMP',
      period: null
    });
    expect(res4).toEqual({});

    // Caso 5: Aluno da UFU exige período
    const res5 = validatePostgrad({
      participantType: 'Aluno da UFU',
      period: null
    });
    expect(res5.period).toBeDefined();

    // Caso 6: Aluno UFU Graduação exige período
    const res6 = validatePostgrad({
      participantType: 'Aluno UFU Graduação',
      period: null
    });
    expect(res6.period).toBeDefined();

    // Caso 7: Aluno UFU Graduação com período preenchido (válido)
    const res7 = validatePostgrad({
      participantType: 'Aluno UFU Graduação',
      period: 3
    });
    expect(res7).toEqual({});
  });
});
