import { describe, it, expect, vi, beforeEach } from 'vitest';
import { apiRequest } from './api';
import { getUserPointEvents } from './userService';

let mockCurrentUser = { uid: 'user-1', email: 'user@ufu.br', displayName: 'User Test', photoURL: 'https://test.com/photo.png' };

vi.mock('./api', () => ({
  apiRequest: vi.fn()
}));

vi.mock('./userService', () => ({
  getUserProfile: vi.fn(),
  uploadUserAvatar: vi.fn(),
  updateUserProfile: vi.fn(),
  getUserPointEvents: vi.fn(),
  getLeaderboardUsers: vi.fn(),
  isAdminEmail: vi.fn(() => false)
}));

vi.mock('./firebase', () => ({
  auth: {
    get currentUser() {
      return mockCurrentUser;
    }
  },
  db: { _name: 'mock-db' },
  storage: { _name: 'mock-storage' }
}));

vi.mock('firebase/firestore', () => ({
  doc: vi.fn(() => ({ id: 'mock-doc-ref' })),
  updateDoc: vi.fn(),
  collection: vi.fn(() => ({ id: 'mock-col-ref' })),
  getDocs: vi.fn(),
  query: vi.fn((q) => q),
  where: vi.fn()
}));

vi.mock('firebase/storage', () => ({
  ref: vi.fn(() => ({ fullPath: 'mock-storage-ref' })),
  uploadBytes: vi.fn(),
  getDownloadURL: vi.fn()
}));

if (!globalThis.URL.createObjectURL) {
  globalThis.URL.createObjectURL = vi.fn((file) => `blob:mock-url-${file?.name || 'file'}`);
}

import {
  addPointEvent,
  getMyPointEvents,
  getMyProfile,
  uploadAvatar,
  uploadMissionPhoto,
  updateMascot,
  getRanking
} from './gameplay';
import {
  getUserProfile,
  uploadUserAvatar,
  updateUserProfile,
  getLeaderboardUsers,
  isAdminEmail
} from './userService';
import { getDocs, doc, updateDoc, collection } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';

describe('addPointEvent (KAN-79)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.spyOn(console, 'warn').mockImplementation(() => {});
  });

  it('sucesso: chama apiRequest com o payload certo e retorna o resultado do backend', async () => {
    apiRequest.mockResolvedValueOnce({ success: true, points: 50 });

    const result = await addPointEvent({ eventType: 'mission', referenceId: 'm1', points: 50 });

    expect(apiRequest).toHaveBeenCalledWith('/points/claim', {
      method: 'POST',
      body: JSON.stringify({ eventType: 'mission', referenceId: 'm1', points: 50, metadata: null })
    });
    expect(result).toEqual({ success: true, points: 50 });
  });

  it('evento já resgatado (409/alreadyClaimed): retorna {success:false, alreadyClaimed:true}, não lança', async () => {
    const err = new Error('já resgatado');
    err.status = 409;
    err.data = { alreadyClaimed: true };
    apiRequest.mockRejectedValueOnce(err);

    const result = await addPointEvent({ eventType: 'mission', referenceId: 'm1', points: 50 });

    expect(result).toEqual({ success: false, alreadyClaimed: true });
  });

  it('erro real (rede/500): retorna {success:false, error}, NUNCA {success:true} (regressão do bug original)', async () => {
    const err = new Error('Falha ao conectar ao backend');
    err.status = 500;
    apiRequest.mockRejectedValueOnce(err);

    const result = await addPointEvent({ eventType: 'mission', referenceId: 'm1', points: 50 });

    expect(result.success).toBe(false);
    expect(result).not.toEqual(expect.objectContaining({ success: true }));
    expect(result.error).toBe('Falha ao conectar ao backend');
  });

  it('falha por ausência de ingresso Sympla (403 SYMPLA_TICKET_REQUIRED): retorna {success:false, code: "SYMPLA_TICKET_REQUIRED"}', async () => {
    const err = new Error('Acesso negado');
    err.status = 403;
    err.data = { error: 'SYMPLA_TICKET_REQUIRED', message: 'Ingresso do Sympla obrigatório.' };
    apiRequest.mockRejectedValueOnce(err);

    const result = await addPointEvent({ eventType: 'mission', referenceId: 'm1', points: 50 });

    expect(result.success).toBe(false);
    expect(result.code).toBe('SYMPLA_TICKET_REQUIRED');
    expect(result.error).toBe('Ingresso do Sympla obrigatório.');
  });

  it('faz fallback resiliente (salva local/Firestore) quando o backend retorna 401 com code auth/insufficient-permission', async () => {
    const err = new Error('Sua sessão expirou ou é inválida. Por favor, faça login novamente para continuar.');
    err.status = 401;
    err.code = 'SESSION_EXPIRED';
    err.data = {
      error: 'INVALID_TOKEN',
      code: 'auth/insufficient-permission',
      message: 'Token de autenticação inválido, expirado ou revogado.'
    };
    apiRequest.mockRejectedValueOnce(err);

    const result = await addPointEvent({
      eventType: 'mission',
      referenceId: 'secret_password',
      points: 20,
      metadata: { secretWord: 'OPORTUNIDADES' }
    });

    expect(result).toEqual({
      success: true,
      points: 20,
      message: 'Pontuação creditada com sucesso!'
    });
  });
});

