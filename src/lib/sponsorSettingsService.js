/**
 * sponsorSettingsService.js
 * Gerenciador de configurações de estande para patrocinadores na FACOM TechWeek.
 * Controla tags personalizadas de qualificação e modelos de mensagens WhatsApp padrão.
 */

export const DEFAULT_QUALIFICATION_TAGS = [
  'Estágio',
  'Júnior',
  'Frontend',
  'Backend',
  'Mobile',
  'Dados / IA',
  'Design / UI',
  'Destaque',
];

export const DEFAULT_WHATSAPP_TEMPLATES = [
  {
    id: 'recruiter_outreach',
    title: 'Abordagem Geral',
    description: 'Mensagem padrão usada no modal de CRM e pós-leitura de QR Code',
    text: 'Olá, {nome}! Foi ótimo conversar com você no estande da {empresa} na FACOM TechWeek! Gostaríamos de marcar uma conversa rápida sobre nossas oportunidades para alunos de {curso}. Qual o seu melhor horário?',
  },
  {
    id: 'interview_invite',
    title: 'Convite para Bate-papo',
    description: 'Convidar talentos de destaque para entrevista ou alinhamento técnico',
    text: 'Olá, {nome}! Aqui é da equipe da {empresa}. Ficamos muito bem impressionados com o seu perfil na TechWeek e gostaríamos de marcar um bate-papo técnico rápido de 15 minutos. Qual o seu melhor horário esta semana?',
  },
  {
    id: 'tech_challenge',
    title: 'Desafio Técnico',
    description: 'Envio de link de desafio ou teste prático de código',
    text: 'Olá, {nome}! Muito legal ter você no estande da {empresa}! Segue o link com as instruções do nosso desafio técnico da TechWeek: https://techweek.facom.ufu.br/desafio',
  },
  {
    id: 'stand_material',
    title: 'Material do Estande',
    description: 'Apresentação institucional, cultura e stacks da empresa',
    text: 'Olá, {nome}! Foi ótimo trocar uma ideia com você no estande da {empresa} na TechWeek. Aqui está a nossa apresentação sobre engenharia, stacks e cultura técnica: https://techweek.facom.ufu.br',
  },
];

export const DEFAULT_FEED_PROFILE = {
  handle: '',
  avatarUrl: '',
  displayName: '',
};

export const DEFAULT_SETTINGS = {
  tags: [...DEFAULT_QUALIFICATION_TAGS],
  templates: [...DEFAULT_WHATSAPP_TEMPLATES],
  activeTemplateId: 'recruiter_outreach',
  feedProfile: { ...DEFAULT_FEED_PROFILE },
};

/**
 * Normaliza e sanitiza um handle de patrocinador para o feed (ex: '@kanastra')
 * @param {string} handle
 * @returns {string} Handle formatado com prefixo @
 */
export function sanitizeFeedHandle(handle = '') {
  if (!handle || typeof handle !== 'string') return '';
  let clean = handle.trim().toLowerCase();
  if (clean.startsWith('@')) clean = clean.substring(1);
  // Remove caracteres inválidos (permite apenas letras, números, underline e ponto)
  clean = clean.replace(/[^a-z0-9_.]/g, '').slice(0, 24);
  return clean ? `@${clean}` : '';
}

// Fallback em memória para ambientes sem localStorage (SSR, Node/Vitest)
const memoryStorage = new Map();

const getStorageKey = (companyId = 'default') => {
  const cleanId = String(companyId || 'default').toLowerCase().trim();
  return `facom_sponsor_settings_${cleanId}`;
};

/**
 * Lê as configurações salvas do patrocinador.
 * @param {string} companyId - Identificador da empresa
 * @returns {object} Configurações ativas
 */
