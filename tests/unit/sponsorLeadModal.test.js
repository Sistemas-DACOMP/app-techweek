// @vitest-environment happy-dom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { render, screen, fireEvent, waitFor, cleanup } from '@testing-library/react';

const { mockSubmitLead, mockUpdateLead, mockGetSponsorSettings, mockGetActiveOutreachMessage } = vi.hoisted(() => ({
  mockSubmitLead: vi.fn(),
  mockUpdateLead: vi.fn(),
  mockGetSponsorSettings: vi.fn(() => ({
    tags: [],
    activeTemplateId: 'recruiter_outreach',
    templates: [{ id: 'recruiter_outreach', title: 'Abordagem Geral' }],
  })),
  mockGetActiveOutreachMessage: vi.fn((companyId, ctx) =>
    `Olá, ${ctx?.name || 'tudo bem'}! Mensagem da ${ctx?.companyName || companyId}.`
  ),
}));

vi.mock('../../src/lib/firebase', () => ({
  auth: { currentUser: null },
  db: {},
  storage: {},
}));

vi.mock('../../src/lib/sponsorService', () => ({
  submitLead: (...args) => mockSubmitLead(...args),
  updateLead: (...args) => mockUpdateLead(...args),
}));

vi.mock('../../src/lib/sponsorSettingsService', () => ({
  getSponsorSettings: (...args) => mockGetSponsorSettings(...args),
  getActiveOutreachMessage: (...args) => mockGetActiveOutreachMessage(...args),
}));

import SponsorLeadModal, {
  QUICK_RECRUITMENT_TAGS,
  RATING_CLASSIFICATIONS,
  getAffiliationBadge,
  getCleanInstitution,
  formatPeriod
} from '../../src/components/SponsorLeadModal';

