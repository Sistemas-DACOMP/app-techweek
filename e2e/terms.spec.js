import { test, expect } from '@playwright/test';

test.describe('Termos de Uso e LGPD', () => {
  test('deve renderizar a página de termos e suas abas de documento', async ({ page }) => {
    await page.goto('/#/termos');

    const title = page.getByRole('heading', { name: /Termos e privacidade/i });
    await expect(title).toBeVisible({ timeout: 15_000 });

    const termsTab = page.locator('#tab-terms');
    const lgpdTab = page.locator('#tab-lgpd');
    await expect(termsTab).toBeVisible();
    await expect(lgpdTab).toBeVisible();

    // Por padrão a aba de termos está ativa
    await expect(termsTab).toHaveAttribute('aria-selected', 'true');
    await expect(page.locator('#panel-terms')).toBeVisible();
  });

  test('deve alternar entre os painéis de Termos e de Privacidade LGPD', async ({ page }) => {
    await page.goto('/#/termos');

    const lgpdTab = page.locator('#tab-lgpd');
    await expect(lgpdTab).toBeVisible({ timeout: 15_000 });
    await lgpdTab.click();

    await expect(lgpdTab).toHaveAttribute('aria-selected', 'true');
    await expect(page.locator('#panel-lgpd')).toBeVisible();
    await expect(page.locator('#panel-terms')).not.toBeVisible();

    // Volta para Termos
    const termsTab = page.locator('#tab-terms');
    await termsTab.click();
    await expect(termsTab).toHaveAttribute('aria-selected', 'true');
    await expect(page.locator('#panel-terms')).toBeVisible();
  });

  test('deve permitir voltar para a página anterior via botão Voltar', async ({ page }) => {
    // Navega para /#/login primeiro para ter histórico
    await page.goto('/#/login');
    await expect(page.locator('#login-email')).toBeVisible({ timeout: 15_000 });

    await page.goto('/#/termos');
    const backBtn = page.getByRole('button', { name: 'Voltar' });
    await expect(backBtn).toBeVisible({ timeout: 15_000 });

    await backBtn.click();
    await expect(page).toHaveURL(/#\/login/);
  });
});