describe('getMyPointEvents (KAN-79/KAN-71)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('une eventos de users/{uid}/point_events e da coleção pointEvents de nível raiz, sem descartar um pelo outro', async () => {
    getUserPointEvents.mockResolvedValueOnce([
      { id: 'mission_m1', eventType: 'mission', referenceId: 'm1', points: 50 }
    ]);
    getDocs.mockResolvedValueOnce({
      docs: [
        {
          id: 'user-1_lecture_attendance_l1',
          data: () => ({ eventType: 'lecture_attendance', referenceId: 'l1', points: 10 })
        }
      ]
    });

    const result = await getMyPointEvents();

    const refs = result.map((e) => e.reference_id);
    expect(refs).toContain('m1');
    expect(refs).toContain('l1');
    expect(result.length).toBeGreaterThanOrEqual(2);
  });
});

describe('getMyProfile', () => {
  beforeEach(() => {
    mockCurrentUser = { uid: 'user-1', email: 'user@ufu.br', displayName: 'User Test', photoURL: 'https://test.com/photo.png' };
    vi.clearAllMocks();
    vi.spyOn(console, 'warn').mockImplementation(() => {});
  });

  it('retorna null quando não há usuário autenticado', async () => {
    mockCurrentUser = null;
    const profile = await getMyProfile();
    expect(profile).toBeNull();
  });

  it('retorna perfil formatado do Firestore quando existe', async () => {
    isAdminEmail.mockReturnValue(false);
    getUserProfile.mockResolvedValueOnce({
      firstName: 'Erick',
      lastName: 'Silva',
      role: 'PARTICIPANT',
      mascot: 'green',
      avatarUrl: 'https://cdn/avatar.png'
    });

    const profile = await getMyProfile();
    expect(profile.id).toBe('user-1');
    expect(profile.first_name).toBe('Erick');
    expect(profile.last_name).toBe('Silva');
    expect(profile.mascot).toBe('green');
    expect(profile.role).toBe('PARTICIPANT');
    expect(profile.participantType).toBe('Aluno da UFU');
  });

  it('atribui role ADMIN quando o email for de administrador', async () => {
    mockCurrentUser = { uid: 'admin-1', email: 'admin@ufu.br', displayName: 'Admin User', photoURL: null };
    isAdminEmail.mockReturnValue(true);
    getUserProfile.mockResolvedValueOnce({
      firstName: 'Admin',
      role: 'PARTICIPANT'
    });

    const profile = await getMyProfile();
    expect(profile.role).toBe('ADMIN');
    expect(profile.participantType).toBe('Organizador');
  });

  it('gera fallback padrão quando getUserProfile falha ou retorna null', async () => {
    isAdminEmail.mockReturnValue(false);
    getUserProfile.mockRejectedValueOnce(new Error('Firestore error'));

    const profile = await getMyProfile();
    expect(profile.id).toBe('user-1');
    expect(profile.first_name).toBe('User');
    expect(profile.mascot).toBe('blue');
    expect(profile.role).toBe('PARTICIPANT');
    expect(profile.email).toBe('user@ufu.br');
  });
});

describe('uploadAvatar', () => {
  beforeEach(() => {
    mockCurrentUser = { uid: 'user-1', email: 'user@ufu.br' };
    vi.clearAllMocks();
  });

  it('lança erro quando o usuário não estiver autenticado', async () => {
    mockCurrentUser = null;
    await expect(uploadAvatar({ name: 'avatar.png' })).rejects.toThrow('Usuário não autenticado');
  });

  it('chama uploadUserAvatar com uid do usuário e arquivo', async () => {
    const mockFile = { name: 'avatar.png' };
    uploadUserAvatar.mockResolvedValueOnce('https://storage/avatar.png');

    const result = await uploadAvatar(mockFile);
    expect(uploadUserAvatar).toHaveBeenCalledWith('user-1', mockFile);
    expect(result).toBe('https://storage/avatar.png');
  });
});

