import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: 'html',

  /**
   * Generous, because these run against the Vite dev server rather than a
   * production build. Routes are lazy-loaded, so the first navigation to each
   * one pays a transform cost that does not exist in the built app — the
   * default 30s was enough to make the first test in a run flake.
   */
  timeout: 60_000,
  expect: { timeout: 10_000 },

  use: {
    baseURL: 'http://localhost:5173',
    trace: 'on-first-retry',
    navigationTimeout: 30_000,
    actionTimeout: 15_000,
  },

  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],

  webServer: [
    {
      command: 'pnpm dev',
      url: 'http://localhost:5173',
      reuseExistingServer: !process.env.CI,
      timeout: 120_000,
      cwd: '.',
    },
    {
      command: 'pnpm dev',
      // The GraphQL endpoint rejects GET, so a 400 means the server is up.
      url: 'http://localhost:4000/graphql',
      reuseExistingServer: !process.env.CI,
      timeout: 120_000,
      cwd: '../server',
    },
  ],
});
