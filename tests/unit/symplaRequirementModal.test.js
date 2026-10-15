import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';
import { SYMPLA_SHEET_Z } from '../../src/components/SymplaRequirementModal';

describe('SymplaRequirementModal (KAN-112)', () => {
  it('fica acima do painel da atividade (z-index 2001) para o aviso aparecer na frente', () => {
    expect(SYMPLA_SHEET_Z).toBeGreaterThan(2001);
  });

  it('não abre o teclado virtual automaticamente ao montar e ajusta posição com visualViewport quando o teclado abre', () => {
    const filePath = path.resolve(process.cwd(), 'src/components/SymplaRequirementModal.jsx');
    const source = fs.readFileSync(filePath, 'utf-8');

    expect(source).not.toContain('inputRef.current?.focus');
    expect(source).not.toContain('autoFocus');
    expect(source).toContain('visualViewport');
    expect(source).toContain('scrollIntoView');
  });
});
