// @vitest-environment happy-dom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';

vi.mock('../../src/lib/firebase', () => ({
  db: {},
  storage: {},
  auth: {},
}));

vi.mock('../../src/lib/feedService', () => ({
  uploadFeedMedia: vi.fn().mockResolvedValue({ url: 'https://cdn.exemplo.com/avatar.webp' }),
}));

import SponsorSettings from '../../src/components/sponsor/SponsorSettings';
import {
  DEFAULT_QUALIFICATION_TAGS,
  DEFAULT_WHATSAPP_TEMPLATES,
  getSponsorSettings,
} from '../../src/lib/sponsorSettingsService';

describe('SponsorSettings UI Component', () => {
  const defaultProps = {
    companyId: 'kanastra',
    companyName: 'Kanastra',
    onSettingsSaved: () => {}
  };

  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
  });

  afterEach(() => {
    cleanup();
  });

  describe('Estrutura e Acessibilidade Geral', () => {
    it('renderiza o cabeçalho e descrição do painel de configurações', () => {
      const html = renderToStaticMarkup(
        React.createElement(SponsorSettings, defaultProps)
      );

      expect(html).toContain('Personalização do Estande');
      expect(html).toContain('Kanastra');
      expect(html).toContain('Perfil no Feed');
      expect(html).toContain('Mensagens &amp; Tags');
      expect(html).toContain('Modelos de WhatsApp');
      expect(html).toContain('Tags de Qualificação');
      // Design enxuto sem ruído visual
      expect(html).not.toContain('1-Clique');
      expect(html).not.toContain('⭐');
    });
  });

  describe('Aba: Perfil Público no Feed (Avatar e @handle)', () => {
    it('renderiza o campo de @ Identificador no Feed e o prefixo @', () => {
      const html = renderToStaticMarkup(
        React.createElement(SponsorSettings, defaultProps)
      );

      expect(html).toContain('@ Identificador no Feed');
      expect(html).toContain('id="feed-handle-input"');
      expect(html).toContain('Como os participantes verão sua empresa no Feed');
    });

    it('renderiza o campo de Nome de Exibição no Feed', () => {
      const html = renderToStaticMarkup(
        React.createElement(SponsorSettings, defaultProps)
      );

      expect(html).toContain('Nome de Exibição no Feed');
      expect(html).toContain('id="feed-display-name-input"');
    });

    it('renderiza os botões de ação e upload de foto de perfil', () => {
      const html = renderToStaticMarkup(
        React.createElement(SponsorSettings, {
          ...defaultProps,
          sponsorLogo: 'https://exemplo.com/logo.png',
        })
      );

      expect(html).toContain('Foto de Perfil (Avatar)');
      expect(html).toContain('Enviar foto');
      expect(html).toContain('Usar logo oficial');
      expect(html).toContain('Salvar Perfil do Feed');
      expect(html).toContain('Restaurar perfil padrão');
    });

    it('renderiza o card de pré-visualização ao vivo de post do Feed', () => {
      const html = renderToStaticMarkup(
        React.createElement(SponsorSettings, {
          ...defaultProps,
          sponsorTier: 'DIAMOND',
        })
      );

      expect(html).toContain('Pré-visualização no Feed');
      expect(html).toContain('Patrocinador Diamante');
      expect(html).toContain('@kanastra');
      expect(html).toContain('Agora');
    });
  });

  describe('Bloco A: Customização de Modelos de WhatsApp', () => {
    it('renderiza os 4 modelos padrão de mensagens WhatsApp', () => {
      const html = renderToStaticMarkup(
        React.createElement(SponsorSettings, defaultProps)
      );

      DEFAULT_WHATSAPP_TEMPLATES.forEach(tpl => {
        expect(html).toContain(tpl.title.replace(/\s*\(Padrão\)/i, ''));
      });
    });

    it('renderiza os chips de variáveis dinâmicas {nome}, {empresa} e {curso}', () => {
      const html = renderToStaticMarkup(
        React.createElement(SponsorSettings, defaultProps)
      );

      expect(html).toContain('{nome}');
      expect(html).toContain('{empresa}');
      expect(html).toContain('{curso}');
      expect(html).toContain('Inserir variável no texto');
    });

    it('renderiza o balão de preview realista de WhatsApp com cabeçalho de simulação', () => {
      const html = renderToStaticMarkup(
        React.createElement(SponsorSettings, defaultProps)
      );

      expect(html).toContain('Pré-visualização (WhatsApp)');
      expect(html).toContain('Gabriel Santos');
      // Background do balão WhatsApp em tom esmeralda escuro
      expect(html).toContain('#005C4B');
    });

    it('oferece botão para restaurar modelo padrão da mensagem', () => {
      const html = renderToStaticMarkup(
        React.createElement(SponsorSettings, defaultProps)
      );

      expect(html).toContain('Restaurar texto original');
    });
  });

  describe('Bloco B: Gerenciador de Tags de Qualificação', () => {
    it('renderiza todas as 8 tags de qualificação padrão como chips interativos', () => {
      const html = renderToStaticMarkup(
        React.createElement(SponsorSettings, defaultProps)
      );

      DEFAULT_QUALIFICATION_TAGS.forEach(tag => {
        expect(html).toContain(tag);
      });
      expect(html).toContain('8 tags');
    });

    it('renderiza campo de input e botão para adicionar novas tags com tecla Enter', () => {
      const html = renderToStaticMarkup(
        React.createElement(SponsorSettings, defaultProps)
      );

      expect(html).toContain('placeholder="Nova tag (ex: IA, Frontend)..."');
      expect(html).toContain('Adicionar');
    });

    it('renderiza botão para restaurar tags originais recomendadas', () => {
      const html = renderToStaticMarkup(
        React.createElement(SponsorSettings, defaultProps)
      );

      expect(html).toContain('Restaurar tags padrão');
    });

    it('possui ações de clique acessíveis com touch targets mínimos de 44px', () => {
      const html = renderToStaticMarkup(
        React.createElement(SponsorSettings, defaultProps)
      );

      // Botões e inputs de ação possuem min-h-[44px]
      expect(html).toContain('min-h-[44px]');
    });
  });

  describe('Interações Reais do Usuário — Abas, Perfil no Feed, Templates e Tags (ERR-045)', () => {
    it('alterna entre abas e salva alterações no Perfil do Feed com sanitização do @handle', () => {
      const onSettingsSaved = vi.fn();
      const { container } = render(
        React.createElement(SponsorSettings, {
          ...defaultProps,
          onSettingsSaved,
        })
      );

      const handleInput = container.querySelector('#feed-handle-input');
      const displayNameInput = container.querySelector('#feed-display-name-input');

      fireEvent.change(handleInput, { target: { value: 'Kanastra Tech!!' } });
      fireEvent.change(displayNameInput, { target: { value: 'Kanastra Oficial' } });

      const saveFeedBtn = screen.getByRole('button', { name: /salvar perfil do feed/i });
      fireEvent.click(saveFeedBtn);

      expect(onSettingsSaved).toHaveBeenCalledTimes(1);
      const saved = getSponsorSettings('kanastra');
      expect(saved.feedProfile.handle).toBe('@kanastratech');
      expect(saved.feedProfile.displayName).toBe('Kanastra Oficial');
    });

    it('adiciona nova tag, remove tag existente e restaura tags padrão na aba Mensagens & Tags', () => {
      const onSettingsSaved = vi.fn();
      render(
        React.createElement(SponsorSettings, {
          ...defaultProps,
          defaultSection: 'messages_tags',
          onSettingsSaved,
        })
      );

      const tagInput = screen.getByPlaceholderText(/nova tag \(ex: ia, frontend\)/i);
      fireEvent.change(tagInput, { target: { value: 'Python' } });

      const addBtn = screen.getByRole('button', { name: /adicionar/i });
      fireEvent.click(addBtn);

      expect(getSponsorSettings('kanastra').tags).toContain('Python');
      expect(onSettingsSaved).toHaveBeenLastCalledWith(
        expect.objectContaining({
          tags: expect.arrayContaining(['Python']),
        })
      );

      const removePythonBtn = screen.getByRole('button', { name: 'Remover tag Python' });
      fireEvent.click(removePythonBtn);
      expect(getSponsorSettings('kanastra').tags).not.toContain('Python');

      // Remove mais uma tag e restaura o padrão
      fireEvent.click(screen.getByRole('button', { name: `Remover tag ${DEFAULT_QUALIFICATION_TAGS[0]}` }));
      expect(getSponsorSettings('kanastra').tags.length).toBe(DEFAULT_QUALIFICATION_TAGS.length - 1);

      fireEvent.click(screen.getByRole('button', { name: /restaurar tags padrão/i }));
      expect(getSponsorSettings('kanastra').tags).toEqual(DEFAULT_QUALIFICATION_TAGS);
    });

    it('edita o texto de um modelo de WhatsApp, insere variável dinâmica e salva configurações', () => {
      const onSettingsSaved = vi.fn();
      const { container } = render(
        React.createElement(SponsorSettings, {
          ...defaultProps,
          defaultSection: 'messages_tags',
          onSettingsSaved,
        })
      );

      const editor = container.querySelector('#template-text-editor');
      fireEvent.change(editor, {
        target: { value: 'Olá {nome}, gostamos do seu perfil na {empresa}!' },
      });

      const cursoVarBtn = screen.getByTitle('Insere o curso do aluno');
      fireEvent.click(cursoVarBtn);

      expect(editor.value).toContain('{curso}');

      const saveTplBtn = screen.getByRole('button', { name: /salvar alterações/i });
      fireEvent.click(saveTplBtn);

      const saved = getSponsorSettings('kanastra');
      const activeTpl = saved.templates.find((t) => t.id === 'recruiter_outreach');
      expect(activeTpl.text).toContain('Olá {nome}, gostamos do seu perfil na {empresa}!');
      expect(activeTpl.text).toContain('{curso}');
      expect(onSettingsSaved).toHaveBeenCalled();
    });
  });
});

