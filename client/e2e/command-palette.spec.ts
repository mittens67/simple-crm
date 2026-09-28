import { test, expect } from '@playwright/test';
import { login_as, DEMO_MANAGER } from './helpers';

/**
 * Natural-language search.
 *
 * The property worth testing is not that the model is clever — CI runs the
 * deterministic mock — but that a question is compiled into a validated plan,
 * shown back to the user, and executed within their own scope.
 */
test('the command palette answers a natural-language question', async ({ page }) => {
  await login_as(page, DEMO_MANAGER);

  await page.keyboard.press('Control+k');
  const dialog = page.getByRole('dialog', { name: 'Search your CRM' });
  await expect(dialog).toBeVisible();

  await dialog.getByLabel('Search question').fill('show me converted leads');
  await dialog.getByRole('button', { name: 'Search' }).click();

  // The interpreted plan is displayed, so the user can see how the question was
  // read rather than trusting an opaque result set. Asserted on the plan's own
  // code block: 'Converted' also appears in every result badge.
  await expect(dialog.getByText('Understood as:')).toBeVisible();
  await expect(dialog.locator('.palette-plan code')).toContainText('"status":"Converted"');
});

test('the palette offers example queries and runs them', async ({ page }) => {
  await login_as(page, DEMO_MANAGER);

  await page.keyboard.press('Control+k');
  const dialog = page.getByRole('dialog', { name: 'Search your CRM' });

  await dialog.getByRole('button', { name: 'deals over 50k' }).click();

  await expect(dialog.getByText('Understood as:')).toBeVisible();
  await expect(dialog.getByRole('button', { name: /^Open deals/ })).toBeVisible();
});

test('the palette closes on Escape', async ({ page }) => {
  await login_as(page, DEMO_MANAGER);

  await page.keyboard.press('Control+k');
  await expect(page.getByRole('dialog', { name: 'Search your CRM' })).toBeVisible();

  await page.keyboard.press('Escape');
  await expect(page.getByRole('dialog', { name: 'Search your CRM' })).toBeHidden();
});
