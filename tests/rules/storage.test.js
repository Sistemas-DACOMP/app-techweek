import { describe, it, beforeAll, afterAll, beforeEach } from 'vitest';
import { initializeTestEnvironment, assertFails, assertSucceeds } from '@firebase/rules-unit-testing';
import fs from 'node:fs';

const PROJECT_ID = 'facom-techweek-test-storage';

describe('Regras de Segurança do Firebase Storage — storage.rules', () => {
  let testEnv;

  beforeAll(async () => {
    const rules = fs.readFileSync('storage.rules', 'utf8');
    testEnv = await initializeTestEnvironment({
      projectId: PROJECT_ID,
      storage: {
        rules,
        host: '127.0.0.1',
        port: 9199,
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
      await testEnv.clearStorage();
    }
  });

  describe('Coleção /avatars/{userId}/{fileName}', () => {
    const smallPng = new Uint8Array(1024);
    const largePng = new Uint8Array(2.5 * 1024 * 1024); // 2.5MB (> 2MB)
    const svgData = new Uint8Array(512);

    it('participante autenticado cria avatar PNG < 2MB no seu próprio UID (assertSucceeds)', async () => {
      const storage = testEnv.authenticatedContext('user-1').storage();
      const fileRef = storage.ref('avatars/user-1/avatar.png');

      await assertSucceeds(fileRef.put(smallPng, { contentType: 'image/png' }));
    });

    it('participante tenta criar avatar > 2MB (assertFails)', async () => {
      const storage = testEnv.authenticatedContext('user-1').storage();
      const fileRef = storage.ref('avatars/user-1/large.png');

      await assertFails(fileRef.put(largePng, { contentType: 'image/png' }));
    });

    it('participante tenta criar avatar com formato proibido SVG (assertFails)', async () => {
      const storage = testEnv.authenticatedContext('user-1').storage();
      const fileRef = storage.ref('avatars/user-1/bad.svg');

      await assertFails(fileRef.put(svgData, { contentType: 'image/svg+xml' }));
    });

    it('participante tenta gravar na pasta de avatar de outro UID (assertFails)', async () => {
      const storage = testEnv.authenticatedContext('user-1').storage();
      const fileRef = storage.ref('avatars/user-2/avatar.png');

      await assertFails(fileRef.put(smallPng, { contentType: 'image/png' }));
    });

    it('participante exclui seu próprio avatar existente (assertSucceeds)', async () => {
      const storage = testEnv.authenticatedContext('user-1').storage();
      const fileRef = storage.ref('avatars/user-1/avatar.png');

      await fileRef.put(smallPng, { contentType: 'image/png' });
      await assertSucceeds(fileRef.delete());
    });
  });

  describe('Coleção /mission_photos/{userId}/{fileName}', () => {
    const smallJpg = new Uint8Array(1024);
    const heavyJpg = new Uint8Array(6 * 1024 * 1024); // 6MB (entre 5MB e 10MB)

    it('participante com email_verified: true envia foto JPG < 5MB em seu próprio UID (assertSucceeds)', async () => {
      const storage = testEnv.authenticatedContext('user-1', {
        email: 'user1@ufu.br',
        email_verified: true,
      }).storage();
      const fileRef = storage.ref('mission_photos/user-1/proof.jpg');

      await assertSucceeds(fileRef.put(smallJpg, { contentType: 'image/jpeg' }));
    });

    it('participante com email_verified: false tenta enviar foto (assertFails)', async () => {
      const storage = testEnv.authenticatedContext('user-1', {
        email: 'user1@ufu.br',
        email_verified: false,
      }).storage();
      const fileRef = storage.ref('mission_photos/user-1/proof.jpg');

      await assertFails(fileRef.put(smallJpg, { contentType: 'image/jpeg' }));
    });

    it('participante tenta enviar foto entre 5MB e 10MB (assertFails — prova a correção da cota de 5MB)', async () => {
      const storage = testEnv.authenticatedContext('user-1', {
        email: 'user1@ufu.br',
        email_verified: true,
      }).storage();
      const fileRef = storage.ref('mission_photos/user-1/heavy.jpg');

      await assertFails(fileRef.put(heavyJpg, { contentType: 'image/jpeg' }));
    });

    it('participante tenta enviar foto no UID de outro usuário (assertFails)', async () => {
      const storage = testEnv.authenticatedContext('user-1', {
        email: 'user1@ufu.br',
        email_verified: true,
      }).storage();
      const fileRef = storage.ref('mission_photos/user-2/proof.jpg');

      await assertFails(fileRef.put(smallJpg, { contentType: 'image/jpeg' }));
    });
  });

  describe('Coleção /feed/{mediaType}/{fileName}', () => {
    const clipMp4 = new Uint8Array(10 * 1024 * 1024); // 10MB
    const bannerPng = new Uint8Array(1024);

    it('participante comum tenta subir vídeo de 10MB no feed (assertFails — prova fechamento de brecha)', async () => {
      const storage = testEnv.authenticatedContext('user-1', {
        email: 'user1@ufu.br',
        email_verified: true,
        role: 'PARTICIPANT',
      }).storage();
      const fileRef = storage.ref('feed/videos/video.mp4');

      await assertFails(fileRef.put(clipMp4, { contentType: 'video/mp4' }));
    });

    it('usuário não autenticado tenta subir mídia no feed (assertFails)', async () => {
      const storage = testEnv.unauthenticatedContext().storage();
      const fileRef = storage.ref('feed/videos/video.mp4');

      await assertFails(fileRef.put(clipMp4, { contentType: 'video/mp4' }));
    });

    it('usuário com role: SPONSOR sobe imagem permitida no feed (assertSucceeds)', async () => {
      const storage = testEnv.authenticatedContext('sponsor-1', {
        role: 'SPONSOR',
      }).storage();
      const fileRef = storage.ref('feed/images/sponsor-banner.png');

      await assertSucceeds(fileRef.put(bannerPng, { contentType: 'image/png' }));
    });

    it('usuário com role: STAFF sobe vídeo permitido no feed (assertSucceeds)', async () => {
      const storage = testEnv.authenticatedContext('staff-1', {
        role: 'STAFF',
      }).storage();
      const fileRef = storage.ref('feed/videos/staff-clip.mp4');

      await assertSucceeds(fileRef.put(clipMp4, { contentType: 'video/mp4' }));
    });

    it('usuário com role: ADMIN sobe vídeo permitido no feed (assertSucceeds)', async () => {
      const storage = testEnv.authenticatedContext('admin-1', {
        role: 'ADMIN',
      }).storage();
      const fileRef = storage.ref('feed/videos/admin-clip.mp4');

      await assertSucceeds(fileRef.put(clipMp4, { contentType: 'video/mp4' }));
    });

    it('leitura pública de mídia do feed (assertSucceeds para qualquer um)', async () => {
      const adminStorage = testEnv.authenticatedContext('admin-1', {
        role: 'ADMIN',
      }).storage();
      const adminFileRef = adminStorage.ref('feed/images/public-post.png');
      await adminFileRef.put(bannerPng, { contentType: 'image/png' });

      const unauthStorage = testEnv.unauthenticatedContext().storage();
      const publicFileRef = unauthStorage.ref('feed/images/public-post.png');

      await assertSucceeds(publicFileRef.getDownloadURL());
    });
  });
});

