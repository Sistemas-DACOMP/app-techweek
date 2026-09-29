import { 
  collection, 
  query, 
  orderBy, 
  onSnapshot, 
  addDoc, 
  doc, 
  updateDoc, 
  deleteDoc, 
  serverTimestamp,
  getDocs
} from 'firebase/firestore';
import { db } from './firebase';

/**
 * Missões padrão para a FACOM TechWeek 2026 baseadas no documento oficial de ideias.
 * Utilizadas como fallback resiliente quando offline ou antes do primeiro sync do Firestore.
 */
export const DEFAULT_MISSIONS = [
  {
    id: 'instagram_story',
    title: 'Post no Stories',
    description: 'Abra a câmera oficial, tire ou envie uma foto com a moldura TechWeek e compartilhe.',
    category: 'social',
    points: 50,
    icon: 'Camera',
    status: 'active',
    type: 'action',
    triggerMode: 'action',
    actionRoute: '/instagram-mission',
    fields: [
      { id: 'photo', type: 'photo', label: 'Envie a foto ou print do seu Story', required: true }
    ],
    order: 1
  },
  {
    id: 'sponsor_visit',
    title: 'Conheça Kanastra',
    description: 'Visite o stand e escaneie o QR Code oficial.',
    category: 'sponsors',
    points: 15,
    icon: 'MapPin',
    status: 'active',
    type: 'auto',
    triggerMode: 'auto',
    autoConfig: {
      eventType: 'sponsor_visit',
      targetId: 'Kanastra'
    },
    order: 2
  },
  {
    id: 'sponsor_vaga',
    title: 'De Olho na Vaga',
    description: 'Converse com alguém da empresa sobre oportunidades para estudantes.',
    category: 'sponsors',
    points: 20,
    icon: 'MessageCircle',
    status: 'active',
    type: 'manual',
    triggerMode: 'form',
    fields: [
      { id: 'company', type: 'select', label: 'Qual empresa foi?', options: ['Levty', 'Kanastra', 'Sankhya', 'Neospace', 'Sebrae', 'Outra'], required: true }
    ],
    order: 3
  },
  {
    id: 'sponsor_tecnologia',
    title: 'Descubra a Tecnologia',
    description: 'Pergunte qual tecnologia está transformando o trabalho da empresa.',
    category: 'sponsors',
    points: 20,
    icon: 'MessageCircle',
    status: 'active',
    type: 'manual',
    triggerMode: 'form',
    fields: [
      { id: 'company', type: 'select', label: 'Qual empresa foi?', options: ['Levty', 'Kanastra', 'Sankhya', 'Neospace', 'Sebrae', 'Outra'], required: true },
      { id: 'response', type: 'textarea', label: 'Qual tecnologia eles usam?', required: true }
    ],
    order: 4
  },
  {
    id: 'sponsor_colecao',
    title: 'Colecione Patrocinadores',
    description: 'Complete seu passaporte visitando todos os stands.',
    category: 'sponsors',
    points: 50,
    icon: 'QrCode',
    status: 'active',
    type: 'auto',
    triggerMode: 'auto',
    autoConfig: {
      eventType: 'passport_complete'
    },
    order: 5
  },
  {
    id: 'secret_password',
    title: 'Missão Secreta',
    description: 'Descubra a palavra-chave escondida no stand da Kanastra.',
    category: 'sponsors',
    points: 30,
    icon: 'Lock',
    status: 'active',
    type: 'manual',
    triggerMode: 'secret',
    isSecret: true,
    secretConfig: {
      secretWord: 'OPORTUNIDADES'
    },
    fields: [
      { id: 'password', type: 'password', label: 'Qual a palavra-chave?', required: true }
    ],
    order: 6
  },
  {
    id: 'secret_qr',
    title: 'Caça ao QR Code',
    description: 'Encontre o QR Code escondido antes que termine.',
    category: 'sponsors',
    points: 40,
    icon: 'Search',
    status: 'active',
    type: 'auto',
    triggerMode: 'auto',
    isSecret: true,
    autoConfig: {
      eventType: 'secret_qr',
      targetId: 'QR_HUNT_MASTER'
    },
    order: 7
  },
  {
    id: 'network_course',
    title: 'Outro Curso',
    description: 'Conecte-se com alguém de um curso diferente.',
    category: 'networking',
    points: 15,
    icon: 'Users',
    status: 'active',
    type: 'auto',
    triggerMode: 'auto',
    autoConfig: {
      eventType: 'network_course'
    },
    order: 8
  },
  {
    id: 'network_type',
    title: 'Fora da UFU',
    description: 'Encontre alguém de outra instituição ou empresa.',
    category: 'networking',
    points: 15,
    icon: 'Users',
    status: 'active',
    type: 'auto',
    triggerMode: 'auto',
    autoConfig: {
      eventType: 'network_external'
    },
    order: 9
  },
  {
    id: 'network_first',
    title: 'Primeira Conexão',
    description: 'Faça sua primeira conexão na TechWeek.',
    category: 'networking',
    points: 10,
    icon: 'Users',
    status: 'active',
    type: 'auto',
    triggerMode: 'auto',
    autoConfig: {
      eventType: 'network_first'
    },
    order: 10
  },
  {
    id: 'network_period',
    title: 'Calouro na Área',
    description: 'Conecte-se com alguém do primeiro período.',
    category: 'networking',
    points: 15,
    icon: 'Users',
    status: 'active',
    type: 'auto',
    triggerMode: 'auto',
    autoConfig: {
      eventType: 'network_freshman'
    },
    order: 11
  },
  {
    id: 'network_career',
    title: 'Sua Área',
    description: 'Encontre alguém da área que quer seguir.',
    category: 'networking',
    points: 20,
    icon: 'MessageCircle',
    status: 'active',
    type: 'manual',
    triggerMode: 'form',
    fields: [
      { id: 'prompt1', type: 'text', label: 'Qual o @/user da pessoa?', required: true },
      { id: 'prompt2', type: 'textarea', label: 'Qual foi o 1º passo dela na carreira?', required: true }
    ],
    order: 12
  },
  {
    id: 'network_connect_two',
    title: 'Conector',
    description: 'Apresente duas pessoas que devem se conhecer.',
    category: 'networking',
    points: 20,
    icon: 'MessageCircle',
    status: 'active',
    type: 'manual',
    triggerMode: 'form',
    fields: [
      { id: 'prompt1', type: 'text', label: 'Qual o @/user da 1ª pessoa?', required: true },
      { id: 'prompt2', type: 'text', label: 'Qual o @/user da 2ª pessoa?', required: true }
    ],
    order: 13
  },
  {
    id: 'network_past_edition',
    title: 'Veterano',
    description: 'Encontre alguém de edições passadas.',
    category: 'networking',
    points: 15,
    icon: 'MessageCircle',
    status: 'active',
    type: 'manual',
    triggerMode: 'form',
    fields: [
      { id: 'prompt1', type: 'text', label: 'Qual o @/user da pessoa?', required: true },
      { id: 'prompt2', type: 'textarea', label: 'Qual foi a melhor experiência dela?', required: true }
    ],
    order: 14
  },
  {
    id: 'network_first_edition',
    title: 'Novato',
    description: 'Encontre alguém novato e mostre o app.',
    category: 'networking',
    points: 15,
    icon: 'MessageCircle',
    status: 'active',
    type: 'manual',
    triggerMode: 'form',
    fields: [
      { id: 'prompt1', type: 'text', label: 'Qual o @/user da pessoa?', required: true },
      { id: 'prompt2', type: 'textarea', label: 'O que você mostrou para ela?', required: true }
    ],
    order: 15
  },
  {
    id: 'sponsor_quiz_levty',
    title: 'Quiz Levty: Tecnologia',
    description: 'Responda qual tecnologia é amplamente utilizada pela Levty.',
    category: 'sponsors',
    points: 30,
    icon: 'HelpCircle',
    status: 'active',
    type: 'manual',
    triggerMode: 'quiz',
    quizConfig: {
      question: 'Qual dessas plataformas proprietárias é utilizada no dia a dia da Levty?',
      options: ['SYDLE ONE', 'SAP NetWeaver', 'Oracle ERP Cloud', 'Salesforce CRM'],
      correctOptionIndex: 0
    },
    order: 16
  },
  {
    id: 'social_mascot_photo',
    title: 'Foto com Teko e Weeka',
    description: 'Encontre os mascotes pelo evento e registre o momento!',
    category: 'social',
    points: 40,
    icon: 'Camera',
    status: 'active',
    type: 'manual',
    triggerMode: 'form',
    fields: [
      { id: 'photo', type: 'photo', label: 'Envie a foto com os mascotes', required: true }
    ],
    order: 17
  }
];

