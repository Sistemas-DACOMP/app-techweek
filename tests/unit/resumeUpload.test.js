// @vitest-environment happy-dom
import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mocks do Firebase Storage e Firestore
const mockUploadBytes = vi.fn();
const mockGetDownloadURL = vi.fn();
const mockRef = vi.fn((_storage, path) => ({ path }));

vi.mock('firebase/storage', () => ({
  ref: (...args) => mockRef(...args),
  uploadBytes: (...args) => mockUploadBytes(...args),
  getDownloadURL: (...args) => mockGetDownloadURL(...args),
  deleteObject: vi.fn().mockResolvedValue(undefined)
}));

const mockUpdateDoc = vi.fn().mockResolvedValue(undefined);
const mockSetDoc = vi.fn().mockResolvedValue(undefined);
const mockGetDoc = vi.fn().mockResolvedValue({ exists: () => false });

vi.mock('firebase/firestore', () => ({
  doc: vi.fn((_db, coll, id) => ({ path: `${coll}/${id}`, id })),
  updateDoc: (...args) => mockUpdateDoc(...args),
  setDoc: (...args) => mockSetDoc(...args),
  getDoc: (...args) => mockGetDoc(...args),
  collection: vi.fn(),
  getDocs: vi.fn(),
  query: vi.fn(),
  where: vi.fn(),
  orderBy: vi.fn(),
  limit: vi.fn(),
  serverTimestamp: vi.fn(() => 'SERVER_TIMESTAMP'),
  onSnapshot: vi.fn(),
  deleteField: vi.fn(() => '__DELETE_FIELD__')
}));

vi.mock('firebase/auth', () => ({
  updateProfile: vi.fn().mockResolvedValue(undefined),
  updateEmail: vi.fn(),
  verifyBeforeUpdateEmail: vi.fn(),
  reauthenticateWithCredential: vi.fn(),
  EmailAuthProvider: { credential: vi.fn() }
}));

vi.mock('../../src/lib/firebase', () => ({
  auth: { currentUser: { uid: 'user_123', email: 'test@ufu.br' } },
  db: {},
  storage: {}
}));

import {
  resolveResumeContentType,
  sanitizeResumeFileName,
  uploadUserResume,
  deleteUserResume
} from '../../src/lib/userService';

