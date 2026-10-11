import { describe, it, expect } from 'vitest';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import SponsorSettings from '../../src/components/sponsor/SponsorSettings';
import { DEFAULT_QUALIFICATION_TAGS, DEFAULT_WHATSAPP_TEMPLATES } from '../../src/lib/sponsorSettingsService';

describe('SponsorSettings UI Component', () => {
  const defaultProps = {
    companyId: 'kanastra',
    companyName: 'Kanastra',
    onSettingsSaved: () => {}
  };

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
});
