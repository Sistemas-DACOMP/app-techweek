// @vitest-environment happy-dom
import { describe, it, expect, vi, afterEach } from 'vitest';
import React from 'react';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';

vi.mock('../../src/lib/firebase', () => ({
  auth: { currentUser: null },
  db: {},
  storage: {},
}));

import { 
  calculateSponsorRoi, 
  exportLeadsToCsv,
  SEED_BIPADO_LEAD,
  getLocalSponsorLeads,
  saveLocalSponsorLead,
  submitLead,
  fetchLeads
} from '../../src/lib/sponsorService';
import SponsorRoiDashboard from '../../src/components/sponsor/SponsorRoiDashboard';

describe('Sponsor Service & Innovation Features', () => {
  afterEach(() => {
    cleanup();
  });

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
      const origDoc = global.document;
      delete global.document;
      try {
        const leads = [{ name: 'Mariana', tags: ['Frontend'] }];
        expect(exportLeadsToCsv(leads, 'EmpresaTeste', 'todos')).toBe(true);
      } finally {
        global.document = origDoc;
      }
    });

    it('gera CSV com cabeçalho contendo a coluna Tags / Habilidades no browser', () => {
      let createdBlobText = null;
      const OrigBlob = global.Blob;
      const OrigURL = global.URL;
      const origDoc = global.document;

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

      try {
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
      } finally {
        global.document = origDoc;
        global.Blob = OrigBlob;
        global.URL = OrigURL;
      }
    });
  });

  describe('Print Layout & Executive Report Dashboard (ERR-043)', () => {
    it('garante que index.css preserva regras de @media print e ajuste exato de cores', async () => {
      const fs = await import('fs');
      const path = await import('path');
      const cssContent = fs.readFileSync(path.resolve(__dirname, '../../src/index.css'), 'utf-8');

      expect(cssContent).toMatch(/@media\s+print/);
      expect(cssContent).toMatch(/print-color-adjust:\s*exact/);
      expect(cssContent).toMatch(/-webkit-print-color-adjust:\s*exact/);
    });

    it('renderiza SponsorRoiDashboard com cabeçalho oficial de impressão, métricas de ROI e alternância de escopo', () => {
      const allLeads = [
        { participantUid: 'u1', name: 'Ana', course: 'Ciência da Computação', period: 7, rating: 5, phone: '34999991111', tags: ['React'] },
        { participantUid: 'u2', name: 'Bruno', course: 'Sistemas de Informação', period: 4, rating: 4, phone: '34999992222', tags: ['Node'] },
      ];
      const myLeads = [allLeads[0]];

      const { container } = render(
        React.createElement(SponsorRoiDashboard, {
          allCompanyLeads: allLeads,
          myLeads,
          companyName: 'Kanastra',
          companyLogo: 'https://example.com/kanastra.png',
          totalEventAttendees: 200,
        })
      );

      // Cabeçalho de impressão (hidden print:flex) e cabeçalho de tela (print:hidden) presentes no DOM real
      expect(screen.getByText('TechWeek 2026')).toBeDefined();
      expect(screen.getByText('Relatório Oficial de Patrocínio')).toBeDefined();
      expect(screen.getByText('Performance de Talentos • Kanastra')).toBeDefined();
      expect(container.querySelector('.print\\:flex')).not.toBeNull();
      expect(container.querySelector('.print\\:hidden')).not.toBeNull();

      // Alterna escopo entre Toda a Empresa (2 leads) e Meus Leads (1 lead)
      const mineTab = screen.getByRole('tab', { name: /meus leads/i });
      fireEvent.click(mineTab);
      expect(mineTab.getAttribute('aria-selected')).toBe('true');
      expect(screen.getByText(/1 conexão capturada/i)).toBeDefined();
    });

    it('aciona window.print() e onExportCsv nos botões de ação executiva do SponsorRoiDashboard', () => {
      const originalPrint = window.print;
      const printSpy = vi.fn();
      window.print = printSpy;
      const onExportCsv = vi.fn();
      const leads = [
        { participantUid: 'u1', name: 'Ana', course: 'Ciência da Computação', period: 7, rating: 5, phone: '34999991111', tags: ['React'] },
      ];

      try {
        render(
          React.createElement(SponsorRoiDashboard, {
            leads,
            companyName: 'Kanastra',
            onExportCsv,
          })
        );

        const printBtn = screen.getByRole('button', { name: /imprimir \/ pdf/i });
        fireEvent.click(printBtn);
        expect(printSpy).toHaveBeenCalledTimes(1);

        const exportBtn = screen.getByRole('button', { name: /exportar csv/i });
        fireEvent.click(exportBtn);
        expect(onExportCsv).toHaveBeenCalledWith(leads, 'company');
      } finally {
        window.print = originalPrint;
      }
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
      const fetchSpy = vi.spyOn(global, 'fetch').mockRejectedValue(new TypeError('fetch failed'));
      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      try {
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
        expect(warnSpy).toHaveBeenCalled();
      } finally {
        warnSpy.mockRestore();
        fetchSpy.mockRestore();
      }
    });

    it('fetchLeads retorna leads da empresa com o lead semente quando não houver conexão com backend', async () => {
      const fetchSpy = vi.spyOn(global, 'fetch').mockRejectedValue(new TypeError('fetch failed'));
      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      try {
        const data = await fetchLeads('test_fetch_company');
        expect(data).toBeDefined();
        expect(data.companyLeads).toBeDefined();
        expect(data.companyLeads.length).toBeGreaterThanOrEqual(1);
        expect(data.companyLeads[0].name).toBe('Mariana Souza');
        expect(warnSpy).toHaveBeenCalled();
      } finally {
        warnSpy.mockRestore();
        fetchSpy.mockRestore();
      }
    });
  });
});
