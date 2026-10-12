import { describe, it, expect } from 'vitest';
import { missingEmulatorVars } from './seed-guard.mjs';

describe('missingEmulatorVars', () => {
  it('lista as duas quando nenhuma está definida', () => {
    expect(missingEmulatorVars({})).toEqual(['FIRESTORE_EMULATOR_HOST', 'FIREBASE_AUTH_EMULATOR_HOST']);
  });

  it('lista só a que falta', () => {
    expect(missingEmulatorVars({ FIRESTORE_EMULATOR_HOST: '127.0.0.1:8080' })).toEqual(['FIREBASE_AUTH_EMULATOR_HOST']);
  });

  it('vazio quando as duas estão definidas', () => {
    expect(missingEmulatorVars({ FIRESTORE_EMULATOR_HOST: 'a:1', FIREBASE_AUTH_EMULATOR_HOST: 'b:2' })).toEqual([]);
  });
});
