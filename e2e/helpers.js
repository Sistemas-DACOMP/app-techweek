export async function login(page) {
  const email = process.env.E2E_TEST_EMAIL;
  const password = process.env.E2E_TEST_PASSWORD;
  if (!email || !password) throw new Error('Defina E2E_TEST_EMAIL e E2E_TEST_PASSWORD no .env.local');

  await page.addInitScript(() => localStorage.setItem('facom_onboarding_completed', 'true'));
  await page.goto('/#/login');
  await page.locator('input[type="email"]').first().fill(email);
  await page.locator('input[type="password"]').first().fill(password);
  await page.getByRole('button', { name: 'Entrar' }).click();
  await page.waitForURL(/#\/$/);
}
