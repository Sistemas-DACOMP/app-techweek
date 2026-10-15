import { test, expect } from '@playwright/test';

test.describe('Fluxo de Cadastro', () => {
  test('deve renderizar a etapa 1 do cadastro com todos os campos principais', async ({ page }) => {
    await page.goto('/#/cadastro');

    const firstNameInput = page.locator('#reg-nome');
    await expect(firstNameInput).toBeVisible({ timeout: 15_000 });

    await expect(page.locator('#reg-sobrenome')).toBeVisible();
    await expect(page.locator('#reg-user')).toBeVisible();
    await expect(page.locator('#reg-email')).toBeVisible();
    await expect(page.getByRole('button', { name: /Continuar/i })).toBeVisible();
    await expect(page.getByRole('link', { name: /Voltar para o login/i })).toBeVisible();
  });

  test('deve barrar o avanço para a etapa 2 quando campos obrigatórios estiverem vazios', async ({ page }) => {
    await page.goto('/#/cadastro');

    const nextBtn = page.getByRole('button', { name: /Continuar/i });
    await expect(nextBtn).toBeVisible({ timeout: 15_000 });

    // Clica em Continuar sem preencher nenhum campo
    await nextBtn.click();

    // Deve exibir mensagem de erro e permanecer na etapa 1
    const errorMsg = page.getByText(/Por favor, corrija os erros/i);
    await expect(errorMsg).toBeVisible();
    await expect(page.getByRole('button', { name: /Continuar/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /Criar meu crachá/i })).not.toBeVisible();
  });

  test('deve navegar de volta para o login pelo link da tela de cadastro', async ({ page }) => {
    await page.goto('/#/cadastro');

    const loginLink = page.getByRole('link', { name: /Voltar para o login/i });
    await expect(loginLink).toBeVisible({ timeout: 15_000 });
    await loginLink.click();

    await expect(page).toHaveURL(/#\/login/);
    await expect(page.locator('#login-email')).toBeVisible();
  });
});


