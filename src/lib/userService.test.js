import { describe, it, expect, vi, beforeEach } from 'vitest';
import { 
  createUserProfile, 
  getUserProfile, 
  updateUserProfile, 
  uploadUserAvatar,
  updateUserEmail,
  getLeaderboardUsers,
  subscribeToLeaderboardUsers
} from './userService';
import { doc, setDoc, getDoc, updateDoc, getDocs, query, where, orderBy, limit, onSnapshot } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { updateProfile, updateEmail } from 'firebase/auth';

vi.mock('firebase/firestore', () => ({
  doc: vi.fn(() => ({ id: 'mockDocRef' })),
  setDoc: vi.fn(),
  getDoc: vi.fn(),
  updateDoc: vi.fn(),
  collection: vi.fn(),
  getDocs: vi.fn(),
  query: vi.fn(),
  where: vi.fn(),
  orderBy: vi.fn(),
  limit: vi.fn(),
  onSnapshot: vi.fn(),
  increment: vi.fn(),
  serverTimestamp: vi.fn(() => 'MOCK_TIMESTAMP')
}));

vi.mock('firebase/storage', () => ({
  ref: vi.fn(() => ({ fullPath: 'avatars/123/avatar.png' })),
  uploadBytes: vi.fn(),
  getDownloadURL: vi.fn()
}));

vi.mock('firebase/auth', () => ({
  updateProfile: vi.fn(),
  updateEmail: vi.fn(() => Promise.resolve())
}));

vi.mock('./firebase', () => ({
  db: {},
  storage: {},
  auth: { currentUser: { uid: 'user-123' } }
}));

