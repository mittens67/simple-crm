import { test, expect } from '@playwright/test';
import { login_as, DEMO_SALES } from './helpers';

test('login flow with session persistence', async ({ page }) => {
  await login_as(page, DEMO_SALES);

  // The access token is held in memory only; surviving a reload proves the
  // httpOnly refresh cookie and the silent-refresh path both work.
  await page.reload();
  await expect(page).toHaveURL('/');
  await expect(page.getByRole('heading', { name: /Dashboard/i })).toBeVisible();
});

test('unauthenticated visitors are sent to the login page', async ({ page }) => {
  await page.goto('/leads');
  await expect(page).toHaveURL(/\/login/);
  await expect(page.locator('input[type="email"]')).toBeVisible();
});
