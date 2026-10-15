import { describe, it, expect, vi, beforeEach } from 'vitest';
import React, { useEffect } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { MemoryRouter } from 'react-router-dom';
import { useUser } from '../../src/hooks/useUser';
import Scanner, { CameraFrame } from '../../src/pages/Scanner';

// Mock de dependências do Firebase e serviços externos
vi.mock('../../src/lib/firebase', () => ({
  db: { mock: 'db' },
  auth: {
    currentUser: { uid: 'usr_me_123', email: 'me@ufu.br' }
  }
}));

vi.mock('../../src/lib/userService', () => ({
  subscribeToUser: vi.fn((_uid, cb) => {
    cb({
      id: 'usr_me_123',
      uid: 'usr_me_123',
      username: 'samuel_tech',
      displayName: 'Samuel Amorim',
      course: 'Sistemas de Informação',
      points: 50,
      pointEvents: [],
      completedChallenges: []
    });
    return () => {};
  }),
  findUserByUsername: vi.fn(),
  updateUserProfile: vi.fn().mockResolvedValue({ success: true }),
  getLeaderboardUsers: vi.fn().mockResolvedValue([]),
  getCachedUserProfile: vi.fn().mockReturnValue({
    id: 'usr_me_123',
    uid: 'usr_me_123',
    username: 'samuel_tech',
    hasSymplaTicket: true
  })
}));

vi.mock('../../src/lib/api', () => ({
  apiRequest: vi.fn()
}));

vi.mock('firebase/firestore', () => ({
  doc: vi.fn((_db, coll, id) => ({ path: `${coll}/${id}`, id })),
  setDoc: vi.fn().mockResolvedValue(),
  getDoc: vi.fn().mockResolvedValue({ exists: () => false, data: () => null }),
  updateDoc: vi.fn().mockResolvedValue(),
  collection: vi.fn(),
  query: vi.fn(),
  where: vi.fn(),
  onSnapshot: vi.fn(() => () => {})
}));

// Componente de teste para invocar useUser de forma puramente determinística
function HookTester({ onReady }) {
  const user = useUser();
  if (onReady) onReady(user);
  return null;
}

