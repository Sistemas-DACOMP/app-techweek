import { describe, it, expect, vi } from 'vitest';
import { isValidUsername } from '../../src/lib/validators';
import { findUserByUsername } from '../../src/lib/userService';

describe('Unicidade de Nome de Usuário (Username Uniqueness)', () => {
  it('valida formato básico de usernames aceitos e rejeitados', () => {
    expect(isValidUsername('dev_tech')).toBe(true);
    expect(isValidUsername('lucas.silva')).toBe(true);
    expect(isValidUsername('aluno123')).toBe(true);
    expect(isValidUsername('ab')).toBe(false); // menos de 3 chars
    expect(isValidUsername('user@invalid!')).toBe(false); // caracteres invalidos
    expect(isValidUsername('')).toBe(false);
  });

  it('normaliza e busca usuário em cache/firestore por username limpo', async () => {
    const store = new Map();
    const mockLocalStorage = {
      getItem: (key) => store.get(key) || null,
      setItem: (key, val) => store.set(key, String(val)),
      removeItem: (key) => store.delete(key),
      clear: () => store.clear(),
      key: (index) => Array.from(store.keys())[index] || null,
      get length() { return store.size; }
    };
    Object.defineProperty(mockLocalStorage, Symbol.iterator, {
      value: function* () {
        yield* store.keys();
      }
    });

    const originalLocalStorage = globalThis.localStorage;
    globalThis.localStorage = mockLocalStorage;

    const mockUser = {
      uid: 'user_123',
      username: 'samuel_amorim',
      displayName: 'Samuel Amorim',
      course: 'Sistemas de Informação'
    };

    mockLocalStorage.setItem('facom_profile_user_123', JSON.stringify(mockUser));

    try {
      const found = await findUserByUsername('@samuel_amorim');
      expect(found).not.toBeNull();
      expect(found.username).toBe('samuel_amorim');
      expect(found.displayName).toBe('Samuel Amorim');

      const notFound = await findUserByUsername('usuario_inexistente_999');
      expect(notFound).toBeNull();
    } finally {
      globalThis.localStorage = originalLocalStorage;
    }
  });
});
