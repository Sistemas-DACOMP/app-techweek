import { describe, it, expect } from 'vitest';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import ParticipantCard, { formatSocialUrl, formatSocialHandle } from '../../src/components/ParticipantCard';

describe('ParticipantCard (KAN-95)', () => {
  describe('formatSocialUrl', () => {
    it('retorna null para valores vazios ou inválidos', () => {
      expect(formatSocialUrl('instagram', null)).toBeNull();
      expect(formatSocialUrl('instagram', '')).toBeNull();
      expect(formatSocialUrl('linkedin', '   ')).toBeNull();
      expect(formatSocialUrl('github', undefined)).toBeNull();
    });

    it('preserva links http e https completos', () => {
      expect(formatSocialUrl('instagram', 'https://instagram.com/erick')).toBe('https://instagram.com/erick');
      expect(formatSocialUrl('linkedin', 'https://linkedin.com/in/erick-raposo')).toBe('https://linkedin.com/in/erick-raposo');
      expect(formatSocialUrl('github', 'https://github.com/erickraposo')).toBe('https://github.com/erickraposo');
    });

    it('formata usernames de Instagram com ou sem @', () => {
      expect(formatSocialUrl('instagram', '@erick.raposo')).toBe('https://instagram.com/erick.raposo');
      expect(formatSocialUrl('instagram', 'erick.raposo')).toBe('https://instagram.com/erick.raposo');
    });

    it('formata perfis de LinkedIn', () => {
      expect(formatSocialUrl('linkedin', 'erick-raposo')).toBe('https://linkedin.com/in/erick-raposo');
      expect(formatSocialUrl('linkedin', 'linkedin.com/in/erick-raposo')).toBe('https://linkedin.com/in/erick-raposo');
    });

    it('formata perfis de GitHub', () => {
      expect(formatSocialUrl('github', 'erickraposo')).toBe('https://github.com/erickraposo');
      expect(formatSocialUrl('github', 'github.com/erickraposo')).toBe('https://github.com/erickraposo');
    });
  });

  describe('formatSocialHandle', () => {
    it('remove @ e extrai handle de URLs', () => {
      expect(formatSocialHandle('instagram', '@erick.raposo')).toBe('erick.raposo');
      expect(formatSocialHandle('instagram', 'https://instagram.com/erick.raposo')).toBe('erick.raposo');
      expect(formatSocialHandle('linkedin', 'https://linkedin.com/in/erick-raposo')).toBe('erick-raposo');
      expect(formatSocialHandle('github', 'https://github.com/erickraposo')).toBe('erickraposo');
    });

    it('retorna string vazia para valores inválidos', () => {
      expect(formatSocialHandle('instagram', null)).toBe('');
      expect(formatSocialHandle('linkedin', '')).toBe('');
    });
  });

  describe('Renderização do Componente ParticipantCard', () => {
    it('renderiza null se nenhum participante for fornecido', () => {
      const html = renderToStaticMarkup(React.createElement(ParticipantCard, { participant: null }));
      expect(html).toBe('');
    });

    it('exibe foto de perfil quando avatarUrl é fornecido', () => {
      const participant = {
        name: 'Erick Raposo',
        username: 'erick_raposo',
        avatarUrl: 'https://example.com/avatar.jpg',
        course: 'Sistemas de Informação',
        period: 4
      };

      const html = renderToStaticMarkup(React.createElement(ParticipantCard, { participant }));
      expect(html).toContain('https://example.com/avatar.jpg');
      expect(html).toContain('alt="Erick Raposo"');
      expect(html).toContain('Erick Raposo');
      expect(html).toContain('@erick_raposo');
      expect(html).toContain('Sistemas de Informação');
      expect(html).toContain('4º período');
    });

    it('exibe iniciais como fallback quando não há foto de perfil', () => {
      const participant = {
        name: 'Lucas Silva',
        username: 'lucas_silva',
        avatarUrl: null,
        course: 'Ciência da Computação'
      };

      const html = renderToStaticMarkup(React.createElement(ParticipantCard, { participant }));
      expect(html).not.toContain('<img');
      expect(html).toContain('LS');
      expect(html).toContain('Lucas Silva');
      expect(html).toContain('@lucas_silva');
    });

    it('renderiza redes sociais no card (Instagram, LinkedIn e GitHub)', () => {
      const participant = {
        name: 'Carlos Santos',
        username: 'carlossantos',
        course: 'Engenharia de Software',
        period: 6,
        participantType: 'Aluno da UFU',
        phone: '34991234567',
        linkedin: 'carlossantos',
        instagram: '@carlos.tech',
        github: 'carlossantos'
      };

      const html = renderToStaticMarkup(React.createElement(ParticipantCard, { participant }));

      // Links sociais e atributos de segurança
      expect(html).toContain('href="https://instagram.com/carlos.tech"');
      expect(html).toContain('href="https://linkedin.com/in/carlossantos"');
      expect(html).toContain('href="https://github.com/carlossantos"');
      expect(html).toContain('target="_blank"');
      expect(html).toContain('rel="noopener noreferrer"');

      // Dados acadêmicos
      expect(html).toContain('Aluno da UFU');
      expect(html).not.toContain('Conversar no WhatsApp');
    });

    it('exibe aviso de ausência de redes sociais se o participante não cadastrou redes nem telefone', () => {
      const participant = {
        name: 'Participante Sem Redes',
        course: 'Engenharia Eletrônica'
      };

      const html = renderToStaticMarkup(React.createElement(ParticipantCard, { participant }));
      expect(html).toContain('Participante não cadastrou redes sociais públicas.');
    });
  });
});