export function getSponsorSettings(companyId = 'default') {
  const key = getStorageKey(companyId);
  const cleanId = String(companyId || 'default').toLowerCase().trim();
  const defaultHandle = cleanId && cleanId !== 'default' ? `@${cleanId}` : '';

  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      const raw = window.localStorage.getItem(key);
      if (raw) {
        const parsed = JSON.parse(raw);
        return {
          tags: Array.isArray(parsed.tags) && parsed.tags.length > 0 ? parsed.tags : [...DEFAULT_QUALIFICATION_TAGS],
          templates: Array.isArray(parsed.templates) && parsed.templates.length > 0 ? parsed.templates : [...DEFAULT_WHATSAPP_TEMPLATES],
          activeTemplateId: parsed.activeTemplateId || 'recruiter_outreach',
          feedProfile: {
            handle: parsed.feedProfile?.handle !== undefined ? parsed.feedProfile.handle : defaultHandle,
            avatarUrl: parsed.feedProfile?.avatarUrl || '',
            displayName: parsed.feedProfile?.displayName || '',
          },
        };
      }
    }
  } catch (err) {
    console.warn('[sponsorSettingsService] Falha ao ler localStorage:', err);
  }

  // Fallback em memória
  if (memoryStorage.has(key)) {
    const mem = memoryStorage.get(key);
    return {
      ...JSON.parse(JSON.stringify(mem)),
      feedProfile: {
        handle: mem.feedProfile?.handle !== undefined ? mem.feedProfile.handle : defaultHandle,
        avatarUrl: mem.feedProfile?.avatarUrl || '',
        displayName: mem.feedProfile?.displayName || '',
      },
    };
  }

  const def = JSON.parse(JSON.stringify(DEFAULT_SETTINGS));
  def.feedProfile.handle = defaultHandle;
  return def;
}

/**
 * Persiste as configurações do patrocinador e emite evento customizado no window.
 * @param {string} companyId - Identificador da empresa
 * @param {object} newSettings - Novas configurações
 * @returns {object} Configurações gravadas
 */
export function saveSponsorSettings(companyId = 'default', newSettings = {}) {
  const key = getStorageKey(companyId);
  const current = getSponsorSettings(companyId);
  const cleanId = String(companyId || 'default').toLowerCase().trim();
  const defaultHandle = cleanId && cleanId !== 'default' ? `@${cleanId}` : '';

  const incomingProfile = newSettings.feedProfile || {};
  const currentProfile = current.feedProfile || {};

  const merged = {
    tags: Array.isArray(newSettings.tags) ? newSettings.tags : current.tags,
    templates: Array.isArray(newSettings.templates) ? newSettings.templates : current.templates,
    activeTemplateId: newSettings.activeTemplateId || current.activeTemplateId || 'recruiter_outreach',
    feedProfile: {
      handle: incomingProfile.handle !== undefined
        ? (sanitizeFeedHandle(incomingProfile.handle) || defaultHandle)
        : (currentProfile.handle || defaultHandle),
      avatarUrl: incomingProfile.avatarUrl !== undefined ? incomingProfile.avatarUrl.trim() : (currentProfile.avatarUrl || ''),
      displayName: incomingProfile.displayName !== undefined ? incomingProfile.displayName.trim() : (currentProfile.displayName || ''),
    },
  };

  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      window.localStorage.setItem(key, JSON.stringify(merged));
    }
  } catch (err) {
    console.warn('[sponsorSettingsService] Falha ao salvar no localStorage:', err);
  }

  memoryStorage.set(key, merged);

  // Disparo de evento de sincronização entre abas e componentes
  if (typeof window !== 'undefined' && typeof window.dispatchEvent === 'function') {
    try {
      window.dispatchEvent(
        new CustomEvent('facom_sponsor_settings_updated', {
          detail: { companyId, settings: merged },
        })
      );
    } catch {}
  }

  return merged;
}

/**
 * Restaura todas as configurações do patrocinador para os valores padrão de fábrica.
 * @param {string} companyId
 * @returns {object}
 */
export function resetSponsorSettings(companyId = 'default') {
  const cleanId = String(companyId || 'default').toLowerCase().trim();
  const defaultHandle = cleanId && cleanId !== 'default' ? `@${cleanId}` : '';
  const def = JSON.parse(JSON.stringify(DEFAULT_SETTINGS));
  def.feedProfile.handle = defaultHandle;
  return saveSponsorSettings(companyId, def);
}

/**
 * Restaura apenas a lista de tags de qualificação para o padrão.
 * @param {string} companyId
 * @returns {object}
 */
