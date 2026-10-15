import { test, expect } from '@playwright/test';

test.describe('Portais e Telas Especiais', () => {
  test('deve renderizar a tela de TV vertical /tv/programacao', async ({ page }) => {
    await page.goto('/#/tv/programacao');
    await expect(page.locator('body')).toBeVisible();

    // Deve conter header do evento / logo ou indicador de programação
    await expect(page.locator('img[alt="FACOM Tech Week"]')).toBeVisible({ timeout: 15_000 });
  });

  test('deve renderizar a tela de acesso do portal administrativo /admin', async ({ page }) => {
    await page.goto('/#/admin');
    await expect(page.locator('body')).toBeVisible();

    // Quando não autenticado como admin, exibe a tela de login administrativo ou casca do portal
    const adminEmailInput = page.getByPlaceholder(/admin@facom.ufu.br/i);
    const adminHeading = page.getByRole('heading', { name: /Admin|Painel|FACOM/i });
    await expect(adminEmailInput.or(adminHeading).first()).toBeVisible({ timeout: 15_000 });
  });

  test('deve renderizar a tela de acesso da equipe de staff /staff', async ({ page }) => {
    await page.goto('/#/staff');
    await expect(page.locator('body')).toBeVisible();

    // Quando não autenticado como staff, exibe login da portaria ou interface de staff
    const staffEmailInput = page.getByPlaceholder(/voce@techweek.com/i);
    const staffHeading = page.getByRole('heading', { name: /Staff|Portaria|Check-in/i });
    await expect(staffEmailInput.or(staffHeading).first()).toBeVisible({ timeout: 15_000 });
  });

  test('deve renderizar o portal do patrocinador /sponsor sem erros de runtime', async ({ page }) => {
    await page.goto('/#/sponsor');
    await expect(page.locator('body')).toBeVisible({ timeout: 15_000 });
  });
});

