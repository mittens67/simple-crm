import { expect, type Page } from '@playwright/test';

export interface DemoAccount {
  email: string;
  password: string;
}

// Kept in step with server/src/scripts/seed.ts. The password is overridable so
// CI and local runs can use a non-default DEMO_PASSWORD.
const demo_password = process.env.DEMO_PASSWORD || 'Demo123!';

export const DEMO_SALES: DemoAccount = {
  email: 'demo-sales@example.com',
  password: demo_password,
};

export const DEMO_SUPPORT: DemoAccount = {
  email: 'demo-support@example.com',
  password: demo_password,
};

/**
 * Logs in and waits for the dashboard. The app has no /dashboard path — the
 * authenticated shell is mounted at '/', with flat child routes like /leads.
 */
export const login_as = async (page: Page, account: DemoAccount) => {
  await page.goto('/login');
  await page.fill('input[type="email"]', account.email);
  await page.fill('input[type="password"]', account.password);
  await page.click('button[type="submit"]');

  await page.waitForURL('/');
  await expect(page.getByRole('heading', { name: /Dashboard/i })).toBeVisible();
};
