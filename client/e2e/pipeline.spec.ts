import { test, expect } from '@playwright/test';
import { login_as, DEMO_MANAGER } from './helpers';

/**
 * Deals previously had a free-string `stage` with no UI input at all, so there
 * was no way to see or change where a deal sat.
 */
test('the pipeline board shows stages in pipeline order', async ({ page }) => {
  await login_as(page, DEMO_MANAGER);
  await page.goto('/pipeline');

  await expect(page.getByRole('heading', { name: 'Pipeline', level: 1 })).toBeVisible();

  // Stage order comes from display_order, not from the order deals happen to
  // be in. Terminal stages are present but hold no open deals.
  await expect(page.locator('.pipeline-column h2')).toHaveText([
    'Prospecting',
    'Qualification',
    'Proposal',
    'Negotiation',
    'Closed Won',
    'Closed Lost',
  ]);
});

test('moving a deal forward takes it out of its previous column', async ({ page }) => {
  await login_as(page, DEMO_MANAGER);
  await page.goto('/pipeline');

  const card = page.locator('.pipeline-card').first();
  await expect(card).toBeVisible();

  const title = (await card.locator('.pipeline-card-title').innerText()).trim();
  // Walk up from the card. `filter({ has: card })` matches every column,
  // because the inner locator is re-evaluated against each candidate rather
  // than being pinned to this one element.
  const origin_name = (
    await card.locator('xpath=ancestor::section[1]').locator('h2').innerText()
  ).trim();

  // Movement is by explicit control rather than drag, so it is reachable by
  // keyboard as well as pointer.
  await card.hover();
  await card.getByRole('button', { name: new RegExp(`^Move .* to `) }).last().click();

  const moved_from = page
    .locator('.pipeline-column')
    .filter({ has: page.getByRole('heading', { name: origin_name, exact: true }) });

  await expect(moved_from.getByText(title, { exact: true })).toHaveCount(0);
  await expect(page.getByText(title, { exact: true }).first()).toBeVisible();
});

test('the board excludes closed deals', async ({ page }) => {
  await login_as(page, DEMO_MANAGER);
  await page.goto('/pipeline');

  // A board shows live work; won and lost deals live in reporting.
  const won_column = page
    .locator('.pipeline-column')
    .filter({ has: page.getByRole('heading', { name: 'Closed Won', exact: true }) });

  await expect(won_column.locator('.pipeline-card')).toHaveCount(0);
  await expect(won_column.getByText('Empty')).toBeVisible();
});
