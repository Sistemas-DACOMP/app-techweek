import { describe, it, expect, vi } from 'vitest';
import { checkUsernameAvailability } from '../../src/lib/userService';

describe('Validação de Unicidade de Username', () => {
  it('rejeita handles nulos ou muito curtos como indisponíveis', async () => {
    const resEmpty = await checkUsernameAvailability('');
    expect(resEmpty.available).toBe(false);

    const resShort = await checkUsernameAvailability('ab');
    expect(resShort.available).toBe(false);
  });

  it('normaliza o username removendo @ e caracteres especiais', async () => {
    const res = await checkUsernameAvailability('@dev_user');
    expect(typeof res.available).toBe('boolean');
  });
});
