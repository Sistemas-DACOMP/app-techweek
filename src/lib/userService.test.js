import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { 
  createUserProfile, 
  getUserProfile, 
  updateUserProfile, 
  uploadUserAvatar,
  updateUserEmail,
  cancelPendingEmailChange,
  syncUserEmailWithAuth,
  getLeaderboardUsers,
  subscribeToLeaderboardUsers,
  updateUserRoleInFirestore,
  checkUsernameAvailability,
  findUserByUsername,
  getUserPointEvents,
  subscribeToAllUsers,
  getCachedUserProfile
} from './userService';
import { apiRequest } from './api';
import { doc, setDoc, getDoc, updateDoc, getDocs, query, where, orderBy, limit, onSnapshot, deleteField } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { updateProfile, updateEmail, verifyBeforeUpdateEmail, reauthenticateWithCredential } from 'firebase/auth';

vi.mock('firebase/firestore', () => ({
  doc: vi.fn(() => ({ id: 'mockDocRef' })),
  setDoc: vi.fn(),
  getDoc: vi.fn(),
  updateDoc: vi.fn(),
  deleteField: vi.fn(() => 'MOCK_DELETE_FIELD'),
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
  updateEmail: vi.fn(() => Promise.resolve()),
  verifyBeforeUpdateEmail: vi.fn(() => Promise.resolve()),
  reauthenticateWithCredential: vi.fn(() => Promise.resolve()),
  EmailAuthProvider: { credential: vi.fn((email, pass) => ({ email, pass })) }
}));

vi.mock('./api', () => ({ apiRequest: vi.fn() }));

