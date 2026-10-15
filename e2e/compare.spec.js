// Captura de página inteira do app atual (390 px) para comparar com o redesign.
// Roda sob demanda com: COMPARE=1 npx playwright test --grep @visual-media
import { test, expect } from '@playwright/test';

const OUT = 'docs/redesign/screens/develop-390';

test.describe('@visual-media redesign compare', () => {
  test.use({ viewport: { width: 390, height: 844 } });

  // O app rola dentro de um contêiner de 100dvh, não na página: mede o maior scrollHeight e estica a viewport.
  async function shot(page, name) {
    const h = await page.evaluate(() => Math.max(...Array.from(document.querySelectorAll('*')).map((e) => e.scrollHeight)));
    await page.setViewportSize({ width: 390, height: Math.min(Math.max(844, h), 5000) });
    await page.waitForLoadState('domcontentloaded');
    await page.screenshot({ path: `${OUT}/${name}.png` });
    await page.setViewportSize({ width: 390, height: 844 });
  }

  test('app do participante · develop', async ({ page }) => {
    test.skip(!process.env.COMPARE, 'defina COMPARE=1');
    test.setTimeout(180_000);
    const stamp = Date.now().toString(36);
    const email = `comparacao.${stamp}@ufu.br`;
    const password = process.env.E2E_TEST_PASSWORD || '123456';

    await page.goto('/#/login');
    await expect(page.getByRole('button', { name: /Entrar/i })).toBeVisible();
    await shot(page, '01-login');

    await page.goto('/#/cadastro');
    await expect(page.getByPlaceholder('Nome', { exact: true })).toBeVisible();
    await shot(page, '02-cadastro-etapa1');
    await page.getByPlaceholder('Nome', { exact: true }).fill('Fabio');
    await page.getByPlaceholder('Sobrenome').fill('Oliveira');
    await page.getByPlaceholder('Ex: devninja').fill(`fabio${stamp}`);
    await page.getByPlaceholder('Ex: 3').fill('6');
    await page.getByPlaceholder('seu.email@exemplo.com').fill(email);
    await page.getByPlaceholder('(34) 99999-9999').fill('34999990000');
    const pw = page.locator('input[type="password"]');
    await pw.nth(0).fill(password);
    await pw.nth(1).fill(password);
    await page.getByRole('button', { name: 'Próximo' }).click();

    await expect(page.getByRole('button', { name: 'Concluir Cadastro' })).toBeVisible();
    await shot(page, '03-cadastro-etapa2');
    await page.getByRole('checkbox').check();
    await page.getByRole('button', { name: 'Concluir Cadastro' }).click();
    await page.waitForURL(/onboarding/, { timeout: 30_000 });
    await expect(page.locator('body')).toBeVisible();
    await shot(page, '04-onboarding');

    await page.evaluate(() => localStorage.setItem('facom_onboarding_completed', 'true'));
    const routes = [
      ['05-inicio', '/'],
      ['06-agenda', '/agenda'],
      ['07-feed', '/feed'],
      ['08-escanear', '/scanner'],
      ['09-missoes', '/challenges'],
      ['10-passaporte', '/challenges?tab=passport'],
      ['11-ranking', '/ranking'],
      ['12-perfil', '/profile']
    ];
    for (const [name, route] of routes) {
      await page.goto('/#' + route);
      await page.waitForLoadState('domcontentloaded');
      await expect(page.locator('body')).toBeVisible();
      await shot(page, name);
    }

    await page.goto('/#/agenda');
    const minhaAgendaBtn = page.getByRole('button', { name: 'Minha agenda' });
    await expect(minhaAgendaBtn).toBeVisible();
    await minhaAgendaBtn.click();
    await expect(page.locator('body')).toBeVisible();
    await shot(page, '13-minha-agenda');
  });
});
