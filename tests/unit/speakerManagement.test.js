// @vitest-environment happy-dom
import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  deleteSpeaker,
  getDeletedSpeakerIds,
  markSpeakerDeleted,
  unmarkSpeakerDeleted,
  subscribeToSpeakers,
  DEFAULT_SPEAKERS,
  saveLocalCustomSpeaker,
  getLocalCustomSpeakers,
  createSpeaker,
  uploadSpeakerPhoto
} from '../../src/lib/activityService';
import { deleteDoc, setDoc, onSnapshot } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';

vi.mock('firebase/firestore', () => ({
  collection: vi.fn(() => ({ id: 'speakers' })),
  query: vi.fn(),
  orderBy: vi.fn(),
  onSnapshot: vi.fn((_q, cb) => {
    if (typeof cb === 'function') cb({ forEach: () => {} });
    return vi.fn();
  }),
  addDoc: vi.fn(),
  doc: vi.fn((_db, col, id) => ({ id, col })),
  setDoc: vi.fn(() => Promise.resolve()),
  updateDoc: vi.fn(),
  deleteDoc: vi.fn(() => Promise.resolve()),
  serverTimestamp: vi.fn(() => 'MOCK_TIMESTAMP'),
  getDocs: vi.fn(() => Promise.resolve({ forEach: vi.fn() }))
}));

vi.mock('firebase/storage', () => ({
  ref: vi.fn((_st, path) => ({ path })),
  uploadBytes: vi.fn(() => Promise.resolve()),
  getDownloadURL: vi.fn(() => Promise.resolve('https://firebasestorage.googleapis.com/v0/b/mock/o/speakers%2Fphotos%2Fmock.jpg?alt=media'))
}));

vi.mock('../../src/lib/firebase', () => ({
  db: { _type: 'mock_firestore_db' },
  storage: { _type: 'mock_firebase_storage' }
}));

describe('activityService - Gestão e Exclusão de Palestrantes', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
  });

  it('markSpeakerDeleted e unmarkSpeakerDeleted manipulam corretamente o tombstone no localStorage', () => {
    markSpeakerDeleted('spk-test-1');
    let deleted = getDeletedSpeakerIds();
    expect(deleted.has('spk-test-1')).toBe(true);

    unmarkSpeakerDeleted('spk-test-1');
    deleted = getDeletedSpeakerIds();
    expect(deleted.has('spk-test-1')).toBe(false);
  });

  it('deleteSpeaker remove palestrante do customLocal, marca como deletado e chama deleteDoc', async () => {
    saveLocalCustomSpeaker({ id: 'spk-custom-1', name: 'Palestrante Custom' });
    expect(getLocalCustomSpeakers().some(s => s.id === 'spk-custom-1')).toBe(true);

    const res = await deleteSpeaker('spk-custom-1');
    expect(res.success).toBe(true);
    expect(deleteDoc).toHaveBeenCalledTimes(1);

    expect(getLocalCustomSpeakers().some(s => s.id === 'spk-custom-1')).toBe(false);
    expect(getDeletedSpeakerIds().has('spk-custom-1')).toBe(true);
  });

  it('subscribeToSpeakers não ressuscita palestrantes marcados como deletados', () => {
    const defaultSpeaker = DEFAULT_SPEAKERS[0];
    expect(defaultSpeaker).toBeDefined();

    markSpeakerDeleted(defaultSpeaker.id);

    let deliveredSpeakers = [];
    const unsub = subscribeToSpeakers((list) => {
      deliveredSpeakers = list;
    });

    expect(deliveredSpeakers.some(s => s.id === defaultSpeaker.id)).toBe(false);
    unsub();
  });

  it('createSpeaker desmarca o ID como deletado e salva no Firestore e localStorage', async () => {
    markSpeakerDeleted('spk_resurrect');
    expect(getDeletedSpeakerIds().has('spk_resurrect')).toBe(true);

    const res = await createSpeaker({
      id: 'spk_resurrect',
      name: 'Dra. Ana Silva',
      role: 'Professora UFU',
      classification: 'Professor UFU'
    });

    expect(res.success).toBe(true);
    expect(setDoc).toHaveBeenCalledTimes(1);
    expect(getDeletedSpeakerIds().has('spk_resurrect')).toBe(false);
    expect(getLocalCustomSpeakers().some(s => s.id === 'spk_resurrect')).toBe(true);
  });

  it('uploadSpeakerPhoto rejeita arquivos inválidos ou não-imagem', async () => {
    await expect(uploadSpeakerPhoto(null)).rejects.toThrow('Nenhum arquivo de imagem fornecido.');

    const textFile = new File(['hello'], 'document.pdf', { type: 'application/pdf' });
    await expect(uploadSpeakerPhoto(textFile)).rejects.toThrow('Formato inválido');
  });

  it('uploadSpeakerPhoto faz upload para o Firebase Storage e retorna a URL', async () => {
    const imgFile = new File(['fake-image-bytes'], 'avatar.png', { type: 'image/png' });
    const url = await uploadSpeakerPhoto(imgFile, 'spk_123');

    expect(uploadBytes).toHaveBeenCalledTimes(1);
    expect(getDownloadURL).toHaveBeenCalledTimes(1);
    expect(url).toContain('firebasestorage.googleapis.com');
  });
});
