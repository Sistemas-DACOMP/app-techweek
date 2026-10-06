import { describe, it, expect, vi, beforeEach } from 'vitest';
import { 
  DEFAULT_MISSIONS, 
  validateSecretWord, 
  validateQuizAnswer, 
  isFlashMissionActive,
  subscribeToMissions,
  seedDefaultMissions
} from '../../src/lib/missionService';
import { collection, onSnapshot, doc, writeBatch } from 'firebase/firestore';

const mockBatch = {
  set: vi.fn(),
  commit: vi.fn().mockResolvedValue(undefined)
};

vi.mock('firebase/firestore', () => ({
  collection: vi.fn(() => ({ id: 'missions_col' })),
  query: vi.fn(),
  orderBy: vi.fn(),
  onSnapshot: vi.fn(),
  addDoc: vi.fn(),
  doc: vi.fn((_db, col, id) => ({ id, col })),
  setDoc: vi.fn(),
  writeBatch: vi.fn(() => mockBatch),
  updateDoc: vi.fn(),
  deleteDoc: vi.fn(),
  serverTimestamp: vi.fn(() => 'MOCK_SERVER_TIMESTAMP'),
  getDocs: vi.fn()
}));

vi.mock('../../src/lib/firebase', () => ({
  db: { _type: 'mock_firestore_db' }
}));

