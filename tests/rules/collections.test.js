import { describe, it, beforeAll, afterAll, beforeEach } from 'vitest';
import { initializeTestEnvironment, assertFails, assertSucceeds } from '@firebase/rules-unit-testing';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import fs from 'node:fs';

const PROJECT_ID = 'facom-techweek-test-collections';

describe('Regras de Segurança do Firestore — Coleções Complementares (ERR-089)', () => {
  let testEnv;

  beforeAll(async () => {
    const rules = fs.readFileSync('firestore.rules', 'utf8');
    testEnv = await initializeTestEnvironment({
      projectId: PROJECT_ID,
      firestore: {
        rules,
        host: '127.0.0.1',
        port: 8080,
      },
    });
  });

  afterAll(async () => {
    if (testEnv) {
      await testEnv.cleanup();
    }
  });

  beforeEach(async () => {
    if (testEnv) {
      await testEnv.clearFirestore();
    }
  });

  async function seedDoc(collectionPath, docId, data) {
    await testEnv.withSecurityRulesDisabled(async (context) => {
      const db = context.firestore();
      await setDoc(doc(db, collectionPath, docId), data);
    });
  }

  // 1. /symplaTickets/{ticketId}
  describe('Coleção /symplaTickets (read, write: false)', () => {
    it('bloqueia leitura e escrita para anônimo, autenticado e admin via client SDK', async () => {
      await seedDoc('symplaTickets', 'ticket-1', { ticketNumber: '12345' });

      const unauthDb = testEnv.unauthenticatedContext().firestore();
      const authDb = testEnv.authenticatedContext('user-1', { email: 'user@ufu.br', email_verified: true }).firestore();
      const adminDb = testEnv.authenticatedContext('admin-1', { role: 'ADMIN', email_verified: true }).firestore();

      await assertFails(getDoc(doc(unauthDb, 'symplaTickets', 'ticket-1')));
      await assertFails(getDoc(doc(authDb, 'symplaTickets', 'ticket-1')));
      await assertFails(getDoc(doc(adminDb, 'symplaTickets', 'ticket-1')));

      await assertFails(setDoc(doc(authDb, 'symplaTickets', 'ticket-2'), { ticketNumber: '999' }));
      await assertFails(setDoc(doc(adminDb, 'symplaTickets', 'ticket-2'), { ticketNumber: '999' }));
    });
  });

  // 2. /mission_secrets/{missionId}
  describe('Coleção /mission_secrets (read, write: false)', () => {
    it('bloqueia leitura e escrita para todos via client SDK', async () => {
      await seedDoc('mission_secrets', 'mission-1', { secretWord: 'TECH2026' });

      const authDb = testEnv.authenticatedContext('user-1', { email: 'user@ufu.br', email_verified: true }).firestore();
      const adminDb = testEnv.authenticatedContext('admin-1', { role: 'ADMIN', email_verified: true }).firestore();

      await assertFails(getDoc(doc(authDb, 'mission_secrets', 'mission-1')));
      await assertFails(getDoc(doc(adminDb, 'mission_secrets', 'mission-1')));
      await assertFails(setDoc(doc(adminDb, 'mission_secrets', 'mission-2'), { secretWord: 'TEST' }));
    });
  });

  // 3. /sponsors/{sponsorId} e /members/{memberUid}
  describe('Coleção /sponsors e subcoleção /members', () => {
    it('leitura permitida para ADMIN ou membro do patrocinador; negada para usuário comum', async () => {
      await seedDoc('sponsors', 'sponsor-1', { name: 'Empresa Alpha' });
      await seedDoc('sponsors/sponsor-1/members', 'member-1', { uid: 'member-1', role: 'SPONSOR' });

      const userDb = testEnv.authenticatedContext('user-outra-empresa', { email: 'outro@ufu.br', email_verified: true }).firestore();
      const memberDb = testEnv.authenticatedContext('member-1', { email: 'membro@alpha.com', email_verified: true }).firestore();
      const adminDb = testEnv.authenticatedContext('admin-1', { role: 'ADMIN', email_verified: true }).firestore();

      await assertFails(getDoc(doc(userDb, 'sponsors', 'sponsor-1')));
      await assertSucceeds(getDoc(doc(memberDb, 'sponsors', 'sponsor-1')));
      await assertSucceeds(getDoc(doc(adminDb, 'sponsors', 'sponsor-1')));
    });

    it('subcoleção /members: membro lê seu próprio doc ou admin; outro usuário falha', async () => {
      await seedDoc('sponsors/sponsor-1/members', 'member-1', { uid: 'member-1' });

      const userDb = testEnv.authenticatedContext('user-qualquer', { email: 'outro@ufu.br' }).firestore();
      const memberDb = testEnv.authenticatedContext('member-1', { email: 'member@alpha.com' }).firestore();
      const adminDb = testEnv.authenticatedContext('admin-1', { role: 'ADMIN' }).firestore();

      await assertFails(getDoc(doc(userDb, 'sponsors/sponsor-1/members', 'member-1')));
      await assertSucceeds(getDoc(doc(memberDb, 'sponsors/sponsor-1/members', 'member-1')));
      await assertSucceeds(getDoc(doc(adminDb, 'sponsors/sponsor-1/members', 'member-1')));
    });

    it('escrita em /sponsors ou /members é bloqueada via client SDK (só backend)', async () => {
      const adminDb = testEnv.authenticatedContext('admin-1', { role: 'ADMIN' }).firestore();
      await assertFails(setDoc(doc(adminDb, 'sponsors', 'sponsor-novo'), { name: 'Novo' }));
      await assertFails(setDoc(doc(adminDb, 'sponsors/sponsor-1/members', 'member-novo'), { uid: 'novo' }));
    });
  });

  // 4. /sponsorInvites/{inviteId}
  describe('Coleção /sponsorInvites', () => {
    it('leitura permitida apenas para ADMIN; escrita bloqueada para todos via client', async () => {
      await seedDoc('sponsorInvites', 'invite-1', { email: 'patrocinador@corp.com', tokenHash: 'abc' });

      const userDb = testEnv.authenticatedContext('user-1', { email: 'user@ufu.br' }).firestore();
      const adminDb = testEnv.authenticatedContext('admin-1', { role: 'ADMIN' }).firestore();

      await assertFails(getDoc(doc(userDb, 'sponsorInvites', 'invite-1')));
      await assertSucceeds(getDoc(doc(adminDb, 'sponsorInvites', 'invite-1')));
      await assertFails(setDoc(doc(adminDb, 'sponsorInvites', 'invite-2'), { tokenHash: 'xyz' }));
    });
  });

  // 5. /activities/{activityId}
  describe('Coleção /activities', () => {
    it('leitura permitida para qualquer autenticado; anônimo falha', async () => {
      await seedDoc('activities', 'act-1', { title: 'Workshop de Vitest' });

      const unauthDb = testEnv.unauthenticatedContext().firestore();
      const authDb = testEnv.authenticatedContext('user-1', { email: 'user@ufu.br' }).firestore();

      await assertFails(getDoc(doc(unauthDb, 'activities', 'act-1')));
      await assertSucceeds(getDoc(doc(authDb, 'activities', 'act-1')));
    });

    it('escrita permitida apenas para ADMIN', async () => {
      const userDb = testEnv.authenticatedContext('user-1', { email: 'user@ufu.br' }).firestore();
      const adminDb = testEnv.authenticatedContext('admin-1', { role: 'ADMIN' }).firestore();

      await assertFails(setDoc(doc(userDb, 'activities', 'act-novo'), { title: 'Nova' }));
      await assertSucceeds(setDoc(doc(adminDb, 'activities', 'act-novo'), { title: 'Nova' }));
    });
  });

  // 6. /missions/{missionId}
  describe('Coleção /missions', () => {
    it('leitura autenticada permitida; anônimo falha', async () => {
      await seedDoc('missions', 'mis-1', { title: 'Encontre o QR Code' });

      const unauthDb = testEnv.unauthenticatedContext().firestore();
      const authDb = testEnv.authenticatedContext('user-1', { email: 'user@ufu.br' }).firestore();

      await assertFails(getDoc(doc(unauthDb, 'missions', 'mis-1')));
      await assertSucceeds(getDoc(doc(authDb, 'missions', 'mis-1')));
    });

    it('escrita permitida apenas para ADMIN', async () => {
      const userDb = testEnv.authenticatedContext('user-1', { email: 'user@ufu.br' }).firestore();
      const adminDb = testEnv.authenticatedContext('admin-1', { role: 'ADMIN' }).firestore();

      await assertFails(setDoc(doc(userDb, 'missions', 'mis-novo'), { title: 'Nova' }));
      await assertSucceeds(setDoc(doc(adminDb, 'missions', 'mis-novo'), { title: 'Nova' }));
    });
  });

  // 7. /announcements/{announcementId}
  describe('Coleção /announcements', () => {
    it('leitura autenticada permitida; anônimo falha', async () => {
      await seedDoc('announcements', 'ann-1', { message: 'Início da abertura' });

      const unauthDb = testEnv.unauthenticatedContext().firestore();
      const authDb = testEnv.authenticatedContext('user-1', { email: 'user@ufu.br' }).firestore();

      await assertFails(getDoc(doc(unauthDb, 'announcements', 'ann-1')));
      await assertSucceeds(getDoc(doc(authDb, 'announcements', 'ann-1')));
    });

    it('escrita permitida apenas para ADMIN', async () => {
      const userDb = testEnv.authenticatedContext('user-1', { email: 'user@ufu.br' }).firestore();
      const adminDb = testEnv.authenticatedContext('admin-1', { role: 'ADMIN' }).firestore();

      await assertFails(setDoc(doc(userDb, 'announcements', 'ann-novo'), { message: 'Aviso' }));
      await assertSucceeds(setDoc(doc(adminDb, 'announcements', 'ann-novo'), { message: 'Aviso' }));
    });
  });

  // 8. /leads/{sponsorId}/contacts/{contactId}
  describe('Coleção /leads/{sponsorId}/contacts/{contactId}', () => {
    it('leitura permitida para o próprio sponsor dono (uid == sponsorId) ou ADMIN; outros falham', async () => {
      await seedDoc('leads/sponsor-alpha/contacts', 'contact-1', { name: 'Lead 1' });

      const sponsorDb = testEnv.authenticatedContext('sponsor-alpha', { role: 'SPONSOR' }).firestore();
      const otherDb = testEnv.authenticatedContext('outro-sponsor', { role: 'SPONSOR' }).firestore();
      const adminDb = testEnv.authenticatedContext('admin-1', { role: 'ADMIN' }).firestore();

      await assertSucceeds(getDoc(doc(sponsorDb, 'leads/sponsor-alpha/contacts', 'contact-1')));
      await assertSucceeds(getDoc(doc(adminDb, 'leads/sponsor-alpha/contacts', 'contact-1')));
      await assertFails(getDoc(doc(otherDb, 'leads/sponsor-alpha/contacts', 'contact-1')));
    });

    it('escrita bloqueada para todos via client SDK (só backend)', async () => {
      const sponsorDb = testEnv.authenticatedContext('sponsor-alpha', { role: 'SPONSOR' }).firestore();
      const adminDb = testEnv.authenticatedContext('admin-1', { role: 'ADMIN' }).firestore();

      await assertFails(setDoc(doc(sponsorDb, 'leads/sponsor-alpha/contacts', 'contact-novo'), { name: 'Lead' }));
      await assertFails(setDoc(doc(adminDb, 'leads/sponsor-alpha/contacts', 'contact-novo'), { name: 'Lead' }));
    });
  });

  // 9. /pointEvents/{eventId}
  describe('Coleção /pointEvents', () => {
    it('leitura permitida para participante verificado dono do evento ou ADMIN; outro usuário falha', async () => {
      await seedDoc('pointEvents', 'pe-1', { userId: 'user-1', points: 50 });

      const ownerDb = testEnv.authenticatedContext('user-1', { email: 'u1@ufu.br', email_verified: true }).firestore();
      const unverifiedDb = testEnv.authenticatedContext('user-1', { email: 'u1@ufu.br', email_verified: false }).firestore();
      const otherDb = testEnv.authenticatedContext('user-2', { email: 'u2@ufu.br', email_verified: true }).firestore();
      const adminDb = testEnv.authenticatedContext('admin-1', { role: 'ADMIN' }).firestore();

      await assertSucceeds(getDoc(doc(ownerDb, 'pointEvents', 'pe-1')));
      await assertFails(getDoc(doc(unverifiedDb, 'pointEvents', 'pe-1')));
      await assertFails(getDoc(doc(otherDb, 'pointEvents', 'pe-1')));
      await assertSucceeds(getDoc(doc(adminDb, 'pointEvents', 'pe-1')));
    });

    it('escrita bloqueada via client SDK', async () => {
      const adminDb = testEnv.authenticatedContext('admin-1', { role: 'ADMIN' }).firestore();
      await assertFails(setDoc(doc(adminDb, 'pointEvents', 'pe-novo'), { userId: 'user-1', points: 100 }));
    });
  });

  // 10. /checkins/{checkinId}
  describe('Coleção /checkins', () => {
    it('leitura permitida para participante verificado (uid == auth.uid) ou Staff/ADMIN; outro falha', async () => {
      await seedDoc('checkins', 'chk-1', { uid: 'user-1', activityId: 'act-1' });

      const ownerDb = testEnv.authenticatedContext('user-1', { email: 'u1@ufu.br', email_verified: true }).firestore();
      const unverifiedDb = testEnv.authenticatedContext('user-1', { email: 'u1@ufu.br', email_verified: false }).firestore();
      const otherDb = testEnv.authenticatedContext('user-2', { email: 'u2@ufu.br', email_verified: true }).firestore();
      const staffDb = testEnv.authenticatedContext('staff-1', { role: 'STAFF' }).firestore();
      const adminDb = testEnv.authenticatedContext('admin-1', { role: 'ADMIN' }).firestore();

      await assertSucceeds(getDoc(doc(ownerDb, 'checkins', 'chk-1')));
      await assertFails(getDoc(doc(unverifiedDb, 'checkins', 'chk-1')));
      await assertFails(getDoc(doc(otherDb, 'checkins', 'chk-1')));
      await assertSucceeds(getDoc(doc(staffDb, 'checkins', 'chk-1')));
      await assertSucceeds(getDoc(doc(adminDb, 'checkins', 'chk-1')));
    });

    it('escrita bloqueada via client SDK', async () => {
      const staffDb = testEnv.authenticatedContext('staff-1', { role: 'STAFF' }).firestore();
      await assertFails(setDoc(doc(staffDb, 'checkins', 'chk-novo'), { uid: 'user-1' }));
    });
  });

  // 11. /users/{userId}/point_events/{eventId}
  describe('Subcoleção /users/{userId}/point_events', () => {
    it('leitura permitida para o próprio usuário com email_verified: true ou ADMIN; outro usuário falha', async () => {
      await seedDoc('users/user-1/point_events', 'sub-pe-1', { points: 100 });

      const ownerDb = testEnv.authenticatedContext('user-1', { email: 'u1@ufu.br', email_verified: true }).firestore();
      const unverifiedDb = testEnv.authenticatedContext('user-1', { email: 'u1@ufu.br', email_verified: false }).firestore();
      const otherDb = testEnv.authenticatedContext('user-2', { email: 'u2@ufu.br', email_verified: true }).firestore();
      const adminDb = testEnv.authenticatedContext('admin-1', { role: 'ADMIN' }).firestore();

      await assertSucceeds(getDoc(doc(ownerDb, 'users/user-1/point_events', 'sub-pe-1')));
      await assertFails(getDoc(doc(unverifiedDb, 'users/user-1/point_events', 'sub-pe-1')));
      await assertFails(getDoc(doc(otherDb, 'users/user-1/point_events', 'sub-pe-1')));
      await assertSucceeds(getDoc(doc(adminDb, 'users/user-1/point_events', 'sub-pe-1')));
    });

    it('escrita bloqueada via client SDK', async () => {
      const ownerDb = testEnv.authenticatedContext('user-1', { email: 'u1@ufu.br', email_verified: true }).firestore();
      await assertFails(setDoc(doc(ownerDb, 'users/user-1/point_events', 'sub-pe-novo'), { points: 50 }));
    });
  });
});

