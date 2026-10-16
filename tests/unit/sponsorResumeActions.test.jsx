// @vitest-environment happy-dom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import React from 'react';
import { render, screen, cleanup } from '@testing-library/react';

const { mockGetDoc } = vi.hoisted(() => ({
  mockGetDoc: vi.fn(),
}));

vi.mock('../../src/lib/firebase', () => ({
  auth: { currentUser: null },
  db: {},
  storage: {},
}));

vi.mock('firebase/firestore', () => ({
  doc: vi.fn((_db, coll, id) => ({ coll, id })),
  getDoc: (...args) => mockGetDoc(...args),
}));

vi.mock('../../src/lib/sponsorService', () => ({
  submitLead: vi.fn().mockResolvedValue({ success: true, lead: { id: 'lead_1' } }),
  updateLead: vi.fn().mockResolvedValue({ success: true }),
}));

vi.mock('../../src/lib/sponsorSettingsService', () => ({
  getSponsorSettings: vi.fn(() => ({
    tags: [],
    activeTemplateId: 'recruiter_outreach',
    templates: [{ id: 'recruiter_outreach', title: 'Abordagem Geral' }],
  })),
  subscribeToSponsorSettings: vi.fn(() => () => {}),
  saveSponsorSettings: vi.fn(),
  getActiveOutreachMessage: vi.fn(() => 'Olá'),
  interpolateTemplate: vi.fn(() => 'Olá'),
}));

import SponsorLeadModal from '../../src/components/SponsorLeadModal';
import LeadDossier from '../../src/pages/sponsor/LeadDossier';