describe('missionService - Regras e Validações de Missões (KAN-104 e KAN-106)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('contém lista de DEFAULT_MISSIONS rica e compatível com as missões existentes', () => {
    expect(Array.isArray(DEFAULT_MISSIONS)).toBe(true);
    expect(DEFAULT_MISSIONS.length).toBeGreaterThanOrEqual(15);

    // Valida IDs essenciais do app legado
    const ids = DEFAULT_MISSIONS.map(m => m.id);
    expect(ids).toContain('instagram_story');
    expect(ids).toContain('sponsor_visit');
    expect(ids).toContain('secret_password');
    expect(ids).toContain('network_first');
    expect(ids).toContain('network_course');

    // Valida presença dos 4 triggerModes
    const triggerModes = DEFAULT_MISSIONS.map(m => m.triggerMode);
    expect(triggerModes).toContain('auto');
    expect(triggerModes).toContain('form');
    expect(triggerModes).toContain('secret');
    expect(triggerModes).toContain('quiz');
  });

  describe('validateSecretWord', () => {
    it('valida palavras secretas com correspondência exata, case-insensitive e trim', () => {
      expect(validateSecretWord('OPORTUNIDADES', 'OPORTUNIDADES')).toBe(true);
      expect(validateSecretWord('oportunidades', 'OPORTUNIDADES')).toBe(true);
      expect(validateSecretWord('  Oportunidades  ', 'OPORTUNIDADES')).toBe(true);
      expect(validateSecretWord('sydle one', 'SYDLE ONE')).toBe(true);
    });

    it('rejeita palavras secretas incorretas ou vazias', () => {
      expect(validateSecretWord('ERRADA', 'OPORTUNIDADES')).toBe(false);
      expect(validateSecretWord('', 'OPORTUNIDADES')).toBe(false);
      expect(validateSecretWord(null, 'OPORTUNIDADES')).toBe(false);
      expect(validateSecretWord('OPORTUNIDADES', '')).toBe(false);
    });
  });

  describe('validateQuizAnswer', () => {
    it('valida índice de resposta correto no quiz', () => {
      expect(validateQuizAnswer(0, 0)).toBe(true);
      expect(validateQuizAnswer('2', 2)).toBe(true);
      expect(validateQuizAnswer(1, 2)).toBe(false);
    });
  });

  describe('isFlashMissionActive', () => {
    it('identifica corretamente se a missão relâmpago está ativa e dentro do prazo', () => {
      const activeFlash = {
        id: 'flash_1',
        isFlash: true,
        status: 'active',
        flashConfig: {
          expiresAt: new Date(Date.now() + 1000 * 60 * 5) // expira em 5 min
        }
      };
      expect(isFlashMissionActive(activeFlash)).toBe(true);

      const expiredFlash = {
        id: 'flash_2',
        isFlash: true,
        status: 'active',
        flashConfig: {
          expiresAt: new Date(Date.now() - 1000) // expirou há 1s
        }
      };
      expect(isFlashMissionActive(expiredFlash)).toBe(false);

      const pausedFlash = {
        id: 'flash_3',
        isFlash: true,
        status: 'paused',
        flashConfig: {
          expiresAt: new Date(Date.now() + 1000 * 60 * 5)
        }
      };
      expect(isFlashMissionActive(pausedFlash)).toBe(false);

      const normalMission = {
        id: 'normal_1',
        isFlash: false,
        status: 'active'
      };
      expect(isFlashMissionActive(normalMission)).toBe(false);
    });
  });

  describe('seedDefaultMissions (KAN-106)', () => {
    it('persiste todas as DEFAULT_MISSIONS e scan com merge: true usando writeBatch', async () => {
      const count = await seedDefaultMissions();
      expect(writeBatch).toHaveBeenCalled();
      expect(mockBatch.commit).toHaveBeenCalled();

      // DEFAULT_MISSIONS (17) + scan (1) = 18
      expect(count).toBe(DEFAULT_MISSIONS.length + 1);
      expect(mockBatch.set).toHaveBeenCalledTimes(DEFAULT_MISSIONS.length + 1);

      // Verifica se a primeira missão foi passada com merge: true e updatedAt
      const firstCallArgs = mockBatch.set.mock.calls[0];
      expect(firstCallArgs[1]).toMatchObject({
        id: DEFAULT_MISSIONS[0].id,
        updatedAt: 'MOCK_SERVER_TIMESTAMP'
      });
      expect(firstCallArgs[2]).toEqual({ merge: true });

      // Verifica se scan foi registrado com merge: true
      const scanCall = mockBatch.set.mock.calls.find(call => call[1].id === 'scan');
      expect(scanCall).toBeDefined();
      expect(scanCall[1].points).toBe(5);
      expect(scanCall[2]).toEqual({ merge: true });
    });
  });

  describe('subscribeToMissions (KAN-106)', () => {
    it('retorna lista vazia quando a coleção de missões no Firestore estiver vazia', () => {
      let snapshotCallback;
      onSnapshot.mockImplementation((_colRef, cb) => {
        snapshotCallback = cb;
        return vi.fn();
      });

      const callback = vi.fn();
      subscribeToMissions(callback);

      // Simula snapshot vazio
      snapshotCallback({
        empty: true,
        docs: []
      });

      expect(callback).toHaveBeenCalledWith([]);
    });

    it('mapeia e ordena documentos client-side pelo campo order', () => {
      let snapshotCallback;
      onSnapshot.mockImplementation((_colRef, cb) => {
        snapshotCallback = cb;
        return vi.fn();
      });

      const callback = vi.fn();
      subscribeToMissions(callback);

      // Simula snapshot com docs fora de ordem
      snapshotCallback({
        empty: false,
        docs: [
          { id: 'm2', data: () => ({ title: 'Missão 2', order: 5 }) },
          { id: 'm1', data: () => ({ title: 'Missão 1', order: 1 }) },
          { id: 'm3', data: () => ({ title: 'Missão 3' }) } // sem order -> fallback 99
        ]
      });

      expect(callback).toHaveBeenCalledWith([
        { id: 'm1', title: 'Missão 1', order: 1 },
        { id: 'm2', title: 'Missão 2', order: 5 },
        { id: 'm3', title: 'Missão 3' }
      ]);
    });

    it('chama onError e repassa DEFAULT_MISSIONS quando o listener falhar', () => {
      let errorCallback;
      onSnapshot.mockImplementation((_colRef, _cb, errCb) => {
        errorCallback = errCb;
        return vi.fn();
      });

      const callback = vi.fn();
      const onError = vi.fn();
      subscribeToMissions(callback, onError);

      const mockError = new Error('Firestore connection failed');
      errorCallback(mockError);

      expect(onError).toHaveBeenCalledWith(mockError);
      expect(callback).toHaveBeenCalledWith(DEFAULT_MISSIONS);
    });
  });
});
