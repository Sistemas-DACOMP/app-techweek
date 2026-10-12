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
    it('sponsor_visit valida token de visita a stand', async () => {
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

      const valid = await validateMissionProof(tx, {
        uid: 'me',
        missionId: 'sponsor_visit',
        eventType: 'challenge',
        referenceId: 'sponsor_visit',
        metadata: { scannedCode: 'kanastra_code' },
        userSnap,
        missionSnap
      });
      expect(valid.valid).toBe(true);
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
