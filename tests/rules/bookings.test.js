import { describe, it, beforeAll, afterAll, beforeEach } from 'vitest';
import { initializeTestEnvironment, assertFails, assertSucceeds } from '@firebase/rules-unit-testing';
import { doc, getDoc, setDoc, updateDoc, deleteDoc, serverTimestamp } from 'firebase/firestore';
import fs from 'node:fs';

const PROJECT_ID = 'facom-techweek-test-bookings';

describe('Regras de Segurança do Firestore — Coleção /bookings', () => {
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

  async function seedBooking(bookingId, bookingData) {
    await testEnv.withSecurityRulesDisabled(async (context) => {
      const db = context.firestore();
      await setDoc(doc(db, 'bookings', bookingId), bookingData);
    });
  }

  describe('Permissões de Reservas por Verificação de E-mail', () => {
    it('participante com email_verified: true cria reserva da sua própria vaga (assertSucceeds)', async () => {
      const authDb = testEnv.authenticatedContext('user-1', {
        email: 'user1@ufu.br',
        email_verified: true,
      }).firestore();

      await assertSucceeds(
        setDoc(doc(authDb, 'bookings', 'booking-1'), {
          userId: 'user-1',
          activityId: 'activity-101',
          createdAt: serverTimestamp(),
        })
      );
    });

    it('participante com email_verified: false tenta criar reserva (deve falhar com assertFails)', async () => {
      const unverifiedDb = testEnv.authenticatedContext('user-1', {
        email: 'user1@ufu.br',
        email_verified: false,
      }).firestore();

      await assertFails(
        setDoc(doc(unverifiedDb, 'bookings', 'booking-1'), {
          userId: 'user-1',
          activityId: 'activity-101',
          createdAt: serverTimestamp(),
        })
      );
    });

    it('participante com email_verified: false tenta ler sua própria reserva (deve falhar com assertFails)', async () => {
      await seedBooking('booking-1', {
        userId: 'user-1',
        activityId: 'activity-101',
      });

      const unverifiedDb = testEnv.authenticatedContext('user-1', {
        email: 'user1@ufu.br',
        email_verified: false,
      }).firestore();

      await assertFails(getDoc(doc(unverifiedDb, 'bookings', 'booking-1')));
    });

    it('participante com email_verified: false tenta excluir sua própria reserva (deve falhar com assertFails)', async () => {
      await seedBooking('booking-1', {
        userId: 'user-1',
        activityId: 'activity-101',
      });

      const unverifiedDb = testEnv.authenticatedContext('user-1', {
        email: 'user1@ufu.br',
        email_verified: false,
      }).firestore();

      await assertFails(deleteDoc(doc(unverifiedDb, 'bookings', 'booking-1')));
    });

    it('participante com email_verified: true lê sua própria reserva (assertSucceeds)', async () => {
      await seedBooking('booking-1', {
        userId: 'user-1',
        activityId: 'activity-101',
      });

      const authDb = testEnv.authenticatedContext('user-1', {
        email: 'user1@ufu.br',
        email_verified: true,
      }).firestore();

      await assertSucceeds(getDoc(doc(authDb, 'bookings', 'booking-1')));
    });

    it('participante com email_verified: true cancela sua própria reserva (assertSucceeds)', async () => {
      await seedBooking('booking-1', {
        userId: 'user-1',
        activityId: 'activity-101',
      });

      const authDb = testEnv.authenticatedContext('user-1', {
        email: 'user1@ufu.br',
        email_verified: true,
      }).firestore();

      await assertSucceeds(deleteDoc(doc(authDb, 'bookings', 'booking-1')));
    });

    it('participante verificado tenta criar reserva para OUTRO usuário (deve falhar com assertFails)', async () => {
      const authDb = testEnv.authenticatedContext('user-1', {
        email: 'user1@ufu.br',
        email_verified: true,
      }).firestore();

      await assertFails(
        setDoc(doc(authDb, 'bookings', 'booking-alheio'), {
          userId: 'user-2',
          activityId: 'activity-101',
          createdAt: serverTimestamp(),
        })
      );
    });

    it('participante verificado tenta ler reserva de OUTRO usuário (deve falhar com assertFails)', async () => {
      await seedBooking('booking-2', {
        userId: 'user-2',
        activityId: 'activity-101',
      });

      const authDb = testEnv.authenticatedContext('user-1', {
        email: 'user1@ufu.br',
        email_verified: true,
      }).firestore();

      await assertFails(getDoc(doc(authDb, 'bookings', 'booking-2')));
    });

    it('participante verificado tenta atualizar sua própria reserva (deve falhar com assertFails — só ADMIN atualiza)', async () => {
      await seedBooking('booking-1', {
        userId: 'user-1',
        activityId: 'activity-101',
      });

      const authDb = testEnv.authenticatedContext('user-1', {
        email: 'user1@ufu.br',
        email_verified: true,
      }).firestore();

      await assertFails(
        updateDoc(doc(authDb, 'bookings', 'booking-1'), {
          activityId: 'activity-999',
        })
      );
    });

    it('participante verificado tenta atualizar reserva de OUTRO usuário (deve falhar com assertFails)', async () => {
      await seedBooking('booking-2', {
        userId: 'user-2',
        activityId: 'activity-101',
      });

      const authDb = testEnv.authenticatedContext('user-1', {
        email: 'user1@ufu.br',
        email_verified: true,
      }).firestore();

      await assertFails(
        updateDoc(doc(authDb, 'bookings', 'booking-2'), {
          activityId: 'activity-999',
        })
      );
    });

    it('admin pode atualizar qualquer reserva (assertSucceeds)', async () => {
      await seedBooking('booking-1', {
        userId: 'user-1',
        activityId: 'activity-101',
      });

      const adminDb = testEnv.authenticatedContext('admin-1', {
        role: 'ADMIN',
        email_verified: true,
      }).firestore();

      await assertSucceeds(
        updateDoc(doc(adminDb, 'bookings', 'booking-1'), {
          status: 'CONFIRMED',
        })
      );
    });

    it('admin pode ler qualquer reserva de participante (assertSucceeds)', async () => {
      await seedBooking('booking-1', {
        userId: 'user-1',
        activityId: 'activity-101',
      });

      const adminDb = testEnv.authenticatedContext('admin-1', {
        role: 'ADMIN',
        email_verified: true,
      }).firestore();

      await assertSucceeds(getDoc(doc(adminDb, 'bookings', 'booking-1')));
    });

    it('admin pode deletar qualquer reserva de participante (assertSucceeds)', async () => {
      await seedBooking('booking-1', {
        userId: 'user-1',
        activityId: 'activity-101',
      });

      const adminDb = testEnv.authenticatedContext('admin-1', {
        role: 'ADMIN',
        email_verified: true,
      }).firestore();

      await assertSucceeds(deleteDoc(doc(adminDb, 'bookings', 'booking-1')));
    });
  });
});
