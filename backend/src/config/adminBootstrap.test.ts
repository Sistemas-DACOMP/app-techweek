import { describe, it, expect, afterEach } from 'vitest';
import { isBootstrapAdmin } from './adminBootstrap';

afterEach(() => {
  delete process.env.ADMIN_BOOTSTRAP_EMAILS;
});

describe('isBootstrapAdmin', () => {
  it('env vazia: ninguém vira ADMIN, nem com e-mail verificado', () => {
    expect(isBootstrapAdmin('a@b.com', true)).toBe(false);
  });
  it('e-mail na env + verificado => true (case/espaços normalizados)', () => {
    process.env.ADMIN_BOOTSTRAP_EMAILS = ' Boss@Example.com , outro@x.com';
    expect(isBootstrapAdmin('boss@example.COM', true)).toBe(true);
  });
  it('e-mail na env mas não verificado => false', () => {
    process.env.ADMIN_BOOTSTRAP_EMAILS = 'boss@example.com';
    expect(isBootstrapAdmin('boss@example.com', false)).toBe(false);
    expect(isBootstrapAdmin('boss@example.com', undefined)).toBe(false);
  });
  it('e-mail fora da lista => false', () => {
    process.env.ADMIN_BOOTSTRAP_EMAILS = 'boss@example.com';
    expect(isBootstrapAdmin('x@example.com', true)).toBe(false);
  });
});
