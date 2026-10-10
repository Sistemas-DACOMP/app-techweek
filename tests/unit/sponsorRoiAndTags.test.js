import { describe, it, expect, vi } from 'vitest';
import { calculateSponsorRoi, exportLeadsToCsv } from '../../src/lib/sponsorService';

describe('Sponsor Service & Innovation Features', () => {
  describe('calculateSponsorRoi', () => {
    it('retorna estrutura segura vazia quando não há leads', () => {
      const roi = calculateSponsorRoi([]);
      expect(roi.totalLeads).toBe(0);
      expect(roi.qualifiedCount).toBe(0);
      expect(roi.qualificationRate).toBe(0);
      expect(roi.topTalentsCount).toBe(0);
      expect(roi.penetrationRate).toBe(0);
      expect(roi.courses).toEqual([]);
      expect(roi.tags).toEqual([]);
      expect(roi.ratingFunnel.total).toBe(0);
    });

    it('calcula métricas de penetração, qualificação e funil corretamente', () => {
      const mockLeads = [
        {
          participantUid: 'u1',
          name: 'Ana Silva',
          course: 'Ciência da Computação',
          period: 7,
          rating: 5,
          phone: '(34) 99123-4567',
          github: 'anasilva',
          tags: ['Frontend', 'React', 'Estágio'],
          collectedByEmail: 'recruiter1@sponsor.com'
        },
        {
          participantUid: 'u2',
          name: 'Bruno Lima',
          course: 'Sistemas de Informação',
          period: 4,
          rating: 4,
          phone: '34988887777',
          tags: ['Backend', 'Node.js', 'Júnior'],
          collectedByEmail: 'recruiter1@sponsor.com'
        },
        {
          participantUid: 'u3',
          name: 'Carlos Mendes',
          course: 'Ciência da Computação',
          period: 2,
          rating: 2,
          phone: '',
          tags: ['Estágio'],
          collectedByEmail: 'recruiter2@sponsor.com'
        },
        {
          participantUid: 'u4',
          name: 'Daniela Pós',
          course: 'Pós-Graduação em Computação',
          participantType: 'Aluno UFU Pós-Graduação',
          rating: 0,
          phone: '34977776666',
          tags: ['Dados/IA'],
          collectedByEmail: 'recruiter2@sponsor.com'
        }
      ];

      const roi = calculateSponsorRoi(mockLeads, 400);

      // Total & Penetration
      expect(roi.totalLeads).toBe(4);
      expect(roi.penetrationRate).toBe(1.0); // 4 / 400 = 1%

      // Qualified (4★ & 5★)
      expect(roi.qualifiedCount).toBe(2);
      expect(roi.qualificationRate).toBe(50); // 2 de 4 = 50%
      expect(roi.topTalentsCount).toBe(1); // 1 lead com 5★

      // Contactable & Github
      expect(roi.withPhoneCount).toBe(3);
      expect(roi.withGithubCount).toBe(1);

      // Periods breakdown
      expect(roi.periods.conclusao).toBe(1); // 7º período
      expect(roi.periods.meio).toBe(1); // 4º período
      expect(roi.periods.inicio).toBe(1); // 2º período
      expect(roi.periods.posGrad).toBe(1); // Pós-graduação

      // Courses distribution
      expect(roi.courses[0].name).toBe('Ciência da Computação');
      expect(roi.courses[0].count).toBe(2);
      expect(roi.courses[0].percent).toBe(50);

      // Tags distribution
      const tagEstagio = roi.tags.find((t) => t.tag === 'Estágio');
      expect(tagEstagio).toBeDefined();
      expect(tagEstagio.count).toBe(2);

      // Attendants productivity
      expect(roi.attendants.length).toBe(2);
      expect(roi.attendants.every((a) => a.count === 2)).toBe(true);

      // Funnel
      expect(roi.ratingFunnel.total).toBe(4);
      expect(roi.ratingFunnel.contactable).toBe(3);
      expect(roi.ratingFunnel.evaluated).toBe(3);
      expect(roi.ratingFunnel.qualified).toBe(2);
      expect(roi.ratingFunnel.destaques).toBe(1);
    });
  });

  describe('exportLeadsToCsv', () => {
    it('executa exportLeadsToCsv em ambiente sem DOM sem quebrar e retorna true', () => {
      const leads = [{ name: 'Mariana', tags: ['Frontend'] }];
      expect(exportLeadsToCsv(leads, 'EmpresaTeste', 'todos')).toBe(true);
    });

    it('gera CSV com cabeçalho contendo a coluna Tags / Habilidades no browser', () => {
      let createdBlobText = null;
      const OrigBlob = global.Blob;
      const OrigURL = global.URL;

      global.Blob = class MockBlob {
        constructor(parts) {
          createdBlobText = parts.join('');
        }
      };
      global.URL = {
        createObjectURL: vi.fn(() => 'blob:mock-url'),
        revokeObjectURL: vi.fn()
      };
      const mockAnchor = {
        set href(v) {},
        set download(v) {},
        click: vi.fn()
      };
      global.document = {
        createElement: vi.fn(() => mockAnchor),
        body: {
          appendChild: vi.fn(),
          removeChild: vi.fn()
        }
      };

      const leads = [
        {
          name: 'Mariana Souza',
          email: 'mariana@ufu.br',
          phone: '34999998888',
          course: 'Engenharia da Computação',
          period: 5,
          rating: 4,
          tags: ['Destaque', 'Frontend', 'TypeScript'],
          notes: 'Ótima candidata para estágio',
          github: 'marianasouza'
        }
      ];

      const success = exportLeadsToCsv(leads, 'EmpresaTeste', 'todos');
      expect(success).toBe(true);
      expect(createdBlobText).toContain('Tags / Habilidades');
      expect(createdBlobText).toContain('Destaque, Frontend, TypeScript');
      expect(createdBlobText).toContain('Mariana Souza');

      delete global.document;
      global.Blob = OrigBlob;
      global.URL = OrigURL;
    });
  });
});
