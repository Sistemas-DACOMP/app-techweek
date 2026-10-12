import { describe, it, beforeAll, afterAll, beforeEach } from 'vitest';
import { initializeTestEnvironment, assertFails, assertSucceeds } from '@firebase/rules-unit-testing';
import { doc, getDoc, setDoc, updateDoc, deleteDoc, addDoc, collection } from 'firebase/firestore';
import fs from 'node:fs';

const PROJECT_ID = 'facom-techweek-test';

describe('Regras de Segurança do Firestore — Coleção /feed_posts', () => {
  let testEnv;

  beforeAll(async () => {
    // Carrega o firestore.rules atual
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

  // Helper para semear post de teste com regras desabilitadas
  async function seedPost(postId, postData) {
    await testEnv.withSecurityRulesDisabled(async (context) => {
      const db = context.firestore();
      await setDoc(doc(db, 'feed_posts', postId), postData);
    });
  }

  // ==========================================
  // CASOS QUE DEVEM SER PERMITIDOS (assertSucceeds)
  // ==========================================
  describe('Permissões Válidas (assertSucceeds)', () => {
    it('leitura por anônimo deve ser permitida', async () => {
      await seedPost('post-1', {
        content: 'Post público de boas-vindas',
        likes: [],
        createdAt: new Date().toISOString(),
      });
      const unauthDb = testEnv.unauthenticatedContext().firestore();
      await assertSucceeds(getDoc(doc(unauthDb, 'feed_posts', 'post-1')));
    });

    it('leitura por participante autenticado deve ser permitida', async () => {
      await seedPost('post-1', {
        content: 'Post público de boas-vindas',
        likes: [],
        createdAt: new Date().toISOString(),
      });
      const authDb = testEnv.authenticatedContext('user-1', { role: 'PARTICIPANT' }).firestore();
      await assertSucceeds(getDoc(doc(authDb, 'feed_posts', 'post-1')));
    });

    it('staff/admin cria post com authorId próprio', async () => {
      const staffDb = testEnv.authenticatedContext('staff-1', { role: 'STAFF' }).firestore();
      await assertSucceeds(
        addDoc(collection(staffDb, 'feed_posts'), {
          author: 'Staff TechWeek',
          authorRole: 'ORGANIZATION',
          authorId: 'staff-1',
          content: 'Palestra começando no auditório',
          pinned: false,
          likes: [],
          createdAt: new Date().toISOString(),
        })
      );
    });

    it('staff/admin cria post sem authorId (tolerante para legado)', async () => {
      const adminDb = testEnv.authenticatedContext('admin-1', { role: 'ADMIN' }).firestore();
      await assertSucceeds(
        addDoc(collection(adminDb, 'feed_posts'), {
          author: 'Comissão Organizadora',
          authorRole: 'ORGANIZATION',
          content: 'Aviso sem authorId',
          pinned: true,
          likes: [],
          createdAt: new Date().toISOString(),
        })
      );
    });

    it('staff/admin fixa, edita e apaga post', async () => {
      await seedPost('post-admin', {
        author: 'Admin',
        authorRole: 'ORGANIZATION',
        authorId: 'admin-1',
        content: 'Texto original',
        pinned: false,
        likes: [],
      });
      const adminDb = testEnv.authenticatedContext('admin-1', { role: 'ADMIN' }).firestore();

      // Edita conteúdo
      await assertSucceeds(
        updateDoc(doc(adminDb, 'feed_posts', 'post-admin'), {
          content: 'Texto editado pelo Admin',
        })
      );

      // Fixa post
      await assertSucceeds(
        updateDoc(doc(adminDb, 'feed_posts', 'post-admin'), {
          pinned: true,
        })
      );

      // Apaga post
      await assertSucceeds(deleteDoc(doc(adminDb, 'feed_posts', 'post-admin')));
    });

    it('patrocinador cria post com authorId próprio e sem campos reservados', async () => {
      const sponsorDb = testEnv.authenticatedContext('sponsor-1', { role: 'SPONSOR' }).firestore();
      await assertSucceeds(
        addDoc(collection(sponsorDb, 'feed_posts'), {
          author: 'Empresa Alpha',
          authorRole: 'SPONSOR',
          authorId: 'sponsor-1',
          content: 'Visitem nosso estande e ganhem brindes!',
          pinned: false,
          companyId: 'alpha',
          sponsorTier: 'GOLD',
          likes: [],
          createdAt: new Date().toISOString(),
        })
      );
    });

    it('patrocinador cria post com likes zerados (likes: [] e likesCount: 0) com sucesso', async () => {
      const sponsorDb = testEnv.authenticatedContext('sponsor-1', { role: 'SPONSOR' }).firestore();
      await assertSucceeds(
        addDoc(collection(sponsorDb, 'feed_posts'), {
          author: 'Empresa Alpha',
          authorRole: 'SPONSOR',
          authorId: 'sponsor-1',
          content: 'Post com likes zerados',
          pinned: false,
          likes: [],
          likesCount: 0,
        })
      );
    });

    it('participante logado curte (adiciona próprio UID) e descurte (remove próprio UID)', async () => {
      await seedPost('post-like', {
        content: 'Post para testar curtidas',
        likes: ['outro-usuario'],
      });
      const userDb = testEnv.authenticatedContext('user-1', { role: 'PARTICIPANT' }).firestore();

      // Curtir adicionando próprio UID
      await assertSucceeds(
        updateDoc(doc(userDb, 'feed_posts', 'post-like'), {
          likes: ['outro-usuario', 'user-1'],
        })
      );

      // Descurtir removendo próprio UID
      await assertSucceeds(
        updateDoc(doc(userDb, 'feed_posts', 'post-like'), {
          likes: ['outro-usuario'],
        })
      );
    });

    it('post legado sem campo likes recebe curtida do próprio UID com sucesso', async () => {
      await seedPost('post-legado', {
        content: 'Post legado sem campo likes',
      });
      const userDb = testEnv.authenticatedContext('user-1', { role: 'PARTICIPANT' }).firestore();

      // Curtir post legado que não tinha 'likes'
      await assertSucceeds(
        updateDoc(doc(userDb, 'feed_posts', 'post-legado'), {
          likes: ['user-1'],
        })
      );
    });
  });

  // ==========================================
  // CASOS QUE DEVEM SER NEGADOS (assertFails)
  // (Nas regras atuais sem proteção, estes testes falharão,
  // comprovando que o teste detecta a vulnerabilidade!)
  // ==========================================
  describe('Bloqueios e Negações de Segurança (assertFails)', () => {
    it('usuário anônimo cria, edita e apaga post (deve falhar)', async () => {
      const unauthDb = testEnv.unauthenticatedContext().firestore();

      // Anônimo cria
      await assertFails(
        addDoc(collection(unauthDb, 'feed_posts'), {
          content: 'Post de invasor anônimo',
          likes: [],
        })
      );

      await seedPost('post-alvo', { content: 'Post legítimo', likes: [] });

      // Anônimo edita
      await assertFails(
        updateDoc(doc(unauthDb, 'feed_posts', 'post-alvo'), {
          content: 'Invasor alterando texto',
        })
      );

      // Anônimo apaga
      await assertFails(deleteDoc(doc(unauthDb, 'feed_posts', 'post-alvo')));
    });

    it('participante comum cria post (deve falhar)', async () => {
      const userDb = testEnv.authenticatedContext('user-1', { role: 'PARTICIPANT' }).firestore();
      await assertFails(
        addDoc(collection(userDb, 'feed_posts'), {
          author: 'Participante Comum',
          authorId: 'user-1',
          content: 'Tentativa de postar no feed oficial',
          likes: [],
        })
      );
    });

    it('participante logado apaga post (deve falhar)', async () => {
      await seedPost('post-del', { content: 'Post oficial', likes: [] });
      const userDb = testEnv.authenticatedContext('user-1', { role: 'PARTICIPANT' }).firestore();
      await assertFails(deleteDoc(doc(userDb, 'feed_posts', 'post-del')));
    });

    it('participante logado altera content, imagem ou autor de post (deve falhar)', async () => {
      await seedPost('post-edit', {
        author: 'Organização',
        content: 'Texto original',
        likes: [],
      });
      const userDb = testEnv.authenticatedContext('user-1', { role: 'PARTICIPANT' }).firestore();

      await assertFails(
        updateDoc(doc(userDb, 'feed_posts', 'post-edit'), {
          content: 'Texto adulterado por participante',
        })
      );
    });

    it('participante logado remove curtida de OUTRO usuário (deve falhar)', async () => {
      await seedPost('post-likes-hack', {
        content: 'Post com curtidas alheias',
        likes: ['user-vitima', 'user-1'],
      });
      const userDb = testEnv.authenticatedContext('user-1', { role: 'PARTICIPANT' }).firestore();

      // user-1 tenta remover a curtida de user-vitima
      await assertFails(
        updateDoc(doc(userDb, 'feed_posts', 'post-likes-hack'), {
          likes: ['user-1'],
        })
      );
    });

    it('participante logado adiciona o UID de OUTRA pessoa em likes (deve falhar)', async () => {
      await seedPost('post-likes-forged', {
        content: 'Post com curtida forjada',
        likes: [],
      });
      const userDb = testEnv.authenticatedContext('user-1', { role: 'PARTICIPANT' }).firestore();

      // user-1 tenta curtir em nome de outro usuário
      await assertFails(
        updateDoc(doc(userDb, 'feed_posts', 'post-likes-forged'), {
          likes: ['outro-usuario'],
        })
      );
    });

    it('participante logado altera likes e outro campo ao mesmo tempo (deve falhar)', async () => {
      await seedPost('post-mixed-update', {
        content: 'Post original',
        likes: [],
      });
      const userDb = testEnv.authenticatedContext('user-1', { role: 'PARTICIPANT' }).firestore();

      await assertFails(
        updateDoc(doc(userDb, 'feed_posts', 'post-mixed-update'), {
          likes: ['user-1'],
          content: 'Texto modificado junto com o like',
        })
      );
    });

    it('criação de post por staff com authorId diferente do UID de quem cria (deve falhar)', async () => {
      const staffDb = testEnv.authenticatedContext('staff-1', { role: 'STAFF' }).firestore();
      await assertFails(
        addDoc(collection(staffDb, 'feed_posts'), {
          author: 'Staff Fake',
          authorId: 'outro-uid-falso',
          content: 'Impersonando outro autor',
          likes: [],
        })
      );
    });

    it('patrocinador criando post com authorId de outro usuário (deve falhar)', async () => {
      const sponsorDb = testEnv.authenticatedContext('sponsor-1', { role: 'SPONSOR' }).firestore();
      await assertFails(
        addDoc(collection(sponsorDb, 'feed_posts'), {
          author: 'Sponsor Fake',
          authorRole: 'SPONSOR',
          authorId: 'outro-uid',
          content: 'Tentando postar como outro patrocinador',
          likes: [],
        })
      );
    });

    it('patrocinador criando post definindo campo reservado à organização pinned=true (deve falhar)', async () => {
      const sponsorDb = testEnv.authenticatedContext('sponsor-1', { role: 'SPONSOR' }).firestore();
      await assertFails(
        addDoc(collection(sponsorDb, 'feed_posts'), {
          author: 'Sponsor Alpha',
          authorRole: 'SPONSOR',
          authorId: 'sponsor-1',
          content: 'Tentando fixar post',
          pinned: true, // Campo reservado à Organização
          likes: [],
        })
      );
    });

    it('patrocinador criando post com authorRole=ORGANIZATION (deve falhar)', async () => {
      const sponsorDb = testEnv.authenticatedContext('sponsor-1', { role: 'SPONSOR' }).firestore();
      await assertFails(
        addDoc(collection(sponsorDb, 'feed_posts'), {
          author: 'Sponsor Alpha',
          authorRole: 'ORGANIZATION', // Campo reservado à Organização
          authorId: 'sponsor-1',
          content: 'Tentando fingir ser organização',
          pinned: false,
          likes: [],
        })
      );
    });

    it('patrocinador criando post sem authorId (deve falhar)', async () => {
      const sponsorDb = testEnv.authenticatedContext('sponsor-1', { role: 'SPONSOR' }).firestore();
      await assertFails(
        addDoc(collection(sponsorDb, 'feed_posts'), {
          author: 'Sponsor Sem AuthorId',
          authorRole: 'SPONSOR',
          content: 'Tentando postar sem authorId',
          pinned: false,
          likes: [],
        })
      );
    });

    it('patrocinador criando post sem authorRole (deve falhar)', async () => {
      const sponsorDb = testEnv.authenticatedContext('sponsor-1', { role: 'SPONSOR' }).firestore();
      await assertFails(
        addDoc(collection(sponsorDb, 'feed_posts'), {
          author: 'Sponsor Sem AuthorRole',
          authorId: 'sponsor-1',
          content: 'Tentando postar sem authorRole',
          pinned: false,
          likes: [],
        })
      );
    });

    it('patrocinador criando post com likes pré-preenchidos (deve falhar)', async () => {
      const sponsorDb = testEnv.authenticatedContext('sponsor-1', { role: 'SPONSOR' }).firestore();
      await assertFails(
        addDoc(collection(sponsorDb, 'feed_posts'), {
          author: 'Sponsor Alpha',
          authorRole: 'SPONSOR',
          authorId: 'sponsor-1',
          content: 'Tentando forjar likes iniciais',
          pinned: false,
          likes: ['user-1', 'user-2'],
        })
      );
    });

    it('patrocinador criando post com contador likesCount > 0 (deve falhar)', async () => {
      const sponsorDb = testEnv.authenticatedContext('sponsor-1', { role: 'SPONSOR' }).firestore();
      await assertFails(
        addDoc(collection(sponsorDb, 'feed_posts'), {
          author: 'Sponsor Alpha',
          authorRole: 'SPONSOR',
          authorId: 'sponsor-1',
          content: 'Tentando forjar likesCount inicial',
          pinned: false,
          likes: [],
          likesCount: 50,
        })
      );
    });

    it('post legado sem likes recebendo curtida com UID de outra pessoa (deve falhar)', async () => {
      await seedPost('post-legado-hack', {
        content: 'Post legado',
      });
      const userDb = testEnv.authenticatedContext('user-1', { role: 'PARTICIPANT' }).firestore();

      await assertFails(
        updateDoc(doc(userDb, 'feed_posts', 'post-legado-hack'), {
          likes: ['outro-usuario'],
        })
      );
    });
  });
});

