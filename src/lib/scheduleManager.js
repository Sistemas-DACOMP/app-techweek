const STORAGE_KEY = 'facom_event_schedule';
export const SCHEDULE_EVENT_NAME = 'techweek_schedule_updated';

export const INITIAL_BASE_SCHEDULE = [
  {
    id: 'palestra_abertura',
    title: 'Palestra de Abertura',
    speaker: 'Comissão Organizadora',
    time: '19:00',
    location: 'Anfiteatro principal',
    date: '14/09',
    points: 20,
    description: 'Abertura oficial da FACOM Tech Week 2026 com apresentação do evento e novidades.',
    active: true
  },
  {
    id: 'palestra_samuel_amorim',
    title: 'Palestra: Dev que nao aparece, nao cresce',
    speaker: 'Samuel Amorim',
    time: '20:00',
    location: '5R',
    date: '14/09',
    points: 20,
    description: 'Dicas essenciais de carreira, visibilidade profissional e networking para desenvolvedores.',
    active: true
  }
];

function triggerUpdate() {
  if (typeof window !== 'undefined' && typeof window.dispatchEvent === 'function') {
    try {
      window.dispatchEvent(new CustomEvent(SCHEDULE_EVENT_NAME));
    } catch {
      // Ignora erro em ambiente de teste
    }
  }
}

export function getAllSchedule() {
  if (typeof window === 'undefined') return INITIAL_BASE_SCHEDULE;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(INITIAL_BASE_SCHEDULE));
      return INITIAL_BASE_SCHEDULE;
    }
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) && parsed.length > 0 ? parsed : INITIAL_BASE_SCHEDULE;
  } catch {
    return INITIAL_BASE_SCHEDULE;
  }
}

export function getActiveSchedule() {
  const all = getAllSchedule();
  return all.filter((item) => item.active !== false);
}

export function saveScheduleItem(item) {
  const current = getAllSchedule();
  const id = item.id || `lecture_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
  
  const newItem = {
    ...item,
    id,
    active: item.active !== false
  };

  const existingIndex = current.findIndex((i) => i.id === id);
  let updated;
  if (existingIndex >= 0) {
    updated = [...current];
    updated[existingIndex] = newItem;
  } else {
    updated = [newItem, ...current];
  }

  if (typeof window !== 'undefined') {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  }
  triggerUpdate();
  return newItem;
}

export function deleteScheduleItem(id) {
  const current = getAllSchedule();
  const filtered = current.filter((i) => i.id !== id);
  if (typeof window !== 'undefined') {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(filtered));
  }
  triggerUpdate();
  return filtered;
}

export function toggleScheduleItemStatus(id) {
  const current = getAllSchedule();
  const updated = current.map((item) => {
    if (item.id === id) {
      return { ...item, active: item.active === false ? true : false };
    }
    return item;
  });

  if (typeof window !== 'undefined') {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  }
  triggerUpdate();
  return updated;
}

export function resetToDefaultSchedule() {
  if (typeof window !== 'undefined') {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(INITIAL_BASE_SCHEDULE));
  }
  triggerUpdate();
  return INITIAL_BASE_SCHEDULE;
}
