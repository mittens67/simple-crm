import { test, expect } from '@playwright/test';
import { login_as, logout, DEMO_SALES } from './helpers';

test('login flow with session persistence', async ({ page }) => {
  await login_as(page, DEMO_SALES);

  // The access token is held in memory only; surviving a reload proves the
  // httpOnly refresh cookie and the silent-refresh path both work.
  await page.reload();
  await expect(page).toHaveURL('/');
  await expect(page.getByRole('heading', { name: 'Dashboard', level: 1 })).toBeVisible();
});

test('unauthenticated visitors are sent to the login page', async ({ page }) => {
  await page.goto('/leads');

  await expect(page).toHaveURL(/\/login/);
  await expect(page.locator('input[type="email"]')).toBeVisible();
});

test('the login form is reachable before the server has warmed up', async ({ page }) => {
  // The health check used to gate the whole app, so a cold backend hid the
  // login form for up to thirty seconds.
  await page.goto('/login');

  await expect(page.locator('input[type="email"]')).toBeVisible({ timeout: 5000 });
});

test('an unknown URL shows the not-found page rather than a blank shell', async ({ page }) => {
  await login_as(page, DEMO_SALES);
  await page.goto('/does-not-exist');

  await expect(page.getByText('Page not found')).toBeVisible();
});

test('logging out returns to the login page and clears the session', async ({ page }) => {
  await login_as(page, DEMO_SALES);

  await logout(page);

  // Going back must not restore an authenticated view.
  await page.goto('/leads');
  await expect(page).toHaveURL(/\/login/);
});
