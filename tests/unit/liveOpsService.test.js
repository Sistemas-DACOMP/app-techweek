import { describe, it, expect, beforeEach } from 'vitest';
import {
  getRoomIncidents,
  createRoomIncident,
  dispatchIncidentSupport,
  resolveIncident,
  deleteIncident,
  releaseWalkinSeats,
  getWalkinReleases,
  cancelWalkinRelease,
  triggerSponsorBoost,
  getActiveSponsorBoosts,
  getMicroPulseRatings,
  submitMicroPulseRating,
  calculateMicroPulseAnalytics,
  getStageDisplayMode,
  setStageDisplayMode,
  calculateUfuExtensionAudit,
  exportUfuAuditCsv,
  resetLiveOpsStorage,
  sendActivityBroadcast,
  getActivityBroadcasts,
  isActivityEvaluated,
  markActivityEvaluated,
  SEMANTIC_RATING_LABELS,
  PERCEPTION_TAGS,
} from '../../src/lib/liveOpsService';

describe('liveOpsService - Live Operations & Event Steering Engine', () => {
  beforeEach(() => {
    resetLiveOpsStorage();
  });

  describe('Pilar 1: Chamados SOS de Sala & Incident Dispatch', () => {
    it('retorna os incidentes padrão iniciais', () => {
      const incidents = getRoomIncidents();
      expect(incidents.length).toBeGreaterThanOrEqual(2);
      expect(incidents[0].room).toBeDefined();
      expect(incidents[0].issue).toBeDefined();
    });

    it('cria novo chamado SOS com prioridade e status open', () => {
      const newInc = createRoomIncident({
        room: 'Auditório 5R',
        activityTitle: 'Workshop IA',
        issue: 'Sem internet no projetor',
        priority: 'alta',
        reporter: 'Monitor João',
      });

      expect(newInc.id).toMatch(/^inc_/);
      expect(newInc.status).toBe('open');
      expect(newInc.priority).toBe('alta');

      const all = getRoomIncidents();
      expect(all.some((i) => i.id === newInc.id)).toBe(true);
    });

    it('despacha suporte técnico e marca como dispatched', () => {
      const inc = createRoomIncident({
        room: 'Lab 1',
        issue: 'Teclado quebrado',
      });

      const dispatched = dispatchIncidentSupport(inc.id, 'Técnico Mariana');
      expect(dispatched.status).toBe('dispatched');
      expect(dispatched.technician).toBe('Técnico Mariana');
      expect(dispatched.dispatchedAt).toBeDefined();
    });

    it('resolve o incidente e marca como resolved', () => {
      const inc = createRoomIncident({
        room: 'Lab 1',
        issue: 'Teclado quebrado',
      });

      const resolved = resolveIncident(inc.id);
      expect(resolved.status).toBe('resolved');
      expect(resolved.resolvedAt).toBeDefined();
    });

    it('exclui incidente com deleteIncident', () => {
      const inc = createRoomIncident({ room: 'Sala A', issue: 'Teste' });
      deleteIncident(inc.id);
      const all = getRoomIncidents();
      expect(all.find((i) => i.id === inc.id)).toBeUndefined();
    });
  });

  describe('Pilar 1: No-Show Buster & Walk-in Release', () => {
    it('registra liberação de vagas para walk-ins', () => {
      const record = releaseWalkinSeats('act_101', 25, 'Palestra DevOps', 'Anfiteatro FACOM');
      expect(record.activityId).toBe('act_101');
      expect(record.releasedSeats).toBe(25);
      expect(record.isWalkinActive).toBe(true);

      const releases = getWalkinReleases();
      expect(releases['act_101']).toBeDefined();
      expect(releases['act_101'].releasedSeats).toBe(25);
    });

    it('cancela liberação de walk-in', () => {
      releaseWalkinSeats('act_102', 15);
      cancelWalkinRelease('act_102');
      const releases = getWalkinReleases();
      expect(releases['act_102']).toBeUndefined();
    });
  });

  describe('Pilar 2: Estande Booster (Missão Relâmpago 1-Clique)', () => {
    it('aciona boost de patrocinador com validade temporizada e EXP em dobro', () => {
      const boost = triggerSponsorBoost({
        sponsorId: 'kanastra',
        sponsorName: 'Kanastra',
        points: 120,
        durationMinutes: 45,
      });

      expect(boost.sponsorId).toBe('kanastra');
      expect(boost.points).toBe(120);
      expect(boost.durationMinutes).toBe(45);
      expect(boost.active).toBe(true);
      expect(new Date(boost.expiresAt).getTime()).toBeGreaterThan(Date.now());

      const active = getActiveSponsorBoosts();
      expect(active['kanastra']).toBeDefined();
      expect(active['kanastra'].sponsorName).toBe('Kanastra');
    });
  });

  describe('Pilar 3: Micro-Pulse NPS & Avaliação de Palestras', () => {
    it('retorna avaliações padrão com cálculo de satisfação', () => {
      const ratings = getMicroPulseRatings();
      expect(ratings.length).toBeGreaterThanOrEqual(4);

      const stats = calculateMicroPulseAnalytics();
      expect(stats.averageScore).toBeGreaterThanOrEqual(4.0);
      expect(stats.approvalRate).toBeGreaterThanOrEqual(80);
      expect(stats.topTags.length).toBeGreaterThan(0);
      expect(stats.rankedActivities.length).toBeGreaterThan(0);
    });

    it('submete nova avaliação e recalcula rankings', () => {
      const newReview = submitMicroPulseRating({
        activityId: 'act_novo',
        activityTitle: 'Oficina de IA com Antigravity',
        speaker: 'DeepMind Team',
        rating: 5,
        reaction: 'love',
        tag: 'Inovador',
        comment: 'Experiência sensacional de pairing com IA.',
        userCourse: 'Ciência da Computação',
      });

      expect(newReview.id).toMatch(/^mp_/);
      expect(newReview.rating).toBe(5);

      const stats = calculateMicroPulseAnalytics([{ id: 'act_novo', title: 'Oficina de IA com Antigravity' }]);
      const found = stats.rankedActivities.find((a) => a.activityId === 'act_novo');
      expect(found).toBeDefined();
      expect(found.averageRating).toBe(5);
    });
  });

  describe('Pilar 3: Stage Display Orchestrator (Controle do Telão)', () => {
    it('controla os modos do telão dinamicamente', () => {
      expect(getStageDisplayMode()).toBe('presenca');
      setStageDisplayMode('ranking');
      expect(getStageDisplayMode()).toBe('ranking');
      setStageDisplayMode('agenda');
      expect(getStageDisplayMode()).toBe('agenda');
    });
  });

  describe('Pilar 4: Auditoria Acadêmica UFU (Regra 75%)', () => {
    it('calcula conformidade de carga horária para extensão universitária', () => {
      const mockUsers = [
        { uid: 'u1', fullName: 'Ana Silva', email: 'ana@ufu.br', totalPoints: 500, hasSymplaTicket: true, course: 'BCC' },
        { uid: 'u2', fullName: 'Bruno Costa', email: 'bruno@ufu.br', totalPoints: 40, hasSymplaTicket: false, course: 'BSI' },
      ];

      const audit = calculateUfuExtensionAudit({
        usersList: mockUsers,
        totalEventHours: 24,
      });

      expect(audit.totalEventHours).toBe(24);
      expect(audit.minRequiredHours).toBe(18); // 75% de 24h
      expect(audit.users.length).toBe(2);

      const ana = audit.users.find((u) => u.uid === 'u1');
      const bruno = audit.users.find((u) => u.uid === 'u2');

      expect(ana.isEligible).toBe(true);
      expect(ana.statusLabel).toBe('APTO PARA CERTIFICADO');

      expect(bruno.isEligible).toBe(false);
      expect(bruno.statusLabel).toBe('FREQUÊNCIA INSUFICIENTE');
    });

    it('suporta assinatura posicional (AdminPessoas) e documentos incompletos sem quebrar', () => {
      const mockUsers = [
        { uid: 'u1', fullName: 'Ana Silva', email: 'ana@ufu.br', totalPoints: 500, hasSymplaTicket: true, course: 'BCC', period: 6 },
        { id: 'u2', firstName: 'Bruno', totalPoints: 40 },
        null,
        undefined,
        {},
      ];
      const mockActivities = [{ id: 'a1' }, { id: 'a2' }, { id: 'a3' }];

      const audit = calculateUfuExtensionAudit(mockUsers, mockActivities, 75);

      expect(Array.isArray(audit.students)).toBe(true);
      expect(audit.students.length).toBe(3);
      expect(audit.totalUfuStudents).toBe(3);
      expect(audit.requiredHours).toBe(18);
      expect(audit.eligibleCount).toBe(1);
      expect(audit.ineligibleCount).toBe(2);
      expect(typeof audit.avgAttendanceRate).toBe('number');
      expect(audit.students[0].id).toBe('u1');
      expect(audit.students[0].attendancePercentage).toBeGreaterThanOrEqual(75);
      expect(audit.students[0].attendedActivitiesCount).toBeGreaterThanOrEqual(1);

      const csv = exportUfuAuditCsv(audit, { download: false });
      expect(csv).toContain('Nome Completo;E-mail;Curso / Vínculo');
      expect(csv).toContain('Ana Silva');
    });
  });

  describe('Pilar 6: Avisos Segmentados por Atividade & Avaliação Pós-Presença', () => {
    it('dispara avisos segmentados com audiência específica e templates', () => {
      const bc = sendActivityBroadcast({
        activityId: 'act_cloud_2026',
        activityTitle: 'Oficina de Kubernetes & Cloud',
        location: 'Lab 2 (Bloco 5R)',
        targetAudience: 'checked_in',
        title: 'Material Adicional',
        message: 'O link do repositório está no telão.',
        urgent: true,
      });

      expect(bc.id).toBeDefined();
      expect(bc.activityId).toBe('act_cloud_2026');
      expect(bc.targetAudience).toBe('checked_in');
      expect(bc.audienceLabel).toBe('Apenas Presentes');
      expect(bc.urgent).toBe(true);

      const list = getActivityBroadcasts('act_cloud_2026');
      expect(list.length).toBeGreaterThanOrEqual(1);
      expect(list[0].title).toBe('Material Adicional');

      const allList = getActivityBroadcasts();
      expect(allList.some((b) => b.id === bc.id)).toBe(true);
    });

    it('gerencia status de avaliação do participante por atividade', () => {
      expect(isActivityEvaluated('act_99', 'user_123')).toBe(false);
      markActivityEvaluated('act_99', 'user_123');
      expect(isActivityEvaluated('act_99', 'user_123')).toBe(true);
      expect(isActivityEvaluated('act_outro', 'user_123')).toBe(false);
    });

    it('submete avaliação com múltiplas tags de percepção e rótulo semântico', () => {
      const review = submitMicroPulseRating({
        activityId: 'act_99',
        activityTitle: 'Palestra Arquitetura de Microsserviços',
        speaker: 'Fábio Silva',
        rating: 5,
        tags: [PERCEPTION_TAGS[0], PERCEPTION_TAGS[1]],
        comment: 'Didática fantástica!',
      });

      expect(review.rating).toBe(5);
      expect(review.tags).toContain('Didática Clara');
      expect(review.tags).toContain('Mão na Massa / Prático');
      expect(SEMANTIC_RATING_LABELS[5]).toBe('Espetacular!');
      expect(SEMANTIC_RATING_LABELS[2]).toBe('Regular');
    });
  });
});

