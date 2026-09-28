import { test, expect } from '@playwright/test';
import { login_as, create_lead, row_for, unique, DEMO_SALES } from './helpers';

test('a lead can be created and then converted into a customer', async ({ page }) => {
  await login_as(page, DEMO_SALES);
  await page.goto('/leads');
  await expect(page.getByRole('heading', { name: 'Leads', level: 1 })).toBeVisible();

  const name = unique('Convert Me');
  await create_lead(page, name);

  const row = row_for(page, name);
  await expect(row).toBeVisible();
  await expect(row).toContainText('Open');

  // Conversion is an update: the create schema pins status to Open.
  await row.getByRole('button', { name: 'Edit' }).click();
  const dialog = page.getByRole('dialog');
  await dialog.getByLabel('Status').selectOption('Converted');
  await dialog.getByRole('button', { name: 'Update' }).click();
  await expect(dialog).toBeHidden();

  // Converting auto-creates a Customer and back-links it.
  const converted = row_for(page, name);
  await expect(converted).toContainText('Converted');
  await expect(converted.locator('td[data-label="Converted To"]')).not.toHaveText('—');
});

test('a converted lead becomes read-only', async ({ page }) => {
  await login_as(page, DEMO_SALES);
  await page.goto('/leads');

  const name = unique('Read Only');
  await create_lead(page, name);

  const row = row_for(page, name);
  await row.getByRole('button', { name: 'Edit' }).click();
  const dialog = page.getByRole('dialog');
  await dialog.getByLabel('Status').selectOption('Converted');
  await dialog.getByRole('button', { name: 'Update' }).click();
  await expect(dialog).toBeHidden();

  // Terminal states swap Edit for View, and drop the archive action.
  const converted = row_for(page, name);
  await expect(converted.getByRole('button', { name: 'View' })).toBeVisible();
  await expect(converted.getByRole('button', { name: 'Edit' })).toHaveCount(0);
  await expect(converted.getByRole('button', { name: 'Archive' })).toHaveCount(0);
});

test('invalid input is reported per field rather than silently rejected', async ({ page }) => {
  await login_as(page, DEMO_SALES);
  await page.goto('/leads');

  await page.getByRole('button', { name: 'New Lead' }).click();
  const dialog = page.getByRole('dialog');

  await dialog.getByLabel('Name').fill('Valid Name');
  await dialog.getByLabel('Email').fill('not-an-email');
  await dialog.getByLabel('Phone').fill('555-0000');
  await dialog.getByRole('button', { name: 'Create' }).click();

  // Forms previously had native `required` and nothing else, so a bad email
  // reached the server and came back as a blocking alert.
  await expect(dialog).toBeVisible();
  await expect(dialog.getByText('Enter a valid email address')).toBeVisible();
});