describe('userService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('createUserProfile', () => {
    it('cria o documento do usuário com username e dados normalizados', async () => {
      vi.mocked(setDoc).mockResolvedValueOnce(undefined);

      const result = await createUserProfile('user-123', {
        email: 'TEST@example.com',
        firstName: 'Samuel',
        lastName: 'Amorim',
        username: 'sam03amorim',
        participantType: 'Aluno da UFU'
      });

      expect(setDoc).toHaveBeenCalledTimes(1);
      expect(result.email).toBe('test@example.com');
      expect(result.username).toBe('sam03amorim');
      expect(result.firstName).toBe('Samuel');
    });

    it('lança erro se uid não for informado', async () => {
      await expect(createUserProfile(null, {})).rejects.toThrow('UID do usuário é obrigatório');
    });
  });

  describe('getUserProfile', () => {
    it('retorna os dados do documento quando ele existe', async () => {
      vi.mocked(getDoc).mockResolvedValueOnce({
        exists: () => true,
        data: () => ({ username: 'sam03amorim', totalPoints: 100 })
      });

      const profile = await getUserProfile('user-123');
      expect(profile.username).toBe('sam03amorim');
      expect(profile.totalPoints).toBe(100);
    });

    it('retorna null quando o documento não existe', async () => {
      vi.mocked(getDoc).mockResolvedValueOnce({
        exists: () => false
      });

      const profile = await getUserProfile('user-unknown');
      expect(profile).toBeNull();
    });
  });

  describe('uploadUserAvatar', () => {
    it('faz upload no storage e atualiza avatarUrl no firestore', async () => {
      vi.mocked(uploadBytes).mockResolvedValueOnce({});
      vi.mocked(getDownloadURL).mockResolvedValueOnce('https://storage.googleapis.com/avatar.png');
      vi.mocked(updateDoc).mockResolvedValueOnce(undefined);

      const mockFile = new File(['fake-content'], 'foto.png', { type: 'image/png' });
      const url = await uploadUserAvatar('user-123', mockFile);

      expect(url).toBe('https://storage.googleapis.com/avatar.png');
      expect(updateDoc).toHaveBeenCalled();
    });

    it('rejeita arquivos maiores que 2MB', async () => {
      const hugeFile = new File(['x'.repeat(2.5 * 1024 * 1024)], 'foto.png', { type: 'image/png' });
      Object.defineProperty(hugeFile, 'size', { value: 3 * 1024 * 1024 });

      await expect(uploadUserAvatar('user-123', hugeFile)).rejects.toThrow('A imagem precisa ter até 2MB.');
    });
  });

  describe('updateUserEmail', () => {
    it('lança erro se uid ou email não forem fornecidos', async () => {
      await expect(updateUserEmail('', 'teste@ufu.br')).rejects.toThrow('UID e novo e-mail são obrigatórios.');
      await expect(updateUserEmail('123', '')).rejects.toThrow('UID e novo e-mail são obrigatórios.');
    });

    it('atualiza o documento do usuário no Firestore e tenta no Auth', async () => {
      const result = await updateUserEmail('user-123', 'Novo.Email@ufu.br ');

      expect(result).toBe(true);
      expect(updateDoc).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          email: 'novo.email@ufu.br'
        })
      );
      expect(updateEmail).toHaveBeenCalledWith(
        expect.anything(),
        'novo.email@ufu.br'
      );
    });
  });

  describe('updateUserProfile (KAN-69)', () => {
    it('lança erro se uid não for fornecido', async () => {
      await expect(updateUserProfile('', { firstName: 'Samuel' })).rejects.toThrow('UID é obrigatório.');
    });

    it('atualiza campos de perfil no Firestore com serverTimestamp', async () => {
      vi.mocked(updateDoc).mockResolvedValueOnce(undefined);

      const updates = {
        firstName: 'Samuel',
        lastName: 'Amorim',
        username: 'sam03amorim',
        phone: '(34) 99999-9999',
        participantType: 'Aluno da UFU',
        course: 'Sistemas de Informação',
        period: 5,
        linkedin: 'linkedin.com/in/samuel',
        instagram: '@samuel'
      };

      const result = await updateUserProfile('user-123', updates);

      expect(result).toBe(true);
      expect(updateDoc).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          firstName: 'Samuel',
          lastName: 'Amorim',
          username: 'sam03amorim',
          course: 'Sistemas de Informação',
          period: 5,
          updatedAt: 'MOCK_TIMESTAMP'
        })
      );
    });
  });

  describe('getLeaderboardUsers e subscribeToLeaderboardUsers (KAN-55)', () => {
    it('getLeaderboardUsers consulta /users filtrando PARTICIPANT e ordenando por pontuacaoTotal desc limit 50', async () => {
      const mockDocs = [
        {
          id: 'user-1',
          data: () => ({
            role: 'PARTICIPANT',
            username: 'alice',
            firstName: 'Alice',
            pontuacaoTotal: 150,
            avatarUrl: 'https://avatar/alice.png'
          })
        },
        {
          id: 'user-2',
          data: () => ({
            role: 'PARTICIPANT',
            username: 'bob',
            firstName: 'Bob',
            pontuacaoTotal: 100,
            avatarUrl: null
          })
        }
      ];

      vi.mocked(getDocs).mockResolvedValueOnce({ docs: mockDocs });

      const result = await getLeaderboardUsers(50);

      expect(where).toHaveBeenCalledWith('role', '==', 'PARTICIPANT');
      expect(orderBy).toHaveBeenCalledWith('pontuacaoTotal', 'desc');
      expect(limit).toHaveBeenCalledWith(50);
      expect(result).toHaveLength(2);
      expect(result[0]).toMatchObject({ id: 'user-1', rank: 1, points: 150, username: 'alice' });
      expect(result[1]).toMatchObject({ id: 'user-2', rank: 2, points: 100, username: 'bob' });
    });

    it('aplica critério de tie-break (REG-RANK-001) quando há empate em pontos', async () => {
      const mockDocs = [
        {
          id: 'user-b',
          data: () => ({
            role: 'PARTICIPANT',
            username: 'zack',
            pontuacaoTotal: 100,
            createdAt: { toMillis: () => 2000 }
          })
        },
        {
          id: 'user-a',
          data: () => ({
            role: 'PARTICIPANT',
            username: 'ana',
            pontuacaoTotal: 100,
            createdAt: { toMillis: () => 1000 }
          })
        }
      ];

      vi.mocked(getDocs).mockResolvedValueOnce({ docs: mockDocs });

      const result = await getLeaderboardUsers(50);

      expect(result).toHaveLength(2);
      // 'ana' tem createdAt mais antigo (1000 < 2000), então desempata em 1º lugar
      expect(result[0].id).toBe('user-a');
      expect(result[0].rank).toBe(1);
      expect(result[1].id).toBe('user-b');
      expect(result[1].rank).toBe(2);
    });

    it('faz fallback gracioso se consulta pontuacaoTotal lançar erro de índice', async () => {
      vi.mocked(getDocs)
        .mockRejectedValueOnce(new Error('The query requires an index'))
        .mockResolvedValueOnce({
          docs: [
            {
              id: 'user-fallback',
              data: () => ({
                role: 'PARTICIPANT',
                username: 'carlos',
                totalPoints: 80
              })
            }
          ]
        });

      const result = await getLeaderboardUsers(50);

      expect(result).toHaveLength(1);
      expect(result[0]).toMatchObject({ id: 'user-fallback', rank: 1, points: 80, username: 'carlos' });
    });

    it('subscribeToLeaderboardUsers escuta via onSnapshot e entrega lista formatada', () => {
      const mockUnsubscribe = vi.fn();
      let capturedCallback;

      vi.mocked(onSnapshot).mockImplementation((_query, onNext) => {
        capturedCallback = onNext;
        return mockUnsubscribe;
      });

      const userCallback = vi.fn();
      const unsub = subscribeToLeaderboardUsers(userCallback, vi.fn(), 50);

      expect(onSnapshot).toHaveBeenCalled();
      expect(typeof unsub).toBe('function');

      // Simula emissão do Firestore
      capturedCallback({
        docs: [
          {
            id: 'snap-1',
            data: () => ({ role: 'PARTICIPANT', username: 'daniela', pontuacaoTotal: 250 })
          }
        ]
      });

      expect(userCallback).toHaveBeenCalledWith([
        expect.objectContaining({ id: 'snap-1', rank: 1, points: 250, username: 'daniela' })
      ]);

      unsub();
      expect(mockUnsubscribe).toHaveBeenCalled();
    });
  });
});

