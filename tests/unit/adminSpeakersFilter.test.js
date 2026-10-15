import { describe, test, expect, vi } from 'vitest';

vi.mock('../../src/lib/firebase', () => ({ db: {}, auth: {} }));

import { DEFAULT_SPEAKERS, filterSpeakers } from '../../src/lib/activityService';

describe('Aba Palestrantes & Convidados - Admin (KAN-59)', () => {
  test('DEFAULT_SPEAKERS possui classificações e estrutura de redes sociais válidas', () => {
    expect(DEFAULT_SPEAKERS.length).toBeGreaterThan(0);
    
    DEFAULT_SPEAKERS.forEach(speaker => {
      expect(speaker.id).toBeDefined();
      expect(speaker.name).toBeDefined();
      expect(speaker.classification).toBeDefined();
      expect(typeof speaker.socialLinks).toBe('object');
    });
  });

  describe('filterSpeakers', () => {
    test('filtra palestrantes por nome de forma case-insensitive', () => {
      const filtered = filterSpeakers(DEFAULT_SPEAKERS, 'aline', 'ALL');
      expect(filtered.length).toBeGreaterThan(0);
      expect(filtered.every(s => s.name.toLowerCase().includes('aline'))).toBe(true);
    });

    test('filtra palestrantes por instituição', () => {
      const filtered = filterSpeakers(DEFAULT_SPEAKERS, 'DACOMP', 'ALL');
      expect(filtered.length).toBeGreaterThan(0);
      expect(filtered.some(s => (s.institution || '').toLowerCase().includes('dacomp'))).toBe(true);
    });

    test('filtra palestrantes por cargo / role', () => {
      const filtered = filterSpeakers(DEFAULT_SPEAKERS, 'Engenheiro', 'ALL');
      expect(filtered.length).toBeGreaterThan(0);
      expect(filtered.some(s => (s.role || '').toLowerCase().includes('engenheiro'))).toBe(true);
    });

    test('filtra por classificação específica', () => {
      const filtered = filterSpeakers(DEFAULT_SPEAKERS, '', 'Professor UFU');
      expect(filtered.length).toBeGreaterThan(0);
      expect(filtered.every(s => s.classification === 'Professor UFU')).toBe(true);
    });

    test('classificação "ALL" ou vazia não restringe por classificação', () => {
      const allResult = filterSpeakers(DEFAULT_SPEAKERS, '', 'ALL');
      const emptyResult = filterSpeakers(DEFAULT_SPEAKERS, '', '');
      expect(allResult.length).toBe(DEFAULT_SPEAKERS.length);
      expect(emptyResult.length).toBe(DEFAULT_SPEAKERS.length);
    });

    test('combina busca por texto e classificação simultaneamente', () => {
      const filtered = filterSpeakers(DEFAULT_SPEAKERS, 'Aline', 'Professor UFU');
      expect(filtered.length).toBeGreaterThan(0);
      expect(filtered[0].name).toContain('Aline');
      expect(filtered[0].classification).toBe('Professor UFU');

      const noMatch = filterSpeakers(DEFAULT_SPEAKERS, 'Aline', 'Convidado Externo');
      expect(noMatch.length).toBe(0);
    });

    test('retorna array vazio quando nenhum resultado corresponde à busca', () => {
      const filtered = filterSpeakers(DEFAULT_SPEAKERS, 'TextoInexistenteXYZ123', 'ALL');
      expect(filtered).toEqual([]);
    });

    test('lida com lista de palestrantes nula ou indefinida sem quebrar', () => {
      expect(filterSpeakers(null, 'teste')).toEqual([]);
      expect(filterSpeakers(undefined, 'teste')).toEqual([]);
    });

    test('lida com objetos com campos nulos ou indefinidos sem quebrar', () => {
      const malformedSpeakers = [
        { id: '1', name: null, role: undefined, institution: null, classification: null },
        { id: '2', name: 'Alvo', role: null, institution: undefined, classification: 'A' }
      ];
      const filtered = filterSpeakers(malformedSpeakers, 'alvo', 'A');
      expect(filtered.length).toBe(1);
      expect(filtered[0].id).toBe('2');
    });
  });
});
