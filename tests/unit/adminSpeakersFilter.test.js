import { describe, test, expect } from 'vitest';
import { DEFAULT_SPEAKERS } from '../../src/lib/activityService';

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

  test('Filtro de busca por nome e classificação funciona corretamente', () => {
    const search = 'Aline';
    const classification = 'Professor UFU';

    const filtered = DEFAULT_SPEAKERS.filter(spk => {
      const matchText = (spk.name || '').toLowerCase().includes(search.toLowerCase()) ||
                        (spk.institution || '').toLowerCase().includes(search.toLowerCase()) ||
                        (spk.role || '').toLowerCase().includes(search.toLowerCase());
      const matchClass = classification === 'ALL' || spk.classification === classification;
      return matchText && matchClass;
    });

    expect(filtered.length).toBeGreaterThan(0);
    expect(filtered[0].name).toContain('Aline');
  });
});
