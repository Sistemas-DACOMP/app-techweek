import { describe, it, expect, vi } from 'vitest';

vi.mock('../../src/lib/firebase', () => ({ db: {}, auth: {} }));
vi.mock('firebase/firestore', () => ({ collection: vi.fn(), onSnapshot: vi.fn(), query: vi.fn() }));

import {
  buildCurve, periodPeaks, roomOccupancy, retention, ratingsFrom, buildSponsors, tierTotals, periodBuckets, participantKinds
} from '../../src/pages/admin/dados/derive';

const at = (h, m = 0) => new Date(2026, 9, 21, h, m);

describe('Admin > Dados e ao vivo (derivações)', () => {
  it('curva conta pessoas distintas e acha o pico por período', () => {
    const checkins = [
      { uid: 'a', entranceAt: at(14, 40), checkoutAt: at(15, 40) },
      { uid: 'a', entranceAt: at(15, 0), checkoutAt: at(15, 30) },
      { uid: 'b', entranceAt: at(15, 5) },
    ];
    const curve = buildCurve(checkins, '2026-10-21');
    expect(Math.max(...curve)).toBe(2);
    expect(periodPeaks(curve).find((p) => p.id === 'tar').peak).toBe(2);
    expect(buildCurve(checkins, '2026-10-22').every((n) => n === 0)).toBe(true);
  });

  it('ocupação agrupa por sala e retenção usa 1º e 2º scan', () => {
    const acts = [
      { id: '1', title: 'A', location: 'Lab', vagas_totais: 10, total_inscritos: 10 },
      { id: '2', title: 'B', location: 'Lab', vagas_totais: 10, total_inscritos: 0 },
    ];
    expect(roomOccupancy(acts)).toEqual([{ name: 'Lab', cap: 20, taken: 10, pct: 50 }]);
    const r = retention(acts, [{ activityId: '1', checkoutAt: at(10) }, { activityId: '1' }]);
    expect(r[0]).toMatchObject({ entered: 2, stayed: 1, stayPct: 50 });
  });

  it('notas, estandes e público', () => {
    const ev = [5, 5, 4, 2].map((rating) => ({ eventType: 'lecture_attendance', referenceId: 'x', metadata: { rating } }));
    const r = ratingsFrom(ev);
    expect(r).toMatchObject({ total: 4, approval: 75, nps: 50 - 25 });
    const cfg = { kanastra: { id: 'kanastra', name: 'K', tier: 'DIAMOND', logo: '/k.png' } };
    const users = [
      { uid: 's1', role: 'SPONSOR', companyId: 'kanastra' },
      { uid: 'p1', visitedSponsors: { kanastra: {} } }, { uid: 'p2', visitedSponsors: { kanastra: {} } }, { uid: 'p3' },
    ];
    const sp = buildSponsors(users, { s1: [{}] }, 3, cfg);
    expect(sp[0]).toMatchObject({ visits: 2, leads: 1, conversion: 50, reach: 67, tier: 'diamante' });
    expect(tierTotals(sp).find((t) => t.id === 'diamante').pct).toBe(100);
    expect(periodBuckets([{ period: 2 }, { period: 8 }, {}]).map((b) => b.n)).toEqual([1, 0, 1, 1]);
    expect(participantKinds([{ participantType: 'Aluno da UFU' }, { participantType: 'Comunidade Externa' }]).map((k) => k.label).sort()).toEqual(['Alunos', 'Externos']);
  });
});
