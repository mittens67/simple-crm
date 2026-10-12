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

/** Sees every rep's records via the `.all` scopes. */
export const DEMO_MANAGER: DemoAccount = {
  email: 'demo-manager@example.com',
  password: demo_password,
};

/**
 * Logs in and waits for the dashboard.
 *
 * The app has no /dashboard path — the authenticated shell is mounted at '/',
 * with flat child routes like /leads. The original specs navigated to
 * /dashboard/sales/leads, which never existed.
 */
export const login_as = async (page: Page, account: DemoAccount) => {
  await page.goto('/login');
  await page.fill('input[type="email"]', account.email);
  await page.fill('input[type="password"]', account.password);
  await page.click('button[type="submit"]');

  await page.waitForURL('/');
  await expect(page.getByRole('heading', { name: 'Dashboard', level: 1 })).toBeVisible();
};

/** Opens a page from the sidebar, which is also a check that the link is offered. */
export const navigate_to = async (page: Page, label: string) => {
  await page.getByRole('link', { name: label, exact: true }).click();
};

/**
 * A unique suffix, so specs running in parallel against a shared database do
 * not collide on names or emails.
 */
export const unique = (prefix: string) => `${prefix}-${Date.now()}-${Math.floor(Math.random() * 1e4)}`;

/**
 * Creates a lead through the UI and returns its name.
 *
 * Leads are always created Open: the server's create schema pins the status, so
 * conversion has to happen through a subsequent update.
 */
export const create_lead = async (page: Page, name: string) => {
  await page.getByRole('button', { name: 'New Lead' }).click();

  const dialog = page.getByRole('dialog');
  await expect(dialog).toBeVisible();

  // Labels are wired with htmlFor now, so they can be used as selectors.
  await dialog.getByLabel('Name').fill(name);
  // The name contains spaces, which are not valid in an email local part —
  // the app rightly rejects `convert me-123@example.com`.
  const local_part = name.toLowerCase().replace(/[^a-z0-9]+/g, '.');
  await dialog.getByLabel('Email').fill(`${local_part}@example.com`);
  await dialog.getByLabel('Phone').fill('555-0123');
  await dialog.getByRole('button', { name: 'Create' }).click();

  await expect(dialog).toBeHidden();
  return name;
};

/** The table row containing the given text. */
export const row_for = (page: Page, text: string) =>
  page.getByRole('row').filter({ hasText: text });

/**
 * Waits for a list page's table to finish loading.
 *
 * Counting rows straight after `goto` races the query: the table renders
 * skeleton rows first, so an immediate count can be zero.
 */
export const wait_for_rows = async (page: Page) => {
  await expect(page.locator('.ui-table tbody tr').first()).toBeVisible();
  await expect(page.locator('.ui-skeleton')).toHaveCount(0);
};

/** Logs out through the sidebar and its confirmation dialog. */
export const logout = async (page: Page) => {
  await page.getByRole('navigation').getByRole('button', { name: 'Log out' }).click();
  await page.getByRole('dialog').getByRole('button', { name: 'Log Out' }).click();
  await expect(page).toHaveURL(/\/login/);
};

/**
 * The total a list page reports, read from the pagination summary
 * ("1–20 of 57"). Counting rendered rows would cap at the page size.
 */
export const total_from_pagination = async (page: Page): Promise<number> => {
  const text = await page.locator('.pagination-status').innerText();
  const match = text.match(/of\s+(\d+)/);
  if (!match) throw new Error(`Could not read a total from "${text}"`);
  return Number(match[1]);
};
