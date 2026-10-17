// @vitest-environment happy-dom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import React from 'react';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';

const mockUnsubscribe = vi.fn();
let mockSubscriberCallback = null;

vi.mock('../../src/lib/activityService', async (importOriginal) => {
  const actual = await importOriginal();
  return {
    ...actual,
    subscribeToActivityBookings: vi.fn((activity, onUpdate, _onError, _options) => {
      mockSubscriberCallback = onUpdate;
      // Emit initial data exactly matching subscribeToActivityBookings structure
      onUpdate({
        confirmed: [
          {
            id: 'bk_1',
            bookingId: 'bk_1',
            userId: 'user_1',
            activityId: 'act_101',
            status: 'CONFIRMED',
            rank: 1,
            rankLabel: '1º',
            createdAt: 1729000000000,
            createdAtFormatted: '15/10/2026, 10:00',
            fullName: 'Ana Silva',
            displayName: 'Ana Silva',
            email: 'ana.silva@ufu.br',
            username: 'anasilva',
            course: 'Ciência da Computação',
            period: '4º Período',
            hasSymplaTicket: true,
            phone: '(34) 99999-0001',
            checkedIn: true,
            checkedInAtFormatted: '15/10/2026, 11:00'
          },
          {
            id: 'bk_2',
            bookingId: 'bk_2',
            userId: 'user_2',
            activityId: 'act_101',
            status: 'CONFIRMED',
            rank: 2,
            rankLabel: '2º',
            createdAt: 1729001000000,
            createdAtFormatted: '15/10/2026, 10:15',
            fullName: 'Bruno Souza',
            displayName: 'Bruno Souza',
            email: 'bruno@ufu.br',
            username: 'brunosouza',
            course: 'Sistemas de Informação',
            period: '6º Período',
            hasSymplaTicket: false,
            phone: '',
            checkedIn: false
          }
        ],
        waitingList: [
          {
            id: 'bk_3',
            bookingId: 'bk_3',
            userId: 'user_3',
            activityId: 'act_101',
            status: 'WAITING_LIST',
            position: 1,
            queuePosition: 1,
            rank: 1,
            rankLabel: '1º da fila',
            createdAt: 1729002000000,
            createdAtFormatted: '15/10/2026, 10:30',
            fullName: 'Carla Dias',
            displayName: 'Carla Dias',
            email: 'carla.dias@ufu.br',
            username: 'carladias',
            course: 'Engenharia da Computação',
            period: '2º Período',
            hasSymplaTicket: true,
            phone: '(34) 98888-1234'
          }
        ],
        all: [],
        totalConfirmed: 2,
        totalWaiting: 1,
        totalCheckedIn: 1,
        stats: {
          confirmedCount: 2,
          waitingCount: 1,
          checkedInCount: 1
        },
        loading: false
      });
      return mockUnsubscribe;
    })
  };
});

import ActivityAttendeesModal from '../../src/pages/admin/ActivityAttendeesModal';

describe('ActivityAttendeesModal Component', () => {
  const mockActivity = {
    id: 'act_101',
    title: 'Workshop de Inteligência Artificial Generativa',
    type: 'Workshop',
    location: 'Lab 5R 102',
    capacity: 20,
    maxCapacity: 20,
    vagas_totais: 20,
    hasCapacityLimit: true,
    isOpenEvent: false,
    requiresRegistration: true,
    sessions: [
      {
        id: 's1',
        date: '2026-10-21',
        startTime: '14:00',
        endTime: '16:00',
        location: 'Lab 5R 102'
      }
    ]
  };

  const mockUsersList = [
    { uid: 'user_1', fullName: 'Ana Silva', email: 'ana.silva@ufu.br' },
    { uid: 'user_2', fullName: 'Bruno Souza', email: 'bruno@ufu.br' },
    { uid: 'user_3', fullName: 'Carla Dias', email: 'carla.dias@ufu.br' }
  ];

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    cleanup();
  });

  it('renderiza o cabeçalho com título, metadados da atividade e badge exclusivo Sympla', () => {
    const handleClose = vi.fn();
    render(
      <ActivityAttendeesModal
        activity={mockActivity}
        usersList={mockUsersList}
        onClose={handleClose}
      />
    );

    expect(screen.getByText('Workshop de Inteligência Artificial Generativa')).toBeDefined();
    expect(screen.getByText(/Lab 5R 102/i)).toBeDefined();
    expect(screen.getByText(/Exclusivo Sympla/i)).toBeDefined();
  });

  it('exibe chips de KPI com totais corretos (Confirmados, Fila, Presentes, Vagas)', () => {
    render(
      <ActivityAttendeesModal
        activity={mockActivity}
        usersList={mockUsersList}
        onClose={vi.fn()}
      />
    );

    expect(screen.getByText('Confirmados')).toBeDefined();
    expect(screen.getByText('Fila de Espera')).toBeDefined();
    expect(screen.getByText('Presentes na Sala')).toBeDefined();
    expect(screen.getByText('Vagas Restantes')).toBeDefined();
    expect(screen.getByText('18')).toBeDefined(); // 20 capacidade - 2 confirmados = 18 vagas
  });

  it('lista os inscritos confirmados com ordem cronológica e status de presença', () => {
    render(
      <ActivityAttendeesModal
        activity={mockActivity}
        usersList={mockUsersList}
        onClose={vi.fn()}
      />
    );

    // Ana Silva (1º) e Bruno Souza (2º)
    expect(screen.getByText('Ana Silva')).toBeDefined();
    expect(screen.getByText('1º')).toBeDefined();
    expect(screen.getByText('Presente')).toBeDefined();

    expect(screen.getByText('Bruno Souza')).toBeDefined();
    expect(screen.getByText('2º')).toBeDefined();
    expect(screen.getByText('Aguardando entrada')).toBeDefined();
  });

  it('permite alternar para a aba Lista de Espera e ver a posição da fila', () => {
    render(
      <ActivityAttendeesModal
        activity={mockActivity}
        usersList={mockUsersList}
        onClose={vi.fn()}
      />
    );

    const waitlistTab = screen.getByRole('tab', { name: /Lista de Espera/i });
    fireEvent.click(waitlistTab);

    expect(screen.getByText('Carla Dias')).toBeDefined();
    expect(screen.getByText('1º da fila')).toBeDefined();
    expect(screen.getByText(/Engenharia da Computação/i)).toBeDefined();
  });

  it('filtra participantes na busca instantânea', () => {
    render(
      <ActivityAttendeesModal
        activity={mockActivity}
        usersList={mockUsersList}
        onClose={vi.fn()}
      />
    );

    const searchInput = screen.getByPlaceholderText(/Buscar por nome/i);
    
    // Filtrar por 'Bruno'
    fireEvent.change(searchInput, { target: { value: 'Bruno' } });

    expect(screen.queryByText('Ana Silva')).toBeNull();
    expect(screen.getByText('Bruno Souza')).toBeDefined();
  });

  it('chama onClose ao clicar no botão fechar', () => {
    const handleClose = vi.fn();
    render(
      <ActivityAttendeesModal
        activity={mockActivity}
        usersList={mockUsersList}
        onClose={handleClose}
      />
    );

    const closeBtn = screen.getByRole('button', { name: /Fechar modal/i });
    fireEvent.click(closeBtn);

    expect(handleClose).toHaveBeenCalledTimes(1);
  });
});
