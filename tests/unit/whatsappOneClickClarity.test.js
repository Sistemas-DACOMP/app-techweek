import { describe, it, expect } from 'vitest';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import SponsorSettings from '../../src/components/sponsor/SponsorSettings';
import SponsorWhatsAppHub from '../../src/components/sponsor/SponsorWhatsAppHub';
import SponsorLeadModal from '../../src/components/SponsorLeadModal';

describe('WhatsApp Modelo Padrão Clarity & Design System', () => {
  const companyProps = {
    companyId: 'test-sponsor',
    companyName: 'TechCorp',
  };

  describe('SponsorSettings (Configuração de Estande)', () => {
    it('exibe badge sutil "Padrão" no tab do modelo ativo e status "Modelo Padrão"', () => {
      const html = renderToStaticMarkup(
        React.createElement(SponsorSettings, companyProps)
      );

      expect(html).toContain('Padrão');
      expect(html).toContain('Modelo Padrão');
      // Não deve ter a expressão confusa 1-clique nem emojis
      expect(html).not.toContain('1-Clique');
      expect(html).not.toContain('⭐');
      expect(html).not.toContain('⚡');
    });

    it('não exibe banners prolixos educativos, mantendo interface enxuta', () => {
      const html = renderToStaticMarkup(
        React.createElement(SponsorSettings, companyProps)
      );

      expect(html).not.toContain('Este é o Modelo Padrão no 1-Clique');
      expect(html).not.toContain('Toda vez que qualquer recrutador');
      expect(html).toContain('Modelos de WhatsApp');
      expect(html).toContain('Tags de Qualificação');
    });
  });

  describe('SponsorWhatsAppHub (Hub de Mensagens Rápidas)', () => {
    it('exibe badge visual sóbrio de "Padrão" sem emojis e sem 1-Clique', () => {
      const html = renderToStaticMarkup(
        React.createElement(SponsorWhatsAppHub, {
          companyId: 'test-hub-sponsor',
          companyName: 'TechCorp',
          phone: '34999998888',
          participantName: 'Lucas Lima',
          course: 'Sistemas de Informação'
        })
      );

      expect(html).toContain('Padrão:');
      expect(html).toContain('Modelo padrão configurado');
      expect(html).not.toContain('⭐');
      expect(html).not.toContain('⚡');
      expect(html).not.toContain('1-Clique');
    });
  });

  describe('SponsorLeadModal (Ações de Contato & Outreach)', () => {
    it('exibe o botão WhatsApp limpo com Modelo Padrão sem emojis', () => {
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

      expect(html).toContain('WhatsApp');
      expect(html).toContain('Modelo Padrão:');
      expect(html).toContain('Abordagem Geral');
      expect(html).not.toContain('WhatsApp 1-Clique');
      expect(html).not.toContain('⚡');
      expect(html).not.toContain('⭐');
    });
  });
});