export function resetTagsToDefault(companyId = 'default') {
  const current = getSponsorSettings(companyId);
  return saveSponsorSettings(companyId, {
    ...current,
    tags: [...DEFAULT_QUALIFICATION_TAGS],
  });
}

/**
 * Restaura apenas os modelos de mensagens WhatsApp para o padrão.
 * @param {string} companyId
 * @returns {object}
 */
export function resetTemplatesToDefault(companyId = 'default') {
  const current = getSponsorSettings(companyId);
  return saveSponsorSettings(companyId, {
    ...current,
    templates: [...DEFAULT_WHATSAPP_TEMPLATES],
  });
}

/**
 * Restaura apenas o perfil público de feed para o padrão.
 * @param {string} companyId
 * @returns {object}
 */
export function resetFeedProfileToDefault(companyId = 'default') {
  const current = getSponsorSettings(companyId);
  const cleanId = String(companyId || 'default').toLowerCase().trim();
  const defaultHandle = cleanId && cleanId !== 'default' ? `@${cleanId}` : '';

  return saveSponsorSettings(companyId, {
    ...current,
    feedProfile: {
      handle: defaultHandle,
      avatarUrl: '',
      displayName: '',
    },
  });
}

/**
 * Substitui tags de variáveis {nome}, {empresa}, {curso} em um template.
 * @param {string} templateString - Mensagem com tokens
 * @param {object} data - Dados para interpolação
 * @returns {string} Mensagem final interpolada
 */
export function interpolateTemplate(templateString = '', data = {}) {
  if (!templateString || typeof templateString !== 'string') return '';

  const rawName = data.name || data.participantName || 'Participante';
  const firstName = rawName.trim().split(/\s+/)[0] || 'Participante';
  const companyName = data.companyName || data.empresa || 'nossa empresa';
  const course = data.course || data.curso || 'Computação';

  let result = templateString;

  // Substituição tolerante com regex case-insensitive e suporte a chaves simples ou duplas
  result = result.replace(/\{\{?\s*(primeiro_nome|first_name)\s*\}\}?/gi, firstName);
  result = result.replace(/\{\{?\s*(nome|name)\s*\}\}?/gi, firstName);
  result = result.replace(/\{\{?\s*(nome_completo|full_name)\s*\}\}?/gi, rawName);
  result = result.replace(/\{\{?\s*(empresa|company)\s*\}\}?/gi, companyName);
  result = result.replace(/\{\{?\s*(curso|course)\s*\}\}?/gi, course);

  return result;
}

/**
 * Obtém a mensagem de outreach ativa e já interpolada para um lead específico.
 * @param {string} companyId - Identificador do patrocinador
 * @param {object} leadData - { name, course, companyName }
 * @returns {string} Mensagem pronta para envio
 */
export function getActiveOutreachMessage(companyId = 'default', leadData = {}) {
  const settings = getSponsorSettings(companyId);
  const activeTpl =
    settings.templates.find((t) => t.id === settings.activeTemplateId) ||
    settings.templates[0] ||
    DEFAULT_WHATSAPP_TEMPLATES[0];

  return interpolateTemplate(activeTpl.text, leadData);
}

/**
 * Assina atualizações de configurações do patrocinador.
 * @param {string} companyId
 * @param {function} callback
 * @returns {function} Unsubscribe
 */
export function subscribeToSponsorSettings(companyId = 'default', callback) {
  if (typeof callback !== 'function') return () => {};

  const handler = (event) => {
    if (!event?.detail || event.detail.companyId === companyId) {
      callback(getSponsorSettings(companyId));
    }
  };

  const storageHandler = (e) => {
    if (e.key === getStorageKey(companyId)) {
      callback(getSponsorSettings(companyId));
    }
  };

  if (typeof window !== 'undefined') {
    window.addEventListener('facom_sponsor_settings_updated', handler);
    window.addEventListener('storage', storageHandler);
  }

  // Notificação inicial imediata
  callback(getSponsorSettings(companyId));

  return () => {
    if (typeof window !== 'undefined') {
      window.removeEventListener('facom_sponsor_settings_updated', handler);
      window.removeEventListener('storage', storageHandler);
    }
  };
}
