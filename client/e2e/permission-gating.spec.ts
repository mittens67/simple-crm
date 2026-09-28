import { test, expect } from '@playwright/test';
import {
  login_as,
  logout,
  wait_for_rows,
  total_from_pagination,
  DEMO_SUPPORT,
  DEMO_SALES,
  DEMO_MANAGER,
} from './helpers';

test('a support role is not offered deals, and cannot reach them directly', async ({ page }) => {
  await login_as(page, DEMO_SUPPORT);

  // The nav link must not be rendered for a role without deals.read.
  await expect(page.getByRole('link', { name: 'Deals', exact: true })).toHaveCount(0);
  await expect(page.getByRole('link', { name: 'Pipeline', exact: true })).toHaveCount(0);

  // And the route guard redirects rather than rendering the page.
  await page.goto('/deals');
  await expect(page).toHaveURL('/');
  await expect(page.getByRole('heading', { name: 'Deals', level: 1 })).toHaveCount(0);
});

test('a sales role is not offered the admin section', async ({ page }) => {
  await login_as(page, DEMO_SALES);

  // Reps hold users.read so assignment dropdowns can show colleagues' names.
  // The admin console is gated on users.update instead, so reading a name does
  // not imply being able to administer people.
  await expect(page.getByRole('link', { name: 'Users', exact: true })).toHaveCount(0);
  await expect(page.getByRole('link', { name: 'Roles', exact: true })).toHaveCount(0);

  await page.goto('/admin/users');
  await expect(page).toHaveURL('/');

  await page.goto('/admin/roles');
  await expect(page).toHaveURL('/');
});

test('an unauthorized mutation is rejected by the server, not just hidden', async ({ page }) => {
  await login_as(page, DEMO_SUPPORT);

  // Same-origin: the dev server proxies /graphql, so the session cookie and
  // auth header are applied exactly as the app sends them.
  const result = await page.evaluate(async () => {
    const response = await fetch('/graphql', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({
        query: `mutation CreateUnauthorizedDeal($input: CreateDealInput!) {
          createDeal(input: $input) { id }
        }`,
        variables: {
          input: {
            title: 'Unauthorized Deal',
            value: 1000,
            customer_id: '000000000000000000000000',
            owner_id: '000000000000000000000000',
          },
        },
      }),
    });
    return response.json();
  });

  expect(result.errors, 'expected the mutation to be rejected').toBeTruthy();
  expect(JSON.stringify(result.errors)).toMatch(/FORBIDDEN|permission|unauthenticated/i);
});

test('ownership scoping means a rep and a manager see different totals', async ({ page }) => {
  // A rep sees only their own book of business; a manager holds the `.all`
  // scopes and sees the whole team's.
  await login_as(page, DEMO_SALES);
  await page.goto('/leads');
  await wait_for_rows(page);
  // Compare the reported totals, not rendered rows: pagination caps both at
  // the page size, so row counts would be identical either way.
  const rep_total = await total_from_pagination(page);

  await logout(page);

  await login_as(page, DEMO_MANAGER);
  await page.goto('/leads');
  await wait_for_rows(page);
  const manager_total = await total_from_pagination(page);

  // A rep sees their own leads plus the unclaimed pool; a manager sees those
  // plus every other rep's.
  expect(manager_total).toBeGreaterThan(rep_total);
});
