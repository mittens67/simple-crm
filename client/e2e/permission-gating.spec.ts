import { test, expect } from '@playwright/test';

test('permission gating: support role cannot access deals', async ({ page }) => {
  // Login as demo-support (Support role, no deals permissions)
  await page.goto('/');
  await page.fill('input[type="email"]', 'demo-support@example.com');
  await page.fill('input[type="password"]', 'Demo123');
  await page.click('button[type="submit"]');
  await page.waitForURL('/dashboard', { waitUntil: 'networkidle' });

  // Try to directly access deals page
  await page.goto('/dashboard/sales/deals', { waitUntil: 'networkidle' });

  // Should either: (a) show an access denied message, or (b) redirect to home/accessible page
  // At minimum, the deals table/content should not be visible
  const deals_table = page.locator('table, .deals-table, .deals');

  // Give it a moment to render, then check
  await page.waitForTimeout(1000);
  const table_visible = await deals_table.isVisible().catch(() => false);

  // If table somehow appeared, we should not see any deals
  if (table_visible) {
    const deals_rows = page.locator('tbody tr');
    const count = await deals_rows.count();
    expect(count).toBe(0);
  }

  // Verify the sidebar doesn't show "Deals" link (or it's hidden)
  const deals_nav_link = page.locator('a, button').filter({ hasText: /Deals/i });
  const nav_visible = await deals_nav_link.isVisible().catch(() => false);

  if (nav_visible) {
    // If nav link is somehow visible, it should be disabled or in a hidden section
    expect(deals_nav_link).toHaveAttribute(/disabled|aria-hidden|hidden|opacity: 0/);
  }
});

test('permission gating: GraphQL mutation rejected for unauthorized user', async ({ page }) => {
  // Login as demo-support
  await page.goto('/');
  await page.fill('input[type="email"]', 'demo-support@example.com');
  await page.fill('input[type="password"]', 'Demo123');
  await page.click('button[type="submit"]');
  await page.waitForURL('/dashboard', { waitUntil: 'networkidle' });

  // Intercept GraphQL requests
  page.on('response', async (response) => {
    if (response.url().includes('/graphql')) {
      try {
        await response.json();
      } catch {
        // Not JSON
      }
    }
  });

  // Try to create a deal via console (simulating a GraphQL call)
  // We'll use page.evaluate to make a fetch call to the GraphQL endpoint
  const result = await page.evaluate(async () => {
    try {
      const response = await fetch('http://localhost:4000/graphql', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          query: `mutation { createDeal(input: { title: "Unauthorized Deal", value: 1000, stage: "Qualification", customer_id: "000000000000000000000000", owner_id: "000000000000000000000000" }) { id } }`,
        }),
      });
      return await response.json();
    } catch (err) {
      return { error: String(err) };
    }
  });

  // Should have errors (permission denied)
  expect(result).toHaveProperty('errors');
  if (result.errors && result.errors.length > 0) {
    const error_msg = JSON.stringify(result.errors[0]);
    expect(error_msg).toMatch(/FORBIDDEN|permission|unauthorized/i);
  }
});
