import { describe, it, expect } from 'vitest';
import { useNotifications } from './useNotifications';

describe('useNotifications module', () => {
  it('exporta a função useNotifications corretamente', () => {
    expect(typeof useNotifications).toBe('function');
  });
});
