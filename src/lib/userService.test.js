import { describe, it, expect, vi, beforeEach } from 'vitest';
import { updateUserEmail } from './userService';
import * as firestore from 'firebase/firestore';
import * as authModule from 'firebase/auth';

vi.mock('firebase/firestore', () => ({
  doc: vi.fn(() => ({ id: 'mock-doc' })),
  updateDoc: vi.fn(() => Promise.resolve()),
  serverTimestamp: vi.fn(() => 'MOCK_TIMESTAMP'),
  getDoc: vi.fn(),
  setDoc: vi.fn(),
  collection: vi.fn(),
  getDocs: vi.fn(),
  query: vi.fn(),
  where: vi.fn(),
  orderBy: vi.fn(),
  limit: vi.fn(),
  increment: vi.fn()
}));

vi.mock('firebase/storage', () => ({
  ref: vi.fn(),
  uploadBytes: vi.fn(),
  getDownloadURL: vi.fn()
}));

vi.mock('firebase/auth', () => ({
  updateEmail: vi.fn(() => Promise.resolve())
}));

vi.mock('./firebase', () => ({
  db: {},
  storage: {},
  auth: {
    currentUser: {
      uid: 'user-123',
      email: 'old@example.com'
    }
  }
}));

describe('userService - updateUserEmail', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('lança erro se uid ou email não forem fornecidos', async () => {
    await expect(updateUserEmail('', 'teste@ufu.br')).rejects.toThrow('UID e novo e-mail são obrigatórios.');
    await expect(updateUserEmail('123', '')).rejects.toThrow('UID e novo e-mail são obrigatórios.');
  });

  it('atualiza o documento do usuário no Firestore e tenta no Auth', async () => {
    const result = await updateUserEmail('user-123', 'Novo.Email@ufu.br ');

    expect(result).toBe(true);
    expect(firestore.updateDoc).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        email: 'novo.email@ufu.br'
      })
    );
    expect(authModule.updateEmail).toHaveBeenCalledWith(
      expect.anything(),
      'novo.email@ufu.br'
    );
  });
});

