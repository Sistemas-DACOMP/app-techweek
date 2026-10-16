import { test, expect } from '@playwright/test';

test.describe('Autenticação e Acesso', () => {
  test('deve renderizar a tela de login com formulário e links essenciais', async ({ page }) => {
    await page.goto('/#/login');

    // Aguarda o término da animação de abertura (splash) e aparição do form
    const emailInput = page.locator('#login-email');
    await expect(emailInput).toBeVisible({ timeout: 15_000 });

    // Valida elementos do formulário
    await expect(page.locator('#login-senha')).toBeVisible();
    await expect(page.getByRole('button', { name: /Entrar/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /Esqueci minha senha/i })).toBeVisible();
    await expect(page.getByRole('link', { name: /Criar conta/i })).toBeVisible();
  });

  test('deve alternar a visibilidade da senha no campo de login', async ({ page }) => {
    await page.goto('/#/login');
    const passwordInput = page.locator('#login-senha');
    await expect(passwordInput).toBeVisible({ timeout: 15_000 });

    // Inicialmente o campo é do tipo password
    await expect(passwordInput).toHaveAttribute('type', 'password');

    // Clica no botão de alternar visibilidade
    const toggleBtn = page.getByRole('button', { name: /Mostrar senha|Ocultar senha/i });
    await toggleBtn.click();
    await expect(passwordInput).toHaveAttribute('type', 'text');

    // Clica novamente para ocultar
    await toggleBtn.click();
    await expect(passwordInput).toHaveAttribute('type', 'password');
  });

  test('deve abrir e fechar a folha modal de recuperação de senha', async ({ page }) => {
    await page.goto('/#/login');
    const forgotBtn = page.getByRole('button', { name: /Esqueci minha senha/i });
    await expect(forgotBtn).toBeVisible({ timeout: 15_000 });

    await forgotBtn.click();

    // Modal visível
    const dialog = page.getByRole('dialog');
    await expect(dialog).toBeVisible();
    await expect(page.locator('#reset-email')).toBeVisible();

    // Fecha clicando no scrim (área de fundo)
    const scrim = page.locator('.ds-scrim');
    await scrim.click({ force: true });
    await expect(dialog).not.toBeVisible();
  });

  test('deve redirecionar usuário não autenticado para /login ao acessar rota protegida', async ({ page }) => {
    // Tenta acessar home diretamente
    await page.goto('/#/');
    await expect(page).toHaveURL(/#\/login/, { timeout: 15_000 });

    // Tenta acessar agenda diretamente
    await page.goto('/#/agenda');
    await expect(page).toHaveURL(/#\/login/, { timeout: 15_000 });

    // Tenta acessar missões diretamente
    await page.goto('/#/challenges');
    await expect(page).toHaveURL(/#\/login/, { timeout: 15_000 });
  });
});

