import { describe, it, expect } from 'vitest';

// Atalhos de simulação só valem no build de dev; parâmetro de URL não pode liberar nada em produção.
const sources = import.meta.glob(['../**/*.js', '../**/*.jsx', '!../**/*.test.*'], { query: '?raw', import: 'default', eager: true });

describe('atalhos de demonstração', () => {
  it('nenhum arquivo de src/ lê ?demo=true da URL', () => {
    const offenders = Object.entries(sources).filter(([, code]) => /location\.search.*demo/.test(code)).map(([f]) => f);
    expect(offenders).toEqual([]);
  });
  it('nenhuma tela mostra entrada de teste simulada', () => {
    const offenders = Object.entries(sources).filter(([, code]) => /\[TESTE\]/.test(code)).map(([f]) => f);
    expect(offenders).toEqual([]);
  });
});
