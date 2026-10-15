import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import WhatsAppButton, { WhatsAppIcon } from './WhatsAppButton';

describe('WhatsAppButton Component (KAN-54)', () => {
  beforeEach(() => {
    vi.stubGlobal('window', { open: vi.fn() });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  describe('Renderização e Atributos', () => {
    it('renderiza botão habilitado com link wa.me válido quando telefone é fornecido', () => {
      const html = renderToStaticMarkup(
        React.createElement(WhatsAppButton, {
          phone: '34999998888',
          participantName: 'Lucas',
          companyName: 'TechCorp',
          label: 'Conversar no WhatsApp'
        })
      );

      expect(html).toContain('whatsapp-button');
      expect(html).toContain('Conversar no WhatsApp');
      expect(html).toContain('title="Abrir conversa no WhatsApp"');
      expect(html).not.toContain('disabled=""');
    });

    it('renderiza desabilitado quando telefone não é fornecido ou é inválido', () => {
      const html = renderToStaticMarkup(
        React.createElement(WhatsAppButton, {
          phone: '',
          label: 'Conversar'
        })
      );

      expect(html).toContain('disabled=""');
      expect(html).toContain('title="Telefone não disponível ou inválido"');
    });

    it('renderiza desabilitado quando a prop disabled é true explicitamente', () => {
      const html = renderToStaticMarkup(
        React.createElement(WhatsAppButton, {
          phone: '34999998888',
          disabled: true
        })
      );

      expect(html).toContain('disabled=""');
    });

    it('aplica largura de 100% quando fullWidth é true', () => {
      const html = renderToStaticMarkup(
        React.createElement(WhatsAppButton, {
          phone: '34999998888',
          fullWidth: true
        })
      );

      expect(html).toContain('width:100%');
    });

    it('renderiza classes adicionais passadas via className', () => {
      const html = renderToStaticMarkup(
        React.createElement(WhatsAppButton, {
          phone: '34999998888',
          className: 'custom-sponsor-btn'
        })
      );

      expect(html).toContain('whatsapp-button custom-sponsor-btn');
    });

    it('renderiza o componente WhatsAppIcon com dimensões e cores SVG', () => {
      const html = renderToStaticMarkup(
        React.createElement(WhatsAppIcon, { size: 24, color: '#25D366' })
      );

      expect(html).toContain('<svg');
      expect(html).toContain('width="24"');
      expect(html).toContain('height="24"');
      expect(html).toContain('fill="#25D366"');
    });
  });

  describe('Interatividade e Eventos de Clique', () => {
    it('dispara onClick e window.open com a URL gerada ao clicar quando disponível', () => {
      const onClick = vi.fn();
      const fakeEvent = { preventDefault: vi.fn() };

      const vdom = WhatsAppButton({
        phone: '34999998888',
        participantName: 'Ana',
        companyName: 'Acme',
        onClick
      });

      vdom.props.onClick(fakeEvent);

      expect(fakeEvent.preventDefault).not.toHaveBeenCalled();
      expect(onClick).toHaveBeenCalledWith(fakeEvent, expect.stringContaining('https://wa.me/5534999998888'));
      expect(window.open).toHaveBeenCalledWith(
        expect.stringContaining('https://wa.me/5534999998888'),
        '_blank',
        'noopener,noreferrer'
      );
    });

    it('impede a ação padrão e não abre janela quando o botão estiver desabilitado', () => {
      const onClick = vi.fn();
      const fakeEvent = { preventDefault: vi.fn() };

      const vdom = WhatsAppButton({
        phone: '',
        onClick
      });

      vdom.props.onClick(fakeEvent);

      expect(fakeEvent.preventDefault).toHaveBeenCalled();
      expect(onClick).not.toHaveBeenCalled();
      expect(window.open).not.toHaveBeenCalled();
    });

    it('impede a ação quando disabled for explicitamente true mesmo com telefone válido', () => {
      const onClick = vi.fn();
      const fakeEvent = { preventDefault: vi.fn() };

      const vdom = WhatsAppButton({
        phone: '34999998888',
        disabled: true,
        onClick
      });

      vdom.props.onClick(fakeEvent);

      expect(fakeEvent.preventDefault).toHaveBeenCalled();
      expect(onClick).not.toHaveBeenCalled();
      expect(window.open).not.toHaveBeenCalled();
    });
  });
});