/**
 * Valida palavra secreta (case-insensitive e ignorando espaços extras).
 */
export function validateSecretWord(inputWord, expectedWord) {
  if (!inputWord || !expectedWord) return false;
  return inputWord.trim().toUpperCase() === expectedWord.trim().toUpperCase();
}

/**
 * Valida se a alternativa selecionada no quiz é a correta.
 */
export function validateQuizAnswer(selectedOptionIndex, correctOptionIndex) {
  return Number(selectedOptionIndex) === Number(correctOptionIndex);
}

/**
 * Checa se uma missão relâmpago está atualmente ativa e dentro do prazo.
 */
export function isFlashMissionActive(mission) {
  if (!mission || !mission.isFlash) return false;
  if (mission.status !== 'active') return false;
  if (!mission.flashConfig || !mission.flashConfig.expiresAt) return true;

  const now = Date.now();
  const expiresAt = mission.flashConfig.expiresAt.toDate 
    ? mission.flashConfig.expiresAt.toDate().getTime() 
    : new Date(mission.flashConfig.expiresAt).getTime();

  return now < expiresAt;
}

/**
 * Escuta as missões em tempo real no Firestore com fallback gracioso.
 */
export function subscribeToMissions(callback, onError) {
  try {
    const q = query(collection(db, 'missions'), orderBy('order', 'asc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      if (snapshot.empty) {
        callback(DEFAULT_MISSIONS);
        return;
      }

      const list = snapshot.docs.map(docSnap => ({
        id: docSnap.id,
        ...docSnap.data()
      }));

      callback(list);
    }, (err) => {
      console.warn('Falha no listener do Firestore de missões, usando fallback padrão:', err);
      if (onError) onError(err);
      callback(DEFAULT_MISSIONS);
    });

    return unsubscribe;
  } catch (err) {
    console.warn('Erro ao inicializar subscribeToMissions:', err);
    callback(DEFAULT_MISSIONS);
    return () => {};
  }
}

