import { describe, it, expect } from 'vitest';
import { CATEGORY_STYLES, STATUS_STYLES } from '../components/Badge';
import { formatActivityType } from './activityService';

describe('Design Tokens & Semantic Styling System', () => {
  it('contém definições completas e de alto contraste para todas as categorias de eventos', () => {
    const requiredCategories = ['palestra', 'minicurso', 'workshop', 'ativacao'];

    requiredCategories.forEach((cat) => {
      const config = CATEGORY_STYLES[cat];
      expect(config).toBeDefined();
      expect(config.label).toBeTypeOf('string');
      expect(config.accent).toMatch(/^#[0-9A-Fa-f]{6}$/);
      expect(config.bg).toMatch(/^#[0-9A-Fa-f]{6}$/);
      expect(config.text).toMatch(/^#[0-9A-Fa-f]{6}$/);
      expect(config.border).toMatch(/^#[0-9A-Fa-f]{6}$/);
      expect(config.icon).toBeDefined();
    });
  });

  it('contém estados de presença calibrados (BOOKED, CHECKED_IN, COMPLETED)', () => {
    const requiredStatuses = ['BOOKED', 'CHECKED_IN', 'COMPLETED', 'WAITING_LIST'];

    requiredStatuses.forEach((st) => {
      const config = STATUS_STYLES[st];
      expect(config).toBeDefined();
      expect(config.label).toBeTypeOf('string');
      expect(config.text).toBeTypeOf('string');
      expect(config.bg).toBeTypeOf('string');
      expect(config.border).toBeTypeOf('string');
      expect(config.icon).toBeDefined();
    });
  });

  it('mantém sincronia com formatActivityType do activityService', () => {
    const lecture = formatActivityType('palestra');
    expect(lecture.label).toBe('Palestra');
    expect(lecture.color.toLowerCase()).toBe(CATEGORY_STYLES.palestra.accent.toLowerCase());

    const workshop = formatActivityType('workshop');
    expect(workshop.label).toBe('Workshop');
    expect(workshop.color.toLowerCase()).toBe(CATEGORY_STYLES.workshop.accent.toLowerCase());
  });
});
