// @vitest-environment happy-dom
import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  deleteActivity,
  getDeletedActivityIds,
  markActivityDeleted,
  unmarkActivityDeleted,
  subscribeToActivities,
  DEFAULT_ACTIVITIES,
  saveLocalCustomActivity,
  getLocalCustomActivities
} from '../../src/lib/activityService';
import { deleteDoc, onSnapshot } from 'firebase/firestore';

vi.mock('firebase/firestore', () => ({
  collection: vi.fn(() => ({ id: 'activities' })),
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

describe('activityService - Exclusão de Atividades', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
  });

  it('markActivityDeleted e unmarkActivityDeleted manipulam corretamente o localStorage', () => {
    markActivityDeleted('act-test-1');
    let deleted = getDeletedActivityIds();
    expect(deleted.has('act-test-1')).toBe(true);

    unmarkActivityDeleted('act-test-1');
    deleted = getDeletedActivityIds();
    expect(deleted.has('act-test-1')).toBe(false);
  });

  it('deleteActivity remove atividade do customLocal, marca como deletada e chama deleteDoc', async () => {
    saveLocalCustomActivity({ id: 'act-custom-1', title: 'Atividade Customizada' });
    expect(getLocalCustomActivities().some(a => a.id === 'act-custom-1')).toBe(true);

    const res = await deleteActivity('act-custom-1');
    expect(res.success).toBe(true);
    expect(deleteDoc).toHaveBeenCalledTimes(1);

    expect(getLocalCustomActivities().some(a => a.id === 'act-custom-1')).toBe(false);
    expect(getDeletedActivityIds().has('act-custom-1')).toBe(true);
  });

  it('subscribeToActivities não ressuscita atividades marcadas como deletadas', () => {
    const targetDefault = DEFAULT_ACTIVITIES[0];
    markActivityDeleted(targetDefault.id);

    let receivedList = [];
    const callback = vi.fn((list) => {
      receivedList = list;
    });

    onSnapshot.mockImplementation((_ref, successCb) => {
      successCb({ empty: true, docs: [] });
      return () => {};
    });

    const unsub = subscribeToActivities(callback);
    expect(receivedList.some(a => a.id === targetDefault.id)).toBe(false);
    if (typeof unsub === 'function') unsub();
  });
});
