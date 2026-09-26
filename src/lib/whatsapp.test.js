import { describe, it, expect } from 'vitest';
import { 
  sanitizeBrazilianPhone, 
  buildWhatsAppMessage, 
  buildWhatsAppLink 
} from './whatsapp';

describe('whatsapp utility (KAN-54 / REG-WHATSAPP-001)', () => {
  describe('sanitizeBrazilianPhone', () => {
    it('deve formatar número com 11 dígitos (celular com DDD) adicionando 55', () => {
      expect(sanitizeBrazilianPhone('34999998888')).toBe('5534999998888');
    });

    it('deve formatar número com 10 dígitos (fixo com DDD) adicionando 55', () => {
      expect(sanitizeBrazilianPhone('3432123456')).toBe('553432123456');
    });

    it('deve limpar caracteres especiais, parênteses, espaços e traços', () => {
      expect(sanitizeBrazilianPhone('(34) 98888-7777')).toBe('5534988887777');
      expect(sanitizeBrazilianPhone('+55 (34) 91234-5678')).toBe('5534912345678');
      expect(sanitizeBrazilianPhone('55 34 9 9999 0000')).toBe('5534999990000');
    });

    it('deve manter o DDI 55 se o número já possuir 12 ou 13 dígitos iniciando em 55', () => {
      expect(sanitizeBrazilianPhone('5534999998888')).toBe('5534999998888');
      expect(sanitizeBrazilianPhone('553432123456')).toBe('553432123456');
    });

    it('deve aceitar tipos numéricos e convertê-los', () => {
      expect(sanitizeBrazilianPhone(34999998888)).toBe('5534999998888');
    });

    it('deve retornar null para números inválidos, vazios ou incompletos', () => {
      expect(sanitizeBrazilianPhone('')).toBeNull();
      expect(sanitizeBrazilianPhone(null)).toBeNull();
      expect(sanitizeBrazilianPhone(undefined)).toBeNull();
      expect(sanitizeBrazilianPhone('12345')).toBeNull(); // muito curto
      expect(sanitizeBrazilianPhone('999999999999999999')).toBeNull(); // muito longo
      expect(sanitizeBrazilianPhone('abcdefghijk')).toBeNull();
    });
  });

  describe('buildWhatsAppMessage', () => {
    it('deve incluir o nome do participante e o nome da empresa', () => {
      const msg = buildWhatsAppMessage('Ana Clara', 'Kanastra');
      expect(msg).toBe('Olá, Ana Clara! Foi um prazer conversar com você no estande da Kanastra na FACOM TechWeek.');
    });

    it('deve usar fallback se o nome do participante ou empresa não forem fornecidos', () => {
      const msg = buildWhatsAppMessage('', '');
      expect(msg).toBe('Olá, Participante! Foi um prazer conversar com você na FACOM TechWeek.');
    });

    it('deve priorizar customMessage se fornecido', () => {
      const msg = buildWhatsAppMessage('Ana', 'Kanastra', 'Mensagem personalizada de teste!');
      expect(msg).toBe('Mensagem personalizada de teste!');
    });
  });

  describe('buildWhatsAppLink', () => {
    it('deve gerar deep-link completo para wa.me com telefone e texto codificado via encodeURIComponent', () => {
      const url = buildWhatsAppLink('(34) 99999-8888', 'Gabriel', 'Sankhya');
      expect(url).toBe(
        'https://wa.me/5534999998888?text=Ol%C3%A1%2C%20Gabriel!%20Foi%20um%20prazer%20conversar%20com%20voc%C3%AA%20no%20estande%20da%20Sankhya%20na%20FACOM%20TechWeek.'
      );
    });

    it('deve retornar null se o telefone for inválido', () => {
      const url = buildWhatsAppLink('123', 'Gabriel', 'Sankhya');
      expect(url).toBeNull();
    });

    it('deve codificar corretamente caracteres especiais e quebras de linha', () => {
      const url = buildWhatsAppLink('34988881111', 'João', 'Levty', 'Olá! Tudo bem?\nVamos conversar.');
      expect(url).toBe('https://wa.me/5534988881111?text=Ol%C3%A1!%20Tudo%20bem%3F%0AVamos%20conversar.');
    });
  });
});
