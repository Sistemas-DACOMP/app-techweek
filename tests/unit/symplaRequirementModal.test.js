import { describe, it, expect } from 'vitest';
import { SYMPLA_SHEET_Z } from '../../src/components/SymplaRequirementModal';

describe('SymplaRequirementModal (KAN-112)', () => {
  it('fica acima do painel da atividade (z-index 2001) para o aviso aparecer na frente', () => {
    expect(SYMPLA_SHEET_Z).toBeGreaterThan(2001);
  });
});
