import { describe, it, expect } from 'vitest';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import AdminDados, { calculateDadosAnalytics } from '../../src/pages/admin/AdminDados';

describe('AdminDados - Analytics Engine & Component', () => {
  const mockActivities = [
    {
      id: 'act_1',
      title: 'Keynote Inteligência Artificial',
      type: 'palestra',
      date: '2026-10-21',
      time: '14:30',
      endTime: '16:00',
      vagas_totais: 150,
      total_inscritos: 140,
      first_scan_count: 140,
      second_scan_count: 90, // Evasão: (140 - 90) / 140 = 35.7% (> 25% alert)
    },
    {
      id: 'act_2',
      title: 'Workshop Cloud & DevOps',
      type: 'workshop',
      date: '2026-10-21',
      time: '09:00',
      endTime: '12:00',
      vagas_totais: 40,
      total_inscritos: 38,
      first_scan_count: 38,
      second_scan_count: 36, // Alta retenção
    },
    {
      id: 'act_3',
      title: 'Palestra de Encerramento',
      type: 'palestra',
      date: '2026-10-22',
      time: '19:30',
      endTime: '21:00',
      vagas_totais: 200,
      total_inscritos: 50,
      idleSeats: 150,
    }
  ];

  const mockUsers = [
    {
      id: 'u1',
      displayName: 'Lucas Aluno',
      course: 'Sistemas de Informação',
      totalPoints: 150,
      hasSymplaTicket: true,
      visitedSponsors: { kanastra: true, bayer: true },
    },
    {
      id: 'u2',
      displayName: 'Mariana BCC',
      course: 'Ciência da Computação',
      totalPoints: 200,
      hasSymplaTicket: true,
      visitedSponsors: { kanastra: true },
    },
    {
      id: 'u3',
      displayName: 'Carlos Eng',
      course: 'Engenharia de Computação',
      totalPoints: 50,
      hasSymplaTicket: true,
    },
  ];

  const mockMissions = [
    { id: 'm1', title: 'Check-in Geral', points: 50, category: 'Presença', completedCount: 3 },
    { id: 'm2', title: 'Pitch Hackathon', points: 100, category: 'Hackathon', completedCount: 0 },
  ];

  it('calcula KPIs essenciais e afluência horária corretamente', () => {
    const stats = calculateDadosAnalytics({
      activities: mockActivities,
      usersList: mockUsers,
      missionsList: mockMissions,
      selectedDay: 'ALL',
    });

    expect(stats.totalCheckins).toBeGreaterThan(0);
    expect(stats.activeCount).toBeGreaterThanOrEqual(3);
    expect(stats.hourlyData.length).toBe(15); // slots entre 08h00 e 22h30
    expect(stats.peakSlot).toBeDefined();
    expect(stats.peakSlot.count).toBeGreaterThan(0);
  });

  it('identifica atividades com alta evasão (>25%) para emissão de badge de alerta', () => {
    const stats = calculateDadosAnalytics({
      activities: mockActivities,
      usersList: mockUsers,
      missionsList: mockMissions,
      selectedDay: 'ALL',
    });

    const keynote = stats.rankedActivities.find((a) => a.id === 'act_1');
    expect(keynote).toBeDefined();
    expect(keynote.highEvasion).toBe(true);
    expect(keynote.evasionPct).toBeGreaterThan(25);
    expect(stats.highEvasionAlerts.length).toBeGreaterThanOrEqual(1);
  });

  it('agrupa perfil acadêmico respeitando os cursos da FACOM/UFU', () => {
    const stats = calculateDadosAnalytics({
      activities: mockActivities,
      usersList: mockUsers,
      missionsList: mockMissions,
      selectedDay: 'ALL',
    });

    expect(stats.academicDistribution.length).toBeGreaterThan(0);
    const bsi = stats.academicDistribution.find((c) => c.short === 'BSI');
    const bcc = stats.academicDistribution.find((c) => c.short === 'BCC');
    expect(bsi).toBeDefined();
    expect(bcc).toBeDefined();
    expect(bsi.count).toBeGreaterThan(0);
    expect(bcc.count).toBeGreaterThan(0);
  });

  it('calcula métricas de estandes e cotas de patrocinadores', () => {
    const stats = calculateDadosAnalytics({
      activities: mockActivities,
      usersList: mockUsers,
      missionsList: mockMissions,
      selectedDay: 'ALL',
    });

    expect(stats.sponsorStats.length).toBe(5);
    const kanastra = stats.sponsorStats.find((s) => s.id === 'kanastra');
    expect(kanastra).toBeDefined();
    expect(kanastra.tier).toBe('DIAMOND');
  });

  it('filtra atividades corretamente quando um dia específico é selecionado', () => {
    const stats = calculateDadosAnalytics({
      activities: mockActivities,
      usersList: mockUsers,
      missionsList: mockMissions,
      selectedDay: '2026-10-21',
    });

    expect(stats.rankedActivities.every((a) => a.date === '2026-10-21')).toBe(true);
    expect(stats.rankedActivities.some((a) => a.id === 'act_3')).toBe(false);
  });

  it('renderiza o componente AdminDados sem falhas em HTML estático', () => {
    const html = renderToStaticMarkup(
      React.createElement(AdminDados, {
        activities: mockActivities,
        usersList: mockUsers,
        missionsList: mockMissions,
      })
    );

    expect(html).toContain('Analytics &amp; Fluxo de Afluência');
    expect(html).toContain('Curva de Afluência');
    expect(html).toContain('Funil de Retenção');
    expect(html).toContain('Estandes &amp; Engajamento');
    expect(html).toContain('Missões &amp; Gamificação');
    expect(html).toContain('Perfil Acadêmico');
  });
});
