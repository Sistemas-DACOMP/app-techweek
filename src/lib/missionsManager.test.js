import { describe, it, expect, beforeEach, beforeAll } from 'vitest';
import {
  getAllMissions,
  getActiveMissions,
  saveMission,
  deleteMission,
  toggleMissionStatus,
  resetToDefaultMissions,
  INITIAL_BASE_MISSIONS
} from './missionsManager';

describe('Missions Manager (Admin)', () => {
  let storage = {};

  beforeAll(() => {
    const localStorageMock = {
      getItem: (key) => (key in storage ? storage[key] : null),
      setItem: (key, value) => {
        storage[key] = String(value);
      },
      removeItem: (key) => {
        delete storage[key];
      },
      clear: () => {
        storage = {};
      }
    };

    globalThis.localStorage = localStorageMock;
    globalThis.window = {
      ...globalThis,
      dispatchEvent: () => true
    };
    if (typeof globalThis.CustomEvent === 'undefined') {
      globalThis.CustomEvent = class CustomEvent {
        constructor(type, eventInitDict) {
          this.type = type;
          this.detail = eventInitDict?.detail;
        }
      };
    }
  });

  beforeEach(() => {
    globalThis.localStorage.clear();
  });

  it('retorna a lista base de missões por padrão', () => {
    const missions = getAllMissions();
    expect(missions.length).toBe(INITIAL_BASE_MISSIONS.length);
    expect(missions[0]).toHaveProperty('id');
    expect(missions[0]).toHaveProperty('name');
  });

  it('adiciona uma nova missão customizada', () => {
    const initialCount = getAllMissions().length;

    const saved = saveMission({
      name: 'Missão de Teste Admin',
      description: 'Descrição de teste criada pelo admin',
      points: 35,
      type: 'manual',
      isFlash: false
    });

    expect(saved).toBeDefined();
    expect(saved.name).toBe('Missão de Teste Admin');
    expect(saved.points).toBe(35);

    const all = getAllMissions();
    expect(all.length).toBe(initialCount + 1);
    expect(all[0].name).toBe('Missão de Teste Admin');
  });

  it('cria e recupera uma missão relâmpago', () => {
    const saved = saveMission({
      name: 'Missão Relâmpago ⚡',
      description: 'Complete nos próximos 30 minutos',
      points: 50,
      isFlash: true,
      expiresAt: new Date(Date.now() + 1000 * 60 * 30).toISOString()
    });

    expect(saved.isFlash).toBe(true);

    const active = getActiveMissions();
    expect(active.some(m => m.id === saved.id)).toBe(true);
  });

  it('filtra missões relâmpago expiradas em getActiveMissions', () => {
    const saved = saveMission({
      name: 'Missão Expirada',
      description: 'Já expirou',
      points: 20,
      isFlash: true,
      expiresAt: new Date(Date.now() - 1000 * 60).toISOString() // 1 minuto atrás
    });

    const active = getActiveMissions();
    expect(active.some(m => m.id === saved.id)).toBe(false);
  });

  it('edita uma missão existente', () => {
    const missions = getAllMissions();
    const first = missions[0];

    saveMission({
      id: first.id,
      name: 'Nome Atualizado',
      points: 99
    });

    const updated = getAllMissions().find(m => m.id === first.id);
    expect(updated.name).toBe('Nome Atualizado');
    expect(updated.points).toBe(99);
  });

  it('pausa e reativa uma missão', () => {
    const missions = getAllMissions();
    const first = missions[0];

    toggleMissionStatus(first.id);
    let updated = getAllMissions().find(m => m.id === first.id);
    expect(updated.active).toBe(false);

    toggleMissionStatus(first.id);
    updated = getAllMissions().find(m => m.id === first.id);
    expect(updated.active).toBe(true);
  });

  it('exclui uma missão', () => {
    const missions = getAllMissions();
    const toDelete = missions[0];

    deleteMission(toDelete.id);

    const after = getAllMissions();
    expect(after.find(m => m.id === toDelete.id)).toBeUndefined();
    expect(after.length).toBe(missions.length - 1);
  });

  it('restaura missões para o padrão oficial', () => {
    saveMission({ name: 'Nova Missão', description: 'desc', points: 10 });
    expect(getAllMissions().length).toBeGreaterThan(INITIAL_BASE_MISSIONS.length);

    resetToDefaultMissions();
    expect(getAllMissions().length).toBe(INITIAL_BASE_MISSIONS.length);
  });

  it('dispara alerta global de missão relâmpago ao criar', () => {
    const flash = saveMission({
      name: 'Relâmpago do Stand',
      description: 'Chegue nos próximos 10 minutos',
      points: 40,
      isFlash: true
    });

    const alertRaw = globalThis.localStorage.getItem('facom_active_flash_alert');
    expect(alertRaw).toBeDefined();
    const alertData = JSON.parse(alertRaw);
    expect(alertData.mission.id).toBe(flash.id);
    expect(alertData.triggeredAt).toBeDefined();
  });
});
