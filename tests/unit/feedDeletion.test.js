// @vitest-environment happy-dom
import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  deleteFeedPost,
  getDeletedFeedPostIds,
  markFeedPostAsDeleted,
  subscribeToFeedPosts,
  getLatestFeedPost,
  DEFAULT_FEED_POSTS
} from '../../src/lib/feedService';
import { deleteDoc, onSnapshot } from 'firebase/firestore';

vi.mock('firebase/firestore', () => ({
  collection: vi.fn(() => ({ id: 'feed_posts' })),
  query: vi.fn(),
  orderBy: vi.fn(),
  onSnapshot: vi.fn(),
  addDoc: vi.fn(),
  doc: vi.fn((_db, col, id) => ({ id, col })),
  setDoc: vi.fn(),
  updateDoc: vi.fn(),
  deleteDoc: vi.fn(() => Promise.resolve()),
  serverTimestamp: vi.fn(() => 'MOCK_TIMESTAMP'),
  getDocs: vi.fn(() => Promise.resolve({ forEach: vi.fn() })),
  arrayUnion: vi.fn((val) => val),
  arrayRemove: vi.fn((val) => val)
}));

vi.mock('../../src/lib/firebase', () => ({
  db: { _type: 'mock_firestore_db' }
}));

vi.mock('firebase/storage', () => ({
  ref: vi.fn(),
  uploadBytes: vi.fn(),
  getDownloadURL: vi.fn()
}));

describe('feedService - Exclusão de Publicações (Feed Deletion)', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
  });

  it('markFeedPostAsDeleted adiciona o id aos itens excluídos no localStorage', () => {
    markFeedPostAsDeleted('post-123');
    const deleted = getDeletedFeedPostIds();
    expect(deleted.has('post-123')).toBe(true);
    expect(deleted.size).toBe(1);
  });

  it('deleteFeedPost chama deleteDoc para posts do Firestore e marca como excluído', async () => {
    const res = await deleteFeedPost('firestore-post-99');
    expect(res.success).toBe(true);
    expect(deleteDoc).toHaveBeenCalledTimes(1);
    const deleted = getDeletedFeedPostIds();
    expect(deleted.has('firestore-post-99')).toBe(true);
  });

  it('deleteFeedPost para posts mock (feed-*) não quebra nem chama Firestore deleteDoc', async () => {
    const res = await deleteFeedPost('feed-1');
    expect(res.success).toBe(true);
    expect(deleteDoc).not.toHaveBeenCalled();
    const deleted = getDeletedFeedPostIds();
    expect(deleted.has('feed-1')).toBe(true);
  });

  it('getLatestFeedPost não retorna post se ele foi marcado como excluído', async () => {
    markFeedPostAsDeleted(DEFAULT_FEED_POSTS[0].id);
    const latest = await getLatestFeedPost();
    if (latest) {
      expect(latest.id).not.toBe(DEFAULT_FEED_POSTS[0].id);
    }
  });

  it('subscribeToFeedPosts omite posts excluídos da lista entregue ao callback', () => {
    markFeedPostAsDeleted('feed-1');

    let receivedPosts = [];
    onSnapshot.mockImplementation((_col, callback) => {
      // Nenhum doc no Firestore, cai nos DEFAULT_FEED_POSTS
      callback({ docs: [] });
      return () => {};
    });

    subscribeToFeedPosts((posts) => {
      receivedPosts = posts;
    });

    const hasFeed1 = receivedPosts.some((p) => p.id === 'feed-1');
    expect(hasFeed1).toBe(false);
  });
});
