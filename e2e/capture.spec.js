// Captura de telas para comparação antes/depois do redesign.
// Só roda com SHOT_PHASE definido: SHOT_PHASE=before npx playwright test capture
import { test } from '@playwright/test';
import { login } from './helpers';

const phase = process.env.SHOT_PHASE;
const ROUTES = ['/', '/agenda', '/challenges', '/ranking', '/profile', '/scanner', '/feed'];
const VIEWPORTS = [390, 430, 768, 1024, 1440];

test.skip(!phase, 'defina SHOT_PHASE=before|after');

test('telas logado', async ({ page }) => {
  await login(page);
  for (const width of VIEWPORTS) {
    await page.setViewportSize({ width, height: 900 });
    for (const route of ROUTES) {
      await page.goto('/#' + route);
      await page.waitForTimeout(1200);
      const name = route === '/' ? 'home' : route.slice(1);
      await page.screenshot({ path: `docs/redesign/screens/${phase}/${name}-${width}.png` });
    }
  }
});

test('telas de entrada', async ({ page }) => {
  for (const width of [390, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    for (const route of ['/login', '/cadastro']) {
      await page.goto('/#' + route);
      await page.waitForTimeout(2500);
      await page.screenshot({ path: `docs/redesign/screens/${phase}/${route.slice(1)}-${width}.png` });
    }
  }
});
