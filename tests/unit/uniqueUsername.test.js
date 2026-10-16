import { describe, it, expect, vi, beforeEach } from 'vitest';
import { collection, query, where, limit, getDocs } from 'firebase/firestore';

vi.mock('../../src/lib/firebase', () => ({
  auth: {},
  db: { __mockDb: true },
  storage: {},
}));

vi.mock('firebase/firestore', () => ({
  doc: vi.fn(),
  getDoc: vi.fn(),
  setDoc: vi.fn(),
  updateDoc: vi.fn(),
  collection: vi.fn((dbInstance, path) => ({ dbInstance, path })),
  getDocs: vi.fn(),
  query: vi.fn((...args) => ({ queryArgs: args })),
  where: vi.fn((field, op, val) => ({ field, op, val })),
  orderBy: vi.fn(),
  limit: vi.fn((n) => ({ limit: n })),
  serverTimestamp: vi.fn(),
  onSnapshot: vi.fn(),
  deleteField: vi.fn(),
}));

import { checkUsernameAvailability } from '../../src/lib/userService';

describe('Validação de Unicidade de Username', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('rejeita handles nulos, muito curtos, muito longos ou com caracteres inválidos sem consultar o Firestore', async () => {
    expect(await checkUsernameAvailability('')).toEqual({ available: false, existingUser: null });
    expect(await checkUsernameAvailability(null)).toEqual({ available: false, existingUser: null });
    expect(await checkUsernameAvailability('ab')).toEqual({ available: false, existingUser: null });
    expect(await checkUsernameAvailability('a'.repeat(21))).toEqual({ available: false, existingUser: null });
    expect(await checkUsernameAvailability('dev!user#')).toEqual({ available: false, existingUser: null });

    expect(getDocs).not.toHaveBeenCalled();
  });

  it('normaliza o username removendo @, espaços e maiúsculas e retorna available: true quando livre no Firestore', async () => {
    getDocs.mockResolvedValueOnce({ empty: true, docs: [] });

    const res = await checkUsernameAvailability('  @Dev_User.01  ');

    expect(collection).toHaveBeenCalledWith({ __mockDb: true }, 'users');
    expect(where).toHaveBeenCalledWith('username', '==', 'dev_user.01');
    expect(limit).toHaveBeenCalledWith(1);
    expect(getDocs).toHaveBeenCalledTimes(1);
    expect(res).toEqual({
      available: true,
      existingUser: null,
    });
  });

  it('retorna available: false e dados de existingUser quando o username já existe na coleção /users', async () => {
    getDocs.mockResolvedValueOnce({
      empty: false,
      docs: [
        {
          data: () => ({
            displayName: 'Ana Carolina',
            avatarUrl: 'https://example.com/ana.png',
          }),
        },
      ],
    });

    const res = await checkUsernameAvailability('@Ana_Carolina');

    expect(where).toHaveBeenCalledWith('username', '==', 'ana_carolina');
    expect(res).toEqual({
      available: false,
      existingUser: {
        name: 'Ana Carolina',
        avatarUrl: 'https://example.com/ana.png',
      },
    });
  });
});