describe('SponsorLeadModal - 5 Melhorias de UX/UI para Estande', () => {
  beforeEach(() => {
    mockSubmitLead.mockReset().mockResolvedValue({ success: true, lead: { id: 'lead_1' } });
    mockUpdateLead.mockReset().mockResolvedValue({ success: true });
  });

  afterEach(() => {
    cleanup();
  });

  const mockParticipant = {
    participantUid: 'usr_test_123',
    name: 'Ana Silva',
    course: 'Sistemas de Informação',
    period: 4,
    phone: '34999998888',
    email: 'ana.silva@ufu.br',
    github: 'anasilva',
    participantType: 'Graduação'
  };

  const mockSponsorProfile = {
    companyId: 'kanastra',
    companyName: 'Kanastra'
  };

  describe('1. Header Limpo e Sem Cortes', () => {
    it('renderiza cabeçalho com nome da empresa em pill dedicada e botão fechar com touch target 44px', () => {
      const html = renderToStaticMarkup(
        React.createElement(SponsorLeadModal, {
          participant: mockParticipant,
          sponsorProfile: mockSponsorProfile,
          isExistingLead: false,
          onClose: () => {}
        })
      );

      // Nome da empresa intacto
      expect(html).toContain('Kanastra');
      expect(html).toContain('Novo Lead');
      // Botão fechar com aria-label e dimensão 44px
      expect(html).toContain('aria-label="Fechar modal"');
      expect(html).toContain('width:44px');
      expect(html).toContain('height:44px');
    });
  });

  describe('2. Chips Rápidos de 1 Toque (Quick Recruitment Tags)', () => {
    it('contém exatamente as 8 tags técnicas necessárias para estande de tech', () => {
      expect(QUICK_RECRUITMENT_TAGS).toEqual([
        'Estágio',
        'Júnior',
        'Frontend',
        'Backend',
        'Mobile',
        'Dados / IA',
        'Design / UI',
        'Destaque'
      ]);
    });

    it('renderiza os chips rápidos na interface com touch target confortável', () => {
      const html = renderToStaticMarkup(
        React.createElement(SponsorLeadModal, {
          participant: mockParticipant,
          sponsorProfile: mockSponsorProfile,
          isExistingLead: false,
          onClose: () => {}
        })
      );

      expect(html).toContain('Chips Rápidos (1 Toque)');
      QUICK_RECRUITMENT_TAGS.forEach((tag) => {
        expect(html).toContain(tag);
      });
    });
  });

  describe('3. Hierarquia e Reorganização dos Botões de Contato', () => {
    it('no modo de captura imediata (isExistingLead = false), botões soltos de contato são omitidos para foco na qualificação e economia vertical', () => {
      const html = renderToStaticMarkup(
        React.createElement(SponsorLeadModal, {
          participant: mockParticipant,
          sponsorProfile: mockSponsorProfile,
          isExistingLead: false,
          onClose: () => {}
        })
      );

      // Não polui o fluxo inicial com botões soltos de contato
      expect(html).not.toContain('Copiar E-mail');
      // Os botões de ação de validação e salvamento devem estar presentes
      expect(html).toContain('Salvar Lead');
      expect(html).toContain('Somente Validar');
    });

    it('no modo de visualização de lead CRM (isExistingLead = true), exibe a Ficha Estratégica com ações de contato e botão para editar', () => {
      const html = renderToStaticMarkup(
        React.createElement(SponsorLeadModal, {
          participant: mockParticipant,
          sponsorProfile: mockSponsorProfile,
          isExistingLead: true,
          onClose: () => {}
        })
      );

      expect(html).toContain('Ficha do Candidato');
      expect(html).toContain('Copiar E-mail');
      expect(html).toContain('WhatsApp');
      expect(html).toContain('Editar Avaliação');
      expect(html).toContain('Fechar');
      // No Modo 1 (Ficha Estratégica de CRM), controles de edição de formulário ficam ocultos até clique explícito
      expect(html).not.toContain('Salvar Alterações');
    });
  });

  describe('3.1 Modo 1: Ficha Estratégica de CRM (Visualização Executiva de Lead Existente)', () => {
    it('renderiza dossiê executivo com estrelas fixas, tags estáticas, anotações limpas e metadados de auditoria', () => {
      const leadData = {
        ...mockParticipant,
        rating: 4,
        notes: '[Frontend] [Destaque] Desenvolvedora talentosa com projetos em React e TypeScript.',
        tags: ['Frontend', 'Destaque'],
        collectedByEmail: 'recrutador@kanastra.com',
        createdAt: '2026-10-10T14:30:00Z',
        linkedin: 'https://linkedin.com/in/anasilva'
      };

      const html = renderToStaticMarkup(
        React.createElement(SponsorLeadModal, {
          participant: leadData,
          sponsorProfile: mockSponsorProfile,
          isExistingLead: true,
          onClose: () => {}
        })
      );

      // Card do candidato e afiliação
      expect(html).toContain('Ana Silva');
      expect(html).toContain('Sistemas de Informação');
      expect(html).toContain('Graduação');

      // Classificação fixa 4 estrelas
      expect(html).toContain('4.0');
      expect(html).toContain('Muito Bom / Fit Técnico');

      // Hero Actions de Contato
      expect(html).toContain('WhatsApp');
      expect(html).toContain('Copiar E-mail');
      expect(html).toContain('GitHub');
      expect(html).toContain('LinkedIn');

      // Chips estáticos de competências e anotações limpas (sem colchetes)
      expect(html).toContain('Competências &amp; Tags');
      expect(html).toContain('Frontend');
      expect(html).toContain('Destaque');
      expect(html).toContain('Desenvolvedora talentosa com projetos em React e TypeScript.');
      expect(html).not.toContain('[Frontend]');

      // Auditoria
      expect(html).toContain('Coletado por:');
      expect(html).toContain('recrutador@kanastra.com');
      expect(html).toContain('Data de registro:');

      // Botões do Rodapé Estratégico
      expect(html).toContain('Fechar');
      expect(html).toContain('Editar Avaliação');
    });
  });

  describe('4. Visibilidade e Classificação Dinâmica das Estrelas (0 a 5 ★)', () => {
    it('define todas as classificações semânticas esperadas de 0 a 5', () => {
      expect(RATING_CLASSIFICATIONS[0].label).toBe('Sem classificação');
      expect(RATING_CLASSIFICATIONS[1].label).toBe('Contato Geral');
      expect(RATING_CLASSIFICATIONS[2].label).toBe('Interesse Básico');
      expect(RATING_CLASSIFICATIONS[3].label).toBe('Bom Perfil');
      expect(RATING_CLASSIFICATIONS[4].label).toBe('Muito Bom / Fit Técnico');
      expect(RATING_CLASSIFICATIONS[5].label).toBe('Destaque Máximo');
    });

    it('renderiza os 5 botões de estrelas com contraste e dimensões WCAG (minWidth: 44px)', () => {
      const html = renderToStaticMarkup(
        React.createElement(SponsorLeadModal, {
          participant: mockParticipant,
          sponsorProfile: mockSponsorProfile,
          isExistingLead: false,
          onClose: () => {}
        })
      );

      expect(html).toContain('1 estrelas - Contato Geral');
      expect(html).toContain('2 estrelas - Interesse Básico');
      expect(html).toContain('3 estrelas - Bom Perfil');
      expect(html).toContain('4 estrelas - Muito Bom / Fit Técnico');
      expect(html).toContain('5 estrelas - Destaque Máximo');
      expect(html).toContain('min-width:44px');
      expect(html).toContain('min-height:44px');
    });
  });

  describe('5. Botão Degradê com Bordas Arredondadas (16px), Somente Validar e Remoção de Pontos', () => {
    it('exibe botão principal com gradiente, bordas arredondadas (16px) e sem menção a +50 pontos', () => {
      const html = renderToStaticMarkup(
        React.createElement(SponsorLeadModal, {
          participant: mockParticipant,
          sponsorProfile: mockSponsorProfile,
          isExistingLead: false,
          onClose: () => {}
        })
      );

      // Label limpo para o patrocinador
      expect(html).toContain('Salvar Lead');
      expect(html).not.toContain('+50');
      expect(html).not.toContain('50 pts');
      // Bordas arredondadas 16px e degradê primário
      expect(html).toContain('border-radius:16px');
      expect(html).toContain('linear-gradient(135deg, #2563EB 0%, #5B3BE0 55%, #7C3AED 100%)');
    });

    it('renderiza o botão "Somente Validar" com bordas arredondadas (16px) no modo de captura imediata', () => {
      const html = renderToStaticMarkup(
        React.createElement(SponsorLeadModal, {
          participant: mockParticipant,
          sponsorProfile: mockSponsorProfile,
          isExistingLead: false,
          onClose: () => {},
          onValidateOnly: () => {}
        })
      );

      expect(html).toContain('Somente Validar');
      expect(html).toContain('border-radius:16px');
    });

    it('não exibe o botão "Somente Validar" na edição de lead já existente no CRM', () => {
      const html = renderToStaticMarkup(
        React.createElement(SponsorLeadModal, {
          participant: mockParticipant,
          sponsorProfile: mockSponsorProfile,
          isExistingLead: true,
          onClose: () => {}
        })
      );

      expect(html).not.toContain('Somente Validar');
    });
  });

  describe('Afiliação Acadêmica (Graduação / Pós / Externo)', () => {
    it('identifica corretamente os diferentes tipos de vínculo', () => {
      expect(getAffiliationBadge({ participantType: 'Graduação' }).label).toBe('Graduação');
      expect(getAffiliationBadge({ participantType: 'Pós-Graduação' }).label).toBe('Pós-Graduação');
      expect(getAffiliationBadge({ participantType: 'Comunidade Externa' }).label).toBe('Externo');
    });

    it('higieniza rótulos redundantes de instituição para evitar texto duplicado', () => {
      expect(getCleanInstitution({ instituicao: 'Aluno UFU Graduação' }, 'Graduação')).toBeNull();
      expect(getCleanInstitution({ instituicao: 'Graduação' }, 'Graduação')).toBeNull();
      expect(getCleanInstitution({ instituicao: 'Universidade Federal de Uberlândia (UFU)' }, 'Graduação')).toBe('UFU');
      expect(getCleanInstitution({ instituicao: 'USP' }, 'Graduação')).toBe('USP');
    });
  });

  describe('Formatação de Período Acadêmico', () => {
    it('formata números e strings sem duplicar o sufixo "Período"', () => {
      expect(formatPeriod(4)).toBe('4º Período');
      expect(formatPeriod('6')).toBe('6º Período');
      expect(formatPeriod('6º Período')).toBe('6º Período');
      expect(formatPeriod('2º periodo')).toBe('2º periodo');
      expect(formatPeriod(null)).toBeNull();
      expect(formatPeriod('')).toBeNull();
    });
  });

  describe('6. Estrutura Flexbox e Redesenho Compacto', () => {
    it('utiliza layout flex com max-height 90vh e sticky footer lado a lado', () => {
      const html = renderToStaticMarkup(
        React.createElement(SponsorLeadModal, {
          participant: mockParticipant,
          sponsorProfile: mockSponsorProfile,
          isExistingLead: false,
          onClose: () => {}
        })
      );

      expect(html).toContain('max-height:90vh');
      expect(html).toContain('flex-direction:column');
      expect(html).toContain('grid-template-columns:1fr 1.35fr');
    });

    it('textarea inicia com placeholder de anotação rápida', () => {
      const html = renderToStaticMarkup(
        React.createElement(SponsorLeadModal, {
          participant: mockParticipant,
          sponsorProfile: mockSponsorProfile,
          isExistingLead: false,
          onClose: () => {}
        })
      );

      expect(html).toContain('placeholder="Adicionar anotação... (opcional)"');
    });
  });

  describe('7. Interações Reais do Usuário — Qualificação, Chips, Notas e Persistência (ERR-041)', () => {
    it('seleciona estrelas, alterna chips rápidos, digita anotação e submete novo lead via submitLead', async () => {
      const onLeadCaptured = vi.fn();
      const onClose = vi.fn();

      render(
        React.createElement(SponsorLeadModal, {
          participant: mockParticipant,
          sponsorProfile: mockSponsorProfile,
          isExistingLead: false,
          onClose,
          onLeadCaptured,
        })
      );

      // Seleciona 5 estrelas
      const star5Btn = screen.getByRole('button', { name: /5 estrelas - destaque máximo/i });
      fireEvent.click(star5Btn);

      // Alterna chips rápidos (adiciona Frontend e Estágio, depois remove Estágio e adiciona Destaque)
      const frontendChip = screen.getByRole('button', { name: 'Frontend' });
      const estagioChip = screen.getByRole('button', { name: 'Estágio' });
      const destaqueChip = screen.getByRole('button', { name: 'Destaque' });

      fireEvent.click(frontendChip);
      fireEvent.click(estagioChip);
      const textarea = screen.getByPlaceholderText('Adicionar anotação... (opcional)');
      expect(textarea.value).toBe('[Frontend] [Estágio]');

      // Remove chip Estágio com 1 toque e adiciona Destaque
      fireEvent.click(estagioChip);
      expect(textarea.value).toBe('[Frontend]');
      fireEvent.click(destaqueChip);
      expect(textarea.value).toBe('[Frontend] [Destaque]');

      // Digita observação complementar
      fireEvent.change(textarea, {
        target: { value: '[Frontend] [Destaque] Excelente domínio de React e arquitetura.' },
      });

      // Clica em Salvar Lead
      const saveBtn = screen.getByRole('button', { name: /salvar lead/i });
      fireEvent.click(saveBtn);

      await waitFor(() => {
        expect(mockSubmitLead).toHaveBeenCalledTimes(1);
      });

      expect(mockSubmitLead).toHaveBeenCalledWith(
        expect.objectContaining({
          participantUid: 'usr_test_123',
          rating: 5,
          notes: '[Frontend] [Destaque] Excelente domínio de React e arquitetura.',
          tags: ['Frontend', 'Destaque'],
          companyId: 'kanastra',
        })
      );
      expect(onLeadCaptured).toHaveBeenCalledWith(
        expect.objectContaining({
          participantUid: 'usr_test_123',
          rating: 5,
          tags: ['Frontend', 'Destaque'],
        })
      );
    });

    it('aciona "Somente Validar" com validateOnly: true e fecha o modal após validar presença', async () => {
      const onValidateOnly = vi.fn();
      const onClose = vi.fn();

      render(
        React.createElement(SponsorLeadModal, {
          participant: mockParticipant,
          sponsorProfile: mockSponsorProfile,
          isExistingLead: false,
          onClose,
          onValidateOnly,
        })
      );

      const validateBtn = screen.getByRole('button', { name: /somente validar/i });
      fireEvent.click(validateBtn);

      await waitFor(() => {
        expect(mockSubmitLead).toHaveBeenCalledWith({
          participantUid: 'usr_test_123',
          notes: '',
          rating: undefined,
          companyId: 'kanastra',
          validateOnly: true,
        });
      });

      expect(onValidateOnly).toHaveBeenCalledWith(mockParticipant);
      expect(onClose).toHaveBeenCalledTimes(1);
    });

    it('abre modo de edição em lead existente no CRM, atualiza nota/tags e chama updateLead', async () => {
      const onLeadUpdated = vi.fn();
      const existingLead = {
        ...mockParticipant,
        rating: 3,
        notes: '[Backend] Bom perfil técnico',
        tags: ['Backend'],
      };

      render(
        React.createElement(SponsorLeadModal, {
          participant: existingLead,
          sponsorProfile: mockSponsorProfile,
          isExistingLead: true,
          onClose: () => {},
          onLeadUpdated,
        })
      );

      // Inicia na Ficha do Candidato e clica em Editar Avaliação
      const editBtn = screen.getByRole('button', { name: /editar avaliação/i });
      fireEvent.click(editBtn);

      // Altera para 4 estrelas e adiciona chip Júnior
      const star4Btn = screen.getByRole('button', { name: /4 estrelas - muito bom/i });
      fireEvent.click(star4Btn);

      const juniorChip = screen.getByRole('button', { name: 'Júnior' });
      fireEvent.click(juniorChip);

      const saveChangesBtn = screen.getByRole('button', { name: /salvar alterações/i });
      fireEvent.click(saveChangesBtn);

      await waitFor(() => {
        expect(mockUpdateLead).toHaveBeenCalledTimes(1);
      });

      expect(mockUpdateLead).toHaveBeenCalledWith({
        participantUid: 'usr_test_123',
        rating: 4,
        notes: '[Backend] [Júnior] Bom perfil técnico',
        tags: ['Backend', 'Júnior'],
        companyId: 'kanastra',
      });
      expect(onLeadUpdated).toHaveBeenCalledWith(
        expect.objectContaining({
          participantUid: 'usr_test_123',
          rating: 4,
          tags: ['Backend', 'Júnior'],
        })
      );
    });

    it('exibe mensagem de erro amigável caso submitLead rejeite a requisição', async () => {
      const errSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      mockSubmitLead.mockRejectedValueOnce(new Error('Falha ao sincronizar lead com o servidor'));

      try {
        render(
          React.createElement(SponsorLeadModal, {
            participant: mockParticipant,
            sponsorProfile: mockSponsorProfile,
            isExistingLead: false,
            onClose: () => {},
          })
        );

        const saveBtn = screen.getByRole('button', { name: /salvar lead/i });
        fireEvent.click(saveBtn);

        await waitFor(() => {
          expect(screen.getByText('Falha ao sincronizar lead com o servidor')).toBeDefined();
        });
      } finally {
        errSpy.mockRestore();
      }
    });
  });
});

