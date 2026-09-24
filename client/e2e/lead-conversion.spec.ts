import { test, expect } from '@playwright/test';
import { login_as, DEMO_SALES } from './helpers';

test('a lead can be created and then converted into a customer', async ({ page }) => {
  await login_as(page, DEMO_SALES);

  await page.goto('/leads');
  await expect(page.getByRole('heading', { name: /^Leads$/i })).toBeVisible();

  const stamp = Date.now();
  const lead_name = `Test Lead ${stamp}`;

  // Leads are always created Open — the server's create schema pins the status
  // and conversion happens through an update.
  await page.getByRole('button', { name: /New Lead/i }).click();
  await page.fill('input[name="name"]', lead_name);
  await page.fill('input[name="email"]', `lead-${stamp}@test.com`);
  await page.fill('input[name="phone"]', '555-0123');
  await page.getByRole('button', { name: /^Create$/ }).click();

  const lead_row = page.getByRole('row', { name: new RegExp(lead_name) });
  await expect(lead_row).toBeVisible();

  // Convert it.
  await lead_row.getByRole('button', { name: /^Edit$/ }).click();
  await page.selectOption('select[name="status"]', 'Converted');
  await page.getByRole('button', { name: /^Update$/ }).click();

  // Converting auto-creates a Customer and back-links it, so the
  // "Converted To" cell must name that customer rather than showing a dash.
  const converted_row = page.getByRole('row', { name: new RegExp(lead_name) });
  await expect(converted_row).toContainText('Converted');

  const converted_to = converted_row.locator('td').nth(5);
  await expect(converted_to).not.toHaveText('-');
  await expect(converted_to).toContainText(/\S/);
});
