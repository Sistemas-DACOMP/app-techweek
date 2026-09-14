const STORAGE_KEY = 'facom_custom_missions';
const EVENT_NAME = 'techweek_missions_updated';

export const INITIAL_BASE_MISSIONS = [
  { id: 'instagram_story', name: 'Post no Stories', description: 'Tire uma foto com nossa moldura e compartilhe!', points: 50, iconName: 'Camera', isAction: true, active: true },
  { id: 'sponsor_visit', name: 'Conheça Kanastra', description: 'Visite o stand e escaneie o QR Code oficial.', points: 15, iconName: 'MapPin', type: 'auto', active: true },
  {
    id: 'sponsor_vaga', name: 'De Olho na Vaga', description: 'Converse com alguém sobre oportunidades para estudantes.', points: 20, iconName: 'MessageCircle', type: 'manual', active: true, fields: [
      { id: 'company', type: 'select', label: 'Qual empresa foi?', options: ['Levty', 'Kanastra', 'Sankhya', 'Neospace', 'Sebrae', 'Outra'] }
    ]
  },
  {
    id: 'sponsor_tecnologia', name: 'Descubra a Tecnologia', description: 'Pergunte qual tecnologia está transformando o trabalho da empresa.', points: 20, iconName: 'MessageCircle', type: 'manual', active: true, fields: [
      { id: 'company', type: 'select', label: 'Qual empresa foi?', options: ['Levty', 'Kanastra', 'Sankhya', 'Neospace', 'Sebrae', 'Outra'] },
      { id: 'response', type: 'textarea', label: 'Qual tecnologia eles usam?' }
    ]
  },
  {
    id: 'sponsor_colecao', name: 'Colecione Patrocinadores', description: 'Complete seu passaporte visitando todos os stands.', points: 50, iconName: 'Camera', type: 'manual', active: true, fields: [
      { id: 'photo', type: 'photo', label: 'Tire uma foto do cartão completo' }
    ]
  },
  {
    id: 'secret_password', name: 'Missão Secreta', description: 'Descubra a palavra-chave escondida no stand da Kanastra.', points: 30, iconName: 'Lock', type: 'manual', isSecret: true, active: true, fields: [
      { id: 'password', type: 'password', label: 'Qual a palavra-chave?' }
    ]
  },
  { id: 'secret_qr', name: 'Caça ao QR Code', description: 'Encontre o QR Code escondido antes que termine.', points: 40, iconName: 'Search', type: 'auto', isSecret: true, active: true },

  { id: 'network_course', name: 'Outro Curso', description: 'Conecte-se com alguém de um curso diferente.', points: 15, iconName: 'Users', type: 'auto', active: true },
  { id: 'network_type', name: 'Fora da UFU', description: 'Encontre alguém de outra instituição ou empresa.', points: 15, iconName: 'Users', type: 'auto', active: true },
  { id: 'network_first', name: 'Primeira Conexão', description: 'Faça sua primeira conexão na TechWeek.', points: 10, iconName: 'Users', type: 'auto', active: true },
  { id: 'network_period', name: 'Calouro na Área', description: 'Conecte-se com alguém do primeiro período.', points: 15, iconName: 'Users', type: 'auto', active: true },
  {
    id: 'network_career', name: 'Sua Área', description: 'Encontre alguém da área que quer seguir.', points: 20, iconName: 'MessageCircle', type: 'manual', active: true, fields: [
      { id: 'prompt1', type: 'text', label: 'Qual o @/user da pessoa?' },
      { id: 'prompt2', type: 'textarea', label: 'Qual foi o 1º passo dela na carreira?' }
    ]
  },
  {
    id: 'network_connect_two', name: 'Conector', description: 'Apresente duas pessoas que devem se conhecer.', points: 20, iconName: 'MessageCircle', type: 'manual', active: true, fields: [
      { id: 'prompt1', type: 'text', label: 'Qual o @/user da 1ª pessoa?' },
      { id: 'prompt2', type: 'text', label: 'Qual o @/user da 2ª pessoa?' }
    ]
  },
  {
    id: 'network_past_edition', name: 'Veterano', description: 'Encontre alguém de edições passadas.', points: 15, iconName: 'MessageCircle', type: 'manual', active: true, fields: [
      { id: 'prompt1', type: 'text', label: 'Qual o @/user da pessoa?' },
      { id: 'prompt2', type: 'textarea', label: 'Qual foi a melhor experiência dela?' }
    ]
  },
  {
    id: 'network_first_edition', name: 'Novato', description: 'Encontre alguém novato e mostre o app.', points: 15, iconName: 'MessageCircle', type: 'manual', active: true, fields: [
      { id: 'prompt1', type: 'text', label: 'Qual o @/user da pessoa?' },
      { id: 'prompt2', type: 'textarea', label: 'O que você mostrou para ela?' }
    ]
  }
];

