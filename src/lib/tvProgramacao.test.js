import { describe, it, expect } from 'vitest';
import { classify, formatRemaining } from './tvProgramacao';

const mk = (id, time, endTime) => ({ id, date: '2026-10-22', time, endTime });
const at = (h, m) => new Date(2026, 9, 22, h, m).getTime();

describe('tvProgramacao', () => {
  const list = [mk('a', '14:00', '15:00'), mk('b', '14:00', '16:00'), mk('c', '15:30', '16:30'), mk('d', '10:00', '11:00')];
  it('separa agora, a seguir e ignora passadas', () => {
    const r = classify(list, at(14, 30));
    expect(r.live.map((x) => x.act.id)).toEqual(['a', 'b']);
    expect(r.upcoming.map((x) => x.act.id)).toEqual(['c']);
  });
  it('intervalo e fim da programação', () => {
    expect(classify(list, at(15, 10)).live.map((x) => x.act.id)).toEqual(['b']);
    expect(classify(list, at(16, 45)).nextStart).toBeNull();
  });
  it('formata tempo restante', () => {
    expect(formatRemaining(25 * 60000)).toBe('25 min');
    expect(formatRemaining(88 * 60000)).toBe('1h28');
  });
});
