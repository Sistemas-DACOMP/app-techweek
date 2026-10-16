// @vitest-environment happy-dom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';

vi.mock('../../src/lib/firebase', () => ({
  auth: {},
  db: {},
  storage: {},
}));

vi.mock('../../src/lib/feedService', () => ({
  uploadFeedMedia: vi.fn(),
}));

vi.mock('../../src/lib/sponsorService', () => ({
  submitLead: vi.fn(),
  updateLead: vi.fn(),
}));

import SponsorSettings from '../../src/components/sponsor/SponsorSettings';
import LeadDossier from '../../src/pages/sponsor/LeadDossier';
import SponsorLeadModal from '../../src/components/SponsorLeadModal';

describe('WhatsApp Modelo Padrão Clarity & Design System', () => {
  const companyProps = {
    companyId: 'test-sponsor',
    companyName: 'TechCorp',
  };

  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
  });

  afterEach(() => {
    cleanup();
  });

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

  describe('LeadDossier (Mensagem pronta)', () => {
    it('exibe "Padrão" sóbrio no modelo ativo, sem emojis e sem 1-Clique', () => {
      const html = renderToStaticMarkup(
        React.createElement(LeadDossier, {
          lead: { participantUid: 'p1', name: 'Lucas Lima', phone: '34999998888', course: 'Sistemas de Informação', rating: 4, tags: [] },
          companyId: 'test-hub-sponsor',
          companyName: 'TechCorp',
          onUpdate: async () => {},
        })
      );

      expect(html).toContain('Mensagem pronta');
      expect(html).toContain('Padrão');
      expect(html).toContain('Enviar pelo WhatsApp');
      expect(html).not.toContain('⭐');
      expect(html).not.toContain('⚡');
      expect(html).not.toContain('1-Clique');
    });

    it('dispara window.open com URL wa.me codificada e variáveis interpoladas ao clicar em "Enviar pelo WhatsApp" ou alternar modelo (ERR-053)', () => {
      const openSpy = vi.fn();
      window.open = openSpy;

      render(
        React.createElement(LeadDossier, {
          lead: {
            participantUid: 'p1',
            name: 'Lucas Lima',
            phone: '(34) 99999-8888',
            course: 'Sistemas de Informação',
            rating: 4,
            tags: [],
          },
          companyId: 'test-hub-sponsor',
          companyName: 'TechCorp',
          onUpdate: async () => {},
        })
      );

      // Clica com o modelo padrão ativo ("Abordagem Geral")
      const sendBtn = screen.getByRole('button', { name: /enviar pelo whatsapp/i });
      fireEvent.click(sendBtn);

      expect(openSpy).toHaveBeenCalledTimes(1);
      const [firstUrl, target, rel] = openSpy.mock.calls[0];
      expect(target).toBe('_blank');
      expect(rel).toBe('noopener,noreferrer');
      expect(firstUrl).toMatch(/^https:\/\/wa\.me\/5534999998888\?text=/);
      const decodedFirst = decodeURIComponent(firstUrl.split('?text=')[1]);
      expect(decodedFirst).toContain('Olá, Lucas!');
      expect(decodedFirst).toContain('TechCorp');
      expect(decodedFirst).toContain('Sistemas de Informação');

      // Alterna para o modelo "Convite para Bate-papo"
      const inviteRadio = screen.getByRole('radio', { name: /convite para bate-papo/i });
      fireEvent.click(inviteRadio);
      fireEvent.click(sendBtn);

      expect(openSpy).toHaveBeenCalledTimes(2);
      const [secondUrl] = openSpy.mock.calls[1];
      const decodedSecond = decodeURIComponent(secondUrl.split('?text=')[1]);
      expect(decodedSecond).toContain('Olá, Lucas!');
      expect(decodedSecond).toContain('bate-papo técnico rápido de 15 minutos');
      expect(decodedSecond).toContain('TechCorp');
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
            course: 'Ciência da Computação',
          },
          sponsorProfile: {
            companyId: 'test-sponsor',
            companyName: 'TechCorp',
          },
          isExistingLead: true,
          onClose: () => {},
        })
      );

      expect(html).toContain('WhatsApp');
      expect(html).toContain('Modelo Padrão:');
      expect(html).toContain('Abordagem Geral');
      expect(html).not.toContain('WhatsApp 1-Clique');
      expect(html).not.toContain('⚡');
      expect(html).not.toContain('⭐');
    });

    it('abre conversa no WhatsApp com mensagem do Modelo Padrão interpolada ao clicar no botão WhatsApp no modal (ERR-053)', () => {
      const openSpy = vi.fn();
      window.open = openSpy;

      render(
        React.createElement(SponsorLeadModal, {
          participant: {
            participantUid: 'part-123',
            name: 'Mariana Silva',
            email: 'mariana@example.com',
            phone: '34988887777',
            course: 'Ciência da Computação',
          },
          sponsorProfile: {
            companyId: 'test-sponsor',
            companyName: 'TechCorp',
          },
          isExistingLead: true,
          onClose: () => {},
        })
      );

      const whatsappBtn = screen.getByRole('button', { name: /^whatsapp$/i });
      fireEvent.click(whatsappBtn);

      expect(openSpy).toHaveBeenCalledTimes(1);
      const [calledUrl, target, rel] = openSpy.mock.calls[0];
      expect(target).toBe('_blank');
      expect(rel).toBe('noopener,noreferrer');
      expect(calledUrl).toMatch(/^https:\/\/wa\.me\/5534988887777\?text=/);

      const decodedMsg = decodeURIComponent(calledUrl.split('?text=')[1]);
      expect(decodedMsg).toContain('Olá, Mariana!');
      expect(decodedMsg).toContain('estande da TechCorp na FACOM TechWeek');
      expect(decodedMsg).toContain('Ciência da Computação');
    });
  });
});

