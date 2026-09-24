import { test, expect } from '@playwright/test';
import { login_as, DEMO_SUPPORT } from './helpers';

test('permission gating: support role cannot access deals', async ({ page }) => {
  await login_as(page, DEMO_SUPPORT);

  // The Deals link must not be offered to a role without deals.read.
  await expect(page.getByRole('link', { name: /^Deals$/i })).toHaveCount(0);

  // Navigating directly must not render the deals page either — the guard
  // redirects back to the dashboard.
  await page.goto('/deals');
  await expect(page).toHaveURL('/');
  await expect(page.getByRole('heading', { name: /^Deals$/i })).toHaveCount(0);
});

test('permission gating: GraphQL mutation rejected for unauthorized user', async ({ page }) => {
  await login_as(page, DEMO_SUPPORT);

  // Same-origin: the Vite dev server proxies /graphql to the API, so the
  // session cookie and auth header are applied exactly as the app sends them.
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
            stage: 'Qualification',
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
