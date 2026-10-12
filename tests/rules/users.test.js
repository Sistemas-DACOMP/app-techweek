import { describe, it, beforeAll, afterAll, beforeEach } from 'vitest';
import { initializeTestEnvironment, assertFails, assertSucceeds } from '@firebase/rules-unit-testing';
import { doc, getDoc, setDoc, updateDoc, deleteDoc, serverTimestamp } from 'firebase/firestore';
import fs from 'node:fs';

const PROJECT_ID = 'facom-techweek-test-users';

describe('Regras de Segurança do Firestore — Coleção /users', () => {
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

  // Helper para semear documento de usuário com regras desabilitadas
  async function seedUser(userId, userData) {
    await testEnv.withSecurityRulesDisabled(async (context) => {
      const db = context.firestore();
      await setDoc(doc(db, 'users', userId), {
        uid: userId,
        email: `${userId}@ufu.br`,
        role: 'PARTICIPANT',
        totalPoints: 0,
        pontuacaoTotal: 0,
        createdAt: new Date(),
        termsAcceptedAt: new Date(),
        updatedAt: new Date(),
        ...userData,
      });
    });
  }

  // ==========================================
  // CASOS PERMITIDOS (assertSucceeds)
  // ==========================================
  describe('Permissões Válidas (assertSucceeds)', () => {
    it('leitura por participante autenticado deve ser permitida', async () => {
      await seedUser('user-1', { firstName: 'Carlos' });
      const authDb = testEnv.authenticatedContext('user-2', { email: 'user2@ufu.br' }).firestore();
      await assertSucceeds(getDoc(doc(authDb, 'users', 'user-1')));
    });

    it('criação de perfil legítimo com campos válidos pelo próprio participante', async () => {
      const authDb = testEnv.authenticatedContext('user-1', { email: 'user1@ufu.br' }).firestore();
      await assertSucceeds(
        setDoc(doc(authDb, 'users', 'user-1'), {
          uid: 'user-1',
          email: 'user1@ufu.br',
          firstName: 'Carlos',
          lastName: 'Silva',
          username: 'carlos_silva',
          phone: '34999999999',
          course: 'Ciência da Computação',
          period: 5,
          institution: 'UFU',
          linkedin: 'https://linkedin.com/in/carlos',
          instagram: 'https://instagram.com/carlos',
          github: 'https://github.com/carlos',
          avatarUrl: 'https://example.com/carlos.jpg',
          role: 'PARTICIPANT',
          totalPoints: 0,
          pontuacaoTotal: 0,
          termsAcceptedAt: serverTimestamp(),
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        })
      );
    });

    it('criação de perfil inicial por participante com email_verified: false (onboarding imediato)', async () => {
      const authDb = testEnv.authenticatedContext('user-unverified', {
        email: 'unverified@ufu.br',
        email_verified: false,
      }).firestore();
      await assertSucceeds(
        setDoc(doc(authDb, 'users', 'user-unverified'), {
          uid: 'user-unverified',
          email: 'unverified@ufu.br',
          firstName: 'Novo',
          lastName: 'Aluno',
          role: 'PARTICIPANT',
          totalPoints: 0,
          pontuacaoTotal: 0,
          termsAcceptedAt: serverTimestamp(),
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        })
      );
    });

    it('atualização de dados pessoais da whitelist pelo próprio participante', async () => {
      await seedUser('user-1', {
        firstName: 'Carlos',
        username: 'carlos_silva',
      });
      const authDb = testEnv.authenticatedContext('user-1', { email: 'user1@ufu.br', email_verified: true }).firestore();
      await assertSucceeds(
        updateDoc(doc(authDb, 'users', 'user-1'), {
          firstName: 'Carlos Eduardo',
          lastName: 'Silva',
          displayName: 'Carlos Silva',
          course: 'Sistemas de Informação',
          period: 6,
          mascot: 'binary-fox',
          updatedAt: serverTimestamp(),
        })
      );
    });

    it('atualização do próprio e-mail quando sincronizado com o token de Auth', async () => {
      await seedUser('user-1', { email: 'antigo@ufu.br' });
      // Usuário com token já atualizado
      const authDb = testEnv.authenticatedContext('user-1', { email: 'novo@ufu.br', email_verified: true }).firestore();
      await assertSucceeds(
        updateDoc(doc(authDb, 'users', 'user-1'), {
          email: 'novo@ufu.br',
          updatedAt: serverTimestamp(),
        })
      );
    });

    it('criação de perfil legítimo com participantType e participant_type válidos', async () => {
      const authDb = testEnv.authenticatedContext('user-part', { email: 'part@ufu.br' }).firestore();
      await assertSucceeds(
        setDoc(doc(authDb, 'users', 'user-part'), {
          uid: 'user-part',
          email: 'part@ufu.br',
          participantType: 'Aluno UFU Graduação',
          participant_type: 'Aluno UFU Graduação',
          role: 'PARTICIPANT',
          totalPoints: 0,
          pontuacaoTotal: 0,
          termsAcceptedAt: serverTimestamp(),
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        })
      );
    });

    it('atualização de participantType e participant_type pelo próprio participante com valores válidos', async () => {
      await seedUser('user-part-update', {
        participantType: 'Aluno UFU Graduação',
        participant_type: 'Aluno UFU Graduação'
      });
      const authDb = testEnv.authenticatedContext('user-part-update', { email: 'part@ufu.br', email_verified: true }).firestore();
      await assertSucceeds(
        updateDoc(doc(authDb, 'users', 'user-part-update'), {
          participantType: 'Aluno UFU Pós-graduação',
          participant_type: 'Aluno UFU Pós-graduação',
          updatedAt: serverTimestamp(),
        })
      );
    });

    it('deleção do próprio perfil pelo dono', async () => {
      await seedUser('user-1', {});
      const authDb = testEnv.authenticatedContext('user-1', { email: 'user1@ufu.br' }).firestore();
      await assertSucceeds(deleteDoc(doc(authDb, 'users', 'user-1')));
    });
  });

  // ==========================================
  // CASOS NEGADOS (assertFails)
  // ==========================================
  describe('Tentativas Maliciosas ou Não Autorizadas (assertFails)', () => {
    it('leitura por anônimo deve ser negada', async () => {
      await seedUser('user-1', {});
      const unauthDb = testEnv.unauthenticatedContext().firestore();
      await assertFails(getDoc(doc(unauthDb, 'users', 'user-1')));
    });

    it('criação de perfil com companyId (vulnerabilidade de patrocinador)', async () => {
      const authDb = testEnv.authenticatedContext('user-1', { email: 'user1@ufu.br' }).firestore();
      await assertFails(
        setDoc(doc(authDb, 'users', 'user-1'), {
          uid: 'user-1',
          email: 'user1@ufu.br',
          role: 'PARTICIPANT',
          totalPoints: 0,
          pontuacaoTotal: 0,
          companyId: 'kanastra',
          termsAcceptedAt: serverTimestamp(),
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        })
      );
    });

    it('criação de perfil com tier (vulnerabilidade de patrocinador)', async () => {
      const authDb = testEnv.authenticatedContext('user-1', { email: 'user1@ufu.br' }).firestore();
      await assertFails(
        setDoc(doc(authDb, 'users', 'user-1'), {
          uid: 'user-1',
          email: 'user1@ufu.br',
          role: 'PARTICIPANT',
          totalPoints: 0,
          pontuacaoTotal: 0,
          tier: 'DIAMOND',
          termsAcceptedAt: serverTimestamp(),
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        })
      );
    });

    it('criação de perfil com goldenTicketAwarded ou visitedSponsors', async () => {
      const authDb = testEnv.authenticatedContext('user-1', { email: 'user1@ufu.br' }).firestore();
      await assertFails(
        setDoc(doc(authDb, 'users', 'user-1'), {
          uid: 'user-1',
          email: 'user1@ufu.br',
          role: 'PARTICIPANT',
          totalPoints: 0,
          pontuacaoTotal: 0,
          goldenTicketAwarded: true,
          visitedSponsors: ['sponsor-1'],
          termsAcceptedAt: serverTimestamp(),
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        })
      );
    });

    it('criação de perfil já com papel privilegiado (ADMIN/STAFF/SPONSOR)', async () => {
      const authDb = testEnv.authenticatedContext('user-1', { email: 'user1@ufu.br' }).firestore();
      await assertFails(
        setDoc(doc(authDb, 'users', 'user-1'), {
          uid: 'user-1',
          email: 'user1@ufu.br',
          role: 'ADMIN',
          totalPoints: 0,
          pontuacaoTotal: 0,
          termsAcceptedAt: serverTimestamp(),
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        })
      );
    });

    it('criação de perfil já com pontuação maior que 0', async () => {
      const authDb = testEnv.authenticatedContext('user-1', { email: 'user1@ufu.br' }).firestore();
      await assertFails(
        setDoc(doc(authDb, 'users', 'user-1'), {
          uid: 'user-1',
          email: 'user1@ufu.br',
          role: 'PARTICIPANT',
          totalPoints: 500,
          pontuacaoTotal: 500,
          termsAcceptedAt: serverTimestamp(),
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        })
      );
    });

    it('criação de perfil com e-mail diferente do token Auth', async () => {
      const authDb = testEnv.authenticatedContext('user-1', { email: 'real@ufu.br' }).firestore();
      await assertFails(
        setDoc(doc(authDb, 'users', 'user-1'), {
          uid: 'user-1',
          email: 'falso@ufu.br',
          role: 'PARTICIPANT',
          totalPoints: 0,
          pontuacaoTotal: 0,
          termsAcceptedAt: serverTimestamp(),
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        })
      );
    });

    it('criação de perfil para outro UID', async () => {
      const authDb = testEnv.authenticatedContext('user-1', { email: 'user1@ufu.br' }).firestore();
      await assertFails(
        setDoc(doc(authDb, 'users', 'user-2'), {
          uid: 'user-2',
          email: 'user2@ufu.br',
          role: 'PARTICIPANT',
          totalPoints: 0,
          pontuacaoTotal: 0,
          termsAcceptedAt: serverTimestamp(),
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        })
      );
    });

    it('criação de perfil com campos do Sympla (proibidos no cliente)', async () => {
      const authDb = testEnv.authenticatedContext('user-1', { email: 'user1@ufu.br' }).firestore();
      await assertFails(
        setDoc(doc(authDb, 'users', 'user-1'), {
          uid: 'user-1',
          email: 'user1@ufu.br',
          role: 'PARTICIPANT',
          totalPoints: 0,
          pontuacaoTotal: 0,
          hasSymplaTicket: true,
          symplaTicket: { id: 'ticket-1' },
          termsAcceptedAt: serverTimestamp(),
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        })
      );
    });

    it('participante tentando atualizar companyId (vulnerabilidade de blacklist atual)', async () => {
      await seedUser('user-1', {});
      const authDb = testEnv.authenticatedContext('user-1', { email: 'user1@ufu.br', email_verified: true }).firestore();
      await assertFails(
        updateDoc(doc(authDb, 'users', 'user-1'), {
          companyId: 'kanastra',
          updatedAt: serverTimestamp(),
        })
      );
    });

    it('participante tentando atualizar tier (vulnerabilidade de blacklist atual)', async () => {
      await seedUser('user-1', {});
      const authDb = testEnv.authenticatedContext('user-1', { email: 'user1@ufu.br', email_verified: true }).firestore();
      await assertFails(
        updateDoc(doc(authDb, 'users', 'user-1'), {
          tier: 'DIAMOND',
          updatedAt: serverTimestamp(),
        })
      );
    });

    it('participante tentando atualizar visitedSponsors ou goldenTicketAwarded', async () => {
      await seedUser('user-1', {});
      const authDb = testEnv.authenticatedContext('user-1', { email: 'user1@ufu.br', email_verified: true }).firestore();
      await assertFails(
        updateDoc(doc(authDb, 'users', 'user-1'), {
          goldenTicketAwarded: true,
          visitedSponsors: ['patrocinador-1'],
          updatedAt: serverTimestamp(),
        })
      );
    });

    it('participante tentando atualizar role', async () => {
      await seedUser('user-1', {});
      const authDb = testEnv.authenticatedContext('user-1', { email: 'user1@ufu.br', email_verified: true }).firestore();
      await assertFails(
        updateDoc(doc(authDb, 'users', 'user-1'), {
          role: 'ADMIN',
          updatedAt: serverTimestamp(),
        })
      );
    });

    it('participante tentando atualizar pontuação (totalPoints/pontuacaoTotal)', async () => {
      await seedUser('user-1', {});
      const authDb = testEnv.authenticatedContext('user-1', { email: 'user1@ufu.br', email_verified: true }).firestore();
      await assertFails(
        updateDoc(doc(authDb, 'users', 'user-1'), {
          totalPoints: 1000,
          updatedAt: serverTimestamp(),
        })
      );
    });

    it('participante tentando atualizar e-mail para um endereço diferente do token de Auth', async () => {
      await seedUser('user-1', { email: 'original@ufu.br' });
      // Token diz 'original@ufu.br', mas update tenta trocar para 'hacker@ufu.br'
      const authDb = testEnv.authenticatedContext('user-1', { email: 'original@ufu.br', email_verified: true }).firestore();
      await assertFails(
        updateDoc(doc(authDb, 'users', 'user-1'), {
          email: 'hacker@ufu.br',
          updatedAt: serverTimestamp(),
        })
      );
    });

    it('participante tentando atualizar perfil de outro usuário', async () => {
      await seedUser('user-2', {});
      const authDb = testEnv.authenticatedContext('user-1', { email: 'user1@ufu.br', email_verified: true }).firestore();
      await assertFails(
        updateDoc(doc(authDb, 'users', 'user-2'), {
          firstName: 'Invasor',
          updatedAt: serverTimestamp(),
        })
      );
    });

    it('staff/admin tentando atualizar perfil de outro usuário via client SDK (deve falhar - só Admin SDK)', async () => {
      await seedUser('user-2', {});
      const adminDb = testEnv.authenticatedContext('admin-1', { role: 'ADMIN', email: 'admin@ufu.br' }).firestore();
      await assertFails(
        updateDoc(doc(adminDb, 'users', 'user-2'), {
          firstName: 'Admin Alterando',
          updatedAt: serverTimestamp(),
        })
      );
    });

    it('update sem atualizar updatedAt com request.time deve ser negado', async () => {
      await seedUser('user-1', {});
      const authDb = testEnv.authenticatedContext('user-1', { email: 'user1@ufu.br', email_verified: true }).firestore();
      await assertFails(
        updateDoc(doc(authDb, 'users', 'user-1'), {
          firstName: 'Carlos',
          // updatedAt ausente ou estático
          updatedAt: new Date(2020, 1, 1),
        })
      );
    });

    it('update com username inválido (caracteres especiais ou tamanho impróprio)', async () => {
      await seedUser('user-1', {});
      const authDb = testEnv.authenticatedContext('user-1', { email: 'user1@ufu.br', email_verified: true }).firestore();
      await assertFails(
        updateDoc(doc(authDb, 'users', 'user-1'), {
          username: 'user<script>',
          updatedAt: serverTimestamp(),
        })
      );
    });

    it('update com campo fora da whitelist (campo arbitrário)', async () => {
      await seedUser('user-1', {});
      const authDb = testEnv.authenticatedContext('user-1', { email: 'user1@ufu.br', email_verified: true }).firestore();
      await assertFails(
        updateDoc(doc(authDb, 'users', 'user-1'), {
          arbitraryField: 'valor_injetado',
          updatedAt: serverTimestamp(),
        })
      );
    });

    it('criação com participantType fora do enum permitido (ex: ADMIN, Hacker) deve falhar', async () => {
      const authDb = testEnv.authenticatedContext('user-1', { email: 'user1@ufu.br' }).firestore();
      await assertFails(
        setDoc(doc(authDb, 'users', 'user-1'), {
          uid: 'user-1',
          email: 'user1@ufu.br',
          participantType: 'Hacker',
          role: 'PARTICIPANT',
          totalPoints: 0,
          pontuacaoTotal: 0,
          termsAcceptedAt: serverTimestamp(),
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        })
      );
    });

    it('atualização com participantType fora do enum permitido (ex: ADMIN) deve falhar', async () => {
      await seedUser('user-1', {});
      const authDb = testEnv.authenticatedContext('user-1', { email: 'user1@ufu.br', email_verified: true }).firestore();
      await assertFails(
        updateDoc(doc(authDb, 'users', 'user-1'), {
          participantType: 'ADMIN',
          updatedAt: serverTimestamp(),
        })
      );
    });

    it('atualização com participant_type fora do enum permitido (ex: Hacker) deve falhar', async () => {
      await seedUser('user-1', {});
      const authDb = testEnv.authenticatedContext('user-1', { email: 'user1@ufu.br', email_verified: true }).firestore();
      await assertFails(
        updateDoc(doc(authDb, 'users', 'user-1'), {
          participant_type: 'Hacker',
          updatedAt: serverTimestamp(),
        })
      );
    });

    it('participante apaga o próprio perfil e recria com campos extras (a recriação falha)', async () => {
      await seedUser('user-1', { firstName: 'Carlos' });
      const authDb = testEnv.authenticatedContext('user-1', { email: 'user1@ufu.br' }).firestore();

      // 1. Apaga com sucesso (permitido ao dono)
      await assertSucceeds(deleteDoc(doc(authDb, 'users', 'user-1')));

      // 2. Tenta recriar injetando campos indevidos (ex: goldenTicketAwarded ou companyId)
      await assertFails(
        setDoc(doc(authDb, 'users', 'user-1'), {
          uid: 'user-1',
          email: 'user1@ufu.br',
          role: 'PARTICIPANT',
          totalPoints: 0,
          pontuacaoTotal: 0,
          goldenTicketAwarded: true,
          companyId: 'kanastra',
          termsAcceptedAt: serverTimestamp(),
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        })
      );
    });

    it('fallback setDoc em updateUserProfile para documento inexistente deve falhar (não satisfaz create)', async () => {
      // Documento 'user-novo' não existe. updateUserProfile envia payload parcial via setDoc({ merge: true })
      const authDb = testEnv.authenticatedContext('user-novo', { email: 'novo@ufu.br' }).firestore();
      await assertFails(
        setDoc(doc(authDb, 'users', 'user-novo'), {
          firstName: 'Carlos',
          updatedAt: serverTimestamp(),
        }, { merge: true })
      );
    });

    it('setDoc com merge sobre documento existente com os campos do createUserProfile deve falhar (tenta reescrever createdAt/termsAcceptedAt)', async () => {
      await seedUser('user-1', { firstName: 'Carlos Original' });
      const authDb = testEnv.authenticatedContext('user-1', { email: 'user1@ufu.br' }).firestore();

      // Simula chamada de createUserProfile sobre documento existente enviando novo timestamp de createdAt/termsAcceptedAt
      await assertFails(
        setDoc(doc(authDb, 'users', 'user-1'), {
          uid: 'user-1',
          email: 'user1@ufu.br',
          firstName: 'Carlos Atualizado',
          role: 'PARTICIPANT',
          totalPoints: 0,
          pontuacaoTotal: 0,
          termsAcceptedAt: serverTimestamp(),
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        }, { merge: true })
      );
    });

    it('deleção de perfil de outro usuário por participante', async () => {
      await seedUser('user-2', {});
      const authDb = testEnv.authenticatedContext('user-1', { email: 'user1@ufu.br' }).firestore();
      await assertFails(deleteDoc(doc(authDb, 'users', 'user-2')));
    });

    it('deleção de perfil por staff/admin via client SDK (deve falhar - só o próprio dono ou Admin SDK)', async () => {
      await seedUser('user-2', {});
      const adminDb = testEnv.authenticatedContext('admin-1', { role: 'ADMIN', email: 'admin@ufu.br' }).firestore();
      await assertFails(deleteDoc(doc(adminDb, 'users', 'user-2')));
    });

    it('tentativa de atualização de perfil por participante com email_verified: false (deve falhar com assertFails)', async () => {
      await seedUser('user-unverified', { firstName: 'Carlos' });
      const authDb = testEnv.authenticatedContext('user-unverified', {
        email: 'unverified@ufu.br',
        email_verified: false,
      }).firestore();

      await assertFails(
        updateDoc(doc(authDb, 'users', 'user-unverified'), {
          firstName: 'Carlos Tentativa',
          updatedAt: serverTimestamp(),
        })
      );
    });

    it('usuário com e-mail sam03amorim@gmail.com sem token claim role: ADMIN tem acesso negado em operações de admin (subcoleção point_events de outro usuário)', async () => {
      await testEnv.withSecurityRulesDisabled(async (context) => {
        const db = context.firestore();
        await setDoc(doc(db, 'users', 'user-2', 'point_events', 'event-1'), {
          points: 50,
          description: 'Teste'
        });
      });

      const samDb = testEnv.authenticatedContext('user-sam', {
        email: 'sam03amorim@gmail.com',
        email_verified: true,
      }).firestore();

      await assertFails(getDoc(doc(samDb, 'users', 'user-2', 'point_events', 'event-1')));
    });
  });
});