describe('Ações de Currículo no Painel do Patrocinador (SponsorLeadModal & LeadDossier)', () => {
  beforeEach(() => {
    mockGetDoc.mockReset();
  });

  afterEach(() => {
    cleanup();
  });

  const mockSponsorProfile = {
    companyId: 'kanastra',
    companyName: 'Kanastra',
  };

  describe('SponsorLeadModal', () => {
    it('renderiza opções de Abrir e Baixar currículo no Modo 1 (Ficha Estratégica CRM)', () => {
      const participantWithResume = {
        participantUid: 'usr_candidato_1',
        name: 'Carlos Oliveira',
        email: 'carlos@ufu.br',
        course: 'Ciência da Computação',
        resumeUrl: 'https://firebasestorage.googleapis.com/v0/b/app/o/resumes%2Fusr_candidato_1%2Fcurriculo_carlos.pdf?alt=media',
        resumeName: 'curriculo_carlos.pdf',
        resumeSize: 1048576, // 1.0 MB
        resumeUpdatedAt: '2026-10-16T12:00:00Z',
      };

      render(
        React.createElement(SponsorLeadModal, {
          participant: participantWithResume,
          sponsorProfile: mockSponsorProfile,
          isExistingLead: true, // Modo 1 (CRM view)
          onClose: () => {},
        })
      );

      expect(screen.getByText('Currículo Profissional')).toBeDefined();
      expect(screen.getByText('curriculo_carlos.pdf')).toBeDefined();
      expect(screen.getByText(/1\.0 MB/)).toBeDefined();

      const openLink = screen.getByRole('link', { name: /^abrir$/i });
      expect(openLink.getAttribute('href')).toBe(participantWithResume.resumeUrl);
      expect(openLink.getAttribute('target')).toBe('_blank');
      expect(openLink.getAttribute('rel')).toContain('noopener');

      const downloadLink = screen.getByRole('link', { name: /^baixar$/i });
      expect(downloadLink.getAttribute('href')).toBe(participantWithResume.resumeUrl);
      expect(downloadLink.getAttribute('download')).toBe('curriculo_carlos.pdf');
    });

    it('exibe mensagem indicando ausência de currículo quando o participante não possui arquivo', () => {
      const participantWithoutResume = {
        participantUid: 'usr_sem_curriculo',
        name: 'Juliana Lima',
        email: 'juliana@ufu.br',
        course: 'Sistemas de Informação',
      };

      render(
        React.createElement(SponsorLeadModal, {
          participant: participantWithoutResume,
          sponsorProfile: mockSponsorProfile,
          isExistingLead: true,
          onClose: () => {},
        })
      );

      expect(screen.getByText('Currículo Profissional')).toBeDefined();
      expect(screen.getByText(/nenhum currículo anexado/i)).toBeDefined();
    });

    it('renderiza opções de Abrir e Baixar no Modo 2 (Captura / Formulário) quando o participante tem currículo', () => {
      const participantWithResume = {
        participantUid: 'usr_candidato_2',
        name: 'Mariana Souza',
        email: 'mariana@ufu.br',
        course: 'Engenharia de Computação',
        resumeUrl: 'https://firebasestorage.googleapis.com/v0/b/app/o/resumes%2Fusr_candidato_2%2Fcurriculo_mariana.pdf?alt=media',
        resumeName: 'curriculo_mariana.pdf',
        resumeSize: 524288, // 512.0 KB
      };

      render(
        React.createElement(SponsorLeadModal, {
          participant: participantWithResume,
          sponsorProfile: mockSponsorProfile,
          isExistingLead: false, // Modo 2 (Formulário / Captura)
          onClose: () => {},
        })
      );

      expect(screen.getByText('curriculo_mariana.pdf')).toBeDefined();
      expect(screen.getByText(/512\.0 KB/)).toBeDefined();

      const openLink = screen.getByRole('link', { name: /^abrir$/i });
      expect(openLink.getAttribute('href')).toBe(participantWithResume.resumeUrl);
      expect(openLink.getAttribute('target')).toBe('_blank');

      const downloadLink = screen.getByRole('link', { name: /^baixar$/i });
      expect(downloadLink.getAttribute('href')).toBe(participantWithResume.resumeUrl);
      expect(downloadLink.getAttribute('download')).toBe('curriculo_mariana.pdf');
    });
  });

  describe('LeadDossier', () => {
    it('renderiza Card de Currículo com botões Abrir e Baixar quando o lead possui resumeUrl', () => {
      const mockLead = {
        participantUid: 'usr_candidato_3',
        name: 'Roberto Rocha',
        email: 'roberto@ufu.br',
        course: 'Ciência da Computação',
        rating: 5,
        notes: 'Excelente candidato backend',
        tags: ['Backend', 'Estágio'],
        resumeUrl: 'https://firebasestorage.googleapis.com/v0/b/app/o/resumes%2Fusr_candidato_3%2Fcv_roberto.docx?alt=media',
        resumeName: 'cv_roberto.docx',
        resumeSize: 2097152, // 2.0 MB
        resumeUpdatedAt: '2026-10-15T18:00:00Z',
      };

      render(
        React.createElement(LeadDossier, {
          lead: mockLead,
          companyName: 'Kanastra',
          companyId: 'kanastra',
          tier: 'diamante',
          onUpdate: vi.fn(),
        })
      );

      expect(screen.getByText('Currículo')).toBeDefined();
      expect(screen.getByText('cv_roberto.docx')).toBeDefined();
      expect(screen.getByText(/2\.0 MB/)).toBeDefined();

      const openLink = screen.getByRole('link', { name: /^abrir$/i });
      expect(openLink.getAttribute('href')).toBe(mockLead.resumeUrl);
      expect(openLink.getAttribute('target')).toBe('_blank');
      expect(openLink.getAttribute('rel')).toContain('noopener');

      const downloadLink = screen.getByRole('link', { name: /^baixar$/i });
      expect(downloadLink.getAttribute('href')).toBe(mockLead.resumeUrl);
      expect(downloadLink.getAttribute('download')).toBe('cv_roberto.docx');
    });

    it('exibe estado vazio no LeadDossier quando o lead não possui currículo', () => {
      const mockLeadWithoutResume = {
        participantUid: 'usr_sem_cv',
        name: 'Lucas Pereira',
        email: 'lucas@ufu.br',
        course: 'Sistemas de Informação',
        rating: 3,
        tags: [],
      };

      render(
        React.createElement(LeadDossier, {
          lead: mockLeadWithoutResume,
          companyName: 'Kanastra',
          companyId: 'kanastra',
          tier: 'diamante',
          onUpdate: vi.fn(),
        })
      );

      expect(screen.getByText('Currículo')).toBeDefined();
      expect(screen.getByText(/o participante ainda não anexou um currículo/i)).toBeDefined();
    });
  });
});
