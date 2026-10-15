import { describe, it, expect, vi, beforeEach } from 'vitest';
import { validateMissionProof } from './missionProofValidator';
import { db } from '../config/firebaseAdmin';

vi.mock('../config/firebaseAdmin', () => ({
  db: {
    collection: vi.fn()
  }
}));

describe('validateMissionProof (KAN-80)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  function makeMockTx(docs: Record<string, any> = {}) {
    return {
      get: vi.fn((ref: { path: string }) => {
        const data = docs[ref.path];
        return Promise.resolve({
          exists: data !== undefined,
          data: () => data
        });
      }),
      set: vi.fn(),
      update: vi.fn()
    } as any;
  }

  describe('Passaporte completo (sponsor_colecao)', () => {
    it('rejeita claim se o participante tem menos de 5 patrocinadores visitados e sem goldenTicket', async () => {
      const tx = makeMockTx();
      const userSnap = {
        exists: true,
        data: () => ({ visitedSponsors: { kanastra: true, levty: true } })
      } as any;
      const missionSnap = { exists: true, data: () => ({}) } as any;

      const result = await validateMissionProof(tx, {
        uid: 'user-1',
        missionId: 'sponsor_colecao',
        eventType: 'challenge',
        referenceId: 'sponsor_colecao',
        metadata: {},
        userSnap,
        missionSnap
      });

      expect(result.valid).toBe(false);
      if (!result.valid) {
        expect(result.error).toBe('INCOMPLETE_PASSPORT');
      }
    });

    it('permite claim se o participante possui 5 patrocinadores visitados', async () => {
      const tx = makeMockTx();
      const userSnap = {
        exists: true,
        data: () => ({
          visitedSponsors: { s1: true, s2: true, s3: true, s4: true, s5: true }
        })
      } as any;
      const missionSnap = { exists: true, data: () => ({}) } as any;

      const result = await validateMissionProof(tx, {
        uid: 'user-1',
        missionId: 'sponsor_colecao',
        eventType: 'challenge',
        referenceId: 'sponsor_colecao',
        metadata: {},
        userSnap,
        missionSnap
      });

      expect(result.valid).toBe(true);
    });

    it('permite claim se o participante possui goldenTicketAwarded: true', async () => {
      const tx = makeMockTx();
      const userSnap = {
        exists: true,
        data: () => ({ goldenTicketAwarded: true })
      } as any;
      const missionSnap = { exists: true, data: () => ({}) } as any;

      const result = await validateMissionProof(tx, {
        uid: 'user-1',
        missionId: 'sponsor_colecao',
        eventType: 'challenge',
        referenceId: 'sponsor_colecao',
        metadata: {},
        userSnap,
        missionSnap
      });

      expect(result.valid).toBe(true);
    });
  });

  describe('Missões com Foto (social_mascot_photo, instagram_story)', () => {
    it('rejeita se photo_url / photo não foi informado', async () => {
      const tx = makeMockTx();
      const userSnap = { exists: true, data: () => ({}) } as any;
      const missionSnap = { exists: true, data: () => ({}) } as any;

      const result = await validateMissionProof(tx, {
        uid: 'user-1',
        missionId: 'instagram_story',
        eventType: 'challenge',
        referenceId: 'instagram_story',
        metadata: {},
        userSnap,
        missionSnap
      });

      expect(result.valid).toBe(false);
      if (!result.valid) {
        expect(result.error).toBe('MISSING_PHOTO_PROOF');
      }
    });

    it('rejeita se a URL da foto for inválida (ex: data: malformada ou texto simples)', async () => {
      const tx = makeMockTx();
      const userSnap = { exists: true, data: () => ({}) } as any;
      const missionSnap = { exists: true, data: () => ({}) } as any;

      const result = await validateMissionProof(tx, {
        uid: 'user-1',
        missionId: 'social_mascot_photo',
        eventType: 'challenge',
        referenceId: 'social_mascot_photo',
        metadata: { photo_url: 'javascript:alert(1)' },
        userSnap,
        missionSnap
      });

      expect(result.valid).toBe(false);
      if (!result.valid) {
        expect(result.error).toBe('INVALID_PHOTO_URL');
      }
    });

    it('aceita foto com URL válida do Firebase Storage / HTTPS', async () => {
      const tx = makeMockTx();
      const userSnap = { exists: true, data: () => ({}) } as any;
      const missionSnap = { exists: true, data: () => ({}) } as any;

      const result = await validateMissionProof(tx, {
        uid: 'user-1',
        missionId: 'social_mascot_photo',
        eventType: 'challenge',
        referenceId: 'social_mascot_photo',
        metadata: { photo_url: 'https://firebasestorage.googleapis.com/v0/b/bucket/o/photo.jpg' },
        userSnap,
        missionSnap
      });

      expect(result.valid).toBe(true);
    });

    it('em ambiente de desenvolvimento/teste aceita blob: e localhost', async () => {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'test';
      try {
        const tx = makeMockTx();
        const userSnap = { exists: true, data: () => ({}) } as any;
        const missionSnap = { exists: true, data: () => ({}) } as any;

        const blobRes = await validateMissionProof(tx, {
          uid: 'user-1',
          missionId: 'social_mascot_photo',
          eventType: 'challenge',
          referenceId: 'social_mascot_photo',
          metadata: { photo_url: 'blob:http://localhost:5173/12345-6789' },
          userSnap,
          missionSnap
        });
        expect(blobRes.valid).toBe(true);

        const localRes = await validateMissionProof(tx, {
          uid: 'user-1',
          missionId: 'social_mascot_photo',
          eventType: 'challenge',
          referenceId: 'social_mascot_photo',
          metadata: { photo_url: 'http://localhost:5000/uploads/photo.jpg' },
          userSnap,
          missionSnap
        });
        expect(localRes.valid).toBe(true);
      } finally {
        process.env.NODE_ENV = originalEnv;
      }
    });

    it('em produção rejeita estritamente blob: e http://localhost (ERR-056)', async () => {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'production';
      try {
        const tx = makeMockTx();
        const userSnap = { exists: true, data: () => ({}) } as any;
        const missionSnap = { exists: true, data: () => ({}) } as any;

        const blobRes = await validateMissionProof(tx, {
          uid: 'user-1',
          missionId: 'social_mascot_photo',
          eventType: 'challenge',
          referenceId: 'social_mascot_photo',
          metadata: { photo_url: 'blob:https://facom-techweek.web.app/fake-proof' },
          userSnap,
          missionSnap
        });
        expect(blobRes.valid).toBe(false);
        if (!blobRes.valid) {
          expect(blobRes.error).toBe('INVALID_PHOTO_URL');
        }

        const localRes = await validateMissionProof(tx, {
          uid: 'user-1',
          missionId: 'social_mascot_photo',
          eventType: 'challenge',
          referenceId: 'social_mascot_photo',
          metadata: { photo_url: 'http://localhost:5000/photo.jpg' },
          userSnap,
          missionSnap
        });
        expect(localRes.valid).toBe(false);
        if (!localRes.valid) {
          expect(localRes.error).toBe('INVALID_PHOTO_URL');
        }

        // URL HTTPS do Firebase Storage oficial é aceita em produção
        const prodStorageRes = await validateMissionProof(tx, {
          uid: 'user-1',
          missionId: 'social_mascot_photo',
          eventType: 'challenge',
          referenceId: 'social_mascot_photo',
          metadata: { photo_url: 'https://firebasestorage.googleapis.com/v0/b/facom-techweek.appspot.com/o/mission_photos%2Fphoto.jpg' },
          userSnap,
          missionSnap
        });
        expect(prodStorageRes.valid).toBe(true);
      } finally {
        process.env.NODE_ENV = originalEnv;
      }
    });
  });

  describe('Palavra Secreta (secret_password)', () => {
    it('rejeita se secretWord não foi enviada no metadata', async () => {
      const tx = makeMockTx();
      const userSnap = { exists: true, data: () => ({}) } as any;
      const missionSnap = { exists: true, data: () => ({}) } as any;

      const result = await validateMissionProof(tx, {
        uid: 'user-1',
        missionId: 'secret_password',
        eventType: 'challenge',
        referenceId: 'secret_password',
        metadata: {},
        userSnap,
        missionSnap
      });

      expect(result.valid).toBe(false);
      if (!result.valid) {
        expect(result.error).toBe('MISSING_SECRET_WORD');
      }
    });

    it('valida com fallback "OPORTUNIDADES" quando secret doc não existe', async () => {
      const tx = makeMockTx();
      (db.collection as any).mockImplementation((col: string) => ({
        doc: (id: string) => ({ path: `${col}/${id}` })
      }));
      const userSnap = { exists: true, data: () => ({}) } as any;
      const missionSnap = { exists: true, data: () => ({}) } as any;

      // Palavra errada
      const wrongResult = await validateMissionProof(tx, {
        uid: 'user-1',
        missionId: 'secret_password',
        eventType: 'challenge',
        referenceId: 'secret_password',
        metadata: { secretWord: 'ERRADA' },
        userSnap,
        missionSnap
      });
      expect(wrongResult.valid).toBe(false);
      if (!wrongResult.valid) {
        expect(wrongResult.error).toBe('INVALID_SECRET_WORD');
      }

      // Palavra certa (case-insensitive e trimmed)
      const correctResult = await validateMissionProof(tx, {
        uid: 'user-1',
        missionId: 'secret_password',
        eventType: 'challenge',
        referenceId: 'secret_password',
        metadata: { secretWord: ' oportunidades ' },
        userSnap,
        missionSnap
      });
      expect(correctResult.valid).toBe(true);
    });

    it('valida contra /mission_secrets/{missionId} quando configurado', async () => {
      const tx = makeMockTx({
        'mission_secrets/secret_password': { secretWord: 'TECHWEEK2026' }
      });
      (db.collection as any).mockImplementation((col: string) => ({
        doc: (id: string) => ({ path: `${col}/${id}` })
      }));
      const userSnap = { exists: true, data: () => ({}) } as any;
      const missionSnap = { exists: true, data: () => ({}) } as any;

      const result = await validateMissionProof(tx, {
        uid: 'user-1',
        missionId: 'secret_password',
        eventType: 'challenge',
        referenceId: 'secret_password',
        metadata: { secretWord: 'TECHWEEK2026' },
        userSnap,
        missionSnap
      });

      expect(result.valid).toBe(true);
    });
  });

  describe('Quiz (sponsor_quiz_levty)', () => {
    it('rejeita se quizAnswer ausente', async () => {
      const tx = makeMockTx();
      const userSnap = { exists: true, data: () => ({}) } as any;
      const missionSnap = { exists: true, data: () => ({}) } as any;

      const result = await validateMissionProof(tx, {
        uid: 'user-1',
        missionId: 'sponsor_quiz_levty',
        eventType: 'challenge',
        referenceId: 'sponsor_quiz_levty',
        metadata: {},
        userSnap,
        missionSnap
      });

      expect(result.valid).toBe(false);
      if (!result.valid) {
        expect(result.error).toBe('MISSING_QUIZ_ANSWER');
      }
    });

    it('valida alternativa correta com fallback 0', async () => {
      const tx = makeMockTx();
      (db.collection as any).mockImplementation((col: string) => ({
        doc: (id: string) => ({ path: `${col}/${id}` })
      }));
      const userSnap = { exists: true, data: () => ({}) } as any;
      const missionSnap = { exists: true, data: () => ({}) } as any;

      const wrong = await validateMissionProof(tx, {
        uid: 'user-1',
        missionId: 'sponsor_quiz_levty',
        eventType: 'challenge',
        referenceId: 'sponsor_quiz_levty',
        metadata: { quizAnswer: 2 },
        userSnap,
        missionSnap
      });
      expect(wrong.valid).toBe(false);
      if (!wrong.valid) {
        expect(wrong.error).toBe('INCORRECT_QUIZ_ANSWER');
      }

      const correct = await validateMissionProof(tx, {
        uid: 'user-1',
        missionId: 'sponsor_quiz_levty',
        eventType: 'challenge',
        referenceId: 'sponsor_quiz_levty',
        metadata: { quizAnswer: 0 },
        userSnap,
        missionSnap
      });
      expect(correct.valid).toBe(true);
    });
  });

  describe('Networking (network_*)', () => {
    it('rejeita se targetUid / targetUsername ausente', async () => {
      const tx = makeMockTx();
      const userSnap = { exists: true, data: () => ({ uid: 'me' }) } as any;
      const missionSnap = { exists: true, data: () => ({ triggerMode: 'auto' }) } as any;

      const result = await validateMissionProof(tx, {
        uid: 'me',
        missionId: 'network_first',
        eventType: 'scan',
        referenceId: 'scan',
        metadata: {},
        userSnap,
        missionSnap
      });

      expect(result.valid).toBe(false);
      if (!result.valid) {
        expect(result.error).toBe('MISSING_NETWORKING_TARGET');
      }
    });

    it('proíbe auto-networking (conectar consigo mesmo por targetUid ou targetUsername)', async () => {
      const tx = makeMockTx();
      const userSnap = { exists: true, data: () => ({ uid: 'me', username: 'erick' }) } as any;
      const missionSnap = { exists: true, data: () => ({ triggerMode: 'auto' }) } as any;

      const byUid = await validateMissionProof(tx, {
        uid: 'me',
        missionId: 'network_first',
        eventType: 'scan',
        referenceId: 'scan',
        metadata: { targetUid: 'me' },
        userSnap,
        missionSnap
      });
      expect(byUid.valid).toBe(false);
      if (!byUid.valid) {
        expect(byUid.error).toBe('SELF_NETWORKING_FORBIDDEN');
      }

      const byUsername = await validateMissionProof(tx, {
        uid: 'me',
        missionId: 'network_first',
        eventType: 'scan',
        referenceId: 'scan',
        metadata: { targetUid: 'other', targetUsername: 'Erick' },
        userSnap,
        missionSnap
      });
      expect(byUsername.valid).toBe(false);
      if (!byUsername.valid) {
        expect(byUsername.error).toBe('SELF_NETWORKING_FORBIDDEN');
      }
    });

    it('network_course valida que cursos são diferentes', async () => {
      const tx = makeMockTx({
        'users/target-1': { course: 'Ciência da Computação' },
        'users/target-2': { course: 'Engenharia Biomédica' }
      });
      (db.collection as any).mockImplementation((col: string) => ({
        doc: (id: string) => ({ path: `${col}/${id}` })
      }));
      const userSnap = { exists: true, data: () => ({ course: 'Ciência da Computação' }) } as any;
      const missionSnap = { exists: true, data: () => ({}) } as any;

      // Mesmo curso
      const sameCourse = await validateMissionProof(tx, {
        uid: 'me',
        missionId: 'network_course',
        eventType: 'scan',
        referenceId: 'scan',
        metadata: { targetUid: 'target-1' },
        userSnap,
        missionSnap
      });
      expect(sameCourse.valid).toBe(false);
      if (!sameCourse.valid) {
        expect(sameCourse.error).toBe('CRITERIA_NOT_MET');
      }

      // Curso diferente
      const diffCourse = await validateMissionProof(tx, {
        uid: 'me',
        missionId: 'network_course',
        eventType: 'scan',
        referenceId: 'scan',
        metadata: { targetUid: 'target-2' },
        userSnap,
        missionSnap
      });
      expect(diffCourse.valid).toBe(true);
    });

    it('network_period valida que participante é do 1º período', async () => {
      const tx = makeMockTx({
        'users/senior': { period: 6 },
        'users/calouro': { period: 1 }
      });
      (db.collection as any).mockImplementation((col: string) => ({
        doc: (id: string) => ({ path: `${col}/${id}` })
      }));
      const userSnap = { exists: true, data: () => ({}) } as any;
      const missionSnap = { exists: true, data: () => ({}) } as any;

      const nonCalouro = await validateMissionProof(tx, {
        uid: 'me',
        missionId: 'network_period',
        eventType: 'scan',
        referenceId: 'scan',
        metadata: { targetUid: 'senior' },
        userSnap,
        missionSnap
      });
      expect(nonCalouro.valid).toBe(false);

      const calouro = await validateMissionProof(tx, {
        uid: 'me',
        missionId: 'network_period',
        eventType: 'scan',
        referenceId: 'scan',
        metadata: { targetUid: 'calouro' },
        userSnap,
        missionSnap
      });
      expect(calouro.valid).toBe(true);
    });

    it('network_course reporta INCOMPLETE_PROFILE se perfil do usuário ou alvo estiver sem curso (ERR-057)', async () => {
      const tx = makeMockTx({
        'users/no-course': {},
        'users/with-course': { curso: 'Engenharia de Software' }
      });
      (db.collection as any).mockImplementation((col: string) => ({
        doc: (id: string) => ({ path: `${col}/${id}` })
      }));
      const missionSnap = { exists: true, data: () => ({}) } as any;

      // Usuário atual sem curso
      const emptyUserRes = await validateMissionProof(tx, {
        uid: 'me',
        missionId: 'network_course',
        eventType: 'scan',
        referenceId: 'scan',
        metadata: { targetUid: 'with-course' },
        userSnap: { exists: true, data: () => ({}) } as any,
        missionSnap
      });
      expect(emptyUserRes.valid).toBe(false);
      if (!emptyUserRes.valid) {
        expect(emptyUserRes.error).toBe('INCOMPLETE_PROFILE');
      }

      // Alvo sem curso
      const emptyTargetRes = await validateMissionProof(tx, {
        uid: 'me',
        missionId: 'network_course',
        eventType: 'scan',
        referenceId: 'scan',
        metadata: { targetUid: 'no-course' },
        userSnap: { exists: true, data: () => ({ course: 'Ciência da Computação' }) } as any,
        missionSnap
      });
      expect(emptyTargetRes.valid).toBe(false);
      if (!emptyTargetRes.valid) {
        expect(emptyTargetRes.error).toBe('INCOMPLETE_PROFILE');
      }

      // Sucesso com curso preenchido em curso vs course
      const successRes = await validateMissionProof(tx, {
        uid: 'me',
        missionId: 'network_course',
        eventType: 'scan',
        referenceId: 'scan',
        metadata: { targetUid: 'with-course' },
        userSnap: { exists: true, data: () => ({ curso: 'Ciência da Computação' }) } as any,
        missionSnap
      });
      expect(successRes.valid).toBe(true);
    });

    it('network_period lida com períodos como string (ex: "1", "1º") e reporta perfil incompleto (ERR-057)', async () => {
      const tx = makeMockTx({
        'users/string-calouro': { period: '1' },
        'users/ordinal-calouro': { periodo: '1º período' },
        'users/no-period': {},
        'users/other-period': { period: '3º' }
      });
      (db.collection as any).mockImplementation((col: string) => ({
        doc: (id: string) => ({ path: `${col}/${id}` })
      }));
      const userSnap = { exists: true, data: () => ({}) } as any;
      const missionSnap = { exists: true, data: () => ({}) } as any;

      const strRes = await validateMissionProof(tx, {
        uid: 'me',
        missionId: 'network_period',
        eventType: 'scan',
        referenceId: 'scan',
        metadata: { targetUid: 'string-calouro' },
        userSnap,
        missionSnap
      });
      expect(strRes.valid).toBe(true);

      const ordRes = await validateMissionProof(tx, {
        uid: 'me',
        missionId: 'network_period',
        eventType: 'scan',
        referenceId: 'scan',
        metadata: { targetUid: 'ordinal-calouro' },
        userSnap,
        missionSnap
      });
      expect(ordRes.valid).toBe(true);

      const noPeriodRes = await validateMissionProof(tx, {
        uid: 'me',
        missionId: 'network_period',
        eventType: 'scan',
        referenceId: 'scan',
        metadata: { targetUid: 'no-period' },
        userSnap,
        missionSnap
      });
      expect(noPeriodRes.valid).toBe(false);
      if (!noPeriodRes.valid) {
        expect(noPeriodRes.error).toBe('INCOMPLETE_PROFILE');
      }

      const otherRes = await validateMissionProof(tx, {
        uid: 'me',
        missionId: 'network_period',
        eventType: 'scan',
        referenceId: 'scan',
        metadata: { targetUid: 'other-period' },
        userSnap,
        missionSnap
      });
      expect(otherRes.valid).toBe(false);
      if (!otherRes.valid) {
        expect(otherRes.error).toBe('CRITERIA_NOT_MET');
      }
    });

    it('network_type valida tipo de participante externo à UFU', async () => {
      const tx = makeMockTx({
        'users/aluno-ufu': { participantType: 'Aluno da UFU' },
        'users/externo': { participantType: 'Empresa Parceira' },
        'users/sem-tipo': {}
      });
      (db.collection as any).mockImplementation((col: string) => ({
        doc: (id: string) => ({ path: `${col}/${id}` })
      }));
      const userSnap = { exists: true, data: () => ({}) } as any;
      const missionSnap = { exists: true, data: () => ({}) } as any;

      const ufuRes = await validateMissionProof(tx, {
        uid: 'me',
        missionId: 'network_type',
        eventType: 'scan',
        referenceId: 'scan',
        metadata: { targetUid: 'aluno-ufu' },
        userSnap,
        missionSnap
      });
      expect(ufuRes.valid).toBe(false);
      if (!ufuRes.valid) {
        expect(ufuRes.error).toBe('CRITERIA_NOT_MET');
      }

      const extRes = await validateMissionProof(tx, {
        uid: 'me',
        missionId: 'network_type',
        eventType: 'scan',
        referenceId: 'scan',
        metadata: { targetUid: 'externo' },
        userSnap,
        missionSnap
      });
      expect(extRes.valid).toBe(true);

      const emptyRes = await validateMissionProof(tx, {
        uid: 'me',
        missionId: 'network_type',
        eventType: 'scan',
        referenceId: 'scan',
        metadata: { targetUid: 'sem-tipo' },
        userSnap,
        missionSnap
      });
      expect(emptyRes.valid).toBe(false);
      if (!emptyRes.valid) {
        expect(emptyRes.error).toBe('INCOMPLETE_PROFILE');
      }
    });

    it('trata erro de transação/I/O na busca do usuário alvo graciosamente (ERR-057)', async () => {
      const tx = {
        get: vi.fn().mockRejectedValue(new Error('Firestore timeout / network error'))
      } as any;
      (db.collection as any).mockImplementation((col: string) => ({
        doc: (id: string) => ({ path: `${col}/${id}` })
      }));
      const userSnap = { exists: true, data: () => ({}) } as any;
      const missionSnap = { exists: true, data: () => ({}) } as any;

      const result = await validateMissionProof(tx, {
        uid: 'me',
        missionId: 'network_first',
        eventType: 'scan',
        referenceId: 'scan',
        metadata: { targetUid: 'target-error' },
        userSnap,
        missionSnap
      });

      expect(result.valid).toBe(false);
      if (!result.valid) {
        expect(result.error).toBe('TARGET_LOOKUP_FAILED');
      }
    });
  });

  describe('Formulários (sponsor_vaga, sponsor_tecnologia)', () => {
    it('sponsor_vaga exige company no metadata', async () => {
      const tx = makeMockTx();
      const userSnap = { exists: true, data: () => ({}) } as any;
      const missionSnap = { exists: true, data: () => ({}) } as any;

      const empty = await validateMissionProof(tx, {
        uid: 'me',
        missionId: 'sponsor_vaga',
        eventType: 'challenge',
        referenceId: 'sponsor_vaga',
        metadata: {},
        userSnap,
        missionSnap
      });
      expect(empty.valid).toBe(false);
      if (!empty.valid) {
        expect(empty.error).toBe('INCOMPLETE_FORM');
      }

      const valid = await validateMissionProof(tx, {
        uid: 'me',
        missionId: 'sponsor_vaga',
        eventType: 'challenge',
        referenceId: 'sponsor_vaga',
        metadata: { company: 'Levty' },
        userSnap,
        missionSnap
      });
      expect(valid.valid).toBe(true);
    });

    it('sponsor_tecnologia exige company e response com min 5 caracteres', async () => {
      const tx = makeMockTx();
      const userSnap = { exists: true, data: () => ({}) } as any;
      const missionSnap = { exists: true, data: () => ({}) } as any;

      const short = await validateMissionProof(tx, {
        uid: 'me',
        missionId: 'sponsor_tecnologia',
        eventType: 'challenge',
        referenceId: 'sponsor_tecnologia',
        metadata: { company: 'Kanastra', response: 'abc' },
        userSnap,
        missionSnap
      });
      expect(short.valid).toBe(false);

      const valid = await validateMissionProof(tx, {
        uid: 'me',
        missionId: 'sponsor_tecnologia',
        eventType: 'challenge',
        referenceId: 'sponsor_tecnologia',
        metadata: { company: 'Kanastra', response: 'Elixir e Kafka' },
        userSnap,
        missionSnap
      });
      expect(valid.valid).toBe(true);
    });
  });

  describe('Stands e Caça ao QR (sponsor_visit, secret_qr)', () => {
    it('sponsor_visit valida token de visita a stand e aceita patrocinadores parceiros (ERR-056)', async () => {
      const tx = makeMockTx();
      const userSnap = { exists: true, data: () => ({}) } as any;
      const missionSnap = { exists: true, data: () => ({}) } as any;

      const invalid = await validateMissionProof(tx, {
        uid: 'me',
        missionId: 'sponsor_visit',
        eventType: 'challenge',
        referenceId: 'sponsor_visit',
        metadata: { scannedCode: 'qualquer_coisa' },
        userSnap,
        missionSnap
      });
      expect(invalid.valid).toBe(false);
      if (!invalid.valid) {
        expect(invalid.error).toBe('INVALID_QR_CODE');
      }

      // Stand padrão Kanastra
      const validKanastra = await validateMissionProof(tx, {
        uid: 'me',
        missionId: 'sponsor_visit',
        eventType: 'challenge',
        referenceId: 'sponsor_visit',
        metadata: { scannedCode: 'kanastra_code' },
        userSnap,
        missionSnap
      });
      expect(validKanastra.valid).toBe(true);

      // Patrocinadores parceiros (Levty, Bayer, Hyperflow, etc.)
      const validLevty = await validateMissionProof(tx, {
        uid: 'me',
        missionId: 'sponsor_visit',
        eventType: 'challenge',
        referenceId: 'sponsor_visit',
        metadata: { scannedCode: 'levty_code' },
        userSnap,
        missionSnap
      });
      expect(validLevty.valid).toBe(true);

      const validBayer = await validateMissionProof(tx, {
        uid: 'me',
        missionId: 'sponsor_visit',
        eventType: 'challenge',
        referenceId: 'sponsor_visit',
        metadata: { scannedCode: 'sponsor_bayer' },
        userSnap,
        missionSnap
      });
      expect(validBayer.valid).toBe(true);

      // Patrocinador configurado em autoConfig.targetId
      const customMissionSnap = {
        exists: true,
        data: () => ({ autoConfig: { targetId: 'EmpresaX' } })
      } as any;
      const validCustomTarget = await validateMissionProof(tx, {
        uid: 'me',
        missionId: 'sponsor_visit',
        eventType: 'challenge',
        referenceId: 'sponsor_visit',
        metadata: { scannedCode: 'visita_EmpresaX_2026' },
        userSnap,
        missionSnap: customMissionSnap
      });
      expect(validCustomTarget.valid).toBe(true);

      // Códigos customizados em missionData.validCodes
      const codesMissionSnap = {
        exists: true,
        data: () => ({ validCodes: ['STAND_CODE_ABC_123'] })
      } as any;
      const validCodeList = await validateMissionProof(tx, {
        uid: 'me',
        missionId: 'sponsor_visit',
        eventType: 'challenge',
        referenceId: 'sponsor_visit',
        metadata: { scannedCode: 'STAND_CODE_ABC_123' },
        userSnap,
        missionSnap: codesMissionSnap
      });
      expect(validCodeList.valid).toBe(true);
    });

    it('secret_qr valida token do QR code secreto', async () => {
      const tx = makeMockTx();
      const userSnap = { exists: true, data: () => ({}) } as any;
      const missionSnap = { exists: true, data: () => ({}) } as any;

      const invalid = await validateMissionProof(tx, {
        uid: 'me',
        missionId: 'secret_qr',
        eventType: 'challenge',
        referenceId: 'secret_qr',
        metadata: { scannedCode: '123' },
        userSnap,
        missionSnap
      });
      expect(invalid.valid).toBe(false);
      if (!invalid.valid) {
        expect(invalid.error).toBe('INVALID_QR_CODE');
      }

      const valid = await validateMissionProof(tx, {
        uid: 'me',
        missionId: 'secret_qr',
        eventType: 'challenge',
        referenceId: 'secret_qr',
        metadata: { scannedCode: 'secret_qr_code' },
        userSnap,
        missionSnap
      });
      expect(valid.valid).toBe(true);
    });
  });
});