describe('uploadMissionPhoto', () => {
  beforeEach(() => {
    mockCurrentUser = { uid: 'user-1', email: 'user@ufu.br' };
    vi.clearAllMocks();
    vi.spyOn(console, 'warn').mockImplementation(() => {});
  });

  it('retorna ObjectURL local quando o usuário não estiver autenticado', async () => {
    mockCurrentUser = null;
    const mockFile = new Blob(['dummy'], { type: 'image/jpeg' });
    mockFile.name = 'foto.jpg';

    const url = await uploadMissionPhoto(mockFile, 'm1');
    expect(url).toContain('blob:');
  });

  it('faz upload para o storage e retorna a URL de download quando autenticado', async () => {
    const mockFile = new Blob(['dummy'], { type: 'image/jpeg' });
    mockFile.name = 'foto.jpg';
    ref.mockReturnValueOnce('storage-ref');
    uploadBytes.mockResolvedValueOnce({});
    getDownloadURL.mockResolvedValueOnce('https://firebasestorage/foto.jpg');

    const url = await uploadMissionPhoto(mockFile, 'm1');
    expect(ref).toHaveBeenCalled();
    expect(uploadBytes).toHaveBeenCalledWith('storage-ref', mockFile, { contentType: 'image/jpeg' });
    expect(getDownloadURL).toHaveBeenCalledWith('storage-ref');
    expect(url).toBe('https://firebasestorage/foto.jpg');
  });

  it('retorna fallback de ObjectURL se o upload no storage falhar', async () => {
    const mockFile = new Blob(['dummy'], { type: 'image/jpeg' });
    mockFile.name = 'foto.jpg';
    ref.mockReturnValueOnce('storage-ref');
    uploadBytes.mockRejectedValueOnce(new Error('Storage unavailable'));

    const url = await uploadMissionPhoto(mockFile, 'm1');
    expect(url).toContain('blob:');
  });
});

describe('updateMascot', () => {
  beforeEach(() => {
    mockCurrentUser = { uid: 'user-1', email: 'user@ufu.br' };
    vi.clearAllMocks();
  });

  it('retorna sem fazer nada se não houver usuário autenticado', async () => {
    mockCurrentUser = null;
    await updateMascot('golden');
    expect(updateUserProfile).not.toHaveBeenCalled();
    expect(updateDoc).not.toHaveBeenCalled();
  });

  it('atualiza o mascote via updateUserProfile em caso de sucesso', async () => {
    updateUserProfile.mockResolvedValueOnce();

    await updateMascot('golden');
    expect(updateUserProfile).toHaveBeenCalledWith('user-1', { mascot: 'golden' });
  });

  it('usa fallback direto no Firestore via updateDoc se updateUserProfile falhar', async () => {
    updateUserProfile.mockRejectedValueOnce(new Error('update error'));
    doc.mockReturnValueOnce('doc-ref');
    updateDoc.mockResolvedValueOnce();

    await updateMascot('golden');
    expect(doc).toHaveBeenCalled();
    expect(updateDoc).toHaveBeenCalledWith('doc-ref', { mascot: 'golden' });
  });
});

describe('getRanking', () => {
  beforeEach(() => {
    mockCurrentUser = { uid: 'user-1', email: 'user@ufu.br' };
    vi.clearAllMocks();
    vi.spyOn(console, 'warn').mockImplementation(() => {});
  });

  it('retorna ranking obtido via getLeaderboardUsers quando disponível', async () => {
    const mockList = [{ uid: 'u1', name: 'User 1', points: 150 }];
    getLeaderboardUsers.mockResolvedValueOnce(mockList);

    const ranking = await getRanking();
    expect(ranking).toEqual(mockList);
    expect(getLeaderboardUsers).toHaveBeenCalledWith(50);
  });

  it('busca na coleção ranking do Firestore caso getLeaderboardUsers retorne vazio', async () => {
    getLeaderboardUsers.mockResolvedValueOnce([]);
    getDocs.mockResolvedValueOnce({
      empty: false,
      docs: [
        { id: 'r1', data: () => ({ name: 'Ranked 1', points: 200 }) }
      ]
    });

    const ranking = await getRanking();
    expect(ranking).toEqual([{ id: 'r1', name: 'Ranked 1', points: 200 }]);
  });

  it('retorna array vazio quando todas as fontes falharem ou estiverem vazias', async () => {
    getLeaderboardUsers.mockRejectedValueOnce(new Error('fail'));
    getDocs.mockResolvedValueOnce({
      empty: true,
      docs: []
    });

    const ranking = await getRanking();
    expect(ranking).toEqual([]);
  });
});

