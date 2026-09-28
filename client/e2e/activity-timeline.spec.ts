import { test, expect } from '@playwright/test';
import { login_as, create_lead, row_for, unique, DEMO_SALES } from './helpers';

/**
 * The timeline replaced the single overwritable sales_notes string, so the
 * property worth testing is that history accumulates rather than being
 * replaced on every edit.
 */
test('activity logged against a lead accumulates on its timeline', async ({ page }) => {
  await login_as(page, DEMO_SALES);
  await page.goto('/leads');

  const name = unique('Timeline Lead');
  await create_lead(page, name);

  await row_for(page, name).getByRole('link', { name }).click();
  await expect(page.getByRole('heading', { name, level: 1 })).toBeVisible();
  await expect(page.getByText('No activity yet')).toBeVisible();

  const log = async (subject: string) => {
    await page.getByRole('button', { name: 'Log activity' }).click();
    const dialog = page.getByRole('dialog');
    await dialog.getByLabel('Subject').fill(subject);
    await dialog.getByRole('button', { name: 'Log', exact: true }).click();
    await expect(dialog).toBeHidden();
  };

  await log('First call');
  await expect(page.getByText('First call')).toBeVisible();

  await log('Second call');

  // Both survive. The old notes field lost the first entry on every edit.
  await expect(page.getByText('First call')).toBeVisible();
  await expect(page.getByText('Second call')).toBeVisible();
});

test('a task logged with a due date appears in the task list', async ({ page }) => {
  await login_as(page, DEMO_SALES);
  await page.goto('/leads');

  const name = unique('Task Lead');
  await create_lead(page, name);
  await row_for(page, name).getByRole('link', { name }).click();

  const subject = unique('Send the quote');
  await page.getByRole('button', { name: 'Log activity' }).click();
  const dialog = page.getByRole('dialog');
  await dialog.getByLabel('Type').selectOption('Task');
  await dialog.getByLabel('Subject').fill(subject);
  await dialog.getByLabel('Due date').fill('2026-12-01');
  await dialog.getByRole('button', { name: 'Log', exact: true }).click();
  await expect(dialog).toBeHidden();

  // Tasks are activities with a due date, so the list is a filtered view of the
  // same entity rather than a separate concept.
  await page.goto('/tasks');
  await expect(page.getByText(subject)).toBeVisible();

  // Completing it removes it from the default open-only view.
  await row_for(page, subject).getByRole('button', { name: 'Complete' }).click();
  await expect(page.getByText(subject)).toHaveCount(0);

  await page.getByLabel('Show completed').check();
  await expect(page.getByText(subject)).toBeVisible();
});
