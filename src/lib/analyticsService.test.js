import { describe, it, expect, vi } from 'vitest';
import {
  generateTimeBuckets,
  normalizeDate,
  calculateActivityRetention,
  mapEventsToHourlyBuckets,
  calculateActivityRankings,
  calculateSponsorBoothRankings,
  calculateMissionAnalytics,
  calculateDemographicProfile,
  getMockAnalyticsData,
  EVENT_START_HOUR,
  EVENT_END_HOUR
} from './analyticsService';

describe('analyticsService - Algoritmos e Agregações', () => {
  describe('generateTimeBuckets', () => {
    it('deve gerar buckets cobrindo das 08:00 até 22:30 em passos de 30min', () => {
      const buckets = generateTimeBuckets(30);
      expect(buckets.length).toBeGreaterThanOrEqual(29);
      expect(buckets[0].label).toBe('08:00');
      expect(buckets[buckets.length - 1].label).toBe('22:30');
    });

    it('deve gerar buckets em passos de 60min se configurado', () => {
      const buckets = generateTimeBuckets(60);
      expect(buckets[0].label).toBe('08:00');
      expect(buckets[1].label).toBe('09:00');
    });
  });

  describe('normalizeDate', () => {
    it('deve normalizar Date, string ISO, objeto Timestamp do Firestore e millis', () => {
      const d = new Date('2026-10-21T10:30:00Z');
      expect(normalizeDate(d)).toEqual(d);
      expect(normalizeDate('2026-10-21T10:30:00Z')?.toISOString()).toBe(d.toISOString());
      expect(normalizeDate({ seconds: Math.floor(d.getTime() / 1000) })?.getTime()).toBe(
        Math.floor(d.getTime() / 1000) * 1000
      );
      expect(normalizeDate({ toDate: () => d })).toEqual(d);
      expect(normalizeDate(null)).toBeNull();
      expect(normalizeDate('data-invalida')).toBeNull();
    });
  });

  describe('calculateActivityRetention (Abandono e Retenção)', () => {
    it('deve calcular corretamente a taxa de abandono (churnRate = (entradas - saidas) / entradas)', () => {
      const activity = { id: 'act_1', title: 'Palestra Teste', total_inscritos: 100 };
      const checkins = [
        { activityId: 'act_1', status: 'CHECKED_IN', entranceAt: new Date() },
        { activityId: 'act_1', status: 'CHECKED_IN', entranceAt: new Date() },
        { activityId: 'act_1', status: 'COMPLETED', entranceAt: new Date(), checkoutAt: new Date() },
        { activityId: 'act_1', status: 'COMPLETED', entranceAt: new Date(), checkoutAt: new Date() }
      ];

      // Total entradas = 4 (2 apenas checked in + 2 completed)
      // Total saídas = 2 (2 completed)
      // Abandonos = 2
      // churnRate = 2 / 4 = 0.5 (50%)
      const result = calculateActivityRetention(activity, checkins);
      expect(result.entrances).toBe(4);
      expect(result.checkouts).toBe(2);
      expect(result.dropoffs).toBe(2);
      expect(result.churnRate).toBe(0.5);
      expect(result.retentionRate).toBe(0.5);
    });

    it('deve flaggar alto abandono quando churnRate >= 30% com amostra relevante', () => {
      const activity = { id: 'act_2', title: 'Palestra Vazia' };
      const checkins = Array.from({ length: 20 }, (_, i) => ({
        activityId: 'act_2',
        status: i < 5 ? 'COMPLETED' : 'CHECKED_IN',
        entranceAt: new Date(),
        checkoutAt: i < 5 ? new Date() : null
      }));

      // 20 entradas, 5 saídas -> 15 abandonos -> 75% churn
      const result = calculateActivityRetention(activity, checkins);
      expect(result.churnRate).toBe(0.75);
      expect(result.isHighDropoff).toBe(true);
    });
  });

  describe('mapEventsToHourlyBuckets', () => {
    it('deve alocar checkins de entrada e saída no bucket de horário correto', () => {
      const entranceDate = new Date();
      entranceDate.setHours(9, 15, 0, 0); // bucket 09:00

      const checkoutDate = new Date();
      checkoutDate.setHours(10, 45, 0, 0); // bucket 10:30

      const checkins = [
        { entranceAt: entranceDate, checkoutAt: checkoutDate }
      ];

      const buckets = mapEventsToHourlyBuckets(checkins, [], [], 30);
      const b0900 = buckets.find((b) => b.label === '09:00');
      const b1030 = buckets.find((b) => b.label === '10:30');

      expect(b0900?.entrances).toBe(1);
      expect(b1030?.checkouts).toBe(1);
    });
  });

  describe('calculateActivityRankings', () => {
    it('deve classificar atividades por mais inscritas e menos inscritas', () => {
      const activities = [
        { id: 'a1', title: 'Palestra A', total_inscritos: 150, vagas_totais: 200 },
        { id: 'a2', title: 'Palestra B', total_inscritos: 30, vagas_totais: 50 },
        { id: 'a3', title: 'Palestra C', total_inscritos: 210, vagas_totais: 200 }
      ];

      const rankings = calculateActivityRankings(activities, []);
      expect(rankings.mostRegistered[0].title).toBe('Palestra C');
      expect(rankings.leastRegistered[0].title).toBe('Palestra B');
    });
  });

  describe('calculateSponsorBoothRankings', () => {
    it('deve agregar visitas de estande e distribuição do Passaporte', () => {
      const users = [
        { id: 'u1', visitedSponsors: { Kanastra: {}, Levty: {} }, goldenTicketAwarded: false },
        { id: 'u2', visitedSponsors: { Kanastra: {}, Levty: {}, Sankhya: {}, BIP: {}, Aimirim: {} }, goldenTicketAwarded: true }
      ];

      const leads = [
        { companyId: 'Kanastra', rating: 5, course: 'Ciência da Computação' },
        { companyId: 'Kanastra', rating: 4, course: 'Ciência da Computação' },
        { companyId: 'Levty', rating: 5, course: 'Sistemas de Informação' }
      ];

      const result = calculateSponsorBoothRankings(users, leads, []);
      const topSponsor = result.ranking[0];
      expect(topSponsor.companyId).toBe('Kanastra');
      expect(topSponsor.totalVisits).toBe(2);
      expect(topSponsor.averageRating).toBe(4.5);
      expect(result.passportStats.goldenTicketsCount).toBe(1);
    });
  });

  describe('calculateMissionAnalytics', () => {
    it('deve ordenar missões por número de conclusões e calcular pontos distribuídos', () => {
      const missions = [
        { id: 'm1', title: 'Missão 1', points: 20, category: 'sponsors' },
        { id: 'm2', title: 'Missão 2', points: 50, category: 'social' }
      ];

      const pointEvents = [
        { referenceId: 'm1', points: 20 },
        { referenceId: 'm1', points: 20 },
        { referenceId: 'm2', points: 50 }
      ];

      const result = calculateMissionAnalytics(missions, [], pointEvents);
      expect(result.mostCompleted[0].id).toBe('m1');
      expect(result.mostCompleted[0].completions).toBe(2);
      expect(result.totalPointsDistributed).toBe(90);
    });
  });

  describe('calculateDemographicProfile', () => {
    it('deve calcular porcentagens de cursos e filiações UFU vs Externa', () => {
      const users = [
        { role: 'PARTICIPANT', course: 'Ciência da Computação', period: '3º', affiliation: 'UFU' },
        { role: 'PARTICIPANT', course: 'Ciência da Computação', period: '3º', affiliation: 'UFU' },
        { role: 'PARTICIPANT', course: 'Sistemas de Informação', period: '1º', affiliation: 'Externa' },
        { role: 'ADMIN', course: 'Coordenação' } // deve ignorar ADMIN
      ];

      const profile = calculateDemographicProfile(users);
      expect(profile.totalParticipants).toBe(3);
      expect(profile.topCourses[0].name).toBe('Ciência da Computação');
      expect(profile.topCourses[0].count).toBe(2);
      expect(profile.topCourses[0].percentage).toBe(66.7);
      expect(profile.affiliationDistribution.UFU).toBe(2);
      expect(profile.affiliationDistribution.Externa).toBe(1);
    });
  });

  describe('getMockAnalyticsData', () => {
    it('deve fornecer um snapshot completo, coerente e com schema válido', () => {
      const mock = getMockAnalyticsData();
      expect(mock.isMock).toBe(true);
      expect(mock.hourlyFlow.length).toBeGreaterThanOrEqual(29);
      expect(mock.activities.mostRegistered.length).toBeGreaterThan(0);
      expect(mock.sponsors.ranking.length).toBeGreaterThan(0);
      expect(mock.missions.mostCompleted.length).toBeGreaterThan(0);
      expect(mock.demographics.totalParticipants).toBeGreaterThan(0);
      expect(mock.summaryKpis.activeAudienceNow).toBeGreaterThan(0);
    });
  });
});
