import { describe, it, expect, vi } from 'vitest';
import { 
  calculateSponsorRoi, 
  exportLeadsToCsv,
  SEED_BIPADO_LEAD,
  getLocalSponsorLeads,
  saveLocalSponsorLead,
  submitLead,
  fetchLeads
} from '../../src/lib/sponsorService';

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

  describe('Print Layout & Executive Report Styles', () => {
    it('garante que index.css possui regras de @media print com fundo azul e ajuste de cor exato', async () => {
      const fs = await import('fs');
      const path = await import('path');
      const cssContent = fs.readFileSync(path.resolve(__dirname, '../../src/index.css'), 'utf-8');
      
      expect(cssContent).toContain('@media print');
      expect(cssContent).toContain('print-color-adjust: exact');
      expect(cssContent).toContain('-webkit-print-color-adjust: exact');
      expect(cssContent).toContain('#0A0F24');
      expect(cssContent).toContain('aside');
    });

    it('garante que SponsorShell esconde menu lateral e navegação na impressão', async () => {
      const fs = await import('fs');
      const path = await import('path');
      const shellContent = fs.readFileSync(path.resolve(__dirname, '../../src/components/sponsor/SponsorShell.jsx'), 'utf-8');
      
      expect(shellContent).toContain('print:!hidden');
      expect(shellContent).toContain('sponsor-shell');
      expect(shellContent).toContain('print:p-0');
    });

    it('garante que SponsorRoiDashboard possui cabeçalho formal e logo para impressão', async () => {
      const fs = await import('fs');
      const path = await import('path');
      const dashboardContent = fs.readFileSync(path.resolve(__dirname, '../../src/components/sponsor/SponsorRoiDashboard.jsx'), 'utf-8');
      
      expect(dashboardContent).toContain('hidden print:flex');
      expect(dashboardContent).toContain('TechWeek 2026');
      expect(dashboardContent).toContain('Relatório Oficial de Patrocínio');
      expect(dashboardContent).toContain('iconeTw');
      expect(dashboardContent).toContain('brightness-0 invert');
    });

    it('garante que seletor CRM/ROI em Sponsor.jsx é oculto na impressão', async () => {
      const fs = await import('fs');
      const path = await import('path');
      const sponsorContent = fs.readFileSync(path.resolve(__dirname, '../../src/pages/Sponsor.jsx'), 'utf-8');
      
      expect(sponsorContent).toContain('print:hidden flex items-center justify-between gap-2');
    });
  });

  describe('Seed Lead & Resilient Lead Persistence', () => {
    it('SEED_BIPADO_LEAD possui formato completo e dados de participante qualificado (5 estrelas)', () => {
      expect(SEED_BIPADO_LEAD).toBeDefined();
      expect(SEED_BIPADO_LEAD.name).toBe('Mariana Souza');
      expect(SEED_BIPADO_LEAD.rating).toBe(5);
      expect(SEED_BIPADO_LEAD.course).toBe('Ciência da Computação');
      expect(SEED_BIPADO_LEAD.period).toBe(6);
      expect(SEED_BIPADO_LEAD.phone).toBeTruthy();
      expect(SEED_BIPADO_LEAD.tags).toContain('Frontend');
      expect(SEED_BIPADO_LEAD.tags).toContain('React');
      expect(SEED_BIPADO_LEAD.participantUid).toBeTruthy();
    });

    it('getLocalSponsorLeads inicializa com o lead semente se o storage estiver vazio', () => {
      const leads = getLocalSponsorLeads('test_company_seed');
      expect(Array.isArray(leads)).toBe(true);
      expect(leads.length).toBeGreaterThanOrEqual(1);
      expect(leads[0].name).toBe('Mariana Souza');
    });

    it('saveLocalSponsorLead insere novo lead ou atualiza existente sem perder integridade', () => {
      const newLead = {
        participantUid: 'test_candidato_123',
        name: 'Carlos Oliveira',
        rating: 4,
        tags: ['Backend', 'Go'],
        notes: 'Boa comunicação'
      };

      saveLocalSponsorLead(newLead, 'test_company_crm');
      const stored = getLocalSponsorLeads('test_company_crm');
      const found = stored.find(l => l.participantUid === 'test_candidato_123');
      expect(found).toBeDefined();
      expect(found.rating).toBe(4);
      expect(found.tags).toContain('Go');
    });

    it('submitLead salva localmente e retorna sucesso com offline: true quando API não estiver disponível', async () => {
      const result = await submitLead({
        participantUid: 'demo_user_offline_test',
        notes: 'Lead salvo em modo teste resiliente',
        rating: 5,
        companyId: 'test_company_offline',
        tags: ['Frontend', 'Destaque'],
        participantData: {
          name: 'Lucas Teste',
          course: 'Sistemas de Informação',
          phone: '(34) 98888-7777',
          email: 'lucas@ufu.br'
        }
      });

      expect(result.success).toBe(true);
      expect(result.lead).toBeDefined();
      expect(result.lead.participantUid).toBe('demo_user_offline_test');
      expect(result.lead.name).toBe('Lucas Teste');
      expect(result.lead.rating).toBe(5);
    });

    it('fetchLeads retorna leads da empresa com o lead semente quando não houver conexão com backend', async () => {
      const data = await fetchLeads('test_fetch_company');
      expect(data).toBeDefined();
      expect(data.companyLeads).toBeDefined();
      expect(data.companyLeads.length).toBeGreaterThanOrEqual(1);
      expect(data.companyLeads[0].name).toBe('Mariana Souza');
    });
  });
});