vi.mock('./firebase', () => ({
  db: {},
  storage: {},
  auth: { currentUser: { uid: 'user-123', email: 'atual@exemplo.com', getIdToken: vi.fn().mockResolvedValue('mock-token') } }
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

    it('nunca grava papel elevado vindo do cliente nem infere papel por e-mail', async () => {
      vi.mocked(setDoc).mockResolvedValueOnce(undefined);
      const result = await createUserProfile('user-123', { email: 'conta.qualquer@exemplo.com', role: 'ADMIN' });
      expect(result.role).toBe('PARTICIPANT');
    });

    it('lança erro se uid não for informado', async () => {
      await expect(createUserProfile(null, {})).rejects.toThrow('UID do usuário é obrigatório');
    });
  });

  describe('createUserProfile e os campos de ingresso Sympla (KAN-108)', () => {
    it('não manda symplaTicket, hasSymplaTicket nem ticketId pro Firestore (as regras bloqueiam), mas mantém no cache local', async () => {
      vi.mocked(setDoc).mockResolvedValueOnce(undefined);
      const ticket = { ticketNumber: 'ABC-123' };
      const result = await createUserProfile('user-9', { email: 'a@b.com', symplaTicket: ticket, hasSymplaTicket: true });

      const payload = vi.mocked(setDoc).mock.calls.at(-1)[1];
      expect(payload).not.toHaveProperty('symplaTicket');
      expect(payload).not.toHaveProperty('hasSymplaTicket');
      expect(payload).not.toHaveProperty('ticketId');
      expect(payload.role).toBe('PARTICIPANT');
      expect(result.symplaTicket).toEqual(ticket);
    });
  });

  describe('getUserProfile', () => {
    it('mantém o papel do servidor independente do e-mail', async () => {
      vi.mocked(getDoc).mockResolvedValueOnce({
        exists: () => true,
        data: () => ({ email: 'conta.qualquer@exemplo.com', role: 'PARTICIPANT' })
      });
      const profile = await getUserProfile('user-999');
      expect(profile.role).toBe('PARTICIPANT');
    });

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

  describe('updateUserEmail (KAN-116)', () => {
    it('lança erro se uid ou email não forem fornecidos', async () => {
      await expect(updateUserEmail('', 'teste@ufu.br')).rejects.toThrow('UID e novo e-mail são obrigatórios.');
      await expect(updateUserEmail('123', '')).rejects.toThrow('UID e novo e-mail são obrigatórios.');
    });

    it('envia verifyBeforeUpdateEmail e grava pendingEmailChange no Firestore sem alterar o email principal', async () => {
      vi.mocked(updateDoc).mockResolvedValueOnce(undefined);
      const result = await updateUserEmail('user-123', 'Novo.Email@ufu.br ');

      expect(result).toEqual({ success: true, verificationEmailSent: true });
      expect(verifyBeforeUpdateEmail).toHaveBeenCalledWith(expect.anything(), 'novo.email@ufu.br');
      
      // O campo email principal NÃO deve ser atualizado agora!
      expect(updateDoc).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          pendingEmailChange: expect.objectContaining({
            newEmail: 'novo.email@ufu.br',
            requestedAt: expect.any(Number),
            expiresAt: expect.any(Number)
          })
        })
      );
      const callArg = vi.mocked(updateDoc).mock.calls[0][1];
      expect(callArg).not.toHaveProperty('email');
    });

    it('se o Auth recusar (ex: requer login recente), propaga o erro e NÃO grava no Firestore', async () => {
      const err = Object.assign(new Error('recent'), { code: 'auth/requires-recent-login' });
      vi.mocked(verifyBeforeUpdateEmail).mockRejectedValueOnce(err);

      await expect(updateUserEmail('user-123', 'novo@ufu.br')).rejects.toMatchObject({ code: 'auth/requires-recent-login' });
      expect(updateDoc).not.toHaveBeenCalled();
    });

    it('com a senha informada, re-autentica antes de chamar verifyBeforeUpdateEmail', async () => {
      vi.mocked(updateDoc).mockResolvedValueOnce(undefined);
      await updateUserEmail('user-123', 'novo@ufu.br', 'senha-atual');

      expect(reauthenticateWithCredential).toHaveBeenCalledTimes(1);
      expect(vi.mocked(reauthenticateWithCredential).mock.invocationCallOrder[0])
        .toBeLessThan(vi.mocked(verifyBeforeUpdateEmail).mock.invocationCallOrder[0]);
    });

    it('recusa se a sessão do Auth não for do uid informado', async () => {
      await expect(updateUserEmail('outro-uid', 'novo@ufu.br')).rejects.toThrow('Sessão inválida');
      expect(verifyBeforeUpdateEmail).not.toHaveBeenCalled();
      expect(updateDoc).not.toHaveBeenCalled();
    });
  });

  describe('cancelPendingEmailChange (KAN-116)', () => {
    it('remove pendingEmailChange do Firestore via deleteField', async () => {
      vi.mocked(updateDoc).mockResolvedValueOnce(undefined);
      const result = await cancelPendingEmailChange('user-123');

      expect(result).toEqual({ success: true });
      expect(updateDoc).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          pendingEmailChange: 'MOCK_DELETE_FIELD',
          updatedAt: 'MOCK_TIMESTAMP'
        })
      );
    });

    it('lança erro se uid não for fornecido', async () => {
      await expect(cancelPendingEmailChange('')).rejects.toThrow('UID é obrigatório');
    });
  });

  describe('syncUserEmailWithAuth (KAN-116)', () => {
    it('sincroniza novo e-mail no Firestore quando auth.currentUser.email mudou e limpa pendingEmailChange', async () => {
      const reloadMock = vi.fn().mockResolvedValue(undefined);
      const getIdTokenMock = vi.fn().mockResolvedValue('new-token');
      const mockUser = {
        uid: 'user-123',
        email: 'novo.confirmado@ufu.br',
        reload: reloadMock,
        getIdToken: getIdTokenMock
      };

      vi.mocked(getDoc).mockResolvedValueOnce({
        exists: () => true,
        data: () => ({
          email: 'antigo@ufu.br',
          pendingEmailChange: {
            newEmail: 'novo.confirmado@ufu.br',
            expiresAt: Date.now() + 60000
          }
        })
      });
      vi.mocked(updateDoc).mockResolvedValueOnce(undefined);

      const result = await syncUserEmailWithAuth('user-123', mockUser);

      expect(reloadMock).toHaveBeenCalled();
      expect(getIdTokenMock).toHaveBeenCalledWith(true);
      expect(result).toEqual({ synced: true, newEmail: 'novo.confirmado@ufu.br' });
      expect(updateDoc).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          email: 'novo.confirmado@ufu.br',
          pendingEmailChange: 'MOCK_DELETE_FIELD',
          updatedAt: 'MOCK_TIMESTAMP'
        })
      );
    });

    it('limpa pendingEmailChange se a solicitação expirou', async () => {
      const reloadMock = vi.fn().mockResolvedValue(undefined);
      const getIdTokenMock = vi.fn().mockResolvedValue('token');
      const mockUser = {
        uid: 'user-123',
        email: 'antigo@ufu.br',
        reload: reloadMock,
        getIdToken: getIdTokenMock
      };

      vi.mocked(getDoc).mockResolvedValueOnce({
        exists: () => true,
        data: () => ({
          email: 'antigo@ufu.br',
          pendingEmailChange: {
            newEmail: 'novo@ufu.br',
            expiresAt: Date.now() - 5000
          }
        })
      });
      vi.mocked(updateDoc).mockResolvedValueOnce(undefined);

      const result = await syncUserEmailWithAuth('user-123', mockUser);

      expect(result).toEqual({ synced: false, expired: true });
      expect(updateDoc).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          pendingEmailChange: 'MOCK_DELETE_FIELD',
          updatedAt: 'MOCK_TIMESTAMP'
        })
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

  describe('updateUserRoleInFirestore (KAN-120)', () => {
    it('troca o papel pelo backend, sem escrever no Firestore pelo client', async () => {
      apiRequest.mockResolvedValue({ success: true });
      const res = await updateUserRoleInFirestore('u1', 'STAFF');
      expect(res).toEqual({ success: true });
      expect(apiRequest).toHaveBeenCalledWith('/api/admin/users/u1/role', { method: 'PUT', body: JSON.stringify({ role: 'STAFF' }) });
      expect(updateDoc).not.toHaveBeenCalled();
    });

    it('devolve a mensagem do backend quando a troca falha', async () => {
      apiRequest.mockRejectedValue(Object.assign(new Error('FORBIDDEN'), { data: { message: 'Sem permissão.' } }));
      const res = await updateUserRoleInFirestore('u1', 'STAFF');
      expect(res).toEqual({ success: false, error: 'Sem permissão.' });
    });
  });

  describe('checkUsernameAvailability', () => {
    it('retorna indisponível para usernames vazios, não-strings ou inválidos', async () => {
      expect(await checkUsernameAvailability(null)).toEqual({ available: false, existingUser: null });
      expect(await checkUsernameAvailability(undefined)).toEqual({ available: false, existingUser: null });
      expect(await checkUsernameAvailability('')).toEqual({ available: false, existingUser: null });
      expect(await checkUsernameAvailability(123)).toEqual({ available: false, existingUser: null });
      expect(await checkUsernameAvailability('ab')).toEqual({ available: false, existingUser: null });
      expect(await checkUsernameAvailability('a'.repeat(21))).toEqual({ available: false, existingUser: null });
      expect(await checkUsernameAvailability('user name com espaco')).toEqual({ available: false, existingUser: null });
      expect(await checkUsernameAvailability('user#symbol!')).toEqual({ available: false, existingUser: null });
    });

    it('remove arroba inicial e normaliza antes de verificar', async () => {
      vi.mocked(getDocs).mockResolvedValueOnce({ empty: true, docs: [] });

      const res = await checkUsernameAvailability('@Dev_User.123');
      expect(where).toHaveBeenCalledWith('username', '==', 'dev_user.123');
      expect(res).toEqual({ available: true, existingUser: null });
    });

    it('retorna available: false e dados do existingUser quando encontrado', async () => {
      vi.mocked(getDocs).mockResolvedValueOnce({
        empty: false,
        docs: [
          {
            data: () => ({
              displayName: 'Erick Dev',
              avatarUrl: 'https://cdn.example.com/erick.png'
            })
          }
        ]
      });

      const res = await checkUsernameAvailability('erick_dev');
      expect(res.available).toBe(false);
      expect(res.existingUser).toEqual({
        name: 'Erick Dev',
        avatarUrl: 'https://cdn.example.com/erick.png'
      });
    });

    it('formata existingUser usando firstName/lastName e photoURL como fallback', async () => {
      vi.mocked(getDocs).mockResolvedValueOnce({
        empty: false,
        docs: [
          {
            data: () => ({
              firstName: 'Carlos',
              lastName: 'Silva',
              photoURL: 'https://cdn.example.com/photo.png'
            })
          }
        ]
      });

      const res = await checkUsernameAvailability('carlos.silva');
      expect(res.available).toBe(false);
      expect(res.existingUser).toEqual({
        name: 'Carlos Silva',
        avatarUrl: 'https://cdn.example.com/photo.png'
      });
    });

    it('retorna available: true quando o username não existe no Firestore', async () => {
      vi.mocked(getDocs).mockResolvedValueOnce({ empty: true, docs: [] });
      const res = await checkUsernameAvailability('novo_usuario');
      expect(res).toEqual({ available: true, existingUser: null });
    });

    it('retorna available: true em caso de exceção no Firestore', async () => {
      vi.mocked(getDocs).mockRejectedValueOnce(new Error('Network error'));
      const res = await checkUsernameAvailability('usuario_offline');
      expect(res).toEqual({ available: true, existingUser: null });
    });
  });

  describe('findUserByUsername', () => {
    it('retorna null se username não for informado', async () => {
      expect(await findUserByUsername(null)).toBeNull();
      expect(await findUserByUsername('')).toBeNull();
      expect(await findUserByUsername(undefined)).toBeNull();
    });

    it('retorna null se usuário não for encontrado', async () => {
      vi.mocked(getDocs).mockResolvedValueOnce({ empty: true, docs: [] });
      const res = await findUserByUsername('desconhecido');
      expect(res).toBeNull();
    });

    it('retorna dados do usuário quando encontrado', async () => {
      vi.mocked(getDocs).mockResolvedValueOnce({
        empty: false,
        docs: [{ id: 'user-77', data: () => ({ username: 'lucas', email: 'lucas@exemplo.com' }) }]
      });

      const res = await findUserByUsername('Lucas ');
      expect(where).toHaveBeenCalledWith('username', '==', 'lucas');
      expect(res).toEqual({ id: 'user-77', username: 'lucas', email: 'lucas@exemplo.com' });
    });
  });

  describe('getUserPointEvents', () => {
    it('retorna array vazio quando uid não for informado', async () => {
      expect(await getUserPointEvents(null)).toEqual([]);
      expect(await getUserPointEvents('')).toEqual([]);
    });

    it('retorna lista de eventos de pontuação quando encontrados', async () => {
      vi.mocked(getDocs).mockResolvedValueOnce({
        docs: [
          { id: 'evt-1', data: () => ({ type: 'PRESENCE', points: 10 }) },
          { id: 'evt-2', data: () => ({ type: 'BONUS', points: 5 }) }
        ]
      });

      const res = await getUserPointEvents('user-123');
      expect(res).toEqual([
        { id: 'evt-1', type: 'PRESENCE', points: 10 },
        { id: 'evt-2', type: 'BONUS', points: 5 }
      ]);
    });

    it('retorna array vazio silenciosamente em caso de permission-denied', async () => {
      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      const permErr = new Error('Permission denied');
      permErr.code = 'permission-denied';
      vi.mocked(getDocs).mockRejectedValueOnce(permErr);

      const res = await getUserPointEvents('user-123');
      expect(res).toEqual([]);
      expect(warnSpy).not.toHaveBeenCalled();
      warnSpy.mockRestore();
    });

    it('retorna array vazio e loga aviso em caso de outros erros', async () => {
      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      vi.mocked(getDocs).mockRejectedValueOnce(new Error('Internal Firestore Error'));

      const res = await getUserPointEvents('user-123');
      expect(res).toEqual([]);
      expect(warnSpy).toHaveBeenCalled();
      warnSpy.mockRestore();
    });
  });

  describe('subscribeToAllUsers', () => {
    it('notifica callback com lista de usuários no snapshot', () => {
      const mockUnsub = vi.fn();
      let successCb;

      vi.mocked(onSnapshot).mockImplementationOnce((_ref, onNext) => {
        successCb = onNext;
        return mockUnsub;
      });

      const cb = vi.fn();
      const unsub = subscribeToAllUsers(cb);

      successCb({
        docs: [
          { id: 'u1', data: () => ({ name: 'User 1', email: 'u1@ufu.br' }) },
          { id: 'u2', data: () => ({ name: 'User 2', email: 'u2@ufu.br' }) }
        ]
      });

      expect(cb).toHaveBeenCalledWith([
        { id: 'u1', uid: 'u1', name: 'User 1', email: 'u1@ufu.br' },
        { id: 'u2', uid: 'u2', name: 'User 2', email: 'u2@ufu.br' }
      ]);

      unsub();
      expect(mockUnsub).toHaveBeenCalled();
    });

    it('em caso de erro, recorre a perfis armazenados em localStorage', () => {
      const mockStorage = {
        'facom_profile_u1': JSON.stringify({ id: 'u1', name: 'User Cache' }),
        'other_key': 'not_profile'
      };
      const storageKeys = Object.keys(mockStorage);
      const fakeLocalStorage = {
        length: storageKeys.length,
        key: (idx) => storageKeys[idx] || null,
        getItem: (k) => mockStorage[k] || null
      };

      vi.stubGlobal('localStorage', fakeLocalStorage);
      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

      let errorCb;
      vi.mocked(onSnapshot).mockImplementationOnce((_ref, _onNext, onError) => {
        errorCb = onError;
        return vi.fn();
      });

      const cb = vi.fn();
      subscribeToAllUsers(cb);

      errorCb(new Error('Network disconnected'));

      expect(cb).toHaveBeenCalledWith([
        { id: 'u1', name: 'User Cache' }
      ]);

      warnSpy.mockRestore();
      vi.unstubAllGlobals();
    });
  });

  describe('getCachedUserProfile', () => {
    afterEach(() => {
      vi.unstubAllGlobals();
    });

    it('retorna perfil do localStorage para o UID fornecido', () => {
      const fakeLocalStorage = {
        getItem: vi.fn((k) => k === 'facom_profile_user-99' ? JSON.stringify({ uid: 'user-99', name: 'Lucas', email: 'lucas@exemplo.com' }) : null)
      };
      vi.stubGlobal('localStorage', fakeLocalStorage);

      const profile = getCachedUserProfile('user-99');
      expect(profile).toEqual({ uid: 'user-99', name: 'Lucas', email: 'lucas@exemplo.com' });
      expect(fakeLocalStorage.getItem).toHaveBeenCalledWith('facom_profile_user-99');
    });

    it('eleva perfil para ADMIN quando o email pertence a ADMIN_EMAILS', () => {
      const fakeLocalStorage = {
        getItem: vi.fn((k) => k === 'facom_profile_admin-1' ? JSON.stringify({ uid: 'admin-1', email: 'sam03amorim@gmail.com', role: 'PARTICIPANT' }) : null)
      };
      vi.stubGlobal('localStorage', fakeLocalStorage);

      const profile = getCachedUserProfile('admin-1');
      expect(profile.role).toBe('ADMIN');
      expect(profile.participantType).toBe('Organizador');
    });

    it('usa auth.currentUser.uid quando uid não for informado', () => {
      const fakeLocalStorage = {
        getItem: vi.fn((k) => k === 'facom_profile_user-123' ? JSON.stringify({ uid: 'user-123', name: 'Atual' }) : null)
      };
      vi.stubGlobal('localStorage', fakeLocalStorage);

      const profile = getCachedUserProfile();
      expect(profile).toEqual({ uid: 'user-123', name: 'Atual' });
      expect(fakeLocalStorage.getItem).toHaveBeenCalledWith('facom_profile_user-123');
    });

    it('faz fallback procurando qualquer chave facom_profile_* quando o uid específico não existir', () => {
      const mockStorage = {
        'other_key': 'abc',
        'facom_profile_fallback': JSON.stringify({ uid: 'fallback', name: 'Fallback User', email: 'fb@ufu.br' })
      };
      const keys = Object.keys(mockStorage);
      const fakeLocalStorage = {
        length: keys.length,
        key: (idx) => keys[idx] || null,
        getItem: (k) => mockStorage[k] || null
      };
      vi.stubGlobal('localStorage', fakeLocalStorage);

      const profile = getCachedUserProfile('uid_inexistente');
      expect(profile).toMatchObject({ uid: 'fallback', name: 'Fallback User' });
    });

    it('retorna null se nada for encontrado ou se o json for inválido', () => {
      const fakeLocalStorage = {
        length: 1,
        key: () => 'facom_profile_broken',
        getItem: () => 'invalid-json{'
      };
      vi.stubGlobal('localStorage', fakeLocalStorage);

      const profile = getCachedUserProfile('uid_inexistente');
      expect(profile).toBeNull();
    });
  });
});