function triggerUpdate() {
  if (typeof window !== 'undefined' && typeof window.dispatchEvent === 'function') {
    try {
      window.dispatchEvent(new CustomEvent(EVENT_NAME));
    } catch {
      // Ignora erro em ambiente de teste
    }
  }
}

export function getAllMissions() {
  if (typeof window === 'undefined') return INITIAL_BASE_MISSIONS;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(INITIAL_BASE_MISSIONS));
      return INITIAL_BASE_MISSIONS;
    }
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) && parsed.length > 0 ? parsed : INITIAL_BASE_MISSIONS;
  } catch {
    return INITIAL_BASE_MISSIONS;
  }
}

export function getActiveMissions() {
  const all = getAllMissions();
  const now = new Date().getTime();
  return all.filter(m => {
    if (m.active === false) return false;
    // Se for missão relâmpago com data limite expirada, ignora
    if (m.isFlash && m.expiresAt && new Date(m.expiresAt).getTime() < now) {
      return false;
    }
    return true;
  });
}

export const FLASH_ALERT_KEY = 'facom_active_flash_alert';
export const FLASH_EVENT_NAME = 'techweek_flash_mission_alert';

export function triggerFlashMissionAlert(mission) {
  if (typeof window === 'undefined') return;
  const alertData = {
    mission,
    triggeredAt: Date.now()
  };
  localStorage.setItem(FLASH_ALERT_KEY, JSON.stringify(alertData));
  if (typeof window.dispatchEvent === 'function') {
    try {
      window.dispatchEvent(new CustomEvent(FLASH_EVENT_NAME, { detail: alertData }));
    } catch {
      // Ignora erro em ambientes sem suporte
    }
  }
}

export function saveMission(missionData) {
  const all = getAllMissions();
  const isExisting = missionData.id && all.some(m => m.id === missionData.id);

  let updated;
  let savedItem;
  if (isExisting) {
    savedItem = { ...missionData };
    updated = all.map(m => (m.id === missionData.id ? { ...m, ...missionData } : m));
  } else {
    const newMission = {
      id: missionData.id || `custom_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      name: missionData.name,
      description: missionData.description,
      points: Number(missionData.points) || 10,
      iconName: missionData.iconName || (missionData.isFlash ? 'Zap' : 'Target'),
      type: missionData.type || 'auto',
      isFlash: !!missionData.isFlash,
      expiresAt: missionData.expiresAt || null,
      active: missionData.active !== false,
      fields: missionData.fields || (
        missionData.type === 'photo'
          ? [{ id: 'photo', type: 'photo', label: 'Tire ou anexe uma foto para comprovar a missão' }]
          : missionData.type === 'manual'
            ? [{ id: 'resp', type: 'textarea', label: 'Sua resposta' }]
            : undefined
      )
    };
    savedItem = newMission;
    // Missões relâmpago ou customizadas ficam no topo
    updated = [newMission, ...all];
  }

  localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  triggerUpdate();

  // Dispara alerta global de 10s se for missão relâmpago
  if (savedItem.isFlash && savedItem.active !== false) {
    triggerFlashMissionAlert(savedItem);
  }

  return isExisting ? missionData : updated[0];
}

export function deleteMission(missionId) {
  const all = getAllMissions();
  const updated = all.filter(m => m.id !== missionId);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  triggerUpdate();
}

export function toggleMissionStatus(missionId) {
  const all = getAllMissions();
  const updated = all.map(m => (m.id === missionId ? { ...m, active: m.active === false } : m));
  localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  triggerUpdate();
}

export function resetToDefaultMissions() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(INITIAL_BASE_MISSIONS));
  triggerUpdate();
  return INITIAL_BASE_MISSIONS;
}

export { EVENT_NAME as MISSIONS_EVENT_NAME };

