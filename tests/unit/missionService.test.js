import { describe, it, expect, vi } from 'vitest';
import { 
  DEFAULT_MISSIONS, 
  validateSecretWord, 
  validateQuizAnswer, 
  isFlashMissionActive,
  subscribeToMissions 
} from '../../src/lib/missionService';

describe('missionService - Regras e Validações de Missões (KAN-104)', () => {
  it('contém lista de DEFAULT_MISSIONS rica e compatível com as missões existentes', () => {
    expect(Array.isArray(DEFAULT_MISSIONS)).toBe(true);
    expect(DEFAULT_MISSIONS.length).toBeGreaterThanOrEqual(15);

    // Valida IDs essenciais do app legado
    const ids = DEFAULT_MISSIONS.map(m => m.id);
    expect(ids).toContain('instagram_story');
    expect(ids).toContain('sponsor_visit');
    expect(ids).toContain('secret_password');
    expect(ids).toContain('network_first');
    expect(ids).toContain('network_course');

    // Valida presença dos 4 triggerModes
    const triggerModes = DEFAULT_MISSIONS.map(m => m.triggerMode);
    expect(triggerModes).toContain('auto');
    expect(triggerModes).toContain('form');
    expect(triggerModes).toContain('secret');
    expect(triggerModes).toContain('quiz');
  });

  describe('validateSecretWord', () => {
    it('valida palavras secretas com correspondência exata, case-insensitive e trim', () => {
      expect(validateSecretWord('OPORTUNIDADES', 'OPORTUNIDADES')).toBe(true);
      expect(validateSecretWord('oportunidades', 'OPORTUNIDADES')).toBe(true);
      expect(validateSecretWord('  Oportunidades  ', 'OPORTUNIDADES')).toBe(true);
      expect(validateSecretWord('sydle one', 'SYDLE ONE')).toBe(true);
    });

    it('rejeita palavras secretas incorretas ou vazias', () => {
      expect(validateSecretWord('ERRADA', 'OPORTUNIDADES')).toBe(false);
      expect(validateSecretWord('', 'OPORTUNIDADES')).toBe(false);
      expect(validateSecretWord(null, 'OPORTUNIDADES')).toBe(false);
      expect(validateSecretWord('OPORTUNIDADES', '')).toBe(false);
    });
  });

  describe('validateQuizAnswer', () => {
    it('valida índice de resposta correto no quiz', () => {
      expect(validateQuizAnswer(0, 0)).toBe(true);
      expect(validateQuizAnswer('2', 2)).toBe(true);
      expect(validateQuizAnswer(1, 2)).toBe(false);
    });
  });

  describe('isFlashMissionActive', () => {
    it('identifica corretamente se a missão relâmpago está ativa e dentro do prazo', () => {
      const activeFlash = {
        id: 'flash_1',
        isFlash: true,
        status: 'active',
        flashConfig: {
          expiresAt: new Date(Date.now() + 1000 * 60 * 5) // expira em 5 min
        }
      };
      expect(isFlashMissionActive(activeFlash)).toBe(true);

      const expiredFlash = {
        id: 'flash_2',
        isFlash: true,
        status: 'active',
        flashConfig: {
          expiresAt: new Date(Date.now() - 1000) // expirou há 1s
        }
      };
      expect(isFlashMissionActive(expiredFlash)).toBe(false);

      const pausedFlash = {
        id: 'flash_3',
        isFlash: true,
        status: 'paused',
        flashConfig: {
          expiresAt: new Date(Date.now() + 1000 * 60 * 5)
        }
      };
      expect(isFlashMissionActive(pausedFlash)).toBe(false);

      const normalMission = {
        id: 'normal_1',
        isFlash: false,
        status: 'active'
      };
      expect(isFlashMissionActive(normalMission)).toBe(false);
    });
  });
});
