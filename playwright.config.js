// E2E contra o app local + Firebase Emulator Suite (nunca contra projeto real).
// Pré-requisitos: `npm run emulators`, seeds (`npm run seed:activities`, `seed:missions`),
// `npm run dev` e uma conta de teste no emulador com E2E_TEST_EMAIL/E2E_TEST_PASSWORD no .env.local.
// Ver docs/GUIA_DEV_EMULADORES.md. Fora do CI de propósito: o CI não sobe emulador.
import { defineConfig } from '@playwright/test';
import { readFileSync, existsSync } from 'node:fs';

if (existsSync('.env.local')) {
  for (const line of readFileSync('.env.local', 'utf8').split(/\r?\n/)) {
    const m = line.match(/^(E2E_[A-Z_]+)=(.*)$/);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2];
  }
}

export default defineConfig({
  testDir: 'e2e',
  timeout: 60_000,
  workers: 1,
  projects: [
    {
      name: 'functional',
      testIgnore: /.*(capture|compare)\.spec\.js/,
    },
    {
      name: 'visual',
      testMatch: /.*(capture|compare)\.spec\.js/,
    },
  ],
  use: {
    baseURL: process.env.E2E_BASE_URL || 'http://localhost:5180',
    viewport: { width: 390, height: 844 },
    locale: 'pt-BR',
  },
  webServer: {
    command: 'npx vite --port 5180',
    url: 'http://localhost:5180',
    reuseExistingServer: !process.env.CI,
  },
});
