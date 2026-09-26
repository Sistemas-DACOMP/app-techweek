import { describe, it, expect } from 'vitest';
import { calculateLevel, LEVEL_TIERS } from './level';

describe('calculateLevel (KAN-70)', () => {
  it('deve retornar Nível 1 - Novato para 0 pontos (corrige bug KAN-70)', () => {
    const res = calculateLevel(0);
    expect(res.level).toBe(1);
    expect(res.title).toBe('Novato');
    expect(res.label).toBe('Nível 1 - Novato');
    expect(res.progress).toBe(0);
    expect(res.pointsToNext).toBe(30);
    expect(res.nextLevelPoints).toBe(30);
    expect(res.isMaxLevel).toBe(false);
  });

  it('deve lidar com valores inválidos (null, undefined, string, negativo)', () => {
    expect(calculateLevel(null).level).toBe(1);
    expect(calculateLevel(undefined).level).toBe(1);
    expect(calculateLevel(-50).level).toBe(1);
    expect(calculateLevel('abc').level).toBe(1);
    expect(calculateLevel('45').level).toBe(2);
  });

  it('deve classificar corretamente os limites de cada nível', () => {
    // Nível 1 (0 a 29)
    expect(calculateLevel(29).level).toBe(1);
    expect(calculateLevel(29).title).toBe('Novato');

    // Nível 2 (30 a 69)
    expect(calculateLevel(30).level).toBe(2);
    expect(calculateLevel(30).title).toBe('Explorador');
    expect(calculateLevel(69).level).toBe(2);

    // Nível 3 (70 a 119)
    expect(calculateLevel(70).level).toBe(3);
    expect(calculateLevel(70).title).toBe('Conectado');
    expect(calculateLevel(119).level).toBe(3);

    // Nível 4 (120 a 199)
    expect(calculateLevel(120).level).toBe(4);
    expect(calculateLevel(120).title).toBe('Avançado');
    expect(calculateLevel(199).level).toBe(4);

    // Nível 5 (200+)
    expect(calculateLevel(200).level).toBe(5);
    expect(calculateLevel(200).title).toBe('Expert');
    expect(calculateLevel(350).level).toBe(5);
  });

  it('deve calcular a porcentagem de progresso para o próximo nível com precisão', () => {
    // 15 pontos de um range de 0 a 30 = 50%
    const midLevel1 = calculateLevel(15);
    expect(midLevel1.progress).toBe(50);
    expect(midLevel1.pointsToNext).toBe(15);

    // 50 pontos: range nível 2 vai de 30 a 70 (tamanho 40). Gained = 20 -> 50%
    const midLevel2 = calculateLevel(50);
    expect(midLevel2.progress).toBe(50);
    expect(midLevel2.pointsToNext).toBe(20);
  });

  it('deve indicar nível máximo corretamente no Nível 5', () => {
    const max = calculateLevel(250);
    expect(max.level).toBe(5);
    expect(max.isMaxLevel).toBe(true);
    expect(max.nextLevelPoints).toBeNull();
    expect(max.pointsToNext).toBe(0);
    expect(max.progress).toBe(100);
  });
});

