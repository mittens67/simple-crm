import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    testTimeout: 30000,
    hookTimeout: 30000,
    // `pnpm build` emits compiled copies of the tests into dist/; without this
    // a build followed by a test run executes every suite twice.
    include: ['src/**/*.{test,spec}.ts'],
    exclude: ['node_modules', 'dist'],
    globalSetup: ['src/__tests__/global-setup.ts'],
    setupFiles: ['src/__tests__/setup.ts'],
  },
});
