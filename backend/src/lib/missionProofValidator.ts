import { Transaction, DocumentSnapshot } from 'firebase-admin/firestore';
import { db } from '../config/firebaseAdmin';

export interface ProofValidationContext {
  uid: string;
  missionId: string;
  eventType: string;
  referenceId: string;
  metadata: any;
  userSnap: DocumentSnapshot;
  missionSnap: DocumentSnapshot;
}

export type ProofValidationResult =
  | { valid: true }
  | { valid: false; error: string; message: string; statusCode?: number };

/**
 * Validador server-side de comprovação de conclusão de missões (KAN-80).
 * Executado dentro da transação do Firestore antes de qualquer gravação de pontos.
 */
export async function validateMissionProof(
  tx: Transaction,
  ctx: ProofValidationContext
): Promise<ProofValidationResult> {
  const { uid, missionId, referenceId, metadata, userSnap, missionSnap } = ctx;
  const userData = (typeof userSnap?.data === 'function' ? (userSnap.data() || {}) : {}) as Record<string, any>;
  const missionData = (missionSnap?.exists && typeof missionSnap?.data === 'function' ? (missionSnap.data() || {}) : {}) as Record<string, any>;

  // 1. Passaporte completo (sponsor_colecao)
  if (missionId === 'sponsor_colecao') {
    const visited = userData.visitedSponsors || {};
    const goldenTicket = userData.goldenTicketAwarded === true;
    const visitedCount = Object.keys(visited).length;

    // Exige carimbo de todas as 5 empresas parceiras ou status de Golden Ticket
    if (!goldenTicket && visitedCount < 5) {
      return {
        valid: false,
        error: 'INCOMPLETE_PASSPORT',
        message: 'Para resgatar esta missão, é necessário completar as visitas do passaporte a todos os 5 patrocinadores.'
      };
    }
    return { valid: true };
  }

  // 2. Missões com Foto (social_mascot_photo, instagram_story ou fields com type 'photo')
  const hasPhotoField =
    missionId === 'social_mascot_photo' ||
    missionId === 'instagram_story' ||
    (Array.isArray(missionData.fields) && missionData.fields.some((f: any) => f?.type === 'photo'));

  if (hasPhotoField) {
    const photoUrl = metadata?.photo_url || metadata?.photo;
    if (typeof photoUrl !== 'string' || !photoUrl.trim()) {
      return {
        valid: false,
        error: 'MISSING_PHOTO_PROOF',
        message: 'Comprovação com foto é obrigatória para esta missão.'
      };
    }

    const cleanUrl = photoUrl.trim();
    const isValidStorageUrl =
      cleanUrl.includes('firebasestorage.googleapis.com') ||
      cleanUrl.includes('mission_photos') ||
      cleanUrl.includes('/b/') ||
      cleanUrl.startsWith('http://localhost') ||
      cleanUrl.startsWith('http://127.0.0.1') ||
      cleanUrl.startsWith('blob:') ||
      cleanUrl.startsWith('https://');

    if (!isValidStorageUrl || (!cleanUrl.startsWith('http://') && !cleanUrl.startsWith('https://') && !cleanUrl.startsWith('blob:'))) {
      return {
        valid: false,
        error: 'INVALID_PHOTO_URL',
        message: 'URL da foto de comprovação é inválida.'
      };
    }
    return { valid: true };
  }

  // 3. Palavra Secreta (secret_password ou triggerMode === 'secret' ou isSecret === true)
  if (missionId === 'secret_password' || missionData.triggerMode === 'secret' || missionData.isSecret === true) {
    const inputWord =
      typeof metadata?.secretWord === 'string'
        ? metadata.secretWord
        : typeof metadata?.password === 'string'
          ? metadata.password
          : null;

    if (!inputWord || !inputWord.trim()) {
      return {
        valid: false,
        error: 'MISSING_SECRET_WORD',
        message: 'A palavra-chave secreta deve ser informada no envio da missão.'
      };
    }

    // Busca a palavra secreta na coleção protegida /mission_secrets/{missionId}
    let expectedSecretWord: string | undefined;
    try {
      const secretRef = db.collection('mission_secrets').doc(missionId);
      const secretSnap = await tx.get(secretRef);
      if (secretSnap.exists) {
        expectedSecretWord = typeof secretSnap.data === 'function' ? secretSnap.data()?.secretWord : (secretSnap as any)?.secretWord;
      }
    } catch (_e) {
      // Ignora erro de transação se a collection ainda não tiver dados
    }

    if (!expectedSecretWord && missionData.secretConfig?.secretWord) {
      expectedSecretWord = missionData.secretConfig.secretWord;
    }

    if (!expectedSecretWord && missionId === 'secret_password') {
      expectedSecretWord = 'OPORTUNIDADES';
    }

    if (!expectedSecretWord) {
      return { valid: true };
    }

    if (inputWord.trim().toUpperCase() !== expectedSecretWord.trim().toUpperCase()) {
      return {
        valid: false,
        error: 'INVALID_SECRET_WORD',
        message: 'A palavra-chave secreta fornecida está incorreta.'
      };
    }
    return { valid: true };
  }

  // 4. Quiz (sponsor_quiz_levty ou triggerMode === 'quiz' ou quizConfig)
  if (missionId === 'sponsor_quiz_levty' || missionData.triggerMode === 'quiz' || missionData.quizConfig) {
    const rawAnswer = metadata?.quizAnswer ?? metadata?.selectedOptionIndex;
    if (rawAnswer === undefined || rawAnswer === null || rawAnswer === '') {
      return {
        valid: false,
        error: 'MISSING_QUIZ_ANSWER',
        message: 'A resposta do quiz deve ser informada.'
      };
    }

    const selectedOptionIndex = Number(rawAnswer);
    if (!Number.isInteger(selectedOptionIndex) || selectedOptionIndex < 0) {
      return {
        valid: false,
        error: 'INVALID_QUIZ_ANSWER',
        message: 'A alternativa selecionada é inválida.'
      };
    }

    let expectedCorrectIndex: number | undefined;
    try {
      const secretRef = db.collection('mission_secrets').doc(missionId);
      const secretSnap = await tx.get(secretRef);
      if (secretSnap.exists) {
        expectedCorrectIndex = typeof secretSnap.data === 'function' ? secretSnap.data()?.correctOptionIndex : (secretSnap as any)?.correctOptionIndex;
      }
    } catch (_e) {}

    if (expectedCorrectIndex === undefined && missionData.quizConfig?.correctOptionIndex !== undefined) {
      expectedCorrectIndex = Number(missionData.quizConfig.correctOptionIndex);
    }

    if (expectedCorrectIndex === undefined && missionId === 'sponsor_quiz_levty') {
      expectedCorrectIndex = 0;
    }

    if (expectedCorrectIndex !== undefined && selectedOptionIndex !== expectedCorrectIndex) {
      return {
        valid: false,
        error: 'INCORRECT_QUIZ_ANSWER',
        message: 'A alternativa selecionada está incorreta.'
      };
    }
    return { valid: true };
  }

  // 5. Networking Automático (network_first, network_course, network_type, network_period)
  if (
    missionId.startsWith('network_') &&
    (missionData.triggerMode === 'auto' || ['network_first', 'network_course', 'network_type', 'network_period'].includes(missionId))
  ) {
    const targetUid = metadata?.targetUid;
    const targetUsername = metadata?.targetUsername;

    if (!targetUid && !targetUsername) {
      return {
        valid: false,
        error: 'MISSING_NETWORKING_TARGET',
        message: 'Identificação do participante conectado é obrigatória.'
      };
    }

    // Proíbe auto-networking (conectar consigo mesmo)
    if (targetUid && targetUid === uid) {
      return {
        valid: false,
        error: 'SELF_NETWORKING_FORBIDDEN',
        message: 'Não é permitido registrar conexão consigo mesmo.'
      };
    }

    const currentUsername = userData.username;
    if (targetUsername && currentUsername && targetUsername.toLowerCase() === currentUsername.toLowerCase()) {
      return {
        valid: false,
        error: 'SELF_NETWORKING_FORBIDDEN',
        message: 'Não é permitido registrar conexão consigo mesmo.'
      };
    }

    // Busca o perfil do usuário alvo no Firestore
    let targetData: any = null;
    if (targetUid) {
      const targetUserRef = db.collection('users').doc(targetUid);
      const targetSnap = await tx.get(targetUserRef);
      if (targetSnap.exists) {
        targetData = typeof targetSnap.data === 'function' ? targetSnap.data() : (targetSnap as any);
      }
    }

    // Fallback: se não encontrou por doc(targetUid), mas enviou perfil escaneado
    if (!targetData && metadata?.scannedProfile) {
      targetData = metadata.scannedProfile;
    }

    if (!targetData && !targetUid && targetUsername) {
      // Perfil não resolvido
      return {
        valid: false,
        error: 'TARGET_PARTICIPANT_NOT_FOUND',
        message: 'Participante da conexão não encontrado.'
      };
    }

    if (missionId === 'network_first') {
      return { valid: true };
    }

    if (missionId === 'network_course') {
      const myCourse = (userData.course || '').trim().toLowerCase();
      const targetCourse = (targetData?.course || targetData?.curso || '').trim().toLowerCase();
      if (!myCourse || !targetCourse || myCourse === targetCourse) {
        return {
          valid: false,
          error: 'CRITERIA_NOT_MET',
          message: 'Esta missão requer conexão com um participante de curso diferente do seu.'
        };
      }
      return { valid: true };
    }

    if (missionId === 'network_type') {
      const targetType = (targetData?.participantType || targetData?.participant_type || '').trim();
      if (!targetType || targetType === 'Aluno da UFU') {
        return {
          valid: false,
          error: 'CRITERIA_NOT_MET',
          message: 'Esta missão requer conexão com participante de outra instituição ou empresa.'
        };
      }
      return { valid: true };
    }

    if (missionId === 'network_period') {
      const targetPeriod = Number(targetData?.period ?? targetData?.periodo);
      if (targetPeriod !== 1) {
        return {
          valid: false,
          error: 'CRITERIA_NOT_MET',
          message: 'Esta missão requer conexão com participante do 1º período (calouro).'
        };
      }
      return { valid: true };
    }

    return { valid: true };
  }

  // 6. Formulários de Texto e Perguntas (sponsor_vaga, sponsor_tecnologia, network_career, etc.)
  if (
    missionData.triggerMode === 'form' ||
    ['sponsor_vaga', 'sponsor_tecnologia', 'network_career', 'network_connect_two', 'network_past_edition', 'network_first_edition'].includes(missionId)
  ) {
    if (missionId === 'sponsor_vaga') {
      const company = metadata?.company;
      if (typeof company !== 'string' || !company.trim()) {
        return {
          valid: false,
          error: 'INCOMPLETE_FORM',
          message: 'Por favor, selecione a empresa visitada.'
        };
      }
      return { valid: true };
    }

    if (missionId === 'sponsor_tecnologia') {
      const company = metadata?.company;
      const response = metadata?.response;
      if (typeof company !== 'string' || !company.trim() || typeof response !== 'string' || response.trim().length < 5) {
        return {
          valid: false,
          error: 'INCOMPLETE_FORM',
          message: 'Por favor, informe a empresa e a tecnologia descoberta (mínimo de 5 caracteres).'
        };
      }
      return { valid: true };
    }

    if (['network_career', 'network_past_edition', 'network_first_edition'].includes(missionId)) {
      const p1 = metadata?.prompt1;
      const p2 = metadata?.prompt2;
      if (typeof p1 !== 'string' || !p1.trim() || typeof p2 !== 'string' || p2.trim().length < 3) {
        return {
          valid: false,
          error: 'INCOMPLETE_FORM',
          message: 'Por favor, responda a todos os campos solicitados da missão.'
        };
      }
      return { valid: true };
    }

    if (missionId === 'network_connect_two') {
      const p1 = metadata?.prompt1;
      const p2 = metadata?.prompt2;
      if (typeof p1 !== 'string' || !p1.trim() || typeof p2 !== 'string' || !p2.trim()) {
        return {
          valid: false,
          error: 'INCOMPLETE_FORM',
          message: 'Por favor, informe o usuário das duas pessoas apresentadas.'
        };
      }
      return { valid: true };
    }

    // Validação genérica de campos obrigatórios se missionData.fields existir
    if (Array.isArray(missionData.fields) && missionData.fields.length > 0) {
      for (const field of missionData.fields) {
        if (field.required) {
          const val = metadata?.[field.id];
          if (val === undefined || val === null || (typeof val === 'string' && !val.trim())) {
            return {
              valid: false,
              error: 'INCOMPLETE_FORM',
              message: `O campo "${field.label || field.id}" é obrigatório.`
            };
          }
        }
      }
    }

    return { valid: true };
  }

  // 7. Missões de QR Code de Stands / Caça (sponsor_visit, secret_qr)
  if (missionId === 'sponsor_visit' || missionId === 'secret_qr') {
    const scanned = metadata?.scannedCode || metadata?.token || referenceId;
    if (missionId === 'sponsor_visit') {
      const validCodes = ['kanastra_code', 'sponsor_visit', 'Kanastra'];
      if (!scanned || (!validCodes.includes(scanned) && typeof scanned === 'string' && !scanned.toLowerCase().includes('kanastra'))) {
        return {
          valid: false,
          error: 'INVALID_QR_CODE',
          message: 'Código de QR inválido para a visita ao stand.'
        };
      }
      return { valid: true };
    }

    if (missionId === 'secret_qr') {
      const validCodes = ['secret_qr_code', 'QR_HUNT_MASTER'];
      if (!scanned || (!validCodes.includes(scanned) && typeof scanned === 'string' && !scanned.toLowerCase().includes('secret'))) {
        return {
          valid: false,
          error: 'INVALID_QR_CODE',
          message: 'Código de QR inválido para a caça ao QR Code.'
        };
      }
      return { valid: true };
    }
  }

  return { valid: true };
}
