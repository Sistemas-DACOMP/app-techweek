import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

// Guarda estática (sem emulador): garante que as travas do KAN-124 não somem do arquivo de regras.
// A suíte oficial com emulador e assertFails/assertSucceeds reside em tests/rules/users.test.js e collections.test.js.
const rules = readFileSync(join(__dirname, '../../firestore.rules'), 'utf8');
const usersMatch = rules.match(/match\s+\/users\/\{userId\}\s*\{([\s\S]*?)\n\s*match\s+\//);
const usersBlock = usersMatch ? usersMatch[1] : '';

describe('firestore.rules users (KAN-124 A1)', () => {
  it('create do dono bloqueia vínculo de empresa e termo', () => {
    const createMatch = usersBlock.match(/allow\s+create:\s*if[\s\S]*?(?=allow\s+update)/);
    const create = createMatch ? createMatch[0] : '';
    for (const f of ['sponsorId', 'companyId', 'company', 'empresa', 'companyName', 'sponsorTermsVersion']) {
      expect(create).toMatch(new RegExp(`!\\(\\s*['"]${f}['"]\\s+in\\s+request\\.resource\\.data\\s*\\)`));
    }
  });

  it('delete do dono só sem sponsorId', () => {
    expect(usersBlock).toMatch(/allow\s+delete:\s*if\s+isOwner\(userId\)\s*&&\s*!\(\s*['"]sponsorId['"]\s+in\s+resource\.data\s*\);/);
  });

  it('update do dono bloqueia campos de vínculo', () => {
    const updateMatch = usersBlock.match(/allow\s+update:\s*if[\s\S]*?(?=allow\s+delete)/);
    const update = updateMatch ? updateMatch[0] : '';
    for (const f of ['sponsorId', 'companyId', 'company', 'empresa', 'companyName', 'jobTitle', 'hasSymplaTicket']) {
      expect(update).toContain(`'${f}'`);
    }
  });

  it('sponsors e sponsorInvites sem escrita de client', () => {
    expect(rules).toMatch(/match\s+\/sponsorInvites\/\{inviteId\}\s*\{\s*allow\s+read:\s*if\s+isAdmin\(\);\s*allow\s+write:\s*if\s+false;/);
  });

  it('KAN-137: leitura de /users restrita ao dono, staff ou admin (sem allow read aberto)', () => {
    expect(usersBlock).toMatch(/allow\s+read:\s*if\s+isOwner\(userId\)\s*\|\|\s*isStaffOrAdmin\(\);/);
    expect(usersBlock).not.toMatch(/allow\s+read:\s*if\s+isAuthenticated\(\);/);
  });

  it('KAN-137: coleção /public_profiles aberta para leitura autenticada e bloqueia dados sensíveis', () => {
    const pubMatch = rules.match(/match\s+\/public_profiles\/\{userId\}\s*\{([\s\S]*?)\n\s*match\s+\//);
    const pubBlock = pubMatch ? pubMatch[1] : '';
    expect(pubBlock).toMatch(/allow\s+read:\s*if\s+isAuthenticated\(\);/);
    expect(pubBlock).toMatch(/allow\s+create,\s*update:\s*if\s+\(isOwner\(userId\)\s*\|\|\s*isStaffOrAdmin\(\)\)/);
    for (const forbidden of ['email', 'phone', 'termsAcceptedAt', 'pendingEmailChange', 'symplaTicket']) {
      expect(pubBlock).toMatch(new RegExp(`!\\(\\s*['"]${forbidden}['"]\\s+in\\s+request\\.resource\\.data\\s*\\)`));
    }
  });
});