describe('Scanner & Conexões (Resolução de Falso Código Já Processado)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    if (typeof localStorage !== 'undefined') {
      localStorage.clear();
    }
    if (typeof navigator !== 'undefined') {
      Object.defineProperty(navigator, 'onLine', {
        configurable: true,
        value: true,
        writable: true
      });
    }
  });

  describe('Renderização e Estrutura do Scanner', () => {
    it('renderiza abas do Scanner e CameraFrame sem falhas (padrão em Escanear)', () => {
      const html = renderToStaticMarkup(
        React.createElement(
          MemoryRouter,
          { initialEntries: ['/scanner'] },
          React.createElement(Scanner)
        )
      );
      expect(html).toContain('Escanear');
      expect(html).toContain('Meu QR');
      expect(html).toContain('id="cracha-panel-scan"');
      expect(html).toContain('techweek-camera-viewport');
    });

    it('abre diretamente na aba Meu QR quando navegado com ?tab=qr ou state.tab=qr', () => {
      const htmlQuery = renderToStaticMarkup(
        React.createElement(
          MemoryRouter,
          { initialEntries: ['/scanner?tab=qr'] },
          React.createElement(Scanner)
        )
      );
      expect(htmlQuery).toContain('id="cracha-panel-qr"');

      const htmlState = renderToStaticMarkup(
        React.createElement(
          MemoryRouter,
          { initialEntries: [{ pathname: '/scanner', state: { tab: 'qr' } }] },
          React.createElement(Scanner)
        )
      );
      expect(htmlState).toContain('id="cracha-panel-qr"');
    });

    it('abre diretamente na aba Escanear (leitor de QR Code) quando navegado com ?tab=scan ou state.tab=scan', () => {
      const htmlQuery = renderToStaticMarkup(
        React.createElement(
          MemoryRouter,
          { initialEntries: ['/scanner?tab=scan'] },
          React.createElement(Scanner)
        )
      );
      expect(htmlQuery).toContain('id="cracha-panel-scan"');
      expect(htmlQuery).toContain('techweek-camera-viewport');

      const htmlState = renderToStaticMarkup(
        React.createElement(
          MemoryRouter,
          { initialEntries: [{ pathname: '/scanner', state: { tab: 'scan', missionId: 'sponsor_visit' } }] },
          React.createElement(Scanner)
        )
      );
      expect(htmlState).toContain('id="cracha-panel-scan"');
      expect(htmlState).toContain('techweek-camera-viewport');
    });

    it('CameraFrame desenha o visor com linhas e gradiente do Design System', () => {
      const html = renderToStaticMarkup(
        React.createElement(CameraFrame, { live: true })
      );
      expect(html).toContain('cracha-scanline-live');
      expect(html).toContain('cracha-frame');
    });
  });

  describe('Lógica do Hook useUser - Prevenção de Falso "Código Já Processado"', () => {
    it('detecta auto-scan ao ler o próprio crachá e retorna status selfScan', async () => {
      let userHook = null;
      renderToStaticMarkup(React.createElement(HookTester, { onReady: (u) => { userHook = u; } }));

      expect(userHook).not.toBeNull();

      const myOwnBadgeQr = JSON.stringify({
        username: 'samuel_tech',
        name: 'Samuel Amorim',
        uid: 'usr_me_123'
      });

      const res = await userHook.registerCodeScan(myOwnBadgeQr, 5);
      expect(res.success).toBe(false);
      expect(res.selfScan).toBe(true);
      expect(res.alreadyScanned).toBeUndefined();
    });

    it('primeira leitura de outro participante não deve ser marcada como já escaneada', async () => {
      const { apiRequest } = await import('../../src/lib/api');
      apiRequest.mockResolvedValueOnce({
        success: true,
        points: 5,
        type: 'scan'
      });

      let userHook = null;
      renderToStaticMarkup(React.createElement(HookTester, { onReady: (u) => { userHook = u; } }));

      const peerBadgeQr = JSON.stringify({
        username: 'mariana_souza',
        name: 'Mariana Souza',
        uid: 'usr_mariana_999'
      });

      const res = await userHook.registerCodeScan(peerBadgeQr, 5);
      expect(res.success).toBe(true);
      expect(res.alreadyScanned).toBe(false);
      expect(res.points).toBe(5);
    });

    it('segunda leitura do mesmo participante sucede normalmente mas retorna 0 pontos', async () => {
      const { apiRequest } = await import('../../src/lib/api');
      let scanCallCount = 0;
      apiRequest.mockImplementation(async (_url, options) => {
        const body = options?.body ? JSON.parse(options.body) : {};
        if (body.eventType === 'scan') {
          scanCallCount++;
          if (scanCallCount > 1) {
            return {
              success: false,
              alreadyClaimed: true,
              error: 'Código já escaneado anteriormente.'
            };
          }
          return { success: true, points: 5, type: 'scan' };
        }
        return { success: true, points: 10, type: 'challenge' };
      });

      let userHook = null;
      renderToStaticMarkup(React.createElement(HookTester, { onReady: (u) => { userHook = u; } }));

      const peerBadgeQr = JSON.stringify({
        username: 'lucas_silva',
        name: 'Lucas Silva',
        uid: 'usr_lucas_888'
      });

      // 1ª Leitura: pontua +5
      const firstRes = await userHook.registerCodeScan(peerBadgeQr, 5);
      expect(firstRes.success).toBe(true);
      expect(firstRes.points).toBe(5);
      expect(firstRes.alreadyScanned).toBe(false);

      // 2ª Leitura: sucede, mas pontua 0
      const secondRes = await userHook.registerCodeScan(peerBadgeQr, 5);
      expect(secondRes.success).toBe(true);
      expect(secondRes.points).toBe(0);
      expect(secondRes.alreadyScanned).toBe(true);
    });

    it('erro 403 (SYMPLA_TICKET_REQUIRED) propaga o código real sem fingir que foi duplicidade', async () => {
      const { apiRequest } = await import('../../src/lib/api');
      const err = new Error('Ingresso Sympla obrigatório.');
      err.status = 403;
      err.code = 'SYMPLA_TICKET_REQUIRED';
      err.data = { error: 'SYMPLA_TICKET_REQUIRED', message: err.message };
      apiRequest.mockRejectedValueOnce(err);

      let userHook = null;
      renderToStaticMarkup(React.createElement(HookTester, { onReady: (u) => { userHook = u; } }));

      const codeQr = 'MISSAO_SALA_101';
      const res = await userHook.registerCodeScan(codeQr, 5);

      expect(res.success).toBe(false);
      expect(res.alreadyScanned).toBe(false);
      expect(res.code).toBe('SYMPLA_TICKET_REQUIRED');
    });

    it('crachá digital com ingresso Sympla vinculado usa o código Sympla no QR e renderiza ParticipantCard com redes sociais na 1ª e 2ª leituras', async () => {
      const { getBadgeQrValue } = await import('../../src/lib/sympla');
      const ParticipantCard = (await import('../../src/components/ParticipantCard')).default;
      const { apiRequest } = await import('../../src/lib/api');

      let scanCallCount = 0;
      apiRequest.mockImplementation(async (_url, options) => {
        const body = options?.body ? JSON.parse(options.body) : {};
        if (body.eventType === 'scan') {
          scanCallCount++;
          if (scanCallCount > 1) {
            return { success: false, alreadyClaimed: true };
          }
          return { success: true, points: 5, type: 'scan' };
        }
        return { success: true, points: 10, type: 'challenge' };
      });

      const peerProfileWithTicket = {
        uid: 'usr_ana_777',
        name: 'Ana Beatriz',
        username: 'anabeatriz',
        displayName: 'Ana Beatriz',
        email: 'ana@ufu.br',
        course: 'Ciência da Computação',
        period: 6,
        institution: 'UFU',
        participantType: 'Estudante',
        instagram: '@anabeatriz.dev',
        linkedin: 'https://linkedin.com/in/anabeatriz',
        github: 'anabeatriz-dev',
        symplaTicket: {
          ticketNumber: 'T987654',
          qrCodeData: 'SYMPLA:T987654'
        }
      };

      const qrValue = getBadgeQrValue(peerProfileWithTicket);
      expect(qrValue).toBe('SYMPLA:T987654');

      let userHook = null;
      renderToStaticMarkup(React.createElement(HookTester, { onReady: (u) => { userHook = u; } }));

      // 1ª Leitura
      const firstScan = await userHook.registerCodeScan(qrValue, 5, peerProfileWithTicket);
      expect(firstScan.success).toBe(true);
      expect(firstScan.points).toBe(5);
      expect(firstScan.alreadyScanned).toBe(false);

      const firstCardHtml = renderToStaticMarkup(
        React.createElement(ParticipantCard, {
          participant: peerProfileWithTicket,
          points: firstScan.points,
          eyebrow: 'Conexão feita!',
          eyebrowTone: 'ok'
        })
      );
      expect(firstCardHtml).toContain('Ana Beatriz');
      expect(firstCardHtml).toContain('@anabeatriz');
      expect(firstCardHtml).toContain('Redes de contato');
      expect(firstCardHtml).toContain('Instagram');
      expect(firstCardHtml).toContain('LinkedIn');
      expect(firstCardHtml).toContain('GitHub');
      expect(firstCardHtml).toContain('+5 pts');

      // 2ª Leitura (pontua 0 mas mantém crachá digital com redes sociais)
      const secondScan = await userHook.registerCodeScan(qrValue, 5, peerProfileWithTicket);
      expect(secondScan.success).toBe(true);
      expect(secondScan.points).toBe(0);
      expect(secondScan.alreadyScanned).toBe(true);
      expect(secondScan.isProfile).toBe(true);

      const secondCardHtml = renderToStaticMarkup(
        React.createElement(ParticipantCard, {
          participant: peerProfileWithTicket,
          points: secondScan.points > 0 ? secondScan.points : null,
          eyebrow: 'Conexão feita!',
          eyebrowTone: 'ok'
        })
      );
      expect(secondCardHtml).toContain('Ana Beatriz');
      expect(secondCardHtml).toContain('Redes de contato');
      expect(secondCardHtml).toContain('Instagram');
      expect(secondCardHtml).toContain('LinkedIn');
      expect(secondCardHtml).toContain('GitHub');
      expect(secondCardHtml).not.toContain('+5 pts');
    });
  });
});

