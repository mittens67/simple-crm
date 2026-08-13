import { test, expect } from '@playwright/test';

test('lead creation and conversion to customer', async ({ page }) => {
  // Login as demo-sales
  await page.goto('/');
  await page.fill('input[type="email"]', 'demo-sales@example.com');
  await page.fill('input[type="password"]', 'Demo123');
  await page.click('button[type="submit"]');
  await page.waitForURL('/dashboard', { waitUntil: 'networkidle' });

  // Navigate to leads page
  await page.goto('/dashboard/sales/leads');
  await page.waitForLoadState('networkidle');

  // Click "New Lead" button
  await page.click('button:has-text("+ New Lead")');

  // Fill lead form
  const lead_name = `Test Lead ${Date.now()}`;
  await page.fill('input[name="name"]', lead_name);
  await page.fill('input[name="email"]', `lead-${Date.now()}@test.com`);
  await page.fill('input[name="phone"]', '555-0123');

  // Change status to Converted
  await page.selectOption('select[name="status"]', 'Converted');

  // Submit form
  await page.click('button[type="submit"]:has-text("Create")');

  // Wait for modal to close and table to update
  await page.waitForTimeout(500);
  await page.reload();
  await page.waitForLoadState('networkidle');

  // Verify the lead appears in the table with "Converted To" showing a customer name
  const lead_row = page.locator(`text=${lead_name}`).locator('..').locator('..');
  await expect(lead_row).toBeVisible();

  // Check that Converted To column has a customer name (not just "-")
  const converted_to_cell = lead_row.locator('td').nth(5); // "Converted To" is the 6th column (0-indexed)
  const cell_text = await converted_to_cell.textContent();
  expect(cell_text).not.toBe('-');
  expect(cell_text?.trim().length).toBeGreaterThan(0);
});
