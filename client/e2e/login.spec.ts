import { test, expect } from '@playwright/test';

test('login flow with session persistence', async ({ page }) => {
  // Navigate to login page
  await page.goto('/');

  // Fill email and password
  await page.fill('input[type="email"]', 'demo-sales@example.com');
  await page.fill('input[type="password"]', 'Demo123');

  // Submit login form
  await page.click('button[type="submit"]');

  // Wait for navigation to dashboard
  await page.waitForURL('/dashboard', { waitUntil: 'networkidle' });
  expect(page.url()).toContain('/dashboard');

  // Assert dashboard content is visible
  await expect(page.locator('h1, h2')).first().toBeVisible({ timeout: 5000 });

  // Reload page to test session persistence
  await page.reload();
  await page.waitForURL('/dashboard');

  // Assert we're still on dashboard (session survived reload)
  expect(page.url()).toContain('/dashboard');
  await expect(page.locator('h1, h2')).first().toBeVisible({ timeout: 5000 });
});
