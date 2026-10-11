import { describe, it, expect } from 'vitest';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import SponsorSettings from '../../src/components/sponsor/SponsorSettings';
import SponsorWhatsAppHub from '../../src/components/sponsor/SponsorWhatsAppHub';
import SponsorLeadModal from '../../src/components/SponsorLeadModal';

describe('WhatsApp 1-Clique Clarity & Transparency', () => {
  const companyProps = {
    companyId: 'test-sponsor',
    companyName: 'TechCorp',
  };

  describe('SponsorSettings (Configuração de Estande)', () => {
    it('exibe badge de destaque "Padrão 1-Clique" no tab do modelo ativo', () => {
      const html = renderToStaticMarkup(
        React.createElement(SponsorSettings, companyProps)
      );

      expect(html).toContain('Padrão 1-Clique');
      expect(html).toContain('PADRÃO NO 1-CLIQUE ATIVO');
    });

    it('exibe banner educativo explicando o funcionamento do disparo em 1-clique', () => {
      const html = renderToStaticMarkup(
        React.createElement(SponsorSettings, companyProps)
      );

      expect(html).toContain('Este é o Modelo Padrão no 1-Clique');
      expect(html).toContain('WhatsApp 1-Clique');
      expect(html).toContain('dados do estudante preenchidos automaticamente');
    });
  });

  describe('SponsorWhatsAppHub (Hub de Mensagens Rápidas)', () => {
    it('exibe badge visual de "Padrão 1-Clique" no cabeçalho e chip de template', () => {
      const html = renderToStaticMarkup(
        React.createElement(SponsorWhatsAppHub, {
          companyId: 'test-hub-sponsor',
          companyName: 'TechCorp',
          phone: '34999998888',
          participantName: 'Lucas Lima',
          course: 'Sistemas de Informação'
        })
      );

      expect(html).toContain('Padrão 1-Clique:');
      expect(html).toContain('⭐ Padrão');
      expect(html).toContain('Este é o modelo padrão configurado para o 1-Clique rápido');
    });
  });

  describe('SponsorLeadModal (Ações de Contato Rápido & Pós-Salvamento)', () => {
    it('indica claramente o botão WhatsApp 1-Clique com o modelo padrão vinculado', () => {
      const html = renderToStaticMarkup(
        React.createElement(SponsorLeadModal, {
          participant: {
            participantUid: 'part-123',
            name: 'Mariana Silva',
            email: 'mariana@example.com',
            phone: '34988887777',
            course: 'Ciência da Computação'
          },
          sponsorProfile: {
            companyId: 'test-sponsor',
            companyName: 'TechCorp'
          },
          isExistingLead: true,
          onClose: () => {}
        })
      );

      expect(html).toContain('WhatsApp 1-Clique');
      expect(html).toContain('Modelo 1-Clique:');
      expect(html).toContain('Abordagem Geral');
    });
  });
});
