import { describe, it, expect, vi, beforeEach } from 'vitest';
import { 
  createUserProfile, 
  getUserProfile, 
  updateUserProfile, 
  uploadUserAvatar,
  updateUserEmail
} from './userService';
import { doc, setDoc, getDoc, updateDoc } from 'firebase/firestore';
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
});