/**
 * Cria uma nova missão no Firestore.
 */
export async function createMission(missionData) {
  const cleanData = {
    title: missionData.title || 'Nova Missão',
    description: missionData.description || '',
    category: missionData.category || 'networking',
    points: Number(missionData.points) || 10,
    icon: missionData.icon || 'Sparkles',
    status: missionData.status || 'active',
    type: missionData.triggerMode === 'auto' ? 'auto' : 'manual',
    triggerMode: missionData.triggerMode || 'form',
    order: Number(missionData.order) || 99,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp()
  };

  if (missionData.triggerMode === 'secret' && missionData.secretConfig) {
    cleanData.isSecret = true;
    cleanData.secretConfig = {
      secretWord: (missionData.secretConfig.secretWord || '').trim().toUpperCase()
    };
  }

  if (missionData.triggerMode === 'quiz' && missionData.quizConfig) {
    cleanData.quizConfig = {
      question: missionData.quizConfig.question || '',
      options: missionData.quizConfig.options || [],
      correctOptionIndex: Number(missionData.quizConfig.correctOptionIndex) || 0
    };
  }

  if (missionData.triggerMode === 'form' && missionData.fields) {
    cleanData.fields = missionData.fields;
  }

  if (missionData.triggerMode === 'auto' && missionData.autoConfig) {
    cleanData.autoConfig = missionData.autoConfig;
  }

  if (missionData.isFlash && missionData.flashConfig) {
    cleanData.isFlash = true;
    const durationMinutes = Number(missionData.flashConfig.durationMinutes) || 5;
    const startsAt = new Date();
    const expiresAt = new Date(startsAt.getTime() + durationMinutes * 60 * 1000);

    cleanData.flashConfig = {
      durationMinutes,
      startsAt,
      expiresAt,
      maxWinners: missionData.flashConfig.maxWinners ? Number(missionData.flashConfig.maxWinners) : null,
      mascotDialogue: missionData.flashConfig.mascotDialogue || '⚡ WEEKA: Atenção, TechWeekers! Uma nova missão relâmpago acaba de começar!'
    };
  }

  const docRef = await addDoc(collection(db, 'missions'), cleanData);
  return { id: docRef.id, ...cleanData };
}

/**
 * Atualiza uma missão existente no Firestore.
 */
export async function updateMission(id, updates) {
  const docRef = doc(db, 'missions', id);
  const payload = {
    ...updates,
    updatedAt: serverTimestamp()
  };

  await updateDoc(docRef, payload);
  return { id, ...updates };
}

/**
 * Remove uma missão do Firestore.
 */
export async function deleteMission(id) {
  const docRef = doc(db, 'missions', id);
  await deleteDoc(docRef);
  return { id, deleted: true };
}

/**
 * Alterna o status da missão entre 'active' e 'paused'.
 */
export async function toggleMissionStatus(id, currentStatus) {
  const newStatus = currentStatus === 'active' ? 'paused' : 'active';
  return updateMission(id, { status: newStatus });
}

/**
 * Dispara uma missão relâmpago imediatamente ativando contagem regressiva.
 */
export async function triggerFlashMission(id, durationMinutes = 5, mascotDialogue = '') {
  const startsAt = new Date();
  const expiresAt = new Date(startsAt.getTime() + durationMinutes * 60 * 1000);

  return updateMission(id, {
    isFlash: true,
    status: 'active',
    flashConfig: {
      durationMinutes,
      startsAt,
      expiresAt,
      mascotDialogue: mascotDialogue || '🚨 MISSÃO RELÂMPAGO LIBERADA! Corra antes que o tempo termine!'
    }
  });
}
