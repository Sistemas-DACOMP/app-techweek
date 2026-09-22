import { describe, it, expect, vi } from 'vitest';
import { registerUser } from './registerUser';

/**
 * Fake mínimo de Firestore: só o suficiente pra exercitar a transação
 * (tx.get/tx.set) sem precisar de um projeto Firebase real.
 */
function makeFakeDb(userAlreadyExists: boolean) {
  const setSpy = vi.fn();
  const userRef = { path: 'users/fake-uid' };

  const tx = {
    get: vi.fn().mockResolvedValue({ exists: userAlreadyExists }),
    set: setSpy
  };

  const db = {
    collection: vi.fn().mockReturnValue({
      doc: vi.fn().mockReturnValue(userRef)
    }),
    runTransaction: vi.fn(async (fn: (tx: typeof tx) => Promise<boolean>) => fn(tx))
  };

  return { db, setSpy, tx };
}

describe('registerUser (REG-LGPD-001 / KAN-72)', () => {
  it('cria o perfil quando o usuário ainda não existe em /users/{uid}', async () => {
    const { db, setSpy } = makeFakeDb(false);

    const result = await registerUser(db as any, 'uid-1', 'participante@example.com');

    expect(result).toEqual({
      status: 'created',
      user: { uid: 'uid-1', email: 'participante@example.com', role: 'PARTICIPANT' }
    });
    expect(setSpy).toHaveBeenCalledTimes(1);
  });

  it('grava role PARTICIPANT e preenche termsAcceptedAt/createdAt no documento', async () => {
    const { db, setSpy } = makeFakeDb(false);

    await registerUser(db as any, 'uid-1', 'participante@example.com');

    const [, data] = setSpy.mock.calls[0];
    expect(data).toMatchObject({
      uid: 'uid-1',
      email: 'participante@example.com',
      role: 'PARTICIPANT'
    });
    expect(data).toHaveProperty('termsAcceptedAt');
    expect(data).toHaveProperty('createdAt');
  });

  it('aceita email null quando o token do Firebase Auth não traz email', async () => {
    const { db, setSpy } = makeFakeDb(false);

    const result = await registerUser(db as any, 'uid-2', null);

    expect(result.status).toBe('created');
    expect(setSpy.mock.calls[0][1].email).toBeNull();
  });

  it('não sobrescreve o documento e retorna already-registered quando /users/{uid} já existe', async () => {
    const { db, setSpy } = makeFakeDb(true);

    const result = await registerUser(db as any, 'uid-1', 'participante@example.com');

    expect(result).toEqual({ status: 'already-registered' });
    expect(setSpy).not.toHaveBeenCalled();
  });

  it('persiste os campos complementares de perfil do aluno (KAN-72 + KAN-68)', async () => {
    const { db, setSpy } = makeFakeDb(false);

    const profile = {
      firstName: 'Ana',
      lastName: 'Silva',
      username: 'anasilva',
      course: 'Ciência da Computação',
      period: '4º Período'
    };

    const result = await registerUser(db as any, 'uid-3', 'ana@ufu.br', profile);

    expect(result.status).toBe('created');
    const [, data] = setSpy.mock.calls[0];
    expect(data).toMatchObject({
      uid: 'uid-3',
      email: 'ana@ufu.br',
      firstName: 'Ana',
      lastName: 'Silva',
      displayName: 'Ana Silva',
      username: 'anasilva',
      course: 'Ciência da Computação',
      period: '4º Período',
      totalPoints: 0
    });
  });
});

