import { expect, test } from '@playwright/test';

const email = process.env.E2E_EMAIL ?? 'coordinador@tutorias.local';
const password = process.env.E2E_PASSWORD ?? 'coordinador-dev-123';

test.describe('autenticación', () => {
  test('una ruta protegida sin sesión redirige a /login', async ({ page }) => {
    await page.goto('/');
    await expect(page).toHaveURL(/\/login$/);
    await expect(page.getByRole('heading', { name: 'Tutorías entre pares' })).toBeVisible();
  });

  test('credenciales incorrectas muestran un error', async ({ page }) => {
    await page.goto('/login');
    await page.getByLabel('Correo').fill(email);
    await page.getByLabel('Contraseña').fill('contrasena-incorrecta');
    await page.getByRole('button', { name: 'Ingresar' }).click();
    await expect(page.getByRole('alert')).toContainText('Correo o contraseña incorrectos');
  });

  test('login → área protegida → logout', async ({ page }) => {
    await page.goto('/');
    await page.getByLabel('Correo').fill(email);
    await page.getByLabel('Contraseña').fill(password);
    await page.getByRole('button', { name: 'Ingresar' }).click();

    await expect(page).not.toHaveURL(/\/login$/);
    await expect(page.getByText(`(${email})`)).toBeVisible();

    // La sesión sobrevive a una recarga (cookie httpOnly).
    await page.reload();
    await expect(page.getByText(`(${email})`)).toBeVisible();

    await page.getByRole('button', { name: 'Cerrar sesión' }).click();
    await expect(page).toHaveURL(/\/login$/);
  });
});
