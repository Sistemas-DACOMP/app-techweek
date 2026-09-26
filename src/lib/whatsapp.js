/**
 * Utilitários para integração, sanitização de telefone brasileiro e deep-links com o WhatsApp.
 * (KAN-54 / REG-WHATSAPP-001)
 */

/**
 * Higieniza número de telefone brasileiro garantindo DDI 55 + DDD + dígitos (10 ou 11 dígitos locais).
 * 
 * Exemplos aceitos:
 * - "(34) 99999-8888" -> "5534999998888"
 * - "34999998888" -> "5534999998888"
 * - "5534999998888" -> "5534999998888"
 * - "+55 (34) 3212-3456" -> "553432123456"
 * 
 * @param {string|number|null|undefined} phoneRaw
 * @returns {string|null} Número higienizado no formato 55XXXXXXXXXXX ou null se inválido.
 */
export function sanitizeBrazilianPhone(phoneRaw) {
  if (phoneRaw === null || phoneRaw === undefined) {
    return null;
  }

  const rawString = String(phoneRaw).trim();
  if (!rawString) {
    return null;
  }

  const digits = rawString.replace(/\D/g, '');

  // DDD (2 dígitos) + Telefone (8 ou 9 dígitos) = 10 ou 11 dígitos
  if (digits.length === 10 || digits.length === 11) {
    return `55${digits}`;
  }

  // DDI 55 + DDD (2 dígitos) + Telefone (8 ou 9 dígitos) = 12 ou 13 dígitos
  if ((digits.length === 12 || digits.length === 13) && digits.startsWith('55')) {
    return digits;
  }

  return null;
}

/**
 * Gera mensagem de texto personalizada para contato inicial.
 * 
 * @param {string} [participantName]
 * @param {string} [companyName]
 * @param {string} [customMessage]
 * @returns {string}
 */
export function buildWhatsAppMessage(participantName = '', companyName = '', customMessage = '') {
  if (customMessage && typeof customMessage === 'string' && customMessage.trim()) {
    return customMessage.trim();
  }

  const name = participantName && typeof participantName === 'string' ? participantName.trim() : 'Participante';
  const company = companyName && typeof companyName === 'string' ? companyName.trim() : '';

  if (company) {
    return `Olá, ${name}! Foi um prazer conversar com você no estande da ${company} na FACOM TechWeek.`;
  }

  return `Olá, ${name}! Foi um prazer conversar com você na FACOM TechWeek.`;
}

/**
 * Gera a URL completa para deep-link do WhatsApp com telefone sanitizado e mensagem codificada via encodeURIComponent.
 * 
 * @param {string|number} phone
 * @param {string} [participantName]
 * @param {string} [companyName]
 * @param {string} [customMessage]
 * @returns {string|null} URL pronta para abertura direta (ex: https://wa.me/5534999998888?text=...) ou null se o telefone for inválido.
 */
export function buildWhatsAppLink(phone, participantName = '', companyName = '', customMessage = '') {
  const sanitized = sanitizeBrazilianPhone(phone);
  if (!sanitized) {
    return null;
  }

  const message = buildWhatsAppMessage(participantName, companyName, customMessage);
  const encodedMessage = encodeURIComponent(message);

  return `https://wa.me/${sanitized}?text=${encodedMessage}`;
}
