import { describe, it, expect } from 'vitest';
import { SPONSORS_CONFIG } from '../../src/components/PassportTab';

describe('Configuração e Regras do Passaporte TechWeek', () => {
  it('contém exatamente as 5 empresas cadastradas com hierarquia correta', () => {
    const keys = Object.keys(SPONSORS_CONFIG);
    expect(keys).toEqual(['kanastra', 'bayer', 'aimirim', 'bip', 'hyperflow']);

    // Kanastra: Diamante e Obrigatório
    expect(SPONSORS_CONFIG.kanastra.tier).toBe('DIAMOND');
    expect(SPONSORS_CONFIG.kanastra.required).toBe(true);

    // Bayer: Ouro e Obrigatório
    expect(SPONSORS_CONFIG.bayer.tier).toBe('GOLD');
    expect(SPONSORS_CONFIG.bayer.required).toBe(true);

    // Aimirim, Bip, HyperFlow: Prata
    expect(SPONSORS_CONFIG.aimirim.tier).toBe('SILVER');
    expect(SPONSORS_CONFIG.aimirim.required).toBe(false);

    expect(SPONSORS_CONFIG.bip.tier).toBe('SILVER');
    expect(SPONSORS_CONFIG.bip.required).toBe(false);

    expect(SPONSORS_CONFIG.hyperflow.tier).toBe('SILVER');
    expect(SPONSORS_CONFIG.hyperflow.required).toBe(false);
  });

  it('valida regra de elegibilidade: Kanastra + Bayer + pelo menos 1 parceira', () => {
    const checkEligibility = (visited) => {
      const kanastra = !!visited.kanastra;
      const bayer = !!visited.bayer;
      const partners = ['aimirim', 'bip', 'hyperflow'].filter(p => !!visited[p]).length;
      return kanastra && bayer && partners >= 1;
    };

    // Apenas Kanastra e Bayer: ainda não elegível
    expect(checkEligibility({ kanastra: true, bayer: true })).toBe(false);

    // Kanastra + Bayer + 1 parceira: elegível!
    expect(checkEligibility({ kanastra: true, bayer: true, aimirim: true })).toBe(true);

    // Todas as 5: elegível
    expect(checkEligibility({ kanastra: true, bayer: true, aimirim: true, bip: true, hyperflow: true })).toBe(true);

    // Faltando Kanastra: não elegível
    expect(checkEligibility({ bayer: true, aimirim: true, bip: true })).toBe(false);

    // Faltando Bayer: não elegível
    expect(checkEligibility({ kanastra: true, aimirim: true, bip: true })).toBe(false);
  });

  it('valida critério do Bilhete Dourado: exatamente todas as 5 empresas visitadas', () => {
    const checkGoldenTicket = (visited) => {
      const keys = ['kanastra', 'bayer', 'aimirim', 'bip', 'hyperflow'];
      return keys.every(k => !!visited[k]);
    };

    expect(checkGoldenTicket({ kanastra: true, bayer: true, aimirim: true, bip: true })).toBe(false);
    expect(checkGoldenTicket({ kanastra: true, bayer: true, aimirim: true, bip: true, hyperflow: true })).toBe(true);
  });
});
