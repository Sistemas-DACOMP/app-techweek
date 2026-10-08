// Trava dos seeds exclusivos do emulador (KAN-123): devolve a lista de
// variáveis de emulador que faltam. Vazia = seguro pra rodar.
const REQUIRED = ['FIRESTORE_EMULATOR_HOST', 'FIREBASE_AUTH_EMULATOR_HOST'];

export function missingEmulatorVars(env = process.env) {
  return REQUIRED.filter((name) => !env[name]);
}
