import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

// Guarda estática (sem emulador): garante que as travas do KAN-124 não somem do arquivo de regras.
const rules = readFileSync(join(__dirname, '../../firestore.rules'), 'utf8');
const usersBlock = rules.slice(rules.indexOf('match /users/{userId}'), rules.indexOf('match /symplaTickets'));

describe('firestore.rules users (KAN-124 A1)', () => {
  it('create do dono bloqueia vínculo de empresa e termo', () => {
    const create = usersBlock.slice(usersBlock.indexOf('allow create'), usersBlock.indexOf('allow update'));
    for (const f of ['sponsorId', 'companyId', 'company', 'empresa', 'companyName', 'termsAcceptedAt']) {
      expect(create).toContain(`!('${f}' in request.resource.data)`);
    }
  });

  it('delete do dono só sem sponsorId', () => {
    expect(usersBlock).toMatch(/allow delete: if isOwner\(userId\) && !\('sponsorId' in resource\.data\);/);
  });

  it('update do dono bloqueia campos de vínculo', () => {
    const update = usersBlock.slice(usersBlock.indexOf('allow update'), usersBlock.indexOf('allow delete'));
    for (const f of ['sponsorId', 'companyId', 'company', 'empresa', 'companyName', 'jobTitle', 'hasSymplaTicket']) {
      expect(update).toContain(`'${f}'`);
    }
  });

  it('sponsors e sponsorInvites sem escrita de client', () => {
    expect(rules).toMatch(/match \/sponsorInvites\/\{inviteId\} \{\s*allow read: if isAdmin\(\);\s*allow write: if false;/);
  });
});
