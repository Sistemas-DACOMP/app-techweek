// Captura de telas para comparação antes/depois do redesign.
// Roda sob demanda com: SHOT_PHASE=before npx playwright test --grep @visual-media
import { test, expect } from '@playwright/test';
import { login } from './helpers';

const phase = process.env.SHOT_PHASE;
const ROUTES = ['/', '/agenda', '/challenges', '/ranking', '/profile', '/scanner', '/feed'];
const VIEWPORTS = [390, 430, 768, 1024, 1440];

test.describe('@visual-media redesign capture', () => {
  test('telas logado', async ({ page }) => {
    test.skip(!phase, 'defina SHOT_PHASE=before|after');
    await login(page);

    for (const width of VIEWPORTS) {
      await page.setViewportSize({ width, height: 900 });
      for (const route of ROUTES) {
        await page.goto('/#' + route);
        await page.waitForLoadState('domcontentloaded');
        await expect(page.locator('body')).toBeVisible();
        const name = route === '/' ? 'home' : route.slice(1);
        await page.screenshot({ path: `docs/redesign/screens/${phase}/${name}-${width}.png` });
      }
    }
  });

  test('telas de entrada', async ({ page }) => {
    test.skip(!phase, 'defina SHOT_PHASE=before|after');

    for (const width of [390, 1440]) {
      await page.setViewportSize({ width, height: 900 });
      for (const route of ['/login', '/cadastro']) {
        await page.goto('/#' + route);
        await page.waitForLoadState('domcontentloaded');
        if (route === '/login') {
          await expect(page.getByRole('button', { name: /Entrar/i })).toBeVisible();
        } else {
          await expect(page.getByRole('button', { name: /Próximo/i })).toBeVisible();
        }
        await page.screenshot({ path: `docs/redesign/screens/${phase}/${route.slice(1)}-${width}.png` });
      }
    }
  });
});
