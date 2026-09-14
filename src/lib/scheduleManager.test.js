import { describe, it, expect, beforeEach, beforeAll } from 'vitest';
import {
  getAllSchedule,
  getActiveSchedule,
  saveScheduleItem,
  deleteScheduleItem,
  toggleScheduleItemStatus,
  resetToDefaultSchedule,
  INITIAL_BASE_SCHEDULE
} from './scheduleManager';

describe('Schedule Manager', () => {
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

  it('deve retornar o cronograma base padrão caso o storage esteja vazio', () => {
    const list = getAllSchedule();
    expect(list.length).toBe(INITIAL_BASE_SCHEDULE.length);
    expect(list[0].id).toBe('palestra_abertura');
  });

  it('deve salvar uma nova palestra e recuperá-la', () => {
    const novaPalestra = {
      title: 'Workshop de React & Vite',
      speaker: 'Erick & Samuel',
      time: '14:00',
      location: 'Laboratório 1B',
      date: '15/09',
      points: 30,
      description: 'Construindo aplicações modernas do zero.'
    };

    const salva = saveScheduleItem(novaPalestra);
    expect(salva.id).toBeDefined();
    expect(salva.title).toBe('Workshop de React & Vite');

    const todas = getAllSchedule();
    expect(todas.length).toBe(INITIAL_BASE_SCHEDULE.length + 1);
    expect(todas[0].title).toBe('Workshop de React & Vite');
  });

  it('deve atualizar uma palestra existente', () => {
    const atualizada = saveScheduleItem({
      id: 'palestra_abertura',
      title: 'Palestra de Abertura Oficial (Editada)',
      time: '19:15',
      location: 'Auditório 5R',
      points: 25
    });

    expect(atualizada.title).toBe('Palestra de Abertura Oficial (Editada)');
    const todas = getAllSchedule();
    const item = todas.find((p) => p.id === 'palestra_abertura');
    expect(item.time).toBe('19:15');
    expect(item.location).toBe('Auditório 5R');
  });

  it('deve alternar status ativo/inativo e filtrar em getActiveSchedule', () => {
    toggleScheduleItemStatus('palestra_abertura');
    const todas = getAllSchedule();
    const item = todas.find((p) => p.id === 'palestra_abertura');
    expect(item.active).toBe(false);

    const ativas = getActiveSchedule();
    expect(ativas.find((p) => p.id === 'palestra_abertura')).toBeUndefined();
  });

  it('deve excluir uma palestra pelo ID', () => {
    deleteScheduleItem('palestra_abertura');
    const todas = getAllSchedule();
    expect(todas.find((p) => p.id === 'palestra_abertura')).toBeUndefined();
  });

  it('deve restaurar a programação para o padrão', () => {
    deleteScheduleItem('palestra_abertura');
    expect(getAllSchedule().length).toBe(INITIAL_BASE_SCHEDULE.length - 1);

    resetToDefaultSchedule();
    expect(getAllSchedule().length).toBe(INITIAL_BASE_SCHEDULE.length);
  });
});