describe('Resume Upload & Management Service (TASK Currículo)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
  });

  describe('resolveResumeContentType', () => {
    it('retorna o MIME correto para PDF nativo ou extensão', () => {
      expect(resolveResumeContentType({ type: 'application/pdf', name: 'curriculo.pdf' })).toBe('application/pdf');
      expect(resolveResumeContentType({ type: '', name: 'meu_cv.pdf' })).toBe('application/pdf');
      expect(resolveResumeContentType({ type: 'application/octet-stream', name: 'cv.PDF' })).toBe('application/pdf');
    });

    it('retorna o MIME correto para DOCX', () => {
      const docxMime = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
      expect(resolveResumeContentType({ type: docxMime, name: 'cv.docx' })).toBe(docxMime);
      expect(resolveResumeContentType({ type: '', name: 'cv.docx' })).toBe(docxMime);
      expect(resolveResumeContentType({ type: 'application/octet-stream', name: 'Curriculo.DOCX' })).toBe(docxMime);
    });

    it('retorna o MIME correto para DOC legado', () => {
      expect(resolveResumeContentType({ type: 'application/msword', name: 'cv.doc' })).toBe('application/msword');
      expect(resolveResumeContentType({ type: '', name: 'cv.doc' })).toBe('application/msword');
    });

    it('fallback seguro para application/pdf se arquivo for indefinido ou genérico', () => {
      expect(resolveResumeContentType(null)).toBe('application/pdf');
      expect(resolveResumeContentType({ name: 'arquivo_sem_extensao' })).toBe('application/pdf');
    });
  });

  describe('sanitizeResumeFileName', () => {
    it('remove acentos e caracteres perigosos mantendo extensão', () => {
      expect(sanitizeResumeFileName('Currículo João & Maria (2026).pdf')).toBe('Curriculo_Joao___Maria__2026_.pdf');
      expect(sanitizeResumeFileName('meu-cv_final.docx')).toBe('meu-cv_final.docx');
    });

    it('retorna nome padrão se inválido', () => {
      expect(sanitizeResumeFileName('')).toBe('curriculo.pdf');
      expect(sanitizeResumeFileName(null)).toBe('curriculo.pdf');
    });
  });

  describe('uploadUserResume', () => {
    it('falha se UID ou arquivo não forem fornecidos', async () => {
      await expect(uploadUserResume(null, { name: 'cv.pdf' })).rejects.toThrow('Usuário não autenticado.');
      await expect(uploadUserResume('u123', null)).rejects.toThrow('Nenhum arquivo fornecido.');
    });

    it('rejeita arquivos que excedam 5MB', async () => {
      const oversizedFile = {
        name: 'cv.pdf',
        size: 6 * 1024 * 1024,
        type: 'application/pdf'
      };
      await expect(uploadUserResume('u123', oversizedFile)).rejects.toThrow(/excede o limite/i);
    });

    it('rejeita extensões inválidas (ex: .exe, .png)', async () => {
      const invalidFile = {
        name: 'malware.exe',
        size: 5000,
        type: 'application/x-msdownload'
      };
      await expect(uploadUserResume('u123', invalidFile)).rejects.toThrow(/formato inválido/i);
    });

    it('faz upload com sucesso, salva no Firestore e persiste no cache local', async () => {
      const validFile = {
        name: 'Meu Currículo 2026.pdf',
        size: 1024 * 500, // ~500 KB
        type: 'application/pdf'
      };

      const mockDownloadUrl = 'https://firebasestorage.googleapis.com/v0/b/bucket/o/resumes%2Fu123%2Fcv.pdf?alt=media';
      mockUploadBytes.mockResolvedValueOnce({ metadata: {} });
      mockGetDownloadURL.mockResolvedValueOnce(mockDownloadUrl);

      const result = await uploadUserResume('u123', validFile);

      expect(result).toBeDefined();
      expect(result.resumeUrl).toBe(mockDownloadUrl);
      expect(result.resumeName).toBe('Meu Currículo 2026.pdf');
      expect(result.resumeSize).toBe(validFile.size);
      expect(result.resumeUpdatedAt).toBeDefined();

      // Verifica uploadBytes
      expect(mockUploadBytes).toHaveBeenCalledTimes(1);
      const [storageRefCall, fileCall, optionsCall] = mockUploadBytes.mock.calls[0];
      expect(storageRefCall.path).toMatch(/^resumes\/u123\/\d+_Meu_Curriculo_2026\.pdf$/);
      expect(fileCall).toBe(validFile);
      expect(optionsCall).toEqual({ contentType: 'application/pdf' });

      // Verifica updateDoc do Firestore
      expect(mockUpdateDoc).toHaveBeenCalledTimes(1);
      const updatePayload = mockUpdateDoc.mock.calls[0][1];
      expect(updatePayload.resumeUrl).toBe(mockDownloadUrl);
      expect(updatePayload.resumeName).toBe('Meu Currículo 2026.pdf');
      expect(updatePayload.resumeSize).toBe(validFile.size);

      // Verifica cache local
      const cached = JSON.parse(localStorage.getItem('facom_profile_u123') || '{}');
      expect(cached.resumeUrl).toBe(mockDownloadUrl);
      expect(cached.resumeName).toBe('Meu Currículo 2026.pdf');
    });
  });

  describe('deleteUserResume', () => {
    it('falha se UID não for informado', async () => {
      await expect(deleteUserResume(null)).rejects.toThrow('Usuário não autenticado.');
    });

    it('remove os campos no Firestore e limpa o cache local', async () => {
      localStorage.setItem('facom_profile_u123', JSON.stringify({
        uid: 'u123',
        resumeUrl: 'https://storage/curriculo.pdf',
        resumeName: 'curriculo.pdf',
        resumeSize: 12345
      }));

      const res = await deleteUserResume('u123');
      expect(res.success).toBe(true);

      expect(mockUpdateDoc).toHaveBeenCalledTimes(1);
      const updatePayload = mockUpdateDoc.mock.calls[0][1];
      expect(updatePayload.resumeUrl).toBeNull();
      expect(updatePayload.resumeName).toBeNull();
      expect(updatePayload.resumeSize).toBeNull();

      const cached = JSON.parse(localStorage.getItem('facom_profile_u123') || '{}');
      expect(cached.resumeUrl).toBeUndefined();
      expect(cached.resumeName).toBeUndefined();
    });
  });
});

