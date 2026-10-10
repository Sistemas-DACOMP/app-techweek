import { describe, it, expect } from 'vitest';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import SponsorLeadModal, {
  QUICK_RECRUITMENT_TAGS,
  RATING_CLASSIFICATIONS,
  getAffiliationBadge
} from '../../src/components/SponsorLeadModal';

describe('SponsorLeadModal - 5 Melhorias de UX/UI para Estande', () => {
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
      expect(html).toContain('Novo Lead de Estande');
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
    it('no modo de captura imediata (isExistingLead = false), botões são compactos para poupar espaço', () => {
      const html = renderToStaticMarkup(
        React.createElement(SponsorLeadModal, {
          participant: mockParticipant,
          sponsorProfile: mockSponsorProfile,
          isExistingLead: false,
          onClose: () => {}
        })
      );

      // Contém atalho discreto e compacto
      expect(html).toContain('Copiar E-mail');
      expect(html).toContain('WhatsApp');
      // O botão principal de salvar deve estar presente
      expect(html).toContain('Salvar Lead (+50 pts)');
    });

    it('no modo de visualização de lead CRM (isExistingLead = true), ações de contato são completas', () => {
      const html = renderToStaticMarkup(
        React.createElement(SponsorLeadModal, {
          participant: mockParticipant,
          sponsorProfile: mockSponsorProfile,
          isExistingLead: true,
          onClose: () => {}
        })
      );

      expect(html).toContain('Detalhes do Candidato');
      expect(html).toContain('Copiar E-mail');
      expect(html).toContain('Salvar Alterações');
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

  describe('5. Clareza de Gamificação no Botão Salvar', () => {
    it('exibe a micro-legenda de gamificação informando o crédito de +50 pontos no passaporte', () => {
      const html = renderToStaticMarkup(
        React.createElement(SponsorLeadModal, {
          participant: mockParticipant,
          sponsorProfile: mockSponsorProfile,
          isExistingLead: false,
          onClose: () => {}
        })
      );

      expect(html).toContain('🎉 Concede +50 pontos no passaporte do aluno no estande Kanastra');
    });

    it('não exibe micro-legenda de crédito de pontos na edição de lead já existente no CRM', () => {
      const html = renderToStaticMarkup(
        React.createElement(SponsorLeadModal, {
          participant: mockParticipant,
          sponsorProfile: mockSponsorProfile,
          isExistingLead: true,
          onClose: () => {}
        })
      );

      expect(html).not.toContain('🎉 Concede +50 pontos no passaporte do aluno');
    });
  });

  describe('Afiliação Acadêmica (Graduação / Pós / Externo)', () => {
    it('identifica corretamente os diferentes tipos de vínculo', () => {
      expect(getAffiliationBadge({ participantType: 'Graduação' }).label).toBe('Graduação');
      expect(getAffiliationBadge({ participantType: 'Pós-Graduação' }).label).toBe('Pós-Graduação');
      expect(getAffiliationBadge({ participantType: 'Comunidade Externa' }).label).toBe('Externo');
    });
  });
});
